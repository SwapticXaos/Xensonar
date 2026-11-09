export type SpectralForgePreviewRouteKind =
  | 'spectral'
  | 'basis-hearing'
  | 'carrier-integral'
  | 'unknown'
  | 'none';


export type SpectralForgePreviewRequestIdentity = {
  requestKey: string;
  routeKind: SpectralForgePreviewRouteKind;
};

export type SpectralForgePreviewScheduleRequest = SpectralForgePreviewRequestIdentity & {
  reason: string;
};

export type SpectralForgePreviewRequest = {
  identity: SpectralForgePreviewRequestIdentity;
  routeKind: SpectralForgePreviewRouteKind;
  reason: string;
  loopPreview: boolean;
  createdAt: number;
};

export function createSpectralForgePreviewRequest(input: {
  identity: SpectralForgePreviewRequestIdentity;
  reason: string;
  loopPreview?: boolean;
  createdAt?: number;
}): SpectralForgePreviewRequest {
  return {
    identity: input.identity,
    routeKind: input.identity.routeKind,
    reason: input.reason,
    loopPreview: input.loopPreview ?? false,
    createdAt: input.createdAt ?? Date.now(),
  };
}

export function createSpectralForgePreviewRequestIdentity(
  input: SpectralForgePreviewRequestIdentity,
): SpectralForgePreviewRequestIdentity {
  return input;
}

export type SpectralForgePreviewSessionState =
  | { kind: 'idle' }
  | { kind: 'dirty'; reason: string; routeKind: SpectralForgePreviewRouteKind }
  | { kind: 'scheduled'; requestKey: string; routeKind: SpectralForgePreviewRouteKind; reason: string }
  | { kind: 'prewarming'; requestKey: string; routeKind: SpectralForgePreviewRouteKind; progress: number }
  | { kind: 'ready'; requestKey: string; routeKind: SpectralForgePreviewRouteKind; cacheHit: boolean }
  | { kind: 'playing'; requestKey: string; routeKind: SpectralForgePreviewRouteKind; loop: boolean }
  | { kind: 'stale'; previousKey: string; currentKey: string; routeKind: SpectralForgePreviewRouteKind }
  | { kind: 'error'; requestKey?: string; routeKind: SpectralForgePreviewRouteKind; message: string };

export type SpectralForgePreviewSessionEvent =
  | { type: 'markDirty'; reason: string; routeKind: SpectralForgePreviewRouteKind }
  | { type: 'schedule'; requestKey: string; routeKind: SpectralForgePreviewRouteKind; reason: string }
  | { type: 'prewarmStart'; requestKey: string; routeKind: SpectralForgePreviewRouteKind }
  | { type: 'prewarmProgress'; requestKey: string; routeKind: SpectralForgePreviewRouteKind; progress: number }
  | { type: 'ready'; requestKey: string; routeKind: SpectralForgePreviewRouteKind; cacheHit: boolean }
  | { type: 'playStart'; requestKey: string; routeKind: SpectralForgePreviewRouteKind; loop: boolean }
  | { type: 'playEnd'; requestKey: string; routeKind: SpectralForgePreviewRouteKind }
  | { type: 'staleResult'; previousKey: string; currentKey: string; routeKind: SpectralForgePreviewRouteKind }
  | { type: 'error'; requestKey?: string; routeKind: SpectralForgePreviewRouteKind; message: string };

export function isSpectralForgePreviewSessionRoute(
  routeKind: SpectralForgePreviewRouteKind,
): routeKind is 'spectral' | 'basis-hearing' | 'carrier-integral' {
  return routeKind === 'spectral' || routeKind === 'basis-hearing' || routeKind === 'carrier-integral';
}
