// Frozen Patch 131 renderer: independent numerical regression oracle, never imported by the app.
import type { ProjectionCarrierPlan } from '../../../src/features/l3lab/spectralForge/donorV2/projectionCarrierPlan';
import type { DonorBodyFrame, DonorBodyV3Model } from '../../../src/features/l3lab/spectralForge/donorV3/donorBodyModel';

const TABLE_SIZE = 512;
const PARTIAL_CAPS = [64, 32, 16, 8, 4, 2, 1];
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, Number.isFinite(value) ? value : 0));
const readCurve = (values: number[], p: number) => {
  const x = p * Math.max(0, values.length - 1), i = Math.floor(x), a = values[i] ?? 0, b = values[Math.min(values.length - 1, i + 1)] ?? a;
  return a + (b - a) * (x - i);
};
const readTable = (table: Float32Array, phase: number) => {
  const p = phase * TABLE_SIZE, i = Math.floor(p), mix = p - i;
  return table[i] + (table[i + 1] - table[i]) * mix;
};
const yieldTask = () => new Promise<void>(resolve => setTimeout(resolve, 0));

function partialCap(frequency: number, sampleRate: number) {
  const useful = Math.max(1, Math.floor(sampleRate * 0.46 / Math.max(18, frequency)));
  return PARTIAL_CAPS.find(cap => cap <= useful) ?? 1;
}

function formantEnvelopeAt(frame: DonorBodyFrame, model: DonorBodyV3Model, hz: number) {
  const values = frame.formantEnvelope;
  if (!values?.length || !(model.formantMaxHz > model.formantMinHz)) return 1;
  const position = clamp(
    Math.log(Math.max(model.formantMinHz, hz) / model.formantMinHz) /
      Math.log(model.formantMaxHz / model.formantMinHz) * values.length - 0.5,
    0,
    values.length - 1,
  );
  const index = Math.floor(position), mix = position - index;
  const a = values[index] ?? 1, b = values[Math.min(values.length - 1, index + 1)] ?? a;
  return Math.max(0.008, a + (b - a) * mix);
}

function buildTable(frame: DonorBodyFrame, model: DonorBodyV3Model, cap: number, targetFrequency: number) {
  const table = new Float32Array(TABLE_SIZE + 1);
  const sourceFrequency = frame.f0Hz > 0 ? frame.f0Hz : model.referenceHz;
  const formantLock = clamp(0.72 + model.voiceIdentityConfidence * 0.24, 0.72, 0.96);
  for (let harmonic = 1; harmonic <= Math.min(cap, frame.harmonicAmplitudes.length); harmonic++) {
    const baseAmplitude = frame.harmonicAmplitudes[harmonic - 1] ?? 0;
    if (baseAmplitude < 1e-7) continue;
    const sourceHz = Math.max(1, sourceFrequency * harmonic);
    const targetHz = Math.max(1, targetFrequency * harmonic);
    const sourceEnvelope = formantEnvelopeAt(frame, model, sourceHz);
    const targetEnvelope = formantEnvelopeAt(frame, model, targetHz);
    const rawRatio = clamp(targetEnvelope / Math.max(0.008, sourceEnvelope), 0.12, 8);
    // Blend in log space: 0 = old harmonic-index timbre, 1 = strict
    // absolute-frequency formant lock. Strong voiced donors approach 0.96.
    const amplitude = baseAmplitude * Math.exp(Math.log(rawRatio) * formantLock);
    const phase = frame.harmonicPhases[harmonic - 1] ?? 0;
    for (let i = 0; i < TABLE_SIZE; i++) table[i] += amplitude * Math.sin(2 * Math.PI * harmonic * i / TABLE_SIZE + phase);
  }
  let power = 0;
  for (let i = 0; i < TABLE_SIZE; i++) power += table[i] * table[i];
  const scale = Math.sqrt(power / TABLE_SIZE) || 1;
  for (let i = 0; i < TABLE_SIZE; i++) table[i] /= scale;
  table[TABLE_SIZE] = table[0];
  return table;
}

function frameIndexAt(model: DonorBodyV3Model, age: number, sourceTimeline: boolean) {
  let time = age;
  if (!sourceTimeline && time > model.attackEndSec) {
    const span = Math.max(model.frameHopSec, model.sustainEndSec - model.sustainStartSec);
    time = model.sustainStartSec + ((time - model.attackEndSec) % span + span) % span;
  }
  const index = model.frameHopSec > 0 ? Math.round(time / model.frameHopSec) : 0;
  return Math.max(0, Math.min(model.frames.length - 1, index));
}

export function donorBodyV3CanRender(model: DonorBodyV3Model | undefined): model is DonorBodyV3Model {
  return !!model && model.frames.length > 0 && model.referenceHz >= 35 && model.voicedFrameRatio >= 0.3;
}

