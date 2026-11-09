/** Donor Projection: harmonic/modal/residual material, carrier-owned time/pitch/voices.
 * No donor sample playback, donor time envelope, or global synthesizer writes.
 */
import type { AudioSourceAsset } from '../audio/AudioImporterTypes';
import type { ProjectionCarrierPlan } from './projectionCarrierPlan';
import { donorProjectionFingerprint } from '../donorV3/donorBodyModel';
import type { DonorProjectionModel } from './donorProjectionTypes';
export type { DonorProjectionModel } from './donorProjectionTypes';
import { donorBodyV3CanRender, renderDonorBodyV3 } from '../donorV3/renderDonorBodyV3';
import { renderDonorBodyV3Reference } from '../donorV3/renderDonorBodyV3';
import { evaluateDonorReconstruction } from '../donorV3/donorReconstructionMetrics';

const PARTIALS = 64;
const TABLE_SIZE = 2048;
const finite = (v: number) => Number.isFinite(v) ? v : 0;
const unit = (v: number) => Math.max(0, Math.min(1, finite(v)));
const yieldTask = () => new Promise<void>(resolve => setTimeout(resolve, 0));

export { analyzeDonorMaterial as analyzeDonorProjection } from './donorMaterialAnalysis';
import { analyzeDonorMaterial as analyzeDonorProjection } from './donorMaterialAnalysis';

export function donorProjectionUsesBodyV3(model: DonorProjectionModel) {
  const body = model.bodyV3;
  const meanFundamentalShare = body?.frames.length
    ? body.frames.reduce((sum, frame) => sum + (frame.harmonicAmplitudes[0] ?? 0), 0) / body.frames.length
    : 0;
  // Sparse inharmonic resonators (bells, metal, struck bodies) belong to the
  // measured modal renderer. Legacy analysis can mistake deep vibrato for
  // modality, so a strong measured fundamental is the independent escape hatch;
  // a coincidental low autocorrelation subharmonic of a bell is not.
  const harmonicBody = (model.modalAmount ?? 0) < 0.5 || meanFundamentalShare >= 0.12;
  const voiceLike = !!body && body.voiceIdentityConfidence >= 0.62 && body.meanPitchConfidence >= 0.72;
  const unexplainedCeiling = voiceLike ? 0.68 : 0.42;
  return donorBodyV3CanRender(body) && body.unexplainedEnergyRatio < unexplainedCeiling && harmonicBody &&
    body.legacyProjectionFingerprint === donorProjectionFingerprint(model);
}

// Weak ownership and two selections per PCM identity; failed promises are evicted.
const channelIds = new WeakMap<Float32Array, number>();
let nextChannelId = 1;
const cache = new WeakMap<Float32Array, Map<string, Promise<DonorProjectionModel>>>();
export function prepareDonorProjection(source: AudioSourceAsset): Promise<DonorProjectionModel> {
  const left = source.leftSamples?.length ? source.leftSamples : source.monoSamples;
  const right = source.channelCount > 1 && source.rightSamples?.length ? source.rightSamples : null;
  let entries = cache.get(left);
  if (!entries) { entries = new Map(); cache.set(left, entries); }
  const start = Math.round(source.importStartSec * source.sampleRate);
  const length = Math.round(source.importDurationSec * source.sampleRate);
  if (right && !channelIds.has(right)) channelIds.set(right, nextChannelId++);
  const key = `v5-formant-lock:${source.sampleRate}:${start}:${length}:${right ? channelIds.get(right) : 0}`;
  const previous = entries.get(key);
  if (previous) return previous;
  const result = analyzeDonorProjection(right ? [left, right] : [left], source.sampleRate, start, length).then(async model => {
    if (!donorBodyV3CanRender(model.bodyV3)) return model;
    const rendered = await renderDonorBodyV3Reference(model.bodyV3, source.sampleRate);
    const eventStart = start + Math.round(model.bodyV3.eventStartSec * source.sampleRate);
    const analysisChannel = model.bodyV3.sourceChannelIndex === 1 && right ? right : left;
    const original = analysisChannel.slice(eventStart, eventStart + rendered.length);
    const metrics = evaluateDonorReconstruction(original, rendered);
    model.bodyV3.reconstructionSimilarity = metrics.spectralSimilarity;
    model.bodyV3.reconstructionLogErrorDb = metrics.logSpectralErrorDb;
    return model;
  });
  entries.set(key, result);
  if (entries.size > 2) entries.delete(entries.keys().next().value!);
  result.catch(() => { if (entries!.get(key) === result) entries!.delete(key); });
  return result;
}

