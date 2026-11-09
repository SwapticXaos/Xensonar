import type { TransientSource } from '../../resonance/transientRuntime';

export const AUDIO_LANE_IDS = {
  MATERIAL_TRACK: 'material-track',
  RHYTHM_PATTERN: 'rhythm-pattern',
  ROOT_FOLLOW: 'root-follow',
  WAVE_STARTER: 'wave-starter',
  PARTICLES: 'particles',
} as const;

export type AudioLaneId = typeof AUDIO_LANE_IDS[keyof typeof AUDIO_LANE_IDS];

export type AudioLaneProtectionClass =
  | 'protected-transport'
  | 'resilient-follower'
  | 'expressive-deferred'
  | 'density-sacrificial';

export const AUDIO_LANE_CONTRACTS = {
  [AUDIO_LANE_IDS.MATERIAL_TRACK]: {
    rank: 1,
    protectionClass: 'protected-transport',
    overloadBehavior: 'preserve-active-playback',
    timingContract: 'shared-audio-time',
  },
  [AUDIO_LANE_IDS.RHYTHM_PATTERN]: {
    rank: 2,
    protectionClass: 'protected-transport',
    overloadBehavior: 'preserve-clocked-pattern-tail',
    timingContract: 'shared-audio-time',
  },
  [AUDIO_LANE_IDS.ROOT_FOLLOW]: {
    rank: 3,
    protectionClass: 'resilient-follower',
    overloadBehavior: 'freeze-last-valid-cursor-then-recouple',
    timingContract: 'shared-audio-time-plus-live-cursor',
  },
  [AUDIO_LANE_IDS.WAVE_STARTER]: {
    rank: 4,
    protectionClass: 'expressive-deferred',
    overloadBehavior: 'defer-briefly-then-drop-stale',
    timingContract: 'shared-audio-time-intent',
  },
  [AUDIO_LANE_IDS.PARTICLES]: {
    rank: 5,
    protectionClass: 'density-sacrificial',
    overloadBehavior: 'drop-density-before-shared-time',
    timingContract: 'shared-audio-time-quantized',
  },
} as const satisfies Record<AudioLaneId, {
  rank: number;
  protectionClass: AudioLaneProtectionClass;
  overloadBehavior: string;
  timingContract: string;
}>;

export const XENSONAR_TRANSIENT_RUNTIME_VOICE_LIMITS = {
  softLimit: 52,
  hardLimit: 84,
  perSourceHard: {
    particle: 30,
    wave: 22,
    drum: 18,
    other: 14,
  },
} as const satisfies {
  softLimit: number;
  hardLimit: number;
  perSourceHard: Partial<Record<TransientSource, number>>;
};

export const XENSONAR_TRANSIENT_RUNTIME_VOICE_WINDOWS_MS = {
  wave: 24,
} as const satisfies Partial<Record<TransientSource, number>>;

export type DeferredWaveStarterAttack = {
  id: number;
  baseFreq: number;
  isSector: boolean;
  requestedAtMs: number;
  attempts: number;
};

export const WAVE_STARTER_DEFER_WINDOWS_MS = {
  flush: 6,
  softMax: 26,
  stale: 34,
  forceDrop: 42,
} as const;

export const WAVE_STARTER_DEFER_FLUSH_MS = WAVE_STARTER_DEFER_WINDOWS_MS.flush;
export const WAVE_STARTER_DEFER_SOFT_MAX_MS = WAVE_STARTER_DEFER_WINDOWS_MS.softMax;
export const WAVE_STARTER_DEFER_STALE_MS = WAVE_STARTER_DEFER_WINDOWS_MS.stale;
export const WAVE_STARTER_DEFER_FORCE_DROP_MS = WAVE_STARTER_DEFER_WINDOWS_MS.forceDrop;

export const WAVE_STARTER_LANE_ADMISSION_CONTRACT = {
  recentEventHorizonMs: 900,
  recentStartsFastWindowMs: 60,
  recentStartsMediumWindowMs: 120,
  recentStartsSlowWindowMs: 420,
  hardOverloadPressureBias: 0.94,
  hardOverloadScheduledToneCount: 126,
  hardOverloadRecentDefers120Ms: 8,
  hardOverloadRecentStarts120Ms: 3,
  heavyPressureBias: 0.76,
  heavyScheduledToneCount: 96,
  mediumPressureBias: 0.54,
  mediumScheduledToneCount: 76,
  heavyMinSpacingMs: 24,
  mediumMinSpacingMs: 14,
  quietMinSpacingMs: 4,
  denseRecentStarts60Ms: 4,
  denseRecentStarts120Ms: 5,
  denseRecentStarts420Ms: 12,
  denseHighPressureBias: 0.72,
  denseHighDelayMs: 12,
  denseQuietDelayMs: 8,
  pressureSlotBias: 0.82,
  pressureSlotScheduledToneCount: 112,
  pressureSlotStrongBias: 0.88,
  pressureSlotStrongScheduledToneCount: 120,
  pressureSlotStrongDelayMs: 14,
  pressureSlotDelayMs: 9,
  deferredSlotPressureBias: 0.68,
  deferredSlotScheduledToneCount: 92,
  deferredSlotDelayMs: 7,
  fallbackDelayMs: 7,
  minDelayMs: 4,
  maxDelayMs: 18,
} as const;

