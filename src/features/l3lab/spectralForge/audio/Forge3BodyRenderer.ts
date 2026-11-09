import type { AudioSourceAsset } from './AudioImporter';
import { SpectralData } from './SpectralData';
import type { Forge3PreviewField } from '../../forge3/bodyField';
import { buildCarrierPresenceInterpretationBridge } from '../interpretation/carrierPresenceInterpretationField';

/** Forge3 body buffer renderer. AudioEngine remains playback/export facade. */
export class Forge3BodyRenderer {
  constructor(private readonly getAudioContext: () => AudioContext) {}

  private getContext(): AudioContext {
    return this.getAudioContext();
  }

  renderForge3BodyPreviewToBuffer(
    sourceAsset: AudioSourceAsset,
    spectralData: SpectralData,
    forge3Field: Forge3PreviewField,
    loopDurationSec: number,
  ): AudioBuffer {
    const ctx = this.getContext();
    const sampleRate = sourceAsset.sampleRate;
    const totalSamples = Math.max(1, Math.round(Math.max(0.05, loopDurationSec) * sampleRate));
    const buffer = ctx.createBuffer(1, totalSamples, sampleRate);
    const output = buffer.getChannelData(0);

    const startSample = Math.max(0, Math.floor(sourceAsset.importStartSec * sampleRate));
    const sourceLength = Math.max(1, Math.min(sourceAsset.monoSamples.length - startSample, Math.floor(Math.max(0.05, sourceAsset.importDurationSec) * sampleRate)));
    const source = sourceAsset.monoSamples.subarray(startSample, startSample + sourceLength);
    const bridge = buildCarrierPresenceInterpretationBridge(spectralData, forge3Field);
    const { presence, interpretation } = bridge;
    const width = presence.width;
    const height = presence.height;
    const samplesPerColumn = totalSamples / Math.max(1, width);

    const hann = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * 2 * Math.max(0, Math.min(1, t)));

    for (let x = 0; x < width; x++) {
      let ampSum = 0;
      let weightSum = 0;
      let sourceTime = x / Math.max(1, width - 1);
      let sourceBand = 0.5;
      let body = 0.4;
      let air = 0.3;
      let impact = 0.15;
      let trace = 0.12;
      for (let y = 0; y < height; y++) {
        const idx = y * width + x;
        const amp = presence.energy[idx] ?? 0;
        if (amp <= 0.0005) continue;
        const sourceWeight = interpretation.sourceWeight[idx] ?? 0;
        const w = amp * (0.25 + sourceWeight * 0.75);
        ampSum += amp;
        weightSum += w;
        sourceTime += (interpretation.sourceTime[idx] ?? 0) * w;
        sourceBand += (interpretation.sourceBand[idx] ?? 0) * w;
        body += (interpretation.bodyBias[idx] ?? 0) * w;
        air += (interpretation.airBias[idx] ?? 0) * w;
        impact += (interpretation.impactBias[idx] ?? 0) * w;
        trace += (interpretation.traceBias[idx] ?? 0) * w;
      }
      const meanAmp = ampSum / Math.max(1, height * 0.12);
      const columnLevel = Math.max(0, Math.min(1, meanAmp * 5.2));
      if (columnLevel < 0.002) continue;
      if (weightSum > 1e-6) {
        sourceTime /= (1 + weightSum);
        sourceBand /= (0.5 + weightSum);
        body /= (0.4 + weightSum);
        air /= (0.3 + weightSum);
        impact /= (0.15 + weightSum);
        trace /= (0.12 + weightSum);
      }

      const grainSec = 0.018 + body * 0.06 + impact * 0.012 + trace * 0.02;
      const grainSamples = Math.max(48, Math.min(Math.round(grainSec * sampleRate), Math.round(samplesPerColumn * 2.6)));
      const outCenter = Math.round((x + 0.5) * samplesPerColumn);
      const outStart = Math.max(0, outCenter - Math.floor(grainSamples / 2));
      const srcCenter = Math.round(Math.max(0, Math.min(sourceLength - 1, sourceTime * (sourceLength - 1))));
      const srcStart = Math.max(0, Math.min(sourceLength - grainSamples - 1, srcCenter - Math.floor(grainSamples / 2)));
      const bandBrightness = Math.max(0, Math.min(1, 1 - sourceBand));
      const bodyTone = Math.max(0, Math.min(1, body - air * 0.3));
      const airy = Math.max(0, Math.min(1, air));
      const transientLift = Math.max(0, Math.min(1, impact));
      const traceMix = Math.max(0, Math.min(1, trace));
      let prev = 0;
      let lp = 0;
      for (let s = 0; s < grainSamples; s++) {
        const outIdx = outStart + s;
        const srcIdx = srcStart + s;
        if (outIdx >= totalSamples || srcIdx >= sourceLength) break;
        const raw = source[srcIdx] ?? 0;
        lp = lp + (raw - lp) * (0.08 + bodyTone * 0.18);
        const hp = raw - prev;
        prev = raw;
        const mixed = lp * (0.7 + bodyTone * 0.6) + raw * 0.18 + hp * (0.25 + airy * 0.85 + bandBrightness * 0.35 + transientLift * 0.25);
        const withTrace = mixed + hp * traceMix * 0.15;
        const env = hann(s / Math.max(1, grainSamples - 1));
        output[outIdx] += withTrace * env * columnLevel * 0.55;
      }
    }