function envelopeAt(model: DonorProjectionModel, hz: number) {
  const position = Math.max(0, Math.min(23, Math.log(Math.max(40, hz) / 40) / Math.log(model.envelopeMaxHz / 40) * 24 - 0.5));
  const center = Math.round(position);
  // Smooth over neighbouring log bands to describe resonance, not donor notes.
  let sum = 0, weight = 0;
  for (let i = Math.max(0, center - 2); i <= Math.min(23, center + 2); i++) {
    const w = Math.exp(-0.5 * ((position - i) / 1.1) ** 2);
    sum += (model.spectralEnvelope[i] ?? 0) * w; weight += w;
  }
  return sum / Math.max(1e-9, weight);
}
const harmonicBasis = Array.from({ length: PARTIALS }, (_, h) => Float32Array.from({ length: TABLE_SIZE }, (_, i) => Math.sin(2 * Math.PI * (h + 1) * i / TABLE_SIZE)));
function table(model: DonorProjectionModel, rootHz: number, sampleRate: number) {
  // A one-semitone guard is enough for interpolation between adjacent tables.
  // The old octave mip ladder discarded up to half the usable partials.
  const cutoff = sampleRate * 0.46 / (rootHz * 2 ** (1 / 12));
  const weights = model.partials.slice(0, PARTIALS).map((p, i) => {
    const source = envelopeAt(model, model.referenceHz * (i + 1));
    const target = envelopeAt(model, rootHz * (i + 1));
    const ratio = Math.max(0.25, Math.min(4, (target + 0.002) / (source + 0.002)));
    return finite(p) * ratio;
  });
  // Normalize before band limiting: transposition never boosts missing highs into
  // an artificially loud fundamental. Fade individual top harmonics, not octaves.
  const norm = Math.sqrt(weights.reduce((sum, w) => sum + w * w, 0)) || 1;
  const data = new Float32Array(TABLE_SIZE + 1);
  for (let h = 1; h <= weights.length; h++) {
    const gain = weights[h - 1] / norm * unit((cutoff - h) / Math.max(1, cutoff * 0.045));
    if (Math.abs(gain) < 1e-9) continue;
    for (let i = 0; i < TABLE_SIZE; i++) data[i] += gain * harmonicBasis[h - 1][i];
  }
  data[TABLE_SIZE] = data[0];
  return data;
}
function readTable(table: Float32Array, phase: number) {
  const p = phase * TABLE_SIZE, i = Math.floor(p);
  return table[i] + (table[i + 1] - table[i]) * (p - i);
}
function curve(values: number[], p: number) {
  const x = p * Math.max(0, values.length - 1), i = Math.floor(x), a = finite(values[i] ?? 0);
  return a + (finite(values[Math.min(i + 1, values.length - 1)] ?? a) - a) * (x - i);
}

/** One buffer, no per-partial WebAudio nodes. Register tables crossfade continuously
 * and contain no partials above 0.46 * sampleRate. Silent carrier cells are exact zero. */
