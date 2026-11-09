import type { WaveStarterEmitOptions } from './waveStarterLaneRuntimeBridge';

export const WAVE_STARTER_9061_DIRECT_CONTRACT_ID = 'wave-starter-9061-direct-contract' as const;

export const WAVE_STARTER_9061_DIRECT_CONTRACT_SUMMARY = [
  'Normal Wellenstarter hits stay on the 90.61-style direct path.',
  'Only explicitly marked bridge/failover/hold-worklet paths may enter the modern Wellenstarter lane runtime.',
  'The direct hit path must keep the primitive transient gate before VoiceSpec, Worklet shadow, failover ledger, FX routing, and tone/node construction.',
] as const;

export const WAVE_STARTER_MODERN_LANE_OPTION_KEYS = [
  'fromDeferredSlot',
  'waveStarterGestureLoopWorkletBridge',
  'waveStarterGestureLoopWorkletOnly',
  'synthWorkletFailoverCandidate',
  'sampleWorkletFailoverCandidate',
] as const;

export function requiresModernWaveStarterLane(options?: WaveStarterEmitOptions): boolean {
  return (
    options?.fromDeferredSlot === true ||
    options?.waveStarterGestureLoopWorkletBridge === true ||
    options?.waveStarterGestureLoopWorkletOnly === true ||
    options?.synthWorkletFailoverCandidate === true ||
    options?.sampleWorkletFailoverCandidate === true
  );
}

export function isImmediateKeyboardWaveStarterGesture(options?: WaveStarterEmitOptions): boolean {
  return (
    options?.keyboardGestureSource === 'keyboard-direct' ||
    options?.keyboardGestureSource === 'keyboard-glissando'
  );
}

export function asLegacy9061WaveStarterDirectOptions(
  options?: WaveStarterEmitOptions,
): WaveStarterEmitOptions {
  const immediateKeyboard = isImmediateKeyboardWaveStarterGesture(options);
  return {
    legacy9061DirectGate: true,
    // A human keyboard gesture is current when its JS handler runs. Do not carry
    // an old DOM timestamp into the audio scheduler and then punish the gesture
    // for main-thread delay. Scheduled/non-keyboard events keep their provenance.
    requestedAtMs: immediateKeyboard ? undefined : options?.requestedAtMs,
    forceSustainExtend: options?.forceSustainExtend,
    waveStarterPresetOverride: options?.waveStarterPresetOverride,
    keyboardGestureSource: options?.keyboardGestureSource,
  };
}
