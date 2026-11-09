import type {
  SpectralForgePreviewRequestIdentity,
  SpectralForgePreviewSessionState,
} from './spectralForgePreviewSessionTypes';
import { resolveSpectralForgeTransportPreviewTruth } from './spectralForgeTransportPreviewTruth';
export { isTransportPreviewPrepared } from './spectralForgeTransportPreviewTruth';

export type SpectralForgeTransportReadyGateInput = {
  currentRequest: SpectralForgePreviewRequestIdentity;
  preparedRequestKey: string | null;
  rendering: boolean;
  renderProgress: number;
  prewarmRendering: boolean;
  prewarmProgress: number;
  isPlaying: boolean;
  sessionState: SpectralForgePreviewSessionState;
};

export type SpectralForgeTransportReadyGate = {
  readyForImmediatePlay: boolean;
  renderFillActive: boolean;
  renderFillPercent: number;
};

export function resolveSpectralForgeTransportReadyGate(
  input: SpectralForgeTransportReadyGateInput,
): SpectralForgeTransportReadyGate {
  const truth = resolveSpectralForgeTransportPreviewTruth(input);
  return {
    readyForImmediatePlay: truth.readyForImmediatePlay,
    renderFillActive: truth.renderFillActive,
    renderFillPercent: truth.renderFillPercent,
  };
}
