import { fftMagnitudesReal } from '../audio/realSpectrum';
import { estimateDonorFundamental } from './donorPitch';
import type { DonorProjectionModel } from './donorProjectionTypes';
import { analyzeDonorBodyV3, donorProjectionFingerprint } from '../donorV3/donorBodyModel';

const HARMONICS = 64;
const finite = (v: number) => Number.isFinite(v) ? v : 0;
const norm = (values: number[]) => {
  const power = Math.sqrt(values.reduce((s, v) => s + v * v, 0)) || 1;
  return values.map(v => v / power);
};
const yieldTask = () => new Promise<void>(resolve => setTimeout(resolve, 0));
type Mode = { ratio: number; amplitude: number };
type Frame = { partials: number[]; modes: Mode[]; envelope: number[]; residual: number[]; noise: number; modal: number; hz: number; brightness: number; power: number; offset: number };

/** Spectral material, not a donor score. Spectral states are re-articulated by
 * carrier onsets; no absolute donor timing or original PCM enters synthesis.
 * Harmonic and sparse inharmonic energy are removed before estimating residual.
 */
export async function analyzeDonorMaterial(
  channels: readonly Float32Array[], sampleRate: number, start = 0, length = channels[0]?.length ?? 0,
): Promise<DonorProjectionModel> {
  if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000 || !channels.length) throw new Error('Ungültiges Donor-Audio.');
  start = Math.max(0, Math.floor(finite(start)));
  length = Math.max(0, Math.min(Math.floor(finite(length)), ...channels.map(c => c.length - start)));
  if (length < 128) throw new Error('Die Donor-Auswahl ist zu kurz.');
  const bodyV3 = await analyzeDonorBodyV3(channels, sampleRate, start, length);
  // Similar physical resolution at 16/48/96 kHz, with a hard CPU/memory bound.
  const n = Math.min(16384, Math.max(4096, 2 ** Math.ceil(Math.log2(sampleRate * 0.12))));
  const count = Math.min(28, Math.max(1, Math.ceil(length / (n / 2))));
  const offsets = new Set<number>();
  for (let i = 0; i < count; i++) offsets.add(Math.round(i / Math.max(1, count - 1) * Math.max(0, length - n)));
  // Extra contiguous early windows recover attacks without increasing long-file cost.
  for (const sec of [0.025, 0.06, 0.12]) if (sec * sampleRate + n < length) offsets.add(Math.round(sec * sampleRate));
  const frames: Frame[] = [];
  const windowed = new Float32Array(n);
  let iteration = 0;
  for (const relative of [...offsets].sort((a, b) => a - b)) {
    const available = Math.min(n, length - relative);
    for (const channel of channels.slice(0, 2)) {
      let mean = 0;
      for (let i = 0; i < available; i++) mean += finite(channel[start + relative + i]);
      mean /= available;
      const pcm = new Float32Array(available);
      for (let i = 0; i < n; i++) {
        const value = i < available ? finite(channel[start + relative + i]) - mean : 0;
        if (i < available) pcm[i] = value;
        windowed[i] = value * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / Math.max(1, available - 1)));
      }
      const spectrum = fftMagnitudesReal(windowed);
      const energy = Float64Array.from(spectrum, v => v * v);
      let power = 0, centroid = 0, logPower = 0;
      for (let k = 1; k < spectrum.length; k++) { power += energy[k]; centroid += energy[k] * k; logPower += Math.log(energy[k] + 1e-24); }
      if (power < 1e-12) continue;
      const flatness = Math.exp(logPower / (spectrum.length - 1)) / (power / (spectrum.length - 1));
      const pitch = flatness < 0.25 ? estimateDonorFundamental(pcm, sampleRate) : { hz: 0, confidence: 0 };
      const used = new Uint8Array(spectrum.length);
      const weights = new Array<number>(HARMONICS).fill(0);
      let harmonicPower = 0;
      if (pitch.hz > 0) {
        for (let h = 1; h <= HARMONICS; h++) {
          const bin = Math.round(pitch.hz * h * n / sampleRate);
          if (bin + 2 >= spectrum.length) break;
          // A wide FFT mask alone mistakes a near-subharmonic of a bell for
          // periodicity. Require a resolved peak at the predicted harmonic.
          let peakBin = Math.max(1, bin - 2);
          for (let k = peakBin + 1; k <= bin + 2; k++) if (spectrum[k] > spectrum[peakBin]) peakBin = k;
          if (peakBin < 1 || peakBin + 1 >= spectrum.length) continue;
          const a = Math.log(spectrum[peakBin - 1] + 1e-20), b = Math.log(spectrum[peakBin] + 1e-20), c = Math.log(spectrum[peakBin + 1] + 1e-20);
          const delta = Math.max(-0.5, Math.min(0.5, 0.5 * (a - c) / (a - 2 * b + c || 1)));
          const measuredHz = (peakBin + delta) * sampleRate / n;
          if (Math.abs(measuredHz - pitch.hz * h) > Math.max(sampleRate / n * 0.22, pitch.hz * h * 0.006)) continue;
          for (let k = Math.max(1, peakBin - 2); k <= Math.min(spectrum.length - 1, peakBin + 2); k++) {
            if (!used[k]) { weights[h - 1] += energy[k]; harmonicPower += energy[k]; used[k] = 1; }
          }
          weights[h - 1] = Math.sqrt(weights[h - 1]);
        }
      }
        // Sparse prominent peaks retain bells/metal/resonant bodies. Broad-band
        // peaks are not oscillators: require both local prominence and concentration.
        const peaks: { bin: number; hz: number; power: number }[] = [];
        for (let k = 3; k < spectrum.length - 4; k++) {
          if (spectrum[k] <= spectrum[k - 1] || spectrum[k] < spectrum[k + 1]) continue;
          let floor = 0, samples = 0;
          for (let j = Math.max(1, k - 9); j <= Math.min(spectrum.length - 1, k + 9); j++) if (Math.abs(j - k) >= 4) { floor += energy[j]; samples++; }
          const area = energy[k - 2] + energy[k - 1] + energy[k] + energy[k + 1] + energy[k + 2];
          if (area / power < 0.008 || energy[k] < 12 * floor / Math.max(1, samples)) continue;
          const a = Math.log(spectrum[k - 1] + 1e-20), b = Math.log(spectrum[k] + 1e-20), c = Math.log(spectrum[k + 1] + 1e-20);
          const delta = Math.max(-0.5, Math.min(0.5, 0.5 * (a - c) / (a - 2 * b + c || 1)));
          peaks.push({ bin: k, hz: (k + delta) * sampleRate / n, power: area });
        }
        peaks.sort((a, b) => b.power - a.power);
        const chosen = peaks.slice(0, 24);
        const concentratedPower = chosen.reduce((s, p) => s + p.power, 0);
      // Periodicity must explain the resolved resonances, not merely the
      // loudest note. Noise outside those peaks remains a valid residual.
      const isPitched = pitch.hz > 0 && harmonicPower / power > 0.5 && harmonicPower >= concentratedPower * 0.94;
      let modalPower = 0;
      const modes: Mode[] = [];
      let referenceHz = isPitched ? pitch.hz : 0;
      if (!isPitched) {
        used.fill(0); harmonicPower = 0; weights.fill(0);
        if (concentratedPower / power > 0.55 && chosen.length) {
          // Lowest substantial resonance is the modal root. Its ratios describe
          // material; the carrier supplies the actual playback frequency.
          referenceHz = Math.min(...chosen.filter(p => p.power >= chosen[0].power * 0.04).map(p => p.hz));
          for (const peak of chosen) {
            let p = 0;
            for (let k = peak.bin - 2; k <= peak.bin + 2; k++) if (!used[k]) { p += energy[k]; used[k] = 1; }
            modalPower += p;
            modes.push({ ratio: peak.hz / referenceHz, amplitude: Math.sqrt(p / power) });
          }
        }
      }
      const envelope = new Array<number>(24).fill(0), residual = new Array<number>(12).fill(0);
      // Every FFT bin belongs to exactly one band; avoid doubled residual energy
      // at rounded log-band boundaries (a previous source of excess hiss).
      for (let k = 1; k < spectrum.length; k++) {
        const hz = k * sampleRate / n;
        const band = Math.max(0, Math.min(23, Math.floor(Math.log(Math.max(40, hz) / 40) / Math.log(sampleRate / 80) * 24)));
        envelope[band] += energy[k] / power;
        if (!used[k]) residual[Math.floor(band / 2)] += energy[k] / power;
      }
      for (let b = 0; b < 24; b++) {
        const bins = Math.max(1, (40 * (sampleRate / 80) ** ((b + 1) / 24) - 40 * (sampleRate / 80) ** (b / 24)) * n / sampleRate);
        envelope[b] = Math.sqrt(envelope[b] / bins);
      }
      if (isPitched) {
        // Estimate the broad resonant envelope from resolved partial peaks, not
        // empty FFT bins between them. Otherwise the donor's original harmonic
        // comb is mistaken for formants and colours transposition unpredictably.
        const strongest = Math.max(...weights);
        for (let b = 0; b < 24; b++) {
          const hz = 40 * (sampleRate / 80) ** ((b + 0.5) / 24);
          let sum = 0, total = 0;
          for (let h = 1; h <= weights.length; h++) {
            if (weights[h - 1] < strongest * 0.015) continue;
            const distance = Math.log2(hz / (pitch.hz * h));
            const weight = Math.exp(-0.5 * (distance / 0.65) ** 2);
            sum += weights[h - 1] / Math.sqrt(power) * weight; total += weight;
          }
          envelope[b] = total > 1e-8 ? sum / total : 0;
        }
      }
      frames.push({ partials: norm(weights), modes, envelope, residual, noise: Math.max(0, 1 - (harmonicPower + modalPower) / power), modal: Math.min(1, modalPower / power), hz: referenceHz, brightness: centroid / power / (spectrum.length - 1), power, offset: relative / sampleRate });
    }
    if (++iteration % 3 === 0) await yieldTask();
  }
  if (!frames.length) throw new Error('Die Donor-Auswahl enthält kein auswertbares Audiosignal.');
  const maximumPower = Math.max(...frames.map(f => f.power));
  // Reject silence/tail numerical residue, but retain quiet character-bearing frames.
  const selected = frames.filter(f => f.power > maximumPower * 0.0001);
  const first = selected[0].offset;
  const attackFrames = selected.filter(f => f.offset <= first + 0.065);
  const sustainFrames = selected.filter(f => f.offset > first + 0.065);
  const aggregate = (pool: Frame[], field: 'partials' | 'envelope' | 'residual') => {
    const values = new Array<number>(pool[0][field].length).fill(0);
    let sumWeight = 0;
    for (const f of pool) {
      // Square-root loudness weighting avoids equal importance of near-silent tails
      // without allowing one transient to erase the sustained timbre.
      const weight = Math.sqrt(f.power / maximumPower); sumWeight += weight;
      for (let i = 0; i < values.length; i++) values[i] += f[field][i] ** 2 * weight;
    }
    return values.map(v => Math.sqrt(v / Math.max(1e-12, sumWeight)));
  };
  const sustain = sustainFrames.length ? sustainFrames : selected;
  const average = (pool: Frame[], field: 'noise' | 'modal' | 'brightness') => pool.reduce((s, f) => s + f[field] * Math.sqrt(f.power), 0) / pool.reduce((s, f) => s + Math.sqrt(f.power), 0);
  const tonalFrames = selected.filter(f => f.hz > 0);
  const referenceHz = tonalFrames.length ? Math.exp(tonalFrames.reduce((s, f) => s + Math.log(f.hz), 0) / tonalFrames.length) : 220;
  const clusters: { ratio: number; power: number; count: number }[] = [];
  for (const f of selected) for (const mode of f.modes) {
    const cluster = clusters.find(c => Math.abs(Math.log2(c.ratio / mode.ratio)) < 0.025);
    const power = mode.amplitude ** 2;
    if (cluster) { cluster.ratio = (cluster.ratio * cluster.power + mode.ratio * power) / (cluster.power + power); cluster.power += power; cluster.count++; }
    else clusters.push({ ratio: mode.ratio, power, count: 1 });
  }
  clusters.sort((a, b) => b.power - a.power);
  const modes = clusters.slice(0, 24), modalNorm = Math.sqrt(modes.reduce((s, m) => s + m.power, 0)) || 1;
  const result: DonorProjectionModel = {
    version: 'donor-projection-v2', partials: norm(aggregate(sustain, 'partials')),
    attackPartials: norm(aggregate(attackFrames, 'partials')),
    attackDurationSec: 0.065, attackNoiseAmount: average(attackFrames, 'noise'),
    noiseAmount: average(sustain, 'noise'), noiseBrightness: average(selected, 'brightness'),
    modalAmount: average(selected, 'modal'), modalPartials: modes.map(m => ({ ratio: m.ratio, amplitude: Math.sqrt(m.power) / modalNorm })),
    analyzedFrames: selected.length, pitchedFrames: selected.filter(f => f.hz > 0 && !f.modes.length).length,
    spectralEnvelope: aggregate(selected, 'envelope'), residualBands: aggregate(selected, 'residual').map(Math.sqrt),
    referenceHz, envelopeMaxHz: sampleRate / 2, bodyV3,
  };
  bodyV3.legacyProjectionFingerprint = donorProjectionFingerprint(result);
  return result;
}