export async function renderDonorBodyV3(
  plan: ProjectionCarrierPlan, model: DonorBodyV3Model, sampleRate: number, durationSec: number,
  options: { sourceTimeline?: boolean; isCancelled?: () => boolean } = {},
) {
  const totalSamples = Math.max(1, Math.round(sampleRate * durationSec));
  const output = new Float32Array(totalSamples);
  const phases = plan.bands.map((_, index) => index * 0.173 % 1);
  const ages = plan.bands.map(() => -1);
  const smoothedGain = plan.bands.map(() => 0);
  const noiseStates = plan.bands.map(() => new Float64Array(8));
  const poles = Array.from({ length: 8 }, (_, band) => 1 - Math.exp(-2 * Math.PI * Math.min(sampleRate * 0.44, 80 * 2 ** band) / sampleRate));
  const tables = new Map<string, Float32Array>();
  const tableFor = (frameIndex: number, cap: number, midiKey: number) => {
    const key = `${frameIndex}:${cap}:${midiKey}`;
    let table = tables.get(key);
    if (!table) {
      const targetFrequency = 440 * 2 ** ((midiKey - 69) / 12);
      table = buildTable(model.frames[frameIndex], model, cap, targetFrequency);
      tables.set(key, table);
      // Render jobs are short, but long glissando drawings can otherwise retain
      // thousands of transient wavetable variants. Keep a bounded local cache.
      if (tables.size > 1536) tables.delete(tables.keys().next().value!);
    }
    return table;
  };
  const smoothing = 1 - Math.exp(-1 / (sampleRate * 0.0025));
  let seed = 0x71b3ac9, peak = 0;
  for (let block = 0; block < totalSamples; block += 4096) {
    if (options.isCancelled?.()) throw new DOMException('Donor-Vorschau abgebrochen.', 'AbortError');
    const end = Math.min(totalSamples, block + 4096);
    for (let i = block; i < end; i++) {
      const p = i / Math.max(1, totalSamples - 1), time = i / sampleRate;
      let mixed = 0;
      for (let voice = 0; voice < plan.bands.length; voice++) {
        const band = plan.bands[voice];
        const cell = Math.min(band.gainCurve.length - 1, Math.round(p * Math.max(0, band.gainCurve.length - 1)));
        const active = (band.gainCurve[cell] ?? 0) > 0;
        if (!active) { ages[voice] = -1; smoothedGain[voice] = 0; noiseStates[voice].fill(0); continue; }
        if (ages[voice] < 0) { ages[voice] = 0; phases[voice] = voice * 0.173 % 1; } else ages[voice]++;
        const age = options.sourceTimeline ? time : ages[voice] / sampleRate;
        const frameIndex = frameIndexAt(model, age, !!options.sourceTimeline);
        const frame = model.frames[frameIndex];
        const frequency = readCurve(band.centerRatioCurve, p) * plan.rootReferenceHz;
        if (!Number.isFinite(frequency) || frequency < 18 || frequency >= sampleRate * 0.46) continue;
        phases[voice] = (phases[voice] + frequency / sampleRate) % 1;
        const targetGain = clamp(readCurve(band.gainCurve, p), 0, 1) * (options.sourceTimeline ? frame.relativeLevel : 1);
        smoothedGain[voice] += (targetGain - smoothedGain[voice]) * smoothing;
        const note = 12 * Math.log2(frequency / 440) + 69;
        const key = Math.floor(note), keyMix = note - key;
        const cap = partialCap(frequency, sampleRate);
        const toneA = readTable(tableFor(frameIndex, cap, key), phases[voice]);
        const toneB = readTable(tableFor(frameIndex, cap, key + 1), phases[voice]);
        const tone = toneA + (toneB - toneA) * keyMix;
        seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
        const white = (seed >>> 0) / 2147483648 - 1;
        let previous = 0, noise = 0;
        for (let n = 0; n < 8; n++) {
          noiseStates[voice][n] += poles[n] * (white - noiseStates[voice][n]);
          noise += (noiseStates[voice][n] - previous) * (frame.noiseBands[n] ?? 0);
          previous = noiseStates[voice][n];
        }
        const aperiodicity = clamp(frame.aperiodicity, 0, 0.32);
        mixed += (tone * Math.sqrt(1 - aperiodicity) + noise * Math.sqrt(aperiodicity) * 0.45) * smoothedGain[voice];
      }
      const edge = Math.min(1, i / Math.max(1, sampleRate * 0.004), (totalSamples - 1 - i) / Math.max(1, sampleRate * 0.004));
      output[i] = mixed * 0.42 * edge;
      peak = Math.max(peak, Math.abs(output[i]));
    }
    await yieldTask();
  }
  if (peak > 0.9) { const scale = 0.9 / peak; for (let i = 0; i < output.length; i++) output[i] *= scale; }
  return output;
}

export function buildDonorReferencePlan(model: DonorBodyV3Model, transposeRatio = 1): ProjectionCarrierPlan {
  const frames = model.frames;
  return { rootReferenceHz: 1, bands: [{
    centerRatioCurve: frames.map(frame => (frame.f0Hz || model.referenceHz) * transposeRatio),
    gainCurve: frames.map(frame => frame.f0Hz > 0 ? 0.72 : 0),
  }] };
}

export async function renderDonorBodyV3Reference(
  model: DonorBodyV3Model, sampleRate: number, transposeRatio = 1,
  isCancelled: () => boolean = () => false,
) {
  const output = await renderDonorBodyV3(buildDonorReferencePlan(model, transposeRatio), model, sampleRate, model.eventDurationSec, { sourceTimeline: true, isCancelled });
  // The A/B lane must compare timbre, not loudness. Match the selected event's
  // RMS after synthesis while retaining peak headroom and a bounded correction.
  let power = 0, peak = 0;
  for (const sample of output) { power += sample * sample; peak = Math.max(peak, Math.abs(sample)); }
  const outputRms = Math.sqrt(power / Math.max(1, output.length));
  const targetRms = clamp(model.sourceRms, 0, 0.45);
  const rmsScale = clamp(targetRms / Math.max(1e-9, outputRms), 0.25, 4);
  const scale = Math.min(rmsScale, peak > 0 ? 0.9 / peak : 1);
  if (Math.abs(scale - 1) > 1e-6) for (let i = 0; i < output.length; i++) output[i] *= scale;
  return output;
}
