import type {
  WaveStarterPerformancePolicy,
  WaveStarterSpecialPathIsolationPolicy,
} from './performanceCrisisTypes';

export const WAVE_STARTER_SPECIAL_PATH_ISOLATION_GLOBAL =
  '__XENSONAR_WAVE_STARTER_SPECIAL_PATH_ISOLATION__';

export const WAVE_STARTER_SPECIAL_PATH_ISOLATION_CONTRACT_ID =
  'wave-starter-special-path-isolation-contract' as const;

export const DEFAULT_WAVE_STARTER_SPECIAL_PATH_ISOLATION: WaveStarterSpecialPathIsolationPolicy = {
  holdGestureLoopWorkletBridge: true,
  holdGestureLegacyFallback: true,
  deferredSlot: true,
  staleFailoverCandidates: true,
  workletShadowMirroring: true,
  liveReports: true,
};

export function readWaveStarterSpecialPathIsolationForHotPath(
  policy?: Pick<WaveStarterPerformancePolicy, 'specialPathIsolation'> | null,
): WaveStarterSpecialPathIsolationPolicy {
  return policy?.specialPathIsolation ?? DEFAULT_WAVE_STARTER_SPECIAL_PATH_ISOLATION;
}

export function resolveWaveStarterSpecialPathIsolation(
  policy?: Pick<WaveStarterPerformancePolicy, 'specialPathIsolation'> | null,
): WaveStarterSpecialPathIsolationPolicy {
  const isolation = policy?.specialPathIsolation;
  if (!isolation) return { ...DEFAULT_WAVE_STARTER_SPECIAL_PATH_ISOLATION };
  return {
    holdGestureLoopWorkletBridge:
      isolation.holdGestureLoopWorkletBridge === true,
    holdGestureLegacyFallback: isolation.holdGestureLegacyFallback === true,
    deferredSlot: isolation.deferredSlot === true,
    staleFailoverCandidates: isolation.staleFailoverCandidates === true,
    workletShadowMirroring: isolation.workletShadowMirroring === true,
    liveReports: isolation.liveReports === true,
  };
}

export function publishWaveStarterSpecialPathIsolationToBrowser(
  policy?: Pick<WaveStarterPerformancePolicy, 'specialPathIsolation'> | null,
): WaveStarterSpecialPathIsolationPolicy {
  const resolved = resolveWaveStarterSpecialPathIsolation(policy);
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>)[
      WAVE_STARTER_SPECIAL_PATH_ISOLATION_GLOBAL
    ] = resolved;
  }
  return resolved;
}

export function readWaveStarterSpecialPathIsolationFromBrowserHotPath(): WaveStarterSpecialPathIsolationPolicy {
  if (typeof window === 'undefined') return DEFAULT_WAVE_STARTER_SPECIAL_PATH_ISOLATION;
  const value = (window as unknown as Record<string, unknown>)[
    WAVE_STARTER_SPECIAL_PATH_ISOLATION_GLOBAL
  ];
  return value && typeof value === 'object'
    ? (value as WaveStarterSpecialPathIsolationPolicy)
    : DEFAULT_WAVE_STARTER_SPECIAL_PATH_ISOLATION;
}

export function readWaveStarterSpecialPathIsolationFromBrowser(): WaveStarterSpecialPathIsolationPolicy {
  return resolveWaveStarterSpecialPathIsolation({
    specialPathIsolation: readWaveStarterSpecialPathIsolationFromBrowserHotPath(),
  });
}

export function formatWaveStarterSpecialPathIsolationValue(
  isolation: WaveStarterSpecialPathIsolationPolicy,
): string {
  return [
    `Hold-Bridge ${isolation.holdGestureLoopWorkletBridge ? 'an' : 'aus'}`,
    `Legacy-Fallback ${isolation.holdGestureLegacyFallback ? 'an' : 'aus'}`,
    `Defer ${isolation.deferredSlot ? 'an' : 'aus'}`,
    `Failover ${isolation.staleFailoverCandidates ? 'an' : 'aus'}`,
    `Shadow ${isolation.workletShadowMirroring ? 'an' : 'aus'}`,
    `Reports ${isolation.liveReports ? 'an' : 'aus'}`,
  ].join(' · ');
}