export async function renderDonorProjection(
  plan: ProjectionCarrierPlan, model: DonorProjectionModel,
  sampleRate: number, durationSec: number,
  isCancelled: () => boolean = () => false,
): Promise<Float32Array> {
  if (!Number.isFinite(durationSec) || durationSec <= 0 || durationSec > 180 || !Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000) throw new Error('Donor-Projektion: ungültige oder zu lange Renderdauer (max. 180 s).');
  const checkCancelled = () => { if (isCancelled()) throw new DOMException('Donor-Vorschau abgebrochen.', 'AbortError'); };
  checkCancelled();
  const bodyV3 = model.bodyV3;
  const v3Compatible = donorProjectionUsesBodyV3(model);
  if (v3Compatible) {
    return renderDonorBodyV3(plan, bodyV3!, sampleRate, durationSec, { isCancelled });
  }
  const output = new Float32Array(Math.round(sampleRate * durationSec));
  // Fixed semitone grid and smooth interpolation avoid table rebuilds per sample.
  const waveBank = new Map<number, Float32Array>();
  let minKey = 128, maxKey = -128;
  for (const band of plan.bands) for (let c = 0; c < band.centerRatioCurve.length; c++) {
    if (!(band.gainCurve[c] > 0)) continue;
    const rawHz = band.centerRatioCurve[c] * plan.rootReferenceHz;
    if (!Number.isFinite(rawHz) || rawHz < 18) continue;
    // Include the audible boundary of glissandi entering from above Nyquist.
    // Rejecting their upper endpoint left interpolated frequencies without tables.
    const hz = Math.min(rawHz, sampleRate * 0.45);
    const key = Math.floor(12 * Math.log2(hz / 440) + 69);
    minKey = Math.min(minKey, key); maxKey = Math.max(maxKey, key + 1);
  }
  for (let key = minKey; key <= maxKey; key++) {
    checkCancelled();
    waveBank.set(key, table(model, 440 * 2 ** ((key - 69) / 12), sampleRate));
    if ((key - minKey) % 4 === 3) await yieldTask();
  }
  const attackModel = model.attackPartials ? { ...model, partials: model.attackPartials } : model;
  const attackBank = new Map<number, Float32Array>();
  for (const key of waveBank.keys()) {
    checkCancelled();
    attackBank.set(key, table(attackModel, 440 * 2 ** ((key - 69) / 12), sampleRate));
    if (key % 4 === 0) await yieldTask();
  }
  const modes = (model.modalPartials ?? []).filter(m => Number.isFinite(m.ratio) && m.ratio > 0 && Number.isFinite(m.amplitude) && m.amplitude > 0).slice(0, 24);
  const modalPhases = plan.bands.map((_, b) => modes.map((__, m) => ((b + 1) * (m + 1) * 0.61803398875) % 1));
  const sineTable = new Float32Array(TABLE_SIZE + 1);
  sineTable.set(harmonicBasis[0]); sineTable[TABLE_SIZE] = sineTable[0];
  const ages = plan.bands.map(() => -1);
  const phases = plan.bands.map((_, i) => (i * 0.61803398875) % 1);
  const noiseStates = plan.bands.map(() => new Float64Array(12));
  const noisePoles = Array.from({ length: 12 }, (_, i) => 1 - Math.exp(-2 * Math.PI * Math.min(sampleRate * 0.45, 40 * Math.pow(model.envelopeMaxHz / 40, (i + 1) / 12)) / sampleRate));
  const noiseWeights = model.residualBands.map((v, i) => v / Math.sqrt(Math.max(0.005, noisePoles[i] - (noisePoles[i - 1] ?? 0))));
  const noiseNorm = Math.sqrt(noiseWeights.reduce((sum, w) => sum + w * w, 0)) || 1;
  for (let i = 0; i < noiseWeights.length; i++) noiseWeights[i] /= noiseNorm;
  // Calibrate the filter bank's actual white-noise variance analytically.
  // Otherwise a breathy donor becomes much quieter simply because filters overlap.
  const coefficients = noiseWeights.map((w, i) => w - (noiseWeights[i + 1] ?? 0));
  let noiseVariance = 0;
  for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) {
    const a = noisePoles[i], b = noisePoles[j];
    noiseVariance += coefficients[i] * coefficients[j] * a * b / (3 * (1 - (1 - a) * (1 - b)));
  }
  const noiseCalibration = Math.min(12, Math.sqrt(0.5 / Math.max(1e-9, noiseVariance)));
  let seed = 0x125d0a;
  const modalPower = modes.length ? unit(model.modalAmount ?? 0) : 0;
  const modalAmount = Math.sqrt(modalPower);
  const sustainNoisePower = Math.min(1 - modalPower, unit(model.noiseAmount));
  const attackNoisePower = Math.min(1 - modalPower, unit(model.attackNoiseAmount ?? model.noiseAmount));
  const attackDuration = Math.max(0.008, Math.min(0.25, finite(model.attackDurationSec ?? 0.045)));
  const gains = plan.bands.map(() => 0);
  const smoothing = 1 - Math.exp(-1 / (sampleRate * 0.002));
  let peak = 0;
  for (let block = 0; block < output.length; block += 4096) {
    checkCancelled();
    const end = Math.min(output.length, block + 4096);
    for (let i = block; i < end; i++) {
      const p = i / Math.max(1, output.length - 1);
      let value = 0;
      for (let b = 0; b < plan.bands.length; b++) {
        const band = plan.bands[b];
        const cell = Math.min(band.gainCurve.length - 1, Math.round(p * (band.gainCurve.length - 1)));
        // Empty cells override interpolation: no tail bridges a painted pause.
        const active = (band.gainCurve[cell] ?? 0) > 0;
        const target = active ? unit(curve(band.gainCurve, p)) : 0;
        gains[b] += (target - gains[b]) * smoothing;
        if (!active) { gains[b] = 0; ages[b] = -1; continue; }
        ages[b]++;
        const x = p * Math.max(0, band.gainCurve.length - 1), x0 = Math.floor(x), x1 = Math.min(band.gainCurve.length - 1, x0 + 1);
        const continuous = band.gainCurve[x0] > 0 && band.gainCurve[x1] > 0;
        const frequency = finite((continuous ? curve(band.centerRatioCurve, p) : band.centerRatioCurve[cell]) * plan.rootReferenceHz);
        if (frequency < 18 || frequency >= sampleRate * 0.45) continue;
        phases[b] = (phases[b] + frequency / sampleRate) % 1;
        const note = 12 * Math.log2(frequency / 440) + 69, key = Math.floor(note), registerBlend = note - key;
        const sustainTone = readTable(waveBank.get(key)!, phases[b]) * (1 - registerBlend) + readTable(waveBank.get(key + 1)!, phases[b]) * registerBlend;
        const attackMix = Math.max(0, 1 - ages[b] / (sampleRate * attackDuration));
        const attackTone = attackMix > 0 ? readTable(attackBank.get(key)!, phases[b]) * (1 - registerBlend) + readTable(attackBank.get(key + 1)!, phases[b]) * registerBlend : 0;
        const tone = sustainTone * (1 - attackMix) + attackTone * attackMix;
        const noisePower = sustainNoisePower * (1 - attackMix) + attackNoisePower * attackMix;
        const noiseAmount = Math.sqrt(noisePower), toneAmount = Math.sqrt(Math.max(0, 1 - modalPower - noisePower));
        let modal = 0;
        for (let m = 0; m < modes.length; m++) {
          const hz = frequency * modes[m].ratio;
          if (hz >= sampleRate * 0.46) continue;
          modalPhases[b][m] = (modalPhases[b][m] + hz / sampleRate) % 1;
          const taper = unit((sampleRate * 0.46 - hz) / (sampleRate * 0.025));
          modal += readTable(sineTable, modalPhases[b][m]) * modes[m].amplitude * taper;
        }
        seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
        const white = (seed >>> 0) / 2147483648 - 1;
        let previousLow = 0, noise = 0;
        for (let n = 0; n < 12; n++) {
          noiseStates[b][n] += noisePoles[n] * (white - noiseStates[b][n]);
          const filtered = noiseStates[b][n];
          noise += (filtered - previousLow) * noiseWeights[n];
          previousLow = filtered;
        }
        // Carrier cell edge taper prevents clicks while retaining exact silence.
        const cellPosition = p * (band.gainCurve.length - 1);
        const edgeWidth = Math.min(0.5, 0.004 * (band.gainCurve.length - 1) / durationSec);
        const leftEdge = cell === 0 || !(band.gainCurve[cell - 1] > 0) ? unit((cellPosition - cell + 0.5) / Math.max(1e-6, edgeWidth)) : 1;
        const rightEdge = cell === band.gainCurve.length - 1 || !(band.gainCurve[cell + 1] > 0) ? unit((cell + 0.5 - cellPosition) / Math.max(1e-6, edgeWidth)) : 1;
        value += (tone * toneAmount + modal * modalAmount + noise * noiseAmount * noiseCalibration) * gains[b] * Math.min(leftEdge, rightEdge);
      }
      const edge = Math.min(1, i / (sampleRate * 0.004), (output.length - 1 - i) / (sampleRate * 0.004));
      output[i] = value * 0.65 * edge;
      peak = Math.max(peak, Math.abs(output[i]));
    }
    await yieldTask();
  }
  // Attenuation only; no normalization pumps near-silent donor/carrier material.
  if (peak > 0.9) { const scale = 0.9 / peak; for (let i = 0; i < output.length; i++) output[i] *= scale; }
  return output;
}
