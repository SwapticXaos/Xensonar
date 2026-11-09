import type { WaveStarterRuntimePolicy } from '../performanceCrisis/performanceCrisisRuntimePolicies';
import type { WaveStarterLaneAdmission } from './waveStarterLaneGuard';

export type WaveStarterMicroReleaseDecision =
  | {
      kind: 'retry-slot';
      reason: 'too-young' | 'pressure-settling' | 'catastrophic-pressure';
      delayMs: number;
    }
  | {
      kind: 'emit-micro';
      reason: 'bounded-defer-release' | 'strong-attack-preserved' | 'late-slot-release';
      gainScale: number;
      voiceDemandMul: number;
    }
  | {
      kind: 'drop-stale';
      reason: 'stale' | 'catastrophic-pressure' | 'strict-policy';
    };

export type WaveStarterMicroReleaseArgs = {
  admission: WaveStarterLaneAdmission;
  ageMs: number;
  attempts: number;
  pressureBias: number;
  activeScheduledToneCount: number;
  policy?: WaveStarterRuntimePolicy;
  staleMs: number;
  softMaxMs: number;
  forceDropMs: number;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));

export function resolveWaveStarterMicroRelease(args: WaveStarterMicroReleaseArgs): WaveStarterMicroReleaseDecision {
  const ageMs = Number.isFinite(args.ageMs) ? Math.max(0, args.ageMs) : Infinity;
  const attempts = Math.max(0, Math.floor(Number.isFinite(args.attempts) ? args.attempts : 0));
  const pressureBias = clamp(args.pressureBias, 0, 1);
  const activeScheduledToneCount = Math.max(0, Number.isFinite(args.activeScheduledToneCount) ? args.activeScheduledToneCount : 0);
  const preserveStrongAttacks = args.policy?.preserveStrongAttacks !== false;
  const strictPressure = pressureBias >= 0.985 || activeScheduledToneCount >= 150;
  const catastrophicPressure = pressureBias >= 0.995 || activeScheduledToneCount >= 172;
  const staleMs = clamp(args.staleMs, 8, 40);
  const softMaxMs = clamp(args.softMaxMs, 10, Math.max(12, staleMs + 4));
  const forceDropMs = clamp(args.forceDropMs, staleMs + 4, 56);
  const microFloorMs = clamp(5 + attempts * 2 + pressureBias * 4, 5, 12);
  const retryDelayMs = clamp(args.admission.recommendedDelayMs || 5, 4, 10);

  if (!Number.isFinite(ageMs) || ageMs > forceDropMs) {
    return { kind: 'drop-stale', reason: 'stale' };
  }

  if (catastrophicPressure) {
    if (ageMs < Math.min(softMaxMs, 18)) return { kind: 'retry-slot', reason: 'catastrophic-pressure', delayMs: 5 };
    return { kind: 'drop-stale', reason: 'catastrophic-pressure' };
  }

  if (args.admission.kind === 'admit-full') {
    return {
      kind: 'emit-micro',
      reason: ageMs >= softMaxMs ? 'late-slot-release' : 'bounded-defer-release',
      gainScale: 1,
      voiceDemandMul: 1,
    };
  }

  if (ageMs < microFloorMs) {
    return { kind: 'retry-slot', reason: 'too-young', delayMs: retryDelayMs };
  }

  if (args.admission.kind === 'drop-overload') {
    if (!preserveStrongAttacks) return { kind: 'drop-stale', reason: 'strict-policy' };
    if (strictPressure && ageMs < softMaxMs) return { kind: 'retry-slot', reason: 'pressure-settling', delayMs: 5 };
    if (ageMs <= staleMs + 10) {
      const pressureTrim = clamp(1 - pressureBias * 0.34 - Math.max(0, activeScheduledToneCount - 96) / 280, 0.54, 0.82);
      return {
        kind: 'emit-micro',
        reason: 'strong-attack-preserved',
        gainScale: pressureTrim,
        voiceDemandMul: clamp(0.78 - pressureBias * 0.16, 0.58, 0.78),
      };
    }
    return { kind: 'drop-stale', reason: 'stale' };
  }

  if (ageMs < Math.min(softMaxMs, staleMs * 0.55) && attempts === 0) {
    return { kind: 'retry-slot', reason: 'pressure-settling', delayMs: retryDelayMs };
  }

  if (ageMs <= staleMs + 8) {
    const pressureTrim = clamp(1 - pressureBias * 0.24 - Math.max(0, activeScheduledToneCount - 88) / 360, 0.64, 0.92);
    return {
      kind: 'emit-micro',
      reason: ageMs >= softMaxMs ? 'late-slot-release' : 'bounded-defer-release',
      gainScale: pressureTrim,
      voiceDemandMul: clamp(0.9 - pressureBias * 0.14, 0.68, 0.94),
    };
  }

  return { kind: 'drop-stale', reason: 'stale' };
}
