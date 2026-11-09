import { fftMagnitudesReal } from '../audio/realSpectrum';
import { estimateDonorFundamental } from '../donorV2/donorPitch';

const PARTIAL_COUNT = 64;
const NOISE_BANDS = 8;
const FORMANT_BANDS = 48;
const FORMANT_MIN_HZ = 70;
const finite = (value: number) => Number.isFinite(value) ? value : 0;
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, finite(value)));
const nextPowerOfTwo = (value: number) => { let n = 1; while (n < value) n <<= 1; return n; };
const yieldTask = () => new Promise<void>(resolve => setTimeout(resolve, 0));

export type DonorBodyFrame = {
  timeSec: number;
  f0Hz: number;
  pitchConfidence: number;
  relativeLevel: number;
  harmonicAmplitudes: number[];
  harmonicPhases: number[];
  aperiodicity: number;
  noiseBands: number[];
  /** Pitch-decoupled vocal-tract / resonant envelope on a fixed log-Hz axis. */
  formantEnvelope: number[];
};

export type DonorBodyV3Model = {
  version: 'donor-body-v3';
  eventStartSec: number;
  eventDurationSec: number;
  frameHopSec: number;
  referenceHz: number;
  attackEndSec: number;
  sustainStartSec: number;
  sustainEndSec: number;
  voicedFrameRatio: number;
  detectedEventCount: number;
  sourceChannelIndex: number;
  sourceRms: number;
  unexplainedEnergyRatio: number;
  /** Fixed absolute-frequency axis for formantEnvelope. Carrier pitch never owns this axis. */
  formantMinHz: number;
  formantMaxHz: number;
  formantBandCount: number;
  meanPitchConfidence: number;
  /** Heuristic confidence that the selected body behaves like a voiced source suitable for identity-preserving retuning. */
  voiceIdentityConfidence: number;
  reconstructionSimilarity?: number;
  reconstructionLogErrorDb?: number;
  legacyProjectionFingerprint?: string;
  frames: DonorBodyFrame[];
};

export function donorProjectionFingerprint(model: {
  partials: number[]; attackPartials?: number[]; spectralEnvelope: number[];
  noiseAmount: number; modalAmount?: number;
}) {
  const sample = (values: number[] | undefined) => (values ?? []).map(value => finite(value).toFixed(6)).join(',');
  return `${sample(model.partials)}|${sample(model.attackPartials)}|${sample(model.spectralEnvelope)}|${finite(model.noiseAmount).toFixed(6)}|${finite(model.modalAmount ?? 0).toFixed(6)}`;
}

type EventRange = { start: number; end: number; energy: number };

function selectEvent(samples: Float32Array, sampleRate: number, start: number, length: number) {
  const block = Math.max(32, Math.round(sampleRate * 0.01));
  const blocks = Math.max(1, Math.ceil(length / block));
  const rms = new Float64Array(blocks);
  let maximum = 0;
  for (let b = 0; b < blocks; b++) {
    let power = 0, count = 0;
    const from = start + b * block, to = Math.min(start + length, from + block);
    for (let i = from; i < to; i++) { const value = finite(samples[i]); power += value * value; count++; }
    rms[b] = Math.sqrt(power / Math.max(1, count)); maximum = Math.max(maximum, rms[b]);
  }
  if (maximum < 1e-7) throw new Error('Die Donor-Auswahl enthält kein auswertbares Audiosignal.');
  const active = Array.from(rms, value => value >= maximum * 0.035);
  // Bridge only very short holes. A longer gap is another performed event,
  // not a timbre state to average into the selected body.
  for (let b = 1; b < blocks - 1; b++) {
    if (active[b]) continue;
    let left = b - 1, right = b + 1;
    while (left >= 0 && !active[left] && b - left <= 4) left--;
    while (right < blocks && !active[right] && right - b <= 4) right++;
    if (left >= 0 && right < blocks && active[left] && active[right] && right - left <= 5) active[b] = true;
  }
  const events: EventRange[] = [];
  for (let b = 0; b < blocks;) {
    if (!active[b]) { b++; continue; }
    const first = b; let energy = 0;
    while (b < blocks && active[b]) { energy += rms[b] * rms[b]; b++; }
    events.push({ start: first * block, end: Math.min(length, b * block), energy });
  }
  const chosen = events.reduce((best, event) => !best || event.energy * (event.end - event.start) > best.energy * (best.end - best.start) ? event : best, null as EventRange | null);
  if (!chosen) throw new Error('Die Donor-Auswahl enthält keinen zusammenhängenden Klangkörper.');
  return { start: start + chosen.start, length: chosen.end - chosen.start, count: events.length };
}

