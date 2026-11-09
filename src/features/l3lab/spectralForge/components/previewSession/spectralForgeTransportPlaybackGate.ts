import { isTransportPreviewPrepared } from './spectralForgeTransportReadyGate';
import type { SpectralForgePreviewRequestIdentity } from './spectralForgePreviewSessionTypes';

export type SpectralForgeTransportPlaybackGateInput = {
  currentRequest: SpectralForgePreviewRequestIdentity;
  preparedRequestKey: string | null;
  serialPrewarmInFlight: boolean;
};

export type SpectralForgeTransportPlaybackGate = {
  previewIsPrepared: boolean;
  routeCanShowRenderFeedback: boolean;
  canStartPlayback: boolean;
  blockedStatusMessage: string | null;
};

export function resolveSpectralForgeTransportPlaybackGate(
  input: SpectralForgeTransportPlaybackGateInput,
): SpectralForgeTransportPlaybackGate {
  const routeCanShowRenderFeedback = input.currentRequest.routeKind !== 'none';
  const previewIsPrepared = isTransportPreviewPrepared({
    currentRequest: input.currentRequest,
    preparedRequestKey: input.preparedRequestKey,
  });
  const canStartPlayback = !routeCanShowRenderFeedback || previewIsPrepared;
  const blockedStatusMessage = canStartPlayback
    ? null
    : input.serialPrewarmInFlight
      ? 'Vorhören wird vorbereitet · Play startet nicht als Renderauslöser'
      : 'Vorhören wartet auf automatische Vorbereitung';

  return {
    previewIsPrepared,
    routeCanShowRenderFeedback,
    canStartPlayback,
    blockedStatusMessage,
  };
}

export function resolveBasisHearingPlaybackStatus(input: {
  previewIsPrepared: boolean;
  machineId: string;
}): string {
  return input.previewIsPrepared
    ? `Hörweise bereit: ${input.machineId}`
    : `Hörweise rendert: ${input.machineId}`;
}