export function clampWaveStarterDelayMs(value: number): number {
  if (!Number.isFinite(value)) return WAVE_STARTER_LANE_ADMISSION_CONTRACT.fallbackDelayMs;
  return Math.max(
    WAVE_STARTER_LANE_ADMISSION_CONTRACT.minDelayMs,
    Math.min(WAVE_STARTER_LANE_ADMISSION_CONTRACT.maxDelayMs, value),
  );
}

export function resolveWaveStarterMinSpacingMs(pressureBias: number, activeScheduledToneCount: number): number {
  if (
    pressureBias >= WAVE_STARTER_LANE_ADMISSION_CONTRACT.heavyPressureBias
    || activeScheduledToneCount >= WAVE_STARTER_LANE_ADMISSION_CONTRACT.heavyScheduledToneCount
  ) {
    return WAVE_STARTER_LANE_ADMISSION_CONTRACT.heavyMinSpacingMs;
  }
  if (
    pressureBias >= WAVE_STARTER_LANE_ADMISSION_CONTRACT.mediumPressureBias
    || activeScheduledToneCount >= WAVE_STARTER_LANE_ADMISSION_CONTRACT.mediumScheduledToneCount
  ) {
    return WAVE_STARTER_LANE_ADMISSION_CONTRACT.mediumMinSpacingMs;
  }
  return WAVE_STARTER_LANE_ADMISSION_CONTRACT.quietMinSpacingMs;
}

export function isWaveStarterHardOverload(args: {
  pressureBias: number;
  activeScheduledToneCount: number;
  recentDefers120ms: number;
  recentStarts120ms: number;
}): boolean {
  return args.pressureBias >= WAVE_STARTER_LANE_ADMISSION_CONTRACT.hardOverloadPressureBias
    || args.activeScheduledToneCount >= WAVE_STARTER_LANE_ADMISSION_CONTRACT.hardOverloadScheduledToneCount
    || (
      args.recentDefers120ms >= WAVE_STARTER_LANE_ADMISSION_CONTRACT.hardOverloadRecentDefers120Ms
      && args.recentStarts120ms >= WAVE_STARTER_LANE_ADMISSION_CONTRACT.hardOverloadRecentStarts120Ms
    );
}

export function isWaveStarterDenseLane(args: {
  recentStarts60ms: number;
  recentStarts120ms: number;
  recentStarts420ms: number;
}): boolean {
  return args.recentStarts60ms >= WAVE_STARTER_LANE_ADMISSION_CONTRACT.denseRecentStarts60Ms
    || args.recentStarts120ms >= WAVE_STARTER_LANE_ADMISSION_CONTRACT.denseRecentStarts120Ms
    || args.recentStarts420ms >= WAVE_STARTER_LANE_ADMISSION_CONTRACT.denseRecentStarts420Ms;
}

export function resolveWaveStarterDenseLaneDelayMs(pressureBias: number): number {
  return pressureBias >= WAVE_STARTER_LANE_ADMISSION_CONTRACT.denseHighPressureBias
    ? WAVE_STARTER_LANE_ADMISSION_CONTRACT.denseHighDelayMs
    : WAVE_STARTER_LANE_ADMISSION_CONTRACT.denseQuietDelayMs;
}

export function isWaveStarterPressureSlotNeeded(pressureBias: number, activeScheduledToneCount: number): boolean {
  return pressureBias >= WAVE_STARTER_LANE_ADMISSION_CONTRACT.pressureSlotBias
    || activeScheduledToneCount >= WAVE_STARTER_LANE_ADMISSION_CONTRACT.pressureSlotScheduledToneCount;
}

export function resolveWaveStarterPressureSlotDelayMs(pressureBias: number, activeScheduledToneCount: number): number {
  return pressureBias >= WAVE_STARTER_LANE_ADMISSION_CONTRACT.pressureSlotStrongBias
    || activeScheduledToneCount >= WAVE_STARTER_LANE_ADMISSION_CONTRACT.pressureSlotStrongScheduledToneCount
    ? WAVE_STARTER_LANE_ADMISSION_CONTRACT.pressureSlotStrongDelayMs
    : WAVE_STARTER_LANE_ADMISSION_CONTRACT.pressureSlotDelayMs;
}

export function isWaveStarterDeferredSlotBlocked(pressureBias: number, activeScheduledToneCount: number): boolean {
  return pressureBias >= WAVE_STARTER_LANE_ADMISSION_CONTRACT.deferredSlotPressureBias
    || activeScheduledToneCount >= WAVE_STARTER_LANE_ADMISSION_CONTRACT.deferredSlotScheduledToneCount;
}
