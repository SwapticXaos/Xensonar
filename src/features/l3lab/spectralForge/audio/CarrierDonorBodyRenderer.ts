import { extractSpectralSkeleton } from '../carrierV2/extractSpectralSkeleton';
import { prepareDonorProjection, renderDonorProjection } from '../donorV2/donorProjection';
import type { DonorProjectionModel } from '../donorV2/donorProjection';
import { donorBodyV3CanRender, renderDonorBodyV3Reference } from '../donorV3/renderDonorBodyV3';
import { buildProjectionCarrierPlan } from '../donorV2/projectionCarrierPlan';
import { SpectralData, yToFrequency } from './SpectralData';
import type { AudioSourceAsset } from './AudioImporter';
import type { MediatedAudioBody } from '../body/mediatedAudioBodyTypes';
import type { AnchorBindingPreview, CarrierAnchor, CarrierSpectralSkeleton, DonorTimbreAtlas, DonorTimbreCell } from '../types/carrierDonorV2Types';
import type { MaterialAllocationPreview, MaterialCell, MaterialField } from '../types/gestaltMaterialField';
import type { TransferProfile } from '../types/transferProfile';
import type { WaveformMix } from '../state/storeTypes';
import { mixedWaveform, squareWave, triangleWave } from './audioWaveforms';
import { normalizeMonoAudioBufferInPlace } from './audioBufferMath';

/**
 * Stateless-ish Carrier/Donor and mediated-body buffer renderer.
 * AudioEngine remains the public facade and owns AudioContext/playback lifetime.
 */
export class CarrierDonorBodyRenderer {
  constructor(private readonly getAudioContext: () => AudioContext) {}

  private getContext(): AudioContext {
    return this.getAudioContext();
  }

  private hash01(seed: number): number {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453123;
    return x - Math.floor(x);
  }

  renderCarrierDonorV2TextureOverlayToBuffer(
    skeleton: CarrierSpectralSkeleton,
    materialAllocationPreview: MaterialAllocationPreview,
    materialField: MaterialField,
    donorSourceAsset: AudioSourceAsset,
    loopDurationSec: number,
    transferProfile: TransferProfile,
  ): AudioBuffer {
    const ctx = this.getContext();
    const sampleRate = ctx.sampleRate;
    const totalSamples = Math.max(1, Math.round(Math.max(0.05, loopDurationSec) * sampleRate));
    const buffer = ctx.createBuffer(1, totalSamples, sampleRate);
    const output = buffer.getChannelData(0);

    const width = Math.max(1, skeleton.width || 1);
    const samplesPerColumn = totalSamples / width;
    const allocationsByTime = new Map(materialAllocationPreview.allocations.map((allocation) => [allocation.timeIndex, allocation]));
    const cellById = new Map(materialField.cells.map((cell) => [cell.id, cell]));

    const donorSampleRate = donorSourceAsset.sampleRate;
    const startSample = Math.max(0, Math.floor(donorSourceAsset.importStartSec * donorSampleRate));
    const sourceLength = Math.max(1, Math.min(
      donorSourceAsset.monoSamples.length - startSample,
      Math.floor(Math.max(0.05, donorSourceAsset.importDurationSec) * donorSampleRate)
    ));
    const source = donorSourceAsset.monoSamples.subarray(startSample, startSample + sourceLength);
    const detail = transferProfile.detail;

    const hann = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * 2 * Math.max(0, Math.min(1, t)));
    const registerReferenceHz = (register: MaterialCell['register']) => {
      switch (register) {
        case 'low':
          return 140;
        case 'high':
          return 1600;
        case 'mid':
        default:
          return 520;
      }
    };
    const sampleDonor = (position: number) => {
      if (sourceLength <= 1) return 0;
      const clamped = Math.max(0, Math.min(sourceLength - 1, position));
      const i0 = Math.floor(clamped);
      const i1 = Math.min(sourceLength - 1, i0 + 1);
      const frac = clamped - i0;
      const a = source[i0] ?? 0;
      const b = source[i1] ?? 0;
      return a + (b - a) * frac;
    };