function buildPitchDecoupledFormantEnvelope(
  harmonicAmplitudes: number[], f0Hz: number, maxHz: number,
) {
  const output = new Array<number>(FORMANT_BANDS).fill(0);
  if (!(f0Hz > 0) || !(maxHz > FORMANT_MIN_HZ)) return output;
  // Broad log-frequency kernels deliberately ignore the donor's individual
  // harmonic comb. What remains is the resonant/filter shape that should stay
  // approximately fixed while the Carrier owns F0.
  const sigmaOctaves = 0.34;
  let maximum = 0;
  for (let band = 0; band < FORMANT_BANDS; band++) {
    const centerHz = FORMANT_MIN_HZ * (maxHz / FORMANT_MIN_HZ) ** ((band + 0.5) / FORMANT_BANDS);
    let weightedPower = 0, weightSum = 0;
    for (let harmonic = 1; harmonic <= harmonicAmplitudes.length; harmonic++) {
      const hz = f0Hz * harmonic;
      if (hz > maxHz * 1.08) break;
      const amplitude = Math.max(0, finite(harmonicAmplitudes[harmonic - 1]));
      if (!(amplitude > 0)) continue;
      const distance = Math.log2(Math.max(1e-6, hz / centerHz));
      if (Math.abs(distance) > sigmaOctaves * 3.5) continue;
      const weight = Math.exp(-0.5 * (distance / sigmaOctaves) ** 2);
      weightedPower += amplitude * amplitude * weight;
      weightSum += weight;
    }
    const value = Math.sqrt(weightedPower / Math.max(1e-12, weightSum));
    output[band] = value;
    maximum = Math.max(maximum, value);
  }
  if (maximum > 1e-9) {
    // A small floor prevents empty inter-harmonic valleys from turning into
    // explosive correction ratios after large interval jumps.
    const floor = maximum * 0.012;
    for (let i = 0; i < output.length; i++) output[i] = Math.max(floor, output[i]) / maximum;
  }
  return output;
}

function spectralFlatness(spectrum: Float32Array) {
  let sum = 0, log = 0, count = 0;
  for (let i = 1; i < spectrum.length; i++) {
    const power = spectrum[i] * spectrum[i];
    sum += power; log += Math.log(power + 1e-20); count++;
  }
  return count && sum > 1e-20 ? Math.exp(log / count) / (sum / count) : 1;
}

/**
 * Builds a time-resolved, pitch-normalized donor body. Harmonic phases are
 * stored relative to the fundamental, so the waveform survives retuning while
 * absolute donor pitch and score do not.
 */
