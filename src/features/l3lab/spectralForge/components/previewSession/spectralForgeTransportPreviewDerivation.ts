import type { SpectralData } from '../../audio/SpectralData';
import type { CarrierIntegralSelection } from '../../integral/carrierIntegralSelection';
import type { CarrierIntegralSynthLabSelection } from '../../integral/carrierIntegralSynthLab';
import type { CarrierIntegralHarmonicXploreSelection } from '../../integral/carrierIntegralHarmonicXploreRenderConfig';
import { computeLoopDurationSec, DURATION, type MaterialExportConfig, type SourcePreviewMode, type SynthMode, type WaveformMix } from '../../state/store';
import { buildSpectralForgeTransportPreviewRequestKey } from './spectralForgePreviewRequestKey';
import { previewRouteCanAutoAfterPaint, previewRouteSupportsLoopPlayback } from './spectralForgePreviewRoute';
import {
  createSpectralForgePreviewRequestIdentity,
  type SpectralForgePreviewRequestIdentity,
  type SpectralForgePreviewRouteKind,
} from './spectralForgePreviewSessionTypes';

export type SpectralForgeTransportPreviewDerivationInput = {
  donorSelected: boolean;
  variant: 'legacy' | 'forge3';
  hasSourceAsset: boolean;
  sourcePreviewMode: SourcePreviewMode;
  carrierIntegralSelection: CarrierIntegralSelection;
  carrierIntegralSynthLab: CarrierIntegralSynthLabSelection;
  carrierIntegralHarmonicXplore: CarrierIntegralHarmonicXploreSelection;
  renderVersion: number;
  synthMode: SynthMode;
  waveformMix: WaveformMix;
  materialExport: Pick<MaterialExportConfig, 'bars' | 'bpm' | 'loopPreview'>;
};

export type SpectralForgeTransportPreviewDerivation = {
  previewDurationSec: number;
  previewPlaybackRate: number;
  previewRenderRouteKind: SpectralForgePreviewRouteKind;
  previewRenderCanAutoAfterPaint: boolean;
  previewLoopAppliesToCurrentRoute: boolean;
  previewLoopEnabled: boolean;
  currentPreviewPreparedToken: string;
  currentPreviewRequest: SpectralForgePreviewRequestIdentity;
};

export function deriveSpectralForgeTransportPreview(
  input: SpectralForgeTransportPreviewDerivationInput,
): SpectralForgeTransportPreviewDerivation {
  const previewDurationSec = computeLoopDurationSec(
    input.materialExport.bars,
    input.materialExport.bpm,
  );
  const previewPlaybackRate = DURATION / Math.max(0.05, previewDurationSec);
  const generalSpectralPreviewRouteActive = !input.donorSelected && !(
    (input.variant === 'forge3' && input.hasSourceAsset && input.sourcePreviewMode === 'forge') ||
    (input.hasSourceAsset && input.sourcePreviewMode !== 'forge') ||
    input.carrierIntegralSelection.source !== 'default'
  );
  const previewRenderRouteKind: SpectralForgePreviewRouteKind = input.donorSelected
    ? 'none'
    : generalSpectralPreviewRouteActive
      ? 'spectral'
      : input.carrierIntegralSelection.source !== 'default'
        ? 'basis-hearing'
        : 'none';
  const previewRenderCanAutoAfterPaint = previewRouteCanAutoAfterPaint(previewRenderRouteKind);
  const previewLoopAppliesToCurrentRoute = input.donorSelected || previewRouteSupportsLoopPlayback(previewRenderRouteKind);
  const previewLoopEnabled = Boolean(input.materialExport.loopPreview);
  const currentPreviewPreparedToken = buildSpectralForgeTransportPreviewRequestKey({
    routeKind: previewRenderRouteKind,
    renderVersion: input.renderVersion,
    synthMode: input.synthMode,
    waveformMix: input.waveformMix,
    machineId: input.carrierIntegralSelection.machineId,
    carrierIntegralSource: input.carrierIntegralSelection.source,
    carrierIntegralPreset: input.carrierIntegralSelection.presetId,
    carrierIntegralBodySource: input.carrierIntegralSelection.bodySourceMode,
    carrierIntegralParams: input.carrierIntegralSelection.paramsPatch,
    synthLab: input.carrierIntegralSynthLab,
    harmonicXplore: input.carrierIntegralHarmonicXplore,
    bars: input.materialExport.bars,
    bpm: input.materialExport.bpm,
  });
  const currentPreviewRequest = createSpectralForgePreviewRequestIdentity({
    requestKey: currentPreviewPreparedToken,
    routeKind: previewRenderRouteKind,
  });

  return {
    previewDurationSec,
    previewPlaybackRate,
    previewRenderRouteKind,
    previewRenderCanAutoAfterPaint,
    previewLoopAppliesToCurrentRoute,
    previewLoopEnabled,
    currentPreviewPreparedToken,
    currentPreviewRequest,
  };
}

export type SpectralForgeTransportPrewarmInputSnapshot = {
  spectralData: SpectralData;
  synthMode: SynthMode;
  waveformMix: WaveformMix;
  routeKind: SpectralForgePreviewRouteKind;
  token: string;
  machineId: CarrierIntegralSelection['machineId'];
  selection: CarrierIntegralSelection;
  synthLab: CarrierIntegralSynthLabSelection;
  harmonicXplore: CarrierIntegralHarmonicXploreSelection;
  previewBpm: number;
};

export function buildSpectralForgeTransportPrewarmInputSnapshot(input: {
  spectralData: SpectralData;
  synthMode: SynthMode;
  waveformMix: WaveformMix;
  preview: SpectralForgeTransportPreviewDerivation;
  carrierIntegralSelection: CarrierIntegralSelection;
  carrierIntegralSynthLab: CarrierIntegralSynthLabSelection;
  carrierIntegralHarmonicXplore: CarrierIntegralHarmonicXploreSelection;
  previewBpm: number;
}): SpectralForgeTransportPrewarmInputSnapshot {
  return {
    spectralData: input.spectralData,
    synthMode: input.synthMode,
    waveformMix: input.waveformMix,
    routeKind: input.preview.previewRenderRouteKind,
    token: input.preview.currentPreviewPreparedToken,
    machineId: input.carrierIntegralSelection.machineId,
    selection: input.carrierIntegralSelection,
    synthLab: input.carrierIntegralSynthLab,
    harmonicXplore: input.carrierIntegralHarmonicXplore,
    previewBpm: input.previewBpm,
  };
}
