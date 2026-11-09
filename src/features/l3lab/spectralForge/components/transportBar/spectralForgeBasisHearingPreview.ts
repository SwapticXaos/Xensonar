import type { ForgeProjectSnapshot } from '../../state/store';
import type {
  CarrierIntegralHarmonicXploreSelection,
  CarrierIntegralMachineId,
  CarrierIntegralSelection,
  CarrierIntegralSynthLabSelection,
} from '../../integral';
import { auditionForgeProjectCarrierIntegral, prewarmForgeProjectCarrierIntegralPreview } from '../../integral/carrierIntegralAudition';
import { createCarrierIntegralAuditionRequest } from '../carrierIntegralVerwalten/carrierIntegralPreviewSession';

export type SpectralForgeBasisHearingPreviewRequest = {
  snapshot: ForgeProjectSnapshot;
  machineId: CarrierIntegralMachineId;
  selection: CarrierIntegralSelection;
  synthLab: CarrierIntegralSynthLabSelection;
  harmonicXplore: CarrierIntegralHarmonicXploreSelection;
  previewBpm: number;
  previewGain?: number;
  previewPitchSemitones?: number;
  loopPreview?: boolean;
  onAudioPosition?: (pos: number) => void;
  onAudioEnd?: () => void;
  onRenderProgress?: (progress: number) => void;
};


export type SpectralForgeBasisHearingPrewarmResult = {
  warmed: boolean;
  cacheHit: boolean;
  cacheKey: string;
  rendered: boolean;
  reason: string;
  machineId: CarrierIntegralMachineId;
};

export async function prewarmSpectralForgeBasisHearingPreview(
  request: SpectralForgeBasisHearingPreviewRequest,
): Promise<SpectralForgeBasisHearingPrewarmResult> {
  const projectName = request.snapshot.materialExport.name || 'SpectralForge Zeichnung';
  const result = await prewarmForgeProjectCarrierIntegralPreview(
    createCarrierIntegralAuditionRequest({
      projectName,
      snapshot: request.snapshot,
      machineId: request.machineId,
      valueSource: 'right-override',
      selection: request.selection,
      synthLab: request.synthLab,
      harmonicXplore: request.harmonicXplore,
      previewPitchSemitones: request.previewPitchSemitones ?? 0,
      previewGain: request.previewGain ?? 1,
      previewBpm: request.previewBpm,
      loopPreview: !!request.loopPreview,
      onRenderProgress: request.onRenderProgress,
    }),
  );

  return {
    warmed: result.warmed,
    cacheHit: result.cacheHit,
    cacheKey: result.cacheKey,
    rendered: result.rendered,
    reason: result.reason,
    machineId: request.machineId,
  };
}

export async function playSpectralForgeBasisHearingPreview(
  request: SpectralForgeBasisHearingPreviewRequest,
): Promise<{ played: boolean; reason: string; machineId: CarrierIntegralMachineId; cacheHit?: boolean }> {
  const projectName = request.snapshot.materialExport.name || 'SpectralForge Zeichnung';
  const previewGain = request.previewGain ?? 1;
  const previewPitchSemitones = request.previewPitchSemitones ?? 0;

  const result = await auditionForgeProjectCarrierIntegral(
    createCarrierIntegralAuditionRequest({
      projectName,
      snapshot: request.snapshot,
      machineId: request.machineId,
      valueSource: 'right-override',
      selection: request.selection,
      synthLab: request.synthLab,
      harmonicXplore: request.harmonicXplore,
      previewPitchSemitones,
      previewGain,
      previewBpm: request.previewBpm,
      loopPreview: !!request.loopPreview,
      onRenderProgress: request.onRenderProgress,
      onAudioPosition: request.onAudioPosition,
      onAudioEnd: request.onAudioEnd,
    }),
  );

  return {
    played: result.played,
    reason: result.reason,
    machineId: request.machineId,
    cacheHit: result.cacheHit,
  };
}