export async function analyzeDonorBodyV3(
  channels: readonly Float32Array[], sampleRate: number, start: number, length: number,
): Promise<DonorBodyV3Model> {
  let sourceChannelIndex = 0, sourceEnergy = -1;
  for (let channelIndex = 0; channelIndex < Math.min(2, channels.length); channelIndex++) {
    let energy = 0;
    const channel = channels[channelIndex];
    for (let i = start; i < Math.min(channel.length, start + length); i++) energy += finite(channel[i]) ** 2;
    if (energy > sourceEnergy) { sourceEnergy = energy; sourceChannelIndex = channelIndex; }
  }
  const source = channels[sourceChannelIndex];
  if (!source || sampleRate < 8000 || length < 128) throw new Error('Die Donor-Auswahl ist zu kurz.');
  const selected = selectEvent(source, sampleRate, start, length);
  let selectedPower = 0;
  for (let i = selected.start; i < selected.start + selected.length; i++) selectedPower += finite(source[i]) ** 2;
  const sourceRms = Math.sqrt(selectedPower / Math.max(1, selected.length));
  const windowSize = Math.min(selected.length, Math.max(1024, Math.min(8192, nextPowerOfTwo(sampleRate * 0.075))));
  const availableTravel = Math.max(0, selected.length - windowSize);
  const desiredHop = Math.max(1, Math.round(sampleRate * 0.0125));
  const frameCount = Math.max(1, Math.min(160, Math.floor(availableTravel / desiredHop) + 1));
  const hop = frameCount > 1 ? availableTravel / (frameCount - 1) : 0;
  const window = new Float32Array(windowSize);
  const windowValues = new Float64Array(windowSize);
  let windowSum = 0;
  for (let i = 0; i < windowSize; i++) {
    windowValues[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / Math.max(1, windowSize - 1));
    windowSum += windowValues[i];
  }
  const frames: DonorBodyFrame[] = [];
  const formantMaxHz = Math.max(FORMANT_MIN_HZ * 2, Math.min(10000, sampleRate * 0.45));
  let maximumLevel = 0, unexplained = 0, totalPower = 0;
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
    const offset = selected.start + Math.round(frameIndex * hop);
    let mean = 0;
    for (let i = 0; i < windowSize; i++) mean += finite(source[offset + i]);
    mean /= windowSize;
    let power = 0;
    for (let i = 0; i < windowSize; i++) {
      const value = finite(source[offset + i]) - mean;
      window[i] = value; power += value * value;
    }
    const level = Math.sqrt(power / windowSize);
    maximumLevel = Math.max(maximumLevel, level); totalPower += power;
    const pitch = estimateDonorFundamental(window, sampleRate);
    const f0 = pitch.hz > 0 ? pitch.hz : 0;
    const amplitudes = new Array<number>(PARTIAL_COUNT).fill(0);
    const phases = new Array<number>(PARTIAL_COUNT).fill(0);
    let explainedPower = 0, fundamentalPhase = 0;
    if (f0 > 0) {
      for (let harmonic = 1; harmonic <= PARTIAL_COUNT && harmonic * f0 < sampleRate * 0.47; harmonic++) {
        let sine = 0, cosine = 0;
        const omega = 2 * Math.PI * f0 * harmonic / sampleRate;
        const stepCosine = Math.cos(omega), stepSine = Math.sin(omega);
        let oscillatorCosine = 1, oscillatorSine = 0;
        for (let i = 0; i < windowSize; i++) {
          const weighted = window[i] * windowValues[i];
          sine += weighted * oscillatorSine;
          cosine += weighted * oscillatorCosine;
          const nextCosine = oscillatorCosine * stepCosine - oscillatorSine * stepSine;
          oscillatorSine = oscillatorSine * stepCosine + oscillatorCosine * stepSine;
          oscillatorCosine = nextCosine;
        }
        const amplitude = 2 * Math.hypot(sine, cosine) / Math.max(1e-12, windowSum);
        const phase = Math.atan2(cosine, sine);
        if (harmonic === 1) fundamentalPhase = phase;
        amplitudes[harmonic - 1] = amplitude;
        phases[harmonic - 1] = phase - harmonic * fundamentalPhase;
        explainedPower += 0.5 * amplitude * amplitude * windowSize;
      }
    }
    const spectrum = fftMagnitudesReal(Float32Array.from(window, (value, i) => value * windowValues[i]));
    const flatness = spectralFlatness(spectrum);
    const residualRatio = clamp(1 - explainedPower / Math.max(1e-12, power), 0, 1);
    const aperiodicity = f0 > 0
      ? Math.min(residualRatio, clamp((1 - pitch.confidence) * 0.22 + Math.sqrt(flatness) * 0.7, 0.001, 0.32))
      : 1;
    unexplained += residualRatio * power;
    const noiseBands = new Array<number>(NOISE_BANDS).fill(0);
    for (let bin = 1; bin < spectrum.length; bin++) {
      const hz = bin * sampleRate / ((spectrum.length - 1) * 2);
      if (f0 > 0 && Math.abs(hz / f0 - Math.round(hz / f0)) < 0.035) continue;
      const band = Math.max(0, Math.min(NOISE_BANDS - 1, Math.floor(Math.log(Math.max(40, hz) / 40) / Math.log(sampleRate / 80) * NOISE_BANDS)));
      noiseBands[band] += spectrum[bin] * spectrum[bin];
    }
    const harmonicNorm = Math.sqrt(amplitudes.reduce((sum, value) => sum + value * value, 0)) || 1;
    const normalizedHarmonics = amplitudes.map(value => value / harmonicNorm);
    const noiseNorm = Math.sqrt(noiseBands.reduce((sum, value) => sum + value, 0)) || 1;
    frames.push({
      timeSec: (offset - selected.start) / sampleRate,
      f0Hz: f0,
      pitchConfidence: pitch.confidence,
      relativeLevel: level,
      harmonicAmplitudes: normalizedHarmonics,
      harmonicPhases: phases,
      aperiodicity,
      noiseBands: noiseBands.map(value => Math.sqrt(value) / noiseNorm),
      formantEnvelope: buildPitchDecoupledFormantEnvelope(normalizedHarmonics, f0, formantMaxHz),
    });
    if (frameIndex % 4 === 3) await yieldTask();
  }
  for (const frame of frames) frame.relativeLevel /= Math.max(1e-9, maximumLevel);
  const voiced = frames.filter(frame => frame.f0Hz > 0 && frame.pitchConfidence >= 0.72);
  const referenceHz = voiced.length
    ? Math.exp(voiced.reduce((sum, frame) => sum + Math.log(frame.f0Hz), 0) / voiced.length)
    : 0;
  const meanPitchConfidence = voiced.length
    ? voiced.reduce((sum, frame) => sum + frame.pitchConfidence, 0) / voiced.length
    : 0;
  const unexplainedEnergyRatio = unexplained / Math.max(1e-12, totalPower);
  const harmonicity = clamp(1 - unexplainedEnergyRatio, 0, 1);
  const voiceIdentityConfidence = clamp(
    (voiced.length / Math.max(1, frames.length)) * 0.5 + meanPitchConfidence * 0.35 + harmonicity * 0.15,
    0, 1,
  );
  const onsetIndex = Math.max(0, frames.findIndex(frame => frame.relativeLevel >= 0.85));
  const attackEndIndex = Math.min(frames.length - 1, Math.max(onsetIndex, Math.round(0.09 / Math.max(1e-4, hop / sampleRate))));
  const stableCandidates = frames.map((frame, index) => ({ frame, index })).filter(({ frame, index }) => index >= attackEndIndex && frame.f0Hz > 0 && frame.relativeLevel >= 0.55);
  const sustainStartIndex = stableCandidates[0]?.index ?? attackEndIndex;
  const sustainEndIndex = stableCandidates[stableCandidates.length - 1]?.index ?? frames.length - 1;
  return {
    version: 'donor-body-v3', eventStartSec: (selected.start - start) / sampleRate,
    eventDurationSec: selected.length / sampleRate, frameHopSec: hop / sampleRate,
    referenceHz, attackEndSec: frames[attackEndIndex]?.timeSec ?? 0.08,
    sustainStartSec: frames[sustainStartIndex]?.timeSec ?? 0,
    sustainEndSec: frames[sustainEndIndex]?.timeSec ?? selected.length / sampleRate,
    voicedFrameRatio: voiced.length / frames.length, detectedEventCount: selected.count, sourceChannelIndex, sourceRms,
    unexplainedEnergyRatio, formantMinHz: FORMANT_MIN_HZ, formantMaxHz, formantBandCount: FORMANT_BANDS,
    meanPitchConfidence, voiceIdentityConfidence, frames,
  };
}
