export type StableLaneSabTransportReadiness = 'available' | 'blocked' | 'unknown';

export type StableLaneSabTransportReadinessReason =
  | 'ready'
  | 'not-in-browser-runtime'
  | 'secure-context-missing'
  | 'shared-array-buffer-missing'
  | 'cross-origin-isolation-missing';

export const STABLE_LANE_SAB_REQUIRED_COOP = 'Cross-Origin-Opener-Policy: same-origin';
export const STABLE_LANE_SAB_REQUIRED_COEP = 'Cross-Origin-Embedder-Policy: require-corp';

export type StableLaneSabTransportReadinessSnapshot = {
  stableLaneSabTransportReadiness: StableLaneSabTransportReadiness;
  stableLaneSabTransportReady: boolean;
  stableLaneSabTransportReadinessReason: StableLaneSabTransportReadinessReason;
  stableLaneSabTransportSharedArrayBufferAvailable: boolean;
  stableLaneSabTransportCrossOriginIsolated: boolean;
  stableLaneSabTransportSecureContext: boolean;
  stableLaneSabTransportSingleFileHtmlLikelyBlocked: boolean;
  stableLaneSabTransportRequiredCoop: string;
  stableLaneSabTransportRequiredCoep: string;
};

function readGlobalBoolean(name: string): boolean {
  const host = globalThis as Record<string, unknown>;
  return host[name] === true;
}

function readLocationProtocol(): string | null {
  const host = globalThis as { location?: { protocol?: unknown } };
  const protocol = host.location?.protocol;
  return typeof protocol === 'string' ? protocol : null;
}

export function detectStableLaneSabTransportReadiness(): StableLaneSabTransportReadinessSnapshot {
  const inBrowserRuntime = typeof window !== 'undefined';
  const protocol = readLocationProtocol();
  const sharedArrayBufferAvailable = typeof (globalThis as Record<string, unknown>).SharedArrayBuffer === 'function';
  const crossOriginIsolated = readGlobalBoolean('crossOriginIsolated');
  const secureContext = readGlobalBoolean('isSecureContext');
  const singleFileHtmlLikelyBlocked = protocol === 'file:' || (!crossOriginIsolated && inBrowserRuntime);

  let readiness: StableLaneSabTransportReadiness = 'blocked';
  let reason: StableLaneSabTransportReadinessReason = 'ready';

  if (!inBrowserRuntime) {
    readiness = 'unknown';
    reason = 'not-in-browser-runtime';
  } else if (!secureContext) {
    reason = 'secure-context-missing';
  } else if (!crossOriginIsolated) {
    reason = 'cross-origin-isolation-missing';
  } else if (!sharedArrayBufferAvailable) {
    reason = 'shared-array-buffer-missing';
  } else {
    readiness = 'available';
    reason = 'ready';
  }

  return {
    stableLaneSabTransportReadiness: readiness,
    stableLaneSabTransportReady: readiness === 'available',
    stableLaneSabTransportReadinessReason: reason,
    stableLaneSabTransportSharedArrayBufferAvailable: sharedArrayBufferAvailable,
    stableLaneSabTransportCrossOriginIsolated: crossOriginIsolated,
    stableLaneSabTransportSecureContext: secureContext,
    stableLaneSabTransportSingleFileHtmlLikelyBlocked: singleFileHtmlLikelyBlocked,
    stableLaneSabTransportRequiredCoop: STABLE_LANE_SAB_REQUIRED_COOP,
    stableLaneSabTransportRequiredCoep: STABLE_LANE_SAB_REQUIRED_COEP,
  };
}

export function withStableLaneSabTransportReadiness<T extends object>(
  snapshot: T,
): T & StableLaneSabTransportReadinessSnapshot {
  return {
    ...snapshot,
    ...detectStableLaneSabTransportReadiness(),
  };
}
