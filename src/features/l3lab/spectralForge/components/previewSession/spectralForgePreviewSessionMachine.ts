import type {
  SpectralForgePreviewSessionEvent,
  SpectralForgePreviewSessionState,
} from './spectralForgePreviewSessionTypes';

const clampProgress = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

function currentRequestKey(state: SpectralForgePreviewSessionState): string | null {
  switch (state.kind) {
    case 'scheduled':
    case 'prewarming':
    case 'ready':
    case 'playing':
      return state.requestKey;
    case 'stale':
      return state.currentKey;
    case 'error':
      return state.requestKey ?? null;
    case 'idle':
    case 'dirty':
    default:
      return null;
  }
}

export function reduceSpectralForgePreviewSession(
  state: SpectralForgePreviewSessionState,
  event: SpectralForgePreviewSessionEvent,
): SpectralForgePreviewSessionState {
  switch (event.type) {
    case 'markDirty':
      return { kind: 'dirty', reason: event.reason, routeKind: event.routeKind };
    case 'schedule':
      return { kind: 'scheduled', requestKey: event.requestKey, routeKind: event.routeKind, reason: event.reason };
    case 'prewarmStart':
      return { kind: 'prewarming', requestKey: event.requestKey, routeKind: event.routeKind, progress: 0 };
    case 'prewarmProgress': {
      const expectedKey = currentRequestKey(state);
      if (expectedKey && expectedKey !== event.requestKey) {
        return { kind: 'stale', previousKey: event.requestKey, currentKey: expectedKey, routeKind: event.routeKind };
      }
      return { kind: 'prewarming', requestKey: event.requestKey, routeKind: event.routeKind, progress: clampProgress(event.progress) };
    }
    case 'ready': {
      const expectedKey = currentRequestKey(state);
      if (expectedKey && expectedKey !== event.requestKey) {
        return { kind: 'stale', previousKey: event.requestKey, currentKey: expectedKey, routeKind: event.routeKind };
      }
      return { kind: 'ready', requestKey: event.requestKey, routeKind: event.routeKind, cacheHit: event.cacheHit };
    }
    case 'playStart': {
      const expectedKey = currentRequestKey(state);
      if (expectedKey && expectedKey !== event.requestKey) {
        return { kind: 'stale', previousKey: event.requestKey, currentKey: expectedKey, routeKind: event.routeKind };
      }
      return { kind: 'playing', requestKey: event.requestKey, routeKind: event.routeKind, loop: event.loop };
    }
    case 'playEnd': {
      const expectedKey = currentRequestKey(state);
      if (expectedKey && expectedKey !== event.requestKey) {
        return { kind: 'stale', previousKey: event.requestKey, currentKey: expectedKey, routeKind: event.routeKind };
      }
      return { kind: 'ready', requestKey: event.requestKey, routeKind: event.routeKind, cacheHit: true };
    }
    case 'staleResult':
      return { kind: 'stale', previousKey: event.previousKey, currentKey: event.currentKey, routeKind: event.routeKind };
    case 'error':
      return { kind: 'error', requestKey: event.requestKey, routeKind: event.routeKind, message: event.message };
    default:
      return state;
  }
}
