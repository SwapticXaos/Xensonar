import { stableCarrierIntegralJson } from '../../integral';
import type { SpectralForgePreviewRouteKind } from './spectralForgePreviewSessionTypes';

export type SpectralForgeTransportPreviewRequestKeyInput = {
  routeKind: SpectralForgePreviewRouteKind;
  renderVersion: number;
  synthMode: unknown;
  waveformMix: unknown;
  machineId: unknown;
  carrierIntegralSource: unknown;
  carrierIntegralPreset: unknown;
  carrierIntegralBodySource: unknown;
  carrierIntegralParams: unknown;
  synthLab: unknown;
  harmonicXplore: unknown;
  bars: number;
  bpm: number;
};

export function buildSpectralForgeTransportPreviewRequestKey(
  input: SpectralForgeTransportPreviewRequestKeyInput,
): string {
  return stableCarrierIntegralJson({
    version: 'spectral-forge-transport-preview-request-v2',
    // loopPreview is intentionally omitted here: it is a playback transport flag,
    // not a render/prepared-buffer identity. The loop wiring is checked separately
    // so this omission cannot become a silent UI promise leak.
    route: input.routeKind,
    renderVersion: input.renderVersion,
    synthMode: input.synthMode,
    waveformMix: input.waveformMix,
    bars: Math.round(input.bars * 1000),
    bpm: Math.round(input.bpm * 10),
    carrierIntegral: stableCarrierIntegralForTransportPreview(input),
  });
}

function stableCarrierIntegralForTransportPreview(input: SpectralForgeTransportPreviewRequestKeyInput) {
  if (input.routeKind !== 'basis-hearing') {
    return null;
  }
  return {
    machineId: input.machineId ?? null,
    source: input.carrierIntegralSource ?? null,
    presetId: input.carrierIntegralPreset ?? null,
    bodySourceMode: input.carrierIntegralBodySource ?? null,
    paramsPatch: input.carrierIntegralParams ?? {},
    synthLab: stableSynthLabForTransportPreview(input.synthLab),
    harmonicXplore: stableHarmonicXploreForTransportPreview(input.harmonicXplore),
  };
}

function stableSynthLabForTransportPreview(synthLab: unknown) {
  const value = synthLab as { presetId?: unknown; paramsPatch?: unknown };
  return {
    presetId: value?.presetId ?? null,
    paramsPatch: value?.paramsPatch ?? {},
  };
}

function stableHarmonicXploreForTransportPreview(harmonicXplore: unknown) {
  const value = harmonicXplore as {
    profileId?: unknown;
    seriesType?: unknown;
    phase?: unknown;
    count?: unknown;
    rolloff?: unknown;
    registerFold?: unknown;
    detailDensity?: unknown;
    detailMode?: unknown;
  };
  return {
    profileId: value?.profileId ?? null,
    seriesType: value?.seriesType ?? null,
    phase: value?.phase ?? null,
    count: value?.count ?? null,
    rolloff: value?.rolloff ?? null,
    registerFold: value?.registerFold ?? null,
    detailDensity: value?.detailDensity ?? null,
    detailMode: value?.detailMode ?? null,
  };
}
