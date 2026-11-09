import type { RootFollowVoiceEngineMode } from '../performanceCrisis/performanceCrisisTypes';

export type RootFollowLegacyReliefGate =
  | 'granular-primary-health'
  | 'stable-lane-primary-audition'
  | 'stable-lane-sustained-relief'
  | 'stable-lane-warmup'
  | 'stable-lane-fallback'
  | 'no-relief';

export function isRootFollowLegacyReliefGate(value: string | null): value is RootFollowLegacyReliefGate {
  return value === 'granular-primary-health'
    || value === 'stable-lane-primary-audition'
    || value === 'stable-lane-sustained-relief'
    || value === 'stable-lane-warmup'
    || value === 'stable-lane-fallback'
    || value === 'no-relief';
}

export function normalizeRootFollowLegacyReliefGate(value: unknown): RootFollowLegacyReliefGate {
  return typeof value === 'string' && isRootFollowLegacyReliefGate(value) ? value : 'no-relief';
}

export function resolveRootFollowLegacyReliefGate(args: {
  stableLaneEnabled: boolean;
  stableLaneProven: boolean;
  stableLaneReliefReady: boolean;
  stableLaneWarmupReason: string | null;
  fallbackReason: string | null;
  primaryCandidateCanMuteLegacy: boolean;
  stableLanePrimaryAuditionReady: boolean;
}): RootFollowLegacyReliefGate {
  if (args.primaryCandidateCanMuteLegacy) return 'granular-primary-health';
  if (args.stableLanePrimaryAuditionReady) return 'stable-lane-primary-audition';
  if (!args.stableLaneEnabled) return 'no-relief';
  if (args.stableLaneReliefReady) return 'stable-lane-sustained-relief';
  if (args.stableLaneProven || args.stableLaneWarmupReason) return 'stable-lane-warmup';
  if (args.fallbackReason) return 'stable-lane-fallback';
  return 'no-relief';
}

export function resolveRootFollowLegacyReliefGateNote(
  value: unknown,
  mode: RootFollowVoiceEngineMode,
): string {
  const gate = normalizeRootFollowLegacyReliefGate(value);
  if (gate === 'granular-primary-health') {
    return 'Primary Kandidat mutet Legacy nur über granular pilot-health; das ist nicht der Stable-Lane-Sustained-Gate.';
  }
  if (gate === 'stable-lane-primary-audition') {
    return 'Stable-Lane Primary Test hat frischen Buffer/Plan-Proof; Legacy-Root/Material-Slices werden früh stummgeschaltet, damit Crackle/Doppelung hörbar getrennt wird.';
  }
  if (gate === 'stable-lane-sustained-relief') {
    return 'Stable Lane hat sustained gerendert; redundante Legacy-Root/Material-Slices dürfen entlastet werden.';
  }
  if (gate === 'stable-lane-warmup') {
    return 'Stable Lane ist proven, aber noch im Warmup; Legacy bleibt hörbarer Schutzpfad.';
  }
  if (gate === 'stable-lane-fallback') {
    return 'Stable-Lane-Proof ist stale oder unvollständig; Legacy bleibt aktiv.';
  }
  if (mode === 'worklet-stable-lane-pilot' || mode === 'worklet-stable-lane-primary-audition') {
    return 'Noch kein aktueller Stable-Lane-Relief-Nachweis im Recorder-Fenster.';
  }
  if (mode === 'worklet-granular-primary-candidate') {
    return 'Primary Kandidat gewählt, aber im Recorder-Fenster wurde noch kein Legacy-Mute-Gate gesehen.';
  }
  return 'Kein Worklet-Relief-Gate aktiv; Legacy bleibt Referenz/Fallback.';
}