    for (let x = 0; x < width; x += 1) {
      const allocation = allocationsByTime.get(x);
      const anchors = skeleton.anchorsByTime[x] ?? [];
      if (!allocation || !anchors.length) continue;

      const slotEnergy = anchors.reduce((sum, anchor) => sum + Math.max(0, anchor.energy), 0) / Math.max(1, anchors.length);
      const slotContinuity = anchors.reduce((sum, anchor) => sum + Math.max(0, anchor.continuity), 0) / Math.max(1, anchors.length);
      const slotLevel = Math.max(0.04, Math.min(1, slotEnergy * (1.6 + detail.anchorFocus * 0.45) + slotContinuity * (0.18 + detail.continuityFidelity * 0.1)));
      const center = Math.round((x + 0.5) * samplesPerColumn);
      const donorLoad = Math.max(0.12, Math.min(1, detail.resonanceLoad * 0.34 + detail.residualLoad * 0.28 + detail.transientLoad * 0.18 + detail.microModulationLoad * 0.2));

      for (let ci = 0; ci < allocation.cellIds.length; ci += 1) {
        const cellId = allocation.cellIds[ci]!;
        const cell = cellById.get(cellId);
        const weight = allocation.weights[ci] ?? 0;
        if (!cell || weight <= 0.0005) continue;

        const leak = Math.max(0, Math.min(1,
          cell.sequenceRecoverability * (0.28 + detail.sequenceDecoupling * 0.34) +
          cell.prosodicTrace * (0.24 + detail.prosodySuppression * 0.42) +
          cell.cellEntanglement * (0.18 + detail.cellDisentanglement * 0.26) +
          cell.sequenceRecoverability * detail.orderednessPenalty * 0.12
        ));
        const donorPurity = Math.max(0, 1 - leak);
        const spreadFactor = 0.72 + detail.bandwidthSpread * 1.4 + detail.zoneCoupling * 0.28;
        const kindDuration = cell.kind === 'transient'
          ? 0.014
          : cell.kind === 'residual'
            ? 0.034
            : cell.kind === 'resonant'
              ? 0.05
              : cell.kind === 'ordered'
                ? 0.028
                : 0.026;
        const grainSec = Math.max(0.01, kindDuration * (0.8 + donorPurity * 0.55 + donorLoad * 0.95) * spreadFactor);
        const grainSamples = Math.max(28, Math.min(Math.round(grainSec * sampleRate), Math.round(samplesPerColumn * (1.55 + detail.zoneCoupling * 2.2))));
        const grainCountBase = cell.kind === 'residual' ? 4 : cell.kind === 'transient' ? 3 : cell.kind === 'resonant' ? 4 : 3;
        const grainCount = Math.max(2, Math.min(9, Math.round(grainCountBase + donorLoad * 3.6 + detail.zoneCoupling * 2.2)));

        const avgCenterBin = anchors.reduce((sum, anchor) => sum + anchor.centerBin, 0) / Math.max(1, anchors.length);
        const brightness = Math.max(0.05, Math.min(1, 1 - avgCenterBin / Math.max(1, skeleton.height - 1)));
        const resonance = Math.max(0, Math.min(1, (cell.resonanceProfile[Math.floor(cell.resonanceProfile.length * 0.68)] ?? 0.2) * (0.45 + detail.resonanceLoad * 1.15)));
        const residual = Math.max(0, Math.min(1, (cell.residualProfile[Math.floor(cell.residualProfile.length * 0.5)] ?? 0.15) * (0.38 + detail.residualLoad * 1.25)));
        const transient = Math.max(0, Math.min(1, (cell.transientProfile[0] ?? 0.12) * (0.42 + detail.transientLoad * 1.18)));
        const micro = Math.max(0, Math.min(1, detail.microModulationLoad * (0.35 + resonance * 0.22 + residual * 0.18)));
        const registerHz = registerReferenceHz(cell.register);

        for (let g = 0; g < grainCount; g += 1) {
          const seed = (x + 1) * 971 + (ci + 1) * 311 + (g + 1) * 17;
          const randA = this.hash01(seed + 0.123);
          const randB = this.hash01(seed + 0.731);
          const randC = this.hash01(seed + 1.217);
          const randD = this.hash01(seed + 2.019);

          const anchor = anchors[Math.min(anchors.length - 1, Math.floor(randD * anchors.length))] ?? anchors[0]!;
          const anchorFreq = Math.max(28, Math.min(14000, anchor.centerHz));
          const pitchWarp = Math.max(0.28, Math.min(4.5, (anchorFreq / Math.max(60, registerHz)) * (0.82 + detail.inharmonicFreedom * 0.85 + randC * 0.12)));
          const donorStep = (donorSampleRate / sampleRate) * pitchWarp;
          const donorGrainSamples = Math.max(12, Math.round(grainSamples * donorStep));

          const srcCenter = Math.round(randA * Math.max(0, sourceLength - 1));
          const donorStart = Math.max(0, Math.min(Math.max(0, sourceLength - donorGrainSamples - 1), srcCenter - Math.floor(donorGrainSamples / 2)));
          const outJitter = Math.round((randB - 0.5) * grainSamples * (0.9 + detail.zoneCoupling * 0.8));
          const outStart = Math.max(0, Math.min(totalSamples - 1, center - Math.floor(grainSamples / 2) + outJitter));
          const phaseOffset = randC * Math.PI * 2;

          let lp = 0;
          let prev = 0;
          let energyFollower = 0;
          for (let s = 0; s < grainSamples; s += 1) {
            const outIdx = outStart + s;
            if (outIdx >= totalSamples) break;

            const donorPos = donorStart + s * donorStep;
            const raw = sampleDonor(donorPos);
            const absRaw = Math.abs(raw);
            energyFollower += (absRaw - energyFollower) * (0.03 + donorPurity * 0.04 + resonance * 0.02);
            const lpCoef = 0.028 + resonance * 0.15 + donorPurity * 0.05;
            lp += (raw - lp) * lpCoef;
            const hp = raw - prev;
            prev = raw;

            const t = outIdx / sampleRate;
            const env = hann(s / Math.max(1, grainSamples - 1));
            const transientEnv = Math.exp(-s / Math.max(10, grainSamples * (0.16 + transient * 0.24)));
            const carrierPhase = 2 * Math.PI * anchorFreq * t + phaseOffset;
            const carrierWave = mixedWaveform(carrierPhase + lp * (0.18 + resonance * 0.42), {
              sine: 1,
              sawtooth: 0.12 + brightness * 0.16 + resonance * 0.18,
              triangle: 0.26 + detail.verticalFidelity * 0.16,
              square: 0.05 + transient * 0.18,
            });
            const overtoneWave = triangleWave(2 * Math.PI * anchorFreq * (1.7 + detail.inharmonicFreedom * 0.95 + randD * 0.28) * t + hp * 0.08);
            const directGrain = raw * (0.16 + donorLoad * 0.44 + donorPurity * 0.12);
            const resonantSignal = carrierWave * (0.18 + energyFollower * 1.15 + Math.tanh(lp * 2.8) * 0.2);
            const residualSignal = hp * (0.38 + residual * 1.2) + (Math.random() * 2 - 1) * residual * 0.045;
            const transientSignal = squareWave(2 * Math.PI * anchorFreq * (1.18 + transient * 0.72) * t + phaseOffset) * Math.tanh(hp * 3.8) * transientEnv;
            const shimmerSignal = overtoneWave * (0.04 + micro * 0.2 + resonance * 0.08);

            let signal = 0;
            switch (cell.kind) {
              case 'resonant':
                signal += directGrain * 0.26;
                signal += resonantSignal * (0.74 + resonance * 0.36);
                signal += shimmerSignal * 0.5;
                signal += residualSignal * 0.18;
                break;
              case 'residual':
                signal += directGrain * 0.22;
                signal += residualSignal * (0.82 + residual * 0.44);
                signal += resonantSignal * 0.22;
                signal += transientSignal * 0.16;
                break;
              case 'transient':
                signal += directGrain * 0.18;
                signal += transientSignal * (0.88 + transient * 0.52);
                signal += residualSignal * 0.26;
                signal += resonantSignal * 0.14;
                break;
              case 'ordered':
                signal += directGrain * 0.24;
                signal += resonantSignal * (0.56 + resonance * 0.24);
                signal += shimmerSignal * 0.32;
                signal += transientSignal * 0.12;
                break;
              case 'mixed':
              default:
                signal += directGrain * 0.24;
                signal += resonantSignal * 0.34;
                signal += residualSignal * 0.3;
                signal += transientSignal * 0.18;
                signal += shimmerSignal * 0.18;
                break;
            }

            const localGain = weight * slotLevel * (0.22 + donorLoad * 0.58 + donorPurity * 0.14);
            output[outIdx] += signal * env * localGain;
          }
        }
      }
    }

