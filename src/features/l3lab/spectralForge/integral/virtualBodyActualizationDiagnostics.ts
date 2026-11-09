import type { CarrierSpectralSkeleton } from '../types/carrierDonorV2Types';
import {
  DEFAULT_ACTUALIZATION_READINESS,
  VIRTUAL_BODY_ACTUALIZATION_SCHEMA_VERSION,
  type ActualizationDiagnostics,
  type ActualizationReadiness,
  type ActualizedAudioBufferReport,
  type ActualizedBodyKind,
  type ActualizedBodyPlan,
  type ActualizationRoute,
  type LatentBodyForm,
} from './virtualBodyActualizationTypes';
import type { HydratedActualizationMedium } from './virtualBodyMediumHydrator';

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function buildCarrierLatentBodyFormFromSkeleton(args: {
  id: string;
  sourceId?: string;
  skeleton: CarrierSpectralSkeleton;
}): LatentBodyForm {
  const anchors = args.skeleton.anchorsByTime.flat();
  const anchorCount = anchors.length;
  const peakPolyphony = args.skeleton.anchorsByTime.reduce((max, frame) => Math.max(max, frame.length), 0);
  const frameCount = Math.max(1, args.skeleton.anchorsByTime.length);
  const meanAnchorsPerFrame = anchorCount / frameCount;
  const meanContinuity = anchorCount
    ? anchors.reduce((sum, anchor) => sum + clamp01(anchor.continuity), 0) / anchorCount
    : 0;
  const meanEnergy = anchorCount
    ? anchors.reduce((sum, anchor) => sum + clamp01(anchor.energy), 0) / anchorCount
    : 0;
  const tonalCount = anchors.filter((anchor) => anchor.regime === 'tonal').length;
  const clusterCount = anchors.filter((anchor) => anchor.regime === 'cluster').length;
  const transientCount = anchors.filter((anchor) => anchor.regime === 'transient').length;
  const noiseCount = anchors.filter((anchor) => anchor.regime === 'noise').length;
  const density = clamp01(meanAnchorsPerFrame / 6);
  const fragmentation = clamp01(1 - meanContinuity);
  const complexity = clamp01((density * 0.45) + (fragmentation * 0.35) + ((clusterCount + noiseCount + transientCount) / Math.max(1, anchorCount)) * 0.2);
  return {
    schemaVersion: VIRTUAL_BODY_ACTUALIZATION_SCHEMA_VERSION,
    id: args.id,
    sourceKind: 'carrier-sketch',
    sourceId: args.sourceId,
    topology: {
      continuity: clamp01(meanContinuity),
      density,
      complexity,
      fragmentation,
      anchorCount,
      peakPolyphony,
      tonalRatio: anchorCount ? tonalCount / anchorCount : 0,
      clusterRatio: anchorCount ? clusterCount / anchorCount : 0,
      transientRatio: anchorCount ? transientCount / anchorCount : 0,
      noiseRatio: anchorCount ? noiseCount / anchorCount : 0,
    },
    spectralSkeletonRef: `${args.id}:carrier-skeleton`,
    diagnostics: [
      `Carrier latent form: ${anchorCount} anchors, peak polyphony ${peakPolyphony}, density ${density.toFixed(3)}, mean energy ${meanEnergy.toFixed(3)}.`,
    ],
  };
}

export function analyzeActualizedAudioBuffer(
  buffer: AudioBuffer,
  readiness: ActualizationReadiness = DEFAULT_ACTUALIZATION_READINESS,
): ActualizedAudioBufferReport {
  let peak = 0;
  let sumSquares = 0;
  let count = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let index = 0; index < data.length; index += 1) {
      const sample = Number(data[index] ?? 0);
      if (!Number.isFinite(sample)) continue;
      const abs = Math.abs(sample);
      peak = Math.max(peak, abs);
      sumSquares += sample * sample;
      count += 1;
    }
  }
  const rms = count ? Math.sqrt(sumSquares / count) : 0;
  const warnings: string[] = [];
  if (buffer.length <= 0) warnings.push('Actualized buffer is empty.');
  if (peak < readiness.minPeak) warnings.push(`Actualized buffer peak ${peak.toFixed(6)} below minimum ${readiness.minPeak}.`);
  if (rms < readiness.minRms) warnings.push(`Actualized buffer RMS ${rms.toFixed(6)} below minimum ${readiness.minRms}.`);
  return {
    peak,
    rms,
    length: buffer.length,
    durationSec: buffer.duration,
    channelCount: buffer.numberOfChannels,
    sampleRate: buffer.sampleRate,
    playable: buffer.length > 0 && peak >= readiness.minPeak && rms >= readiness.minRms,
    warnings,
  };
}

// Builds serializable ActualizedBodyPlan metadata for routes such as rendered-material-body without storing the WebAudio payload.
export function buildActualizedBodyPlan(args: {
  id: string;
  route: ActualizationRoute;
  bodyKind: ActualizedBodyKind;
  medium: HydratedActualizationMedium;
  report?: ActualizedAudioBufferReport;
  rootHz?: number;
  renderPlanRef?: string;
  additionalWarnings?: string[];
}): ActualizedBodyPlan {
  const diagnostics: ActualizationDiagnostics = {
    mediumKind: args.medium.kind,
    usedFailOpen: args.medium.usedFailOpen,
    peak: args.report?.peak ?? args.medium.peak,
    rms: args.report?.rms ?? args.medium.rms,
    warnings: [
      ...args.medium.warnings,
      ...(args.report?.warnings ?? []),
      ...(args.additionalWarnings ?? []),
    ],
  };
  return {
    schemaVersion: VIRTUAL_BODY_ACTUALIZATION_SCHEMA_VERSION,
    id: args.id,
    route: args.route,
    bodyKind: args.bodyKind,
    rootReference: {
      source: args.rootHz ? 'explicit-hz' : 'unknown',
      hz: args.rootHz,
    },
    renderPlanRef: args.renderPlanRef,
    diagnostics,
  };
}
