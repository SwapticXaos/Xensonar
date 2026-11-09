import type { WaveStarterEmitOptions } from './waveStarterLaneRuntimeBridge';

export const WAVE_STARTER_WORKLET_RUNTIME_OWNERSHIP_ID =
  'wave-starter-worklet-runtime-ownership-v1' as const;

export const WAVE_STARTER_WORKLET_RUNTIME_OWNERSHIP = {
  audibleDefaultOwner: 'legacy-9061-main-thread',
  workletRole: 'explicit-special-path-only',
  normalHitMirroring: false,
  normalHitFailoverEvaluation: false,
  normalHitVoicePoolSubmission: false,
} as const;

export function isExplicitWaveStarterWorkletSpecialPath(
  options?: WaveStarterEmitOptions,
): boolean {
  return Boolean(
    options?.keyboardGlissandoWorkletDirect === true ||
      options?.keyboardGlissandoWorkletOnly === true ||
      options?.waveStarterGestureLoopWorkletBridge === true ||
      options?.waveStarterGestureLoopWorkletOnly === true ||
      options?.waveStarterInstrumentEngineSkeleton === true ||
      options?.synthWorkletFailoverCandidate === true ||
      options?.sampleWorkletFailoverCandidate === true,
  );
}