    let maxAmp = 0;
    for (let i = 0; i < totalSamples; i++) maxAmp = Math.max(maxAmp, Math.abs(output[i]));
    if (maxAmp > 0.0001) {
      const gain = 0.9 / maxAmp;
      for (let i = 0; i < totalSamples; i++) output[i] *= gain;
    }

    return buffer;
  }

  renderForge3BodyDrivenPreviewToBuffer(
    sourceAsset: AudioSourceAsset,
    forge3Field: Forge3PreviewField,
    loopDurationSec: number,
  ): AudioBuffer {
    const ctx = this.getContext();
    const sampleRate = sourceAsset.sampleRate;
    const totalSamples = Math.max(1, Math.round(Math.max(0.05, loopDurationSec) * sampleRate));
    const buffer = ctx.createBuffer(1, totalSamples, sampleRate);
    const output = buffer.getChannelData(0);

    const width = Math.max(1, forge3Field.width || 1);
    const height = Math.max(1, forge3Field.height || 1);
    const samplesPerColumn = totalSamples / Math.max(1, width);
    const startSample = Math.max(0, Math.floor(sourceAsset.importStartSec * sampleRate));
    const sourceLength = Math.max(1, Math.min(sourceAsset.monoSamples.length - startSample, Math.floor(Math.max(0.05, sourceAsset.importDurationSec) * sampleRate)));
    const source = sourceAsset.monoSamples.subarray(startSample, startSample + sourceLength);

    const hann = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * 2 * Math.max(0, Math.min(1, t)));

    for (let x = 0; x < width; x++) {
      let bodyPresenceSum = 0;
      let weightSum = 0;
      let sourceTime = x / Math.max(1, width - 1);
      let sourceBand = 0.5;
      let body = 0.45;
      let air = 0.2;
      let impact = 0.12;
      let trace = 0.08;
      for (let y = 0; y < height; y++) {
        const idx = y * width + x;
        const mass = forge3Field.bodyMass[idx] ?? 0;
        const srcWeight = forge3Field.sourceWeight[idx] ?? 0;
        const bodyPresence = Math.max(mass, srcWeight * 0.6);
        if (bodyPresence <= 0.02) continue;
        const w = bodyPresence * (0.2 + srcWeight * 0.8);
        bodyPresenceSum += bodyPresence;
        weightSum += w;
        sourceTime += (forge3Field.sourceTime[idx] ?? 0) * w;
        sourceBand += (forge3Field.sourceBand[idx] ?? 0) * w;
        body += (forge3Field.bodyBias[idx] ?? 0) * w;
        air += (forge3Field.airBias[idx] ?? 0) * w;
        impact += (forge3Field.impactBias[idx] ?? 0) * w;
        trace += (forge3Field.traceBias[idx] ?? 0) * w;
      }
      const meanPresence = bodyPresenceSum / Math.max(1, height * 0.18);
      const columnLevel = Math.max(0, Math.min(1, meanPresence * 3.4));
      if (columnLevel < 0.012) continue;
      if (weightSum > 1e-6) {
        sourceTime /= (1 + weightSum);
        sourceBand /= (0.5 + weightSum);
        body /= (0.45 + weightSum);
        air /= (0.2 + weightSum);
        impact /= (0.12 + weightSum);
        trace /= (0.08 + weightSum);
      }

      const grainSec = 0.024 + body * 0.05 + air * 0.02 + impact * 0.014 + trace * 0.015;
      const grainSamples = Math.max(64, Math.min(Math.round(grainSec * sampleRate), Math.round(samplesPerColumn * 3.2)));
      const outCenter = Math.round((x + 0.5) * samplesPerColumn);
      const outStart = Math.max(0, outCenter - Math.floor(grainSamples / 2));
      const srcCenter = Math.round(Math.max(0, Math.min(sourceLength - 1, sourceTime * (sourceLength - 1))));
      const srcStart = Math.max(0, Math.min(sourceLength - grainSamples - 1, srcCenter - Math.floor(grainSamples / 2)));
      const bandBrightness = Math.max(0, Math.min(1, 1 - sourceBand));
      const bodyTone = Math.max(0, Math.min(1, body - air * 0.18));
      const airy = Math.max(0, Math.min(1, air));
      const transientLift = Math.max(0, Math.min(1, impact));
      const traceMix = Math.max(0, Math.min(1, trace));
      let prev = 0;
      let lp = 0;
      for (let s = 0; s < grainSamples; s++) {
        const outIdx = outStart + s;
        const srcIdx = srcStart + s;
        if (outIdx >= totalSamples || srcIdx >= sourceLength) break;
        const raw = source[srcIdx] ?? 0;
        lp = lp + (raw - lp) * (0.06 + bodyTone * 0.22);
        const hp = raw - prev;
        prev = raw;
        let signal = lp * (0.72 + bodyTone * 0.55);
        signal += raw * (0.12 + bandBrightness * 0.16);
        signal += hp * (0.18 + airy * 0.7 + transientLift * 0.35);
        signal += (Math.random() * 2 - 1) * airy * 0.06;
        signal += hp * traceMix * 0.12;
        const env = hann(s / Math.max(1, grainSamples - 1));
        output[outIdx] += signal * env * columnLevel * 0.7;
      }
    }

    let maxAmp = 0;
    for (let i = 0; i < totalSamples; i++) maxAmp = Math.max(maxAmp, Math.abs(output[i]));
    if (maxAmp > 0.0001) {
      const gain = 0.9 / maxAmp;
      for (let i = 0; i < totalSamples; i++) output[i] *= gain;
    }

    return buffer;
  }
}
