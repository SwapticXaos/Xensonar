import type {
  SpectralForgePreviewRequestIdentity,
  SpectralForgePreviewRouteKind,
  SpectralForgePreviewSessionState,
} from './spectralForgePreviewSessionTypes';
export type SpectralForgeTransportPreviewTruthStatus =
  | 'idle'
  | 'preparing'
  | 'prepared'
  | 'playing'
  | 'stale'
  | 'blocked';

export type SpectralForgeTransportPreviewTruthInput = {
  currentRequest: SpectralForgePreviewRequestIdentity;
  preparedRequestKey: string | null;
  rendering: boolean;
  renderProgress: number;
  prewarmRendering: boolean;
  prewarmProgress: number;
  isPlaying: boolean;
  sessionState: SpectralForgePreviewSessionState;
};

export type SpectralForgeTransportPreviewTruth = {
  status: SpectralForgeTransportPreviewTruthStatus;
  readyForImmediatePlay: boolean;
  renderFillActive: boolean;
  renderFillPercent: number;
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function isTransportPreviewPrepared(input: {
  currentRequest: SpectralForgePreviewRequestIdentity;
  preparedRequestKey: string | null;
}): boolean {
  return input.currentRequest.routeKind !== 'none' && input.preparedRequestKey === input.currentRequest.requestKey;
}

function sessionOwnsCurrentRequest(
  state: SpectralForgePreviewSessionState,
  routeKind: SpectralForgePreviewRouteKind,
  requestKey: string,
): boolean {
  switch (state.kind) {
    case 'ready':
    case 'playing':
    case 'prewarming':
    case 'scheduled':
      return state.routeKind === routeKind && state.requestKey === requestKey;
    case 'stale':
      return state.routeKind === routeKind && state.currentKey === requestKey;
    case 'error':
      return state.routeKind === routeKind && state.requestKey === requestKey;
    case 'idle':
    case 'dirty':
    default:
      return false;
  }
}

function sessionContradictsPreparedToken(state: SpectralForgePreviewSessionState): boolean {
  return (
    state.kind === 'dirty' ||
    state.kind === 'scheduled' ||
    state.kind === 'prewarming' ||
    state.kind === 'stale' ||
    state.kind === 'error'
  );
}

export function resolveSpectralForgeTransportPreviewTruth(
  input: SpectralForgeTransportPreviewTruthInput,
): SpectralForgeTransportPreviewTruth {
  const tokenPrepared = isTransportPreviewPrepared({
    currentRequest: input.currentRequest,
    preparedRequestKey: input.preparedRequestKey,
  });
  const sessionCurrent = sessionOwnsCurrentRequest(
    input.sessionState,
    input.currentRequest.routeKind,
    input.currentRequest.requestKey,
  );
  const sessionContradictsPrepared = sessionContradictsPreparedToken(input.sessionState);

  const readyForImmediatePlay =
    tokenPrepared &&
    (!sessionCurrent ||
      !sessionContradictsPrepared ||
      input.sessionState.kind === 'ready' ||
      input.sessionState.kind === 'playing');

  const rawActive = input.rendering || input.prewarmRendering;
  const rawProgress = clamp01(input.rendering ? input.renderProgress : input.prewarmProgress);
  const renderFillActive = rawActive && (input.rendering || (!readyForImmediatePlay && !input.isPlaying));
  const renderFillPercent = renderFillActive
    ? Math.max(4, Math.min(100, Math.round(rawProgress * 100)))
    : 0;

  const status: SpectralForgeTransportPreviewTruthStatus = input.isPlaying && input.sessionState.kind === 'playing'
    ? 'playing'
    : readyForImmediatePlay
      ? 'prepared'
      : renderFillActive
        ? 'preparing'
        : sessionCurrent && input.sessionState.kind === 'stale'
          ? 'stale'
          : sessionCurrent && sessionContradictsPrepared
            ? 'blocked'
            : 'idle';

  return {
    status,
    readyForImmediatePlay,
    renderFillActive,
    renderFillPercent,
  };
}