    return normalizeMonoAudioBufferInPlace(buffer, 0.92);
  }

  private renderSourceFirstBodyToBuffer(
    body: MediatedAudioBody,
    sourceAsset: AudioSourceAsset,
    loopDurationSec: number,
  ): AudioBuffer {
    const ctx = this.getContext();
    const sampleRate = sourceAsset.sampleRate;
    const totalSamples = Math.max(1, Math.round(Math.max(0.05, loopDurationSec) * sampleRate));
    const buffer = ctx.createBuffer(1, totalSamples, sampleRate);
    const output = buffer.getChannelData(0);

    const width = Math.max(1, body.resolution.width || 1);
    const height = Math.max(1, body.resolution.height || 1);
    const samplesPerColumn = totalSamples / Math.max(1, width);
    const startSample = Math.max(0, Math.floor(sourceAsset.importStartSec * sampleRate));
    const sourceLength = Math.max(1, Math.min(sourceAsset.monoSamples.length - startSample, Math.floor(Math.max(0.05, sourceAsset.importDurationSec) * sampleRate)));
    const source = sourceAsset.monoSamples.subarray(startSample, startSample + sourceLength);

    const shapeMask = body.shapeMask;
    const materialMass = body.materialMass;
    const sourceTimeField = body.provenance.sourceTime;
    const sourceBandField = body.provenance.sourceBand;
    const sourceWeightField = body.provenance.sourceWeight;
    const bodyBiasField = body.materialCharacter.bodyBias;
    const airBiasField = body.materialCharacter.airBias;
    const impactBiasField = body.materialCharacter.impactBias;
    const traceBiasField = body.materialCharacter.traceBias;

    const hann = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * 2 * Math.max(0, Math.min(1, t)));

    for (let x = 0; x < width; x++) {
      let bodyPresenceSum = 0;
      let weightSum = 0;
      let sourceTime = x / Math.max(1, width - 1);
      let sourceBand = 0.5;
      let bodyBias = 0.45;
      let airBias = 0.2;
      let impactBias = 0.12;
      let traceBias = 0.08;
      for (let y = 0; y < height; y++) {
        const idx = y * width + x;
        const shape = shapeMask[idx] ?? 0;
        const mass = materialMass[idx] ?? 0;
        const srcWeight = sourceWeightField[idx] ?? 0;
        const presence = Math.max(mass, srcWeight * 0.6, shape * 0.32);
        if (presence <= 0.02) continue;
        const w = presence * (0.18 + srcWeight * 0.72 + shape * 0.1);
        bodyPresenceSum += presence;
        weightSum += w;
        sourceTime += (sourceTimeField[idx] ?? 0) * w;
        sourceBand += (sourceBandField[idx] ?? 0) * w;
        bodyBias += (bodyBiasField[idx] ?? 0) * w;
        airBias += (airBiasField[idx] ?? 0) * w;
        impactBias += (impactBiasField[idx] ?? 0) * w;
        traceBias += (traceBiasField[idx] ?? 0) * w;
      }
      const meanPresence = bodyPresenceSum / Math.max(1, height * 0.18);
      const columnLevel = Math.max(0, Math.min(1, meanPresence * 3.2));
      if (columnLevel < 0.012) continue;
      if (weightSum > 1e-6) {
        sourceTime /= (1 + weightSum);
        sourceBand /= (0.5 + weightSum);
        bodyBias /= (0.45 + weightSum);
        airBias /= (0.2 + weightSum);
        impactBias /= (0.12 + weightSum);
        traceBias /= (0.08 + weightSum);
      }

      const grainSec = 0.022 + bodyBias * 0.048 + airBias * 0.018 + impactBias * 0.014 + traceBias * 0.014;
      const grainSamples = Math.max(64, Math.min(Math.round(grainSec * sampleRate), Math.round(samplesPerColumn * 3.4)));
      const outCenter = Math.round((x + 0.5) * samplesPerColumn);
      const outStart = Math.max(0, outCenter - Math.floor(grainSamples / 2));
      const srcCenter = Math.round(Math.max(0, Math.min(sourceLength - 1, sourceTime * (sourceLength - 1))));
      const srcStart = Math.max(0, Math.min(sourceLength - grainSamples - 1, srcCenter - Math.floor(grainSamples / 2)));
      const bandBrightness = Math.max(0, Math.min(1, 1 - sourceBand));
      const bodyTone = Math.max(0, Math.min(1, bodyBias - airBias * 0.18));
      const airy = Math.max(0, Math.min(1, airBias));
      const transientLift = Math.max(0, Math.min(1, impactBias));
      const traceMix = Math.max(0, Math.min(1, traceBias));
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

    return normalizeMonoAudioBufferInPlace(buffer);
  }

  private renderFormFirstBodyToBuffer(
    body: MediatedAudioBody,
    loopDurationSec: number,
    donorSourceAsset?: AudioSourceAsset | null,
  ): AudioBuffer {
    const ctx = this.getContext();
    const sampleRate = ctx.sampleRate;
    const totalSamples = Math.max(1, Math.round(Math.max(0.05, loopDurationSec) * sampleRate));
    const buffer = ctx.createBuffer(1, totalSamples, sampleRate);
    const output = buffer.getChannelData(0);

    const width = Math.max(1, body.resolution.width || 1);
    const height = Math.max(1, body.resolution.height || 1);
    const samplesPerColumn = totalSamples / Math.max(1, width);
    const shapeMask = body.shapeMask;
    const materialMass = body.materialMass;
    const grainField = body.grain;
    const bodyBiasField = body.materialCharacter.bodyBias;
    const airBiasField = body.materialCharacter.airBias;
    const impactBiasField = body.materialCharacter.impactBias;
    const traceBiasField = body.materialCharacter.traceBias;
    const sourceBandField = body.provenance.sourceBand;

    const donorStartSample = donorSourceAsset
      ? Math.max(0, Math.floor(donorSourceAsset.importStartSec * donorSourceAsset.sampleRate))
      : 0;
    const donorLengthSamples = donorSourceAsset
      ? Math.max(1, Math.min(
          donorSourceAsset.monoSamples.length - donorStartSample,
          Math.floor(Math.max(0.05, donorSourceAsset.importDurationSec) * donorSourceAsset.sampleRate),
        ))
      : 0;
    const donorSource = donorSourceAsset
      ? donorSourceAsset.monoSamples.subarray(donorStartSample, donorStartSample + donorLengthSamples)
      : null;
    const donorLength = donorSource?.length ?? 0;
    const donorSampleRate = donorSourceAsset?.sampleRate ?? sampleRate;

    const hann = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * 2 * Math.max(0, Math.min(1, t)));
    const sampleDonor = (position: number) => {
      if (!donorSource || donorLength <= 1) return 0;
      const clamped = Math.max(0, Math.min(donorLength - 1, position));
      const i0 = Math.floor(clamped);
      const i1 = Math.min(donorLength - 1, i0 + 1);
      const frac = clamped - i0;
      const a = donorSource[i0] ?? 0;
      const b = donorSource[i1] ?? 0;
      return a + (b - a) * frac;
    };

    for (let x = 0; x < width; x++) {
      let energySum = 0;
      let weightSum = 0;
      let yIndex = height * 0.55;
      let grain = 0.45;
      let bodyBias = 0.4;
      let airBias = 0.24;
      let impactBias = 0.16;
      let traceBias = 0.08;
      for (let y = 0; y < height; y++) {
        const idx = y * width + x;
        const shape = shapeMask[idx] ?? 0;
        const mass = materialMass[idx] ?? 0;
        const presence = Math.max(shape * 0.72 + mass * 0.48, mass * 0.64);
        if (presence <= 0.01) continue;
        const grainValue = grainField?.[idx] ?? 0.5;
        const bodyValue = bodyBiasField[idx] ?? shape * 0.45;
        const airValue = airBiasField[idx] ?? presence * 0.16;
        const impactValue = impactBiasField[idx] ?? presence * 0.12;
        const traceValue = traceBiasField[idx] ?? presence * 0.06;
        const bandNorm = sourceBandField[idx] ?? (height <= 1 ? 0.5 : y / Math.max(1, height - 1));
        const weight = presence * (0.4 + grainValue * 0.35 + impactValue * 0.25);
        energySum += presence;
        weightSum += weight;
        yIndex += (y * 0.75 + bandNorm * (height - 1) * 0.25) * weight;
        grain += grainValue * weight;
        bodyBias += bodyValue * weight;
        airBias += airValue * weight;
        impactBias += impactValue * weight;
        traceBias += traceValue * weight;
      }

      const columnLevel = Math.max(0, Math.min(1, energySum / Math.max(1, height * 0.16) * 3.4));
      if (columnLevel < 0.01) continue;
      if (weightSum > 1e-6) {
        yIndex /= (height * 0.55 + weightSum);
        grain /= (0.45 + weightSum);
        bodyBias /= (0.4 + weightSum);
        airBias /= (0.24 + weightSum);
        impactBias /= (0.16 + weightSum);
        traceBias /= (0.08 + weightSum);
      }

      const binY = Math.max(0, Math.min(height - 1, Math.round(yIndex)));
      const baseFreq = Math.max(30, Math.min(12000, yToFrequency(binY, height)));
      const grainSec = 0.018 + grain * 0.075 + airBias * 0.018 + traceBias * 0.012;
      const grainSamples = Math.max(64, Math.min(Math.round(grainSec * sampleRate), Math.round(samplesPerColumn * 3.2)));
      const center = Math.round((x + 0.5) * samplesPerColumn);
      const start = Math.max(0, center - Math.floor(grainSamples / 2));

      if (donorSource && donorLength > 1) {
        const donorCenterNorm = width <= 1 ? 0.5 : x / Math.max(1, width - 1);
        const donorCenter = donorCenterNorm * Math.max(0, donorLength - 1);
        const donorGrainSamples = Math.max(16, Math.round(grainSamples * (donorSampleRate / sampleRate)));
        const donorStart = Math.max(0, Math.min(Math.max(0, donorLength - donorGrainSamples - 1), donorCenter - Math.floor(donorGrainSamples / 2)));
        const donorStep = donorGrainSamples / Math.max(1, grainSamples);
        const bodyTone = Math.max(0, Math.min(1, bodyBias - airBias * 0.12));
        const airy = Math.max(0, Math.min(1, airBias));
        const transientLift = Math.max(0, Math.min(1, impactBias));
        const traceMix = Math.max(0, Math.min(1, traceBias));
        const brightness = 1 - binY / Math.max(1, height - 1);
        let prev = 0;
        let lp = 0;
        for (let s = 0; s < grainSamples; s++) {
          const outIdx = start + s;
          if (outIdx >= totalSamples) break;
          const donorPos = donorStart + s * donorStep;
          const raw = sampleDonor(donorPos);
          lp = lp + (raw - lp) * (0.045 + bodyTone * 0.18 + (1 - grain) * 0.05);
          const hp = raw - prev;
          prev = raw;
          let signal = lp * (0.7 + bodyTone * 0.5);
          signal += raw * (0.12 + brightness * 0.18);
          signal += hp * (0.12 + airy * 0.55 + transientLift * 0.25);
          signal += hp * traceMix * 0.1;
          signal += (Math.random() * 2 - 1) * airy * 0.035;
          const env = hann(s / Math.max(1, grainSamples - 1));
          output[outIdx] += signal * env * columnLevel * 0.78;
        }
        continue;
      }

      const overtone = baseFreq * (1.25 + bodyBias * 0.8 + traceBias * 0.45);
      const shimmer = baseFreq * (1.98 + airBias * 0.7);
      const fmDepth = 0.1 + impactBias * 0.28 + traceBias * 0.08;
      const noiseMix = Math.max(0, Math.min(1, airBias * 0.7 + (1 - grain) * 0.22));
      const bodyMix = Math.max(0, Math.min(1, 0.4 + bodyBias * 0.85));
      const overtoneMix = Math.max(0, Math.min(1, 0.15 + grain * 0.3 + traceBias * 0.22));
      const shimmerMix = Math.max(0, Math.min(1, 0.04 + airBias * 0.22));
      const transientMix = Math.max(0, Math.min(1, 0.12 + impactBias * 0.45));

      for (let s = 0; s < grainSamples; s++) {
        const outIdx = start + s;
        if (outIdx >= totalSamples) break;
        const t = s / sampleRate;
        const env = hann(s / Math.max(1, grainSamples - 1));
        const fm = Math.sin(2 * Math.PI * baseFreq * t * (0.5 + traceBias * 0.4));
        const fundamental = Math.sin(2 * Math.PI * baseFreq * t + fm * fmDepth);
        const overtoneVoice = triangleWave(2 * Math.PI * overtone * t);
        const shimmerVoice = Math.sin(2 * Math.PI * shimmer * t + Math.sin(2 * Math.PI * baseFreq * t) * 0.18);
        const transient = squareWave(2 * Math.PI * baseFreq * (1.5 + impactBias * 1.25) * t) * Math.exp(-s / Math.max(8, grainSamples * (0.12 + impactBias * 0.18)));
        const noise = (Math.random() * 2 - 1) * noiseMix;
        let signal = fundamental * bodyMix;
        signal += overtoneVoice * overtoneMix;
        signal += shimmerVoice * shimmerMix;
        signal += transient * transientMix;
        signal += noise * 0.18;
        output[outIdx] += signal * env * columnLevel * 0.38;
      }
    }
    return normalizeMonoAudioBufferInPlace(buffer);
  }

  private blendBodyBuffers(primary: AudioBuffer, secondary: AudioBuffer, secondaryMix: number): AudioBuffer {
    const mix = Math.max(0, Math.min(1, secondaryMix));
    const ctx = this.getContext();
    const sampleRate = primary.sampleRate;
    const length = Math.min(primary.length, secondary.length);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const output = buffer.getChannelData(0);
    const a = primary.getChannelData(0);
    const b = secondary.getChannelData(0);
    for (let i = 0; i < length; i++) {
      output[i] = a[i] * (1 - mix) + b[i] * mix;
    }
    return normalizeMonoAudioBufferInPlace(buffer);
  }

  renderFromMediatedAudioBodyToBuffer(
    body: MediatedAudioBody,
    options: {
      sourceAsset?: AudioSourceAsset | null,
      loopDurationSec: number,
      donorSourceAsset?: AudioSourceAsset | null,
      renderMode?: 'source_first_preview' | 'body_contract_preview',
    },
  ): AudioBuffer {
    const sourceAsset = options.sourceAsset ?? null;
    const loopDurationSec = options.loopDurationSec;

    switch (body.state.origin) {
      case 'form_first':
        return this.renderFormFirstBodyToBuffer(body, loopDurationSec, options.donorSourceAsset ?? null);
      case 'hybrid': {
        const formBuffer = this.renderFormFirstBodyToBuffer(body, loopDurationSec, options.donorSourceAsset ?? null);
        if (!sourceAsset) return formBuffer;
        const sourceBuffer = this.renderSourceFirstBodyToBuffer(body, sourceAsset, loopDurationSec);
        return this.blendBodyBuffers(sourceBuffer, formBuffer, 0.35);
      }
      case 'source_first':
      default:
        if (!sourceAsset) {
          throw new Error('renderFromMediatedAudioBodyToBuffer requires sourceAsset for source-first body rendering');
        }
        return this.renderSourceFirstBodyToBuffer(body, sourceAsset, loopDurationSec);
    }
  }




  renderCarrierDonorV2PreviewToBuffer(
    skeleton: CarrierSpectralSkeleton,
    bindingPreview: AnchorBindingPreview[],
    donorAtlas: DonorTimbreAtlas,
    loopDurationSec: number,
    transferProfile: TransferProfile,
  ): AudioBuffer {
    const ctx = this.getContext();
    const sampleRate = ctx.sampleRate;
    const totalSamples = Math.max(1, Math.round(Math.max(0.05, loopDurationSec) * sampleRate));
    const buffer = ctx.createBuffer(1, totalSamples, sampleRate);
    const output = buffer.getChannelData(0);
    const width = Math.max(1, skeleton.width || 1);
    const height = Math.max(1, skeleton.height || 1);
    const samplesPerColumn = totalSamples / Math.max(1, width);
    const cellById = new Map(donorAtlas.cells.map((cell) => [cell.id, cell]));
    const bindingByAnchorId = new Map(bindingPreview.map((binding) => [binding.carrierAnchorId, binding]));
    const regimeDurationFactor: Record<CarrierAnchor['regime'], number> = { tonal: 1.7, cluster: 1.4, noise: 1.1, transient: 0.76 };
    const detail = transferProfile.detail;
    const donorLoad = Math.max(0.05, Math.min(1, detail.resonanceLoad * 0.32 + detail.residualLoad * 0.24 + detail.transientLoad * 0.2 + detail.microModulationLoad * 0.12 + 0.12));
    const maxOrderedVoices = Math.max(6, Math.min(20, Math.round(6 + detail.verticalFidelity * 4 + detail.polyAnchorBlend * 5 + detail.resonanceLoad * 2)));
    const maxResonanceVoices = Math.max(4, Math.min(7, Math.round(4 + detail.zoneCoupling * 2 + detail.resonanceLoad * 2)));

    const clamp01 = (value: number) => {
      if (!Number.isFinite(value)) return 0;
      return Math.max(0, Math.min(1, value));
    };

    const normalizeArray = (values: number[]) => {
      const sum = values.reduce((acc, value) => acc + Math.max(0, value), 0);
      if (sum <= 1e-9) return values.map(() => 0);
      return values.map((value) => Math.max(0, value) / sum);
    };

    const normalizeFloat = (values: Float32Array | undefined | null) => {
      if (!values || !values.length) return [] as number[];
      let total = 0;
      for (let i = 0; i < values.length; i += 1) total += Math.max(0, values[i] ?? 0);
      if (total <= 1e-9) return Array.from(values, () => 0);
      return Array.from(values, (value) => Math.max(0, value) / total);
    };

    type CarrierOrderedVoice = { freq: number; gain: number; brightness: number };
    type CarrierResonanceVoice = { freq: number; gain: number; width: number };
    type JustIntervalSpec = { label: string; ratio: number; numerator: number; denominator: number; complexity: number };
    type JustIntervalMatch = { interval: JustIntervalSpec; score: number; centsError: number; foldedRatio: number; octaveFactor: number };

    const justIntervals: JustIntervalSpec[] = [
      { label: '1/1', ratio: 1, numerator: 1, denominator: 1, complexity: 0.08 },
      { label: '16/15', ratio: 16 / 15, numerator: 16, denominator: 15, complexity: 0.44 },
      { label: '10/9', ratio: 10 / 9, numerator: 10, denominator: 9, complexity: 0.38 },
      { label: '9/8', ratio: 9 / 8, numerator: 9, denominator: 8, complexity: 0.32 },
      { label: '8/7', ratio: 8 / 7, numerator: 8, denominator: 7, complexity: 0.48 },
      { label: '7/6', ratio: 7 / 6, numerator: 7, denominator: 6, complexity: 0.4 },
      { label: '6/5', ratio: 6 / 5, numerator: 6, denominator: 5, complexity: 0.28 },
      { label: '5/4', ratio: 5 / 4, numerator: 5, denominator: 4, complexity: 0.22 },
      { label: '9/7', ratio: 9 / 7, numerator: 9, denominator: 7, complexity: 0.52 },
      { label: '4/3', ratio: 4 / 3, numerator: 4, denominator: 3, complexity: 0.18 },
      { label: '11/8', ratio: 11 / 8, numerator: 11, denominator: 8, complexity: 0.58 },
      { label: '7/5', ratio: 7 / 5, numerator: 7, denominator: 5, complexity: 0.5 },
      { label: '10/7', ratio: 10 / 7, numerator: 10, denominator: 7, complexity: 0.56 },
      { label: '3/2', ratio: 3 / 2, numerator: 3, denominator: 2, complexity: 0.14 },
      { label: '14/9', ratio: 14 / 9, numerator: 14, denominator: 9, complexity: 0.54 },
      { label: '8/5', ratio: 8 / 5, numerator: 8, denominator: 5, complexity: 0.24 },
      { label: '5/3', ratio: 5 / 3, numerator: 5, denominator: 3, complexity: 0.26 },
      { label: '12/7', ratio: 12 / 7, numerator: 12, denominator: 7, complexity: 0.5 },
      { label: '7/4', ratio: 7 / 4, numerator: 7, denominator: 4, complexity: 0.42 },
      { label: '9/5', ratio: 9 / 5, numerator: 9, denominator: 5, complexity: 0.46 },
      { label: '15/8', ratio: 15 / 8, numerator: 15, denominator: 8, complexity: 0.36 },
      { label: '2/1', ratio: 2, numerator: 2, denominator: 1, complexity: 0.1 },
    ];

    const centsBetweenRatios = (ratioA: number, ratioB: number) => 1200 * Math.log2(Math.max(1e-9, ratioA) / Math.max(1e-9, ratioB));

    const matchJustInterval = (freqA: number, freqB: number): JustIntervalMatch | null => {
      if (!Number.isFinite(freqA) || !Number.isFinite(freqB) || freqA <= 0 || freqB <= 0) return null;
      const low = Math.min(freqA, freqB);
      const high = Math.max(freqA, freqB);
      if (low <= 1e-6) return null;
      const rawRatio = high / low;
      let foldedRatio = rawRatio;
      let octaveFactor = 1;
      while (foldedRatio > 2.0001) {
        foldedRatio /= 2;
        octaveFactor *= 2;
      }
      while (foldedRatio < 0.9999) {
        foldedRatio *= 2;
        octaveFactor /= 2;
      }
      let best: JustIntervalMatch | null = null;
      for (const interval of justIntervals) {
        const centsError = centsBetweenRatios(foldedRatio, interval.ratio);
        const absError = Math.abs(centsError);
        const tolerance = 15 + interval.complexity * 12;
        if (absError > tolerance) continue;
        const score = Math.pow(Math.max(0, 1 - absError / tolerance), 1.6) * (1 - interval.complexity * 0.18);
        if (!best || score > best.score) best = { interval, score, centsError, foldedRatio, octaveFactor };
      }
      return best && best.score > 0.08 ? best : null;
    };

    const buildNaturalOvertoneVoices = (fundamental: number, anchor: CarrierAnchor, relationEnergy: number): CarrierOrderedVoice[] => {
      const voices: CarrierOrderedVoice[] = [];
      const regimeFactor = anchor.regime === 'tonal' ? 1 : anchor.regime === 'cluster' ? 0.78 : anchor.regime === 'transient' ? 0.38 : 0.26;
      const baseGain = Math.max(0, anchor.energy) * regimeFactor * (0.055 + detail.resonanceLoad * 0.035 + detail.anchorFocus * 0.025 + relationEnergy * 0.04);
      if (baseGain <= 0.004) return voices;
      const spectrum = [
        { ratio: 2, weight: 0.42 },
        { ratio: 3, weight: 0.31 },
        { ratio: 4, weight: 0.24 },
        { ratio: 5, weight: 0.21 },
        { ratio: 6, weight: 0.15 },
        { ratio: 7, weight: 0.14 },
        { ratio: 8, weight: 0.1 },
        { ratio: 9, weight: 0.08 },
        { ratio: 11, weight: 0.055 },
        { ratio: 13, weight: 0.043 },
      ];
      for (const partial of spectrum) {
        const freq = fundamental * partial.ratio;
        if (freq < 28 || freq > 16000) continue;
        voices.push({
          freq,
          gain: baseGain * partial.weight * (1 + relationEnergy * 0.32),
          brightness: clamp01(Math.log2(partial.ratio) / 4),
        });
      }
      return voices;
    };

    const buildJustRelationVoices = (
      anchor: CarrierAnchor,
      slotAnchors: CarrierAnchor[],
    ): { ordered: CarrierOrderedVoice[]; resonance: CarrierResonanceVoice[]; relationEnergy: number } => {
      const ordered: CarrierOrderedVoice[] = [];
      const resonance: CarrierResonanceVoice[] = [];
      let relationEnergy = 0;
      const sourceFreq = Math.max(1e-6, anchor.centerHz);
      const sorted = slotAnchors
        .filter((other) => other.id !== anchor.id && other.energy > 0.015 && other.centerHz > 12)
        .sort((a, b) => Math.abs(Math.log2(a.centerHz / sourceFreq)) - Math.abs(Math.log2(b.centerHz / sourceFreq)))
        .slice(0, 5);

      for (const other of sorted) {
        const match = matchJustInterval(sourceFreq, other.centerHz);
        if (!match) continue;
        const low = Math.min(sourceFreq, other.centerHz);
        const high = Math.max(sourceFreq, other.centerHz);
        const complexityLift = 0.82 + match.interval.complexity * 0.34;
        const energy = clamp01(Math.sqrt(Math.max(0, anchor.energy) * Math.max(0, other.energy)) * match.score * (0.62 + detail.polyAnchorBlend * 0.28 + detail.zoneCoupling * 0.18));
        if (energy <= 0.025) continue;
        relationEnergy += energy * complexityLift;

        const partnerGain = energy * 0.23;
        ordered.push({ freq: other.centerHz, gain: partnerGain, brightness: clamp01(Math.log2(Math.max(1, high / low)) / 2) });

        const commonPartialHz = low * match.interval.numerator * Math.max(1, Math.round(match.octaveFactor));
        if (commonPartialHz >= 28 && commonPartialHz <= 16000) {
          ordered.push({ freq: commonPartialHz, gain: energy * 0.18 * complexityLift, brightness: clamp01(Math.log2(Math.max(1, commonPartialHz / low)) / 5) });
        }

        const octaveSpread = Math.max(1, Math.round(match.octaveFactor));
        const relationHaloHz = low * (match.interval.numerator + match.interval.denominator) / match.interval.denominator * octaveSpread;
        if (relationHaloHz >= 28 && relationHaloHz <= 16000) {
          ordered.push({ freq: relationHaloHz, gain: energy * 0.12 * (0.72 + match.interval.complexity * 0.4), brightness: clamp01(match.interval.complexity + 0.22) });
        }

        const differenceHz = high - low;
        if (differenceHz >= 28 && differenceHz <= 6000) {
          resonance.push({ freq: differenceHz, gain: energy * 0.22, width: 0.28 + match.interval.complexity * 0.18 });
        }

        const sumHz = high + low;
        if (sumHz >= 50 && sumHz <= 16000) {
          resonance.push({ freq: sumHz, gain: energy * 0.13 * complexityLift, width: 0.16 + match.interval.complexity * 0.12 });
        }
      }

      return { ordered, resonance, relationEnergy: clamp01(relationEnergy) };
    };

    const leakForCell = (cell: DonorTimbreCell) => {
      const explicit = cell.leakAuditModel?.meanOverallLeakRisk;
      const recommended = cell.leakAuditModel?.meanRecommendedSuppression ?? 0;
      const fallback =
        cell.sequenceRecoverability * (0.28 + detail.sequenceDecoupling * 0.34) +
        cell.prosodicTrace * (0.24 + detail.prosodySuppression * 0.42) +
        cell.cellEntanglement * (0.18 + detail.cellDisentanglement * 0.26) +
        cell.sequenceRecoverability * detail.orderednessPenalty * 0.12;
      return clamp01(Math.max(explicit ?? 0, fallback * 0.85, recommended * 0.92));
    };

    const buildOrderedVoices = (cell: DonorTimbreCell, fundamental: number, purity: number, weight: number): CarrierOrderedVoice[] => {
      const partialWeights = normalizeFloat(cell.orderedModel?.meanPartialWeights ?? null);
      const sourceWeights = partialWeights.length ? partialWeights : normalizeFloat(cell.meanRelativeSpectralEnvelope);
      const oddEvenBalance = cell.orderedModel?.meanOddEvenBalance ?? 0;
      const inharmonicSpread = cell.orderedModel?.meanInharmonicSpread ?? 0.18;
      const orderedness = cell.orderedModel?.meanOrderedness ?? 0.24;
      const spectralSlope = cell.orderedModel?.meanSpectralSlope ?? -0.65;
      const voices: CarrierOrderedVoice[] = [];

      for (let i = 0; i < Math.min(maxOrderedVoices, sourceWeights.length); i += 1) {
        const harmonicNumber = i + 1;
        let gain = sourceWeights[i] ?? 0;
        if (gain <= 0.003) continue;
        const isOdd = harmonicNumber % 2 === 1;
        const oddEvenFactor = isOdd ? 1 + Math.max(0, oddEvenBalance) * 0.42 : 1 + Math.max(0, -oddEvenBalance) * 0.42;
        const slopeBias = Math.exp(Math.min(0, spectralSlope) * i * 0.06);
        const spread = 1 + inharmonicSpread * detail.inharmonicFreedom * (0.012 * harmonicNumber);
        const detune = 1 + (harmonicNumber - 1) * 0.0015 * detail.microModulationLoad;
        const freq = Math.max(24, Math.min(16000, fundamental * harmonicNumber * spread * detune));
        const voiceGain = gain * oddEvenFactor * slopeBias * weight * (0.18 + orderedness * 0.48 + purity * 0.24 + donorLoad * 0.32);
        voices.push({ freq, gain: voiceGain, brightness: clamp01(harmonicNumber / Math.max(1, sourceWeights.length - 1)) });
      }

      voices.sort((a, b) => b.gain - a.gain);
      return voices.slice(0, maxOrderedVoices);
    };

    const buildResonanceVoices = (cell: DonorTimbreCell, fundamental: number, purity: number, weight: number): CarrierResonanceVoice[] => {
      const centers = cell.resonanceModel?.meanPeakCenters ?? null;
      const peakWeights = normalizeFloat(cell.resonanceModel?.meanPeakWeights ?? null);
      const widths = cell.resonanceModel?.meanPeakWidths ?? null;
      const bodyCentroid = cell.resonanceModel?.meanBodyCentroid ?? 0.5;
      const sharpness = cell.resonanceModel?.meanResonanceSharpness ?? 0.25;
      const strength = cell.resonanceModel?.meanResonanceStrength ?? 0.18;
      const voices: CarrierResonanceVoice[] = [];
      if (!centers || !centers.length) return voices;

      for (let i = 0; i < Math.min(maxResonanceVoices, centers.length); i += 1) {
        const center = centers[i] ?? 0.5;
        const width = widths?.[i] ?? 0.2;
        const peakWeight = peakWeights[i] ?? 0;
        if (peakWeight <= 0.002) continue;
        const spread = (center - bodyCentroid) * (1.1 + detail.bandwidthSpread * 1.25);
        const ratio = Math.max(0.35, Math.min(5.5, 2 ** spread));
        const freq = Math.max(24, Math.min(16000, fundamental * ratio));
        const gain = peakWeight * weight * (0.12 + strength * 0.48 + sharpness * 0.2 + purity * 0.1 + detail.resonanceLoad * 0.34);
        voices.push({ freq, gain, width });
      }

      voices.sort((a, b) => b.gain - a.gain);
      return voices.slice(0, maxResonanceVoices);
    };

    for (let x = 0; x < width; x += 1) {
      const anchors = skeleton.anchorsByTime[x] ?? [];
      if (!anchors.length) continue;
      const center = Math.round((x + 0.5) * samplesPerColumn);

      for (const anchor of anchors) {
        const binding = bindingByAnchorId.get(anchor.id);
        if (!binding) continue;
        const cells = binding.donorCellIds.map((id, index) => {
          const cell = cellById.get(id);
          const weight = binding.weights[index] ?? 0;
          return cell ? { cell, weight } : null;
        }).filter((entry): entry is { cell: DonorTimbreCell; weight: number } => !!entry && entry.weight > 0.001);
        if (!cells.length) continue;

        const grainSec = (samplesPerColumn / sampleRate) * regimeDurationFactor[anchor.regime] + Math.max(0, anchor.bandwidthBins * 0.0014);
        const grainSamples = Math.max(96, Math.min(Math.round(grainSec * sampleRate), Math.round(samplesPerColumn * 5.2)));
        const start = Math.max(0, center - Math.floor(grainSamples / 2));
        const fundamental = Math.max(26, Math.min(14000, anchor.centerHz));

        const orderedVoices: CarrierOrderedVoice[] = [];
        const resonanceVoices: CarrierResonanceVoice[] = [];
        const justRelation = buildJustRelationVoices(anchor, anchors);
        orderedVoices.push(...justRelation.ordered);
        resonanceVoices.push(...justRelation.resonance);
        let resonanceTone = 0;
        let resonanceSharpness = 0;
        let residualStrength = 0;
        let residualColor = 0.5;
        let transientStrength = 0;
        let transientSharpness = 0;
        let onsetSpread = 0.5;
        let decayTightness = 0.5;
        let microMotion = 0;
        let orderedStrength = 0;
        let aggregatePurity = 0;

        for (const { cell, weight } of cells) {
          const leak = leakForCell(cell);
          const purity = Math.max(0.05, 1 - leak);
          aggregatePurity += purity * weight;
          orderedStrength += (cell.orderedModel?.meanOrderedness ?? 0) * weight * purity;
          resonanceTone += (cell.resonanceModel?.meanBodyCentroid ?? 0.5) * weight;
          resonanceSharpness += (cell.resonanceModel?.meanResonanceSharpness ?? 0.25) * weight;
          residualStrength += (cell.residualModel?.meanResidualStrength ?? 0.12) * weight * purity;
          residualColor += ((cell.residualModel?.meanNoiseColorCentroid ?? 0.5) - 0.5) * weight;
          transientStrength += (cell.transientModel?.meanTransientStrength ?? 0.08) * weight * purity;
          transientSharpness += (cell.transientModel?.meanOnsetSharpness ?? 0.2) * weight;
          onsetSpread += ((cell.transientModel?.meanOnsetSpread ?? 0.5) - 0.5) * weight;
          decayTightness += ((cell.transientModel?.meanDecayTightness ?? 0.5) - 0.5) * weight;
          microMotion += (cell.meanModulationProfile[1] ?? 0.08) * weight * purity;

          orderedVoices.push(...buildOrderedVoices(cell, fundamental, purity, weight));
          resonanceVoices.push(...buildResonanceVoices(cell, fundamental, purity, weight));
        }

        orderedVoices.push(...buildNaturalOvertoneVoices(fundamental, anchor, justRelation.relationEnergy));

        if (!orderedVoices.length) {
          orderedVoices.push({ freq: fundamental, gain: 1, brightness: 0.1 });
        }

        orderedVoices.sort((a, b) => b.gain - a.gain);
        resonanceVoices.sort((a, b) => b.gain - a.gain);
        const compactOrdered = orderedVoices.slice(0, maxOrderedVoices);
        const compactResonance = resonanceVoices.slice(0, maxResonanceVoices);
        const orderedWeights = normalizeArray(compactOrdered.map((voice) => voice.gain));
        const resonanceWeights = normalizeArray(compactResonance.map((voice) => voice.gain));
        for (let i = 0; i < compactOrdered.length; i += 1) compactOrdered[i]!.gain = orderedWeights[i] ?? 0;
        for (let i = 0; i < compactResonance.length; i += 1) compactResonance[i]!.gain = resonanceWeights[i] ?? 0;

        const bodyMix = Math.max(0.08, Math.min(0.76, anchor.energy * (0.28 + detail.anchorFocus * 0.32) + orderedStrength * 0.32 + donorLoad * 0.08 + justRelation.relationEnergy * 0.08));
        const resonanceMix = Math.max(0.04, Math.min(0.72, detail.resonanceLoad * (0.18 + resonanceSharpness * 0.34 + aggregatePurity * 0.18) + justRelation.relationEnergy * 0.14));
        const noiseMix = Math.max(0.01, Math.min(0.55, residualStrength * (0.08 + detail.residualLoad * 0.58)));
        const transientMix = Math.max(0.01, Math.min(0.62, transientStrength * (0.1 + detail.transientLoad * 0.62)));
        const shimmerMix = Math.max(0.01, Math.min(0.48, microMotion * (0.08 + detail.microModulationLoad * 0.32) + justRelation.relationEnergy * 0.12));
        const localGain = Math.max(0.04, Math.min(1, anchor.energy * (0.96 + detail.anchorFocus * 0.86)));
        const resonanceBrightness = clamp01(0.35 + resonanceTone * 0.85 + (1 - anchor.centerBin / Math.max(1, height - 1)) * 0.22);
        const noiseTilt = clamp01(0.5 + residualColor * 0.8);
        const attackWindow = Math.max(8, grainSamples * (0.04 + transientSharpness * 0.12 + detail.transientLoad * 0.06));
        const decayWindow = Math.max(12, grainSamples * (0.18 + (1 - clamp01(decayTightness)) * 0.25 + onsetSpread * 0.08));
        const orderedPhases = compactOrdered.map((_, idx) => ((x * 0.173 + idx * 0.211) % 1) * Math.PI * 2);
        const resonancePhases = compactResonance.map((_, idx) => ((x * 0.089 + idx * 0.157) % 1) * Math.PI * 2);

        let noiseLp = 0;
        let noiseHpState = 0;
        for (let s = 0; s < grainSamples; s += 1) {
          const outIdx = start + s;
          if (outIdx >= totalSamples) break;
          const t = s / sampleRate;
          const envPos = s / Math.max(1, grainSamples - 1);
          const env = 0.5 - 0.5 * Math.cos(Math.PI * 2 * envPos);
          const attackEnv = Math.exp(-s / attackWindow);
          const decayEnv = Math.exp(-s / decayWindow);

          let orderedSignal = 0;
          for (let i = 0; i < compactOrdered.length; i += 1) {
            const voice = compactOrdered[i]!;
            const basePhase = orderedPhases[i]!;
            const fm = Math.sin(2 * Math.PI * (0.7 + i * 0.29) * t + basePhase) * shimmerMix * (0.08 + voice.brightness * 0.12);
            const waveMix: WaveformMix = {
              sine: 1,
              sawtooth: 0.08 + voice.brightness * 0.42 + detail.resonanceLoad * 0.18,
              square: 0.02 + transientMix * 0.12,
              triangle: 0.28 + bodyMix * 0.26,
            };
            orderedSignal += mixedWaveform(2 * Math.PI * voice.freq * t + basePhase + fm, waveMix) * voice.gain;
          }

          let resonanceSignal = 0;
          for (let i = 0; i < compactResonance.length; i += 1) {
            const voice = compactResonance[i]!;
            const basePhase = resonancePhases[i]!;
            const width = Math.max(0.04, voice.width);
            const detuneA = 1 - width * (0.08 + detail.bandwidthSpread * 0.1);
            const detuneB = 1 + width * (0.08 + detail.bandwidthSpread * 0.1);
            resonanceSignal += Math.sin(2 * Math.PI * voice.freq * detuneA * t + basePhase) * voice.gain * 0.62;
            resonanceSignal += triangleWave(2 * Math.PI * voice.freq * detuneB * t + basePhase * 0.73) * voice.gain * 0.38;
          }

          const rawNoise = Math.random() * 2 - 1;
          noiseLp += (rawNoise - noiseLp) * (0.02 + noiseTilt * 0.16);
          const hp = rawNoise - noiseLp;
          noiseHpState += (hp - noiseHpState) * (0.08 + (1 - noiseTilt) * 0.22);
          const coloredNoise = noiseLp * (1 - noiseTilt) + noiseHpState * noiseTilt;

          const transientBurst = squareWave(2 * Math.PI * fundamental * (1.3 + detail.transientLoad * 1.4) * t)
            * attackEnv
            * (0.45 + transientSharpness * 0.35 + onsetSpread * 0.12);
          const shimmer = Math.sin(2 * Math.PI * fundamental * (1.95 + resonanceBrightness * 0.7) * t) * shimmerMix * decayEnv;

          let signal = 0;
          signal += orderedSignal * bodyMix;
          signal += resonanceSignal * resonanceMix;
          signal += coloredNoise * noiseMix * 0.42;
          signal += transientBurst * transientMix;
          signal += shimmer;

          const spreadGain = 0.34 + detail.bandwidthSpread * 0.16 + detail.zoneCoupling * 0.06;
          output[outIdx] += signal * env * localGain * spreadGain;
        }
      }
    }

    return normalizeMonoAudioBufferInPlace(buffer);
  }

  async renderDonorBodyToBuffer(spectralData: SpectralData, source: AudioSourceAsset, durationSec: number, isCancelled: () => boolean = () => false): Promise<AudioBuffer> {
    const ctx = this.getContext();
    const model = await prepareDonorProjection(source);
    if (isCancelled()) throw new DOMException('Donor-Vorschau abgebrochen.', 'AbortError');
    // Always read the current drawing; cached V2 skeletons may predate an edit.
    const skeleton = extractSpectralSkeleton(spectralData, durationSec, {
      maxAnchorsPerFrame: 8, minPeakAmplitude: 0.025, verticalSmoothingRadius: 1, minPeakDistanceBins: 2,
    });
    const plan = buildProjectionCarrierPlan(skeleton);
    const samples = await renderDonorProjection(plan, model, ctx.sampleRate, durationSec, isCancelled);
    const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
    buffer.getChannelData(0).set(samples);
    return buffer;
  }

  async renderDonorProofToBuffer(
    source: AudioSourceAsset, model: DonorProjectionModel,
    kind: 'original' | 'reconstruction' | 'transposed',
    isCancelled: () => boolean = () => false,
  ): Promise<AudioBuffer> {
    const body = model.bodyV3;
    if (!donorBodyV3CanRender(body)) throw new Error('Dieser Donor hat keinen ausreichend stabilen tonalen Körper für die Versuchsstrecke.');
    const ctx = this.getContext();
    if (kind === 'original') {
      const proofSource = body.sourceChannelIndex === 1 && source.rightSamples?.length ? source.rightSamples : source.leftSamples?.length ? source.leftSamples : source.monoSamples;
      const start = Math.round((source.importStartSec + body.eventStartSec) * source.sampleRate);
      const length = Math.max(1, Math.min(proofSource.length - start, Math.round(body.eventDurationSec * source.sampleRate)));
      const buffer = ctx.createBuffer(1, Math.max(1, Math.round(length / source.sampleRate * ctx.sampleRate)), ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < output.length; i++) {
        const position = i * source.sampleRate / ctx.sampleRate, a = Math.floor(position), mix = position - a;
        const va = proofSource[start + a] ?? 0, vb = proofSource[Math.min(proofSource.length - 1, start + a + 1)] ?? va;
        output[i] = va + (vb - va) * mix;
      }
      return buffer;
    }
    const samples = await renderDonorBodyV3Reference(body, ctx.sampleRate, kind === 'transposed' ? 2 ** (7 / 12) : 1, isCancelled);
    const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
    buffer.getChannelData(0).set(samples);
    return buffer;
  }
}
