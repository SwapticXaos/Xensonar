import { useEffect, useRef } from 'react';
import { snapshotAudioPressureMap, resolveAudioPressureBiasFromSnapshot } from '../../../core/audio/audioPressureMap';
import type { WaveStarterEmitOptions } from '../audio/waveStarterLaneRuntimeBridge';
import {
  collectDueWaveStarterHoldGestureLoopPulses,
  createWaveStarterHoldGestureLoopLaneState,
  hasActiveWaveStarterHoldGestureLoop,
  normalizeWaveStarterHoldPatternSteps,
  releaseWaveStarterHoldGestureLoop,
  resolveWaveStarterHoldGestureLoopFrame,
  resolveWaveStarterHoldSegments,
} from './waveStarterHoldSegmentClock';
import {
  isWaveStarterGestureLoopWorkletBridgeAllowedFromBrowser,
  publishWaveStarterGestureLoopWorkletBridgeDecision,
  resolveWaveStarterGestureLoopWorkletBridgeOptions,
} from './waveStarterGestureLoopWorkletBridge';
import { publishWaveStarterHoldPathForensicsSnapshot } from './waveStarterHoldPathForensics';
import { isResonanceSustainExtendKey } from './resonanceKeyboardCommandActions';

type HoldLane = 'wellenstart' | 'klaviatur';

type MutableCurrentRef<T> = { current: T };

type WaveStarterHoldParamsRef = MutableCurrentRef<{
  quantizeBpm?: number;
  waveStarterHoldSegments?: number;
  waveStarterHoldCustomSegments?: number;
  waveStarterHoldReferenceBars?: number;
  keyboardHoldSegments?: number;
  keyboardHoldCustomSegments?: number;
  keyboardHoldReferenceBars?: number;
  keyboardHoldPatternSteps?: readonly number[];
  waveStarterHoldPatternSteps?: readonly number[];
  keyboardHoldSoundPreset?: unknown;
  waveStarterHoldSoundPreset?: unknown;
}>;

type WaveStarterHoldNexusRefs = MutableCurrentRef<{
  cursorY: number;
}>;

export type UseWaveStarterHoldGestureLoopBridgeArgs = {
  resonanceInputActive: boolean;
  audioCtx: AudioContext | null;
  audioCtxRef: MutableCurrentRef<AudioContext | null>;
  activeScheduledTonesRef: MutableCurrentRef<unknown[]>;
  longToneHoldRef: MutableCurrentRef<boolean>;
  nexusParamsRef: WaveStarterHoldParamsRef;
  nexusRefs: WaveStarterHoldNexusRefs;
  gridTempoBpm: number;
  waveSoundPreset: string;
  freqFromY: (y: number) => number;
  playWaveStartSound: (baseFreq: number, isSector?: boolean, options?: WaveStarterEmitOptions) => void;
  recordAudioPressureAdaptiveAction: (action: any) => void;
};

export function useWaveStarterHoldGestureLoopBridge({
  resonanceInputActive,
  audioCtx,
  audioCtxRef,
  activeScheduledTonesRef,
  longToneHoldRef,
  nexusParamsRef,
  nexusRefs,
  gridTempoBpm,
  waveSoundPreset,
  freqFromY,
  playWaveStartSound,
  recordAudioPressureAdaptiveAction,
}: UseWaveStarterHoldGestureLoopBridgeArgs) {
  const waveStarterHoldGestureLoopRef = useRef(createWaveStarterHoldGestureLoopLaneState());
  const holdLoopRafRef = useRef<number | null>(null);
  const holdLoopAliveRef = useRef(false);
  const holdLoopFrameRef = useRef<() => void>(() => {});

  const ensureHoldLoopRaf = () => {
    if (!holdLoopAliveRef.current || holdLoopRafRef.current !== null) return;
    if (!hasActiveWaveStarterHoldGestureLoop({ state: waveStarterHoldGestureLoopRef.current })) return;
    holdLoopRafRef.current = requestAnimationFrame(() => {
      holdLoopRafRef.current = null;
      holdLoopFrameRef.current();
    });
  };

  const cancelIdleHoldLoopRaf = () => {
    if (hasActiveWaveStarterHoldGestureLoop({ state: waveStarterHoldGestureLoopRef.current })) return;
    if (holdLoopRafRef.current !== null) cancelAnimationFrame(holdLoopRafRef.current);
    holdLoopRafRef.current = null;
  };

  const resolveHoldClockBpm = () =>
    Math.max(40, nexusParamsRef.current.quantizeBpm || gridTempoBpm || 108);

  const resolveWaveStarterHoldSegmentsPerBar = () =>
    resolveWaveStarterHoldSegments(
      nexusParamsRef.current.waveStarterHoldSegments,
      nexusParamsRef.current.waveStarterHoldCustomSegments,
      24,
    );

  const resolveKeyboardHoldSegmentsPerBar = () =>
    resolveWaveStarterHoldSegments(
      nexusParamsRef.current.keyboardHoldSegments,
      nexusParamsRef.current.keyboardHoldCustomSegments,
      24,
    );

  const normalizeHoldReferenceBars = (value: unknown, fallback = 1) => {
    const numeric = typeof value === 'number' ? value : Number(value);
    return Math.max(0.125, Math.min(16, Number.isFinite(numeric) ? numeric : fallback));
  };

  const resolveWaveStarterHoldReferenceBars = () =>
    normalizeHoldReferenceBars(nexusParamsRef.current.waveStarterHoldReferenceBars, 1);

  const resolveKeyboardHoldReferenceBars = () =>
    normalizeHoldReferenceBars(nexusParamsRef.current.keyboardHoldReferenceBars, 1);

  const resolveWaveStarterHoldPatternStepsForLane = (lane: HoldLane) => {
    const segmentsPerBar =
      lane === 'klaviatur'
        ? resolveKeyboardHoldSegmentsPerBar()
        : resolveWaveStarterHoldSegmentsPerBar();
    return normalizeWaveStarterHoldPatternSteps(
      lane === 'klaviatur'
        ? nexusParamsRef.current.keyboardHoldPatternSteps
        : nexusParamsRef.current.waveStarterHoldPatternSteps,
      segmentsPerBar,
    );
  };

  const resolveWaveStarterHoldSoundPresetForLane = (lane: HoldLane) => {
    const value =
      lane === 'klaviatur'
        ? nexusParamsRef.current.keyboardHoldSoundPreset
        : nexusParamsRef.current.waveStarterHoldSoundPreset;
    return typeof value === 'string' && value ? value : waveSoundPreset;
  };

  const shouldEmitWellenstartHoldAudio = (
    isRepeat: boolean,
    targetHz?: number | null,
  ) => {
    const frame = resolveWaveStarterHoldGestureLoopFrame({
      state: waveStarterHoldGestureLoopRef.current,
      lane: 'wellenstart',
      keyId: 'Enter',
      isRepeat,
      nowMs: performance.now(),
      bpm: resolveHoldClockBpm(),
      segmentsPerBar: resolveWaveStarterHoldSegmentsPerBar(),
      referenceBars: resolveWaveStarterHoldReferenceBars(),
      targetHz,
      sustainExtendActive: longToneHoldRef.current,
      activeSteps: resolveWaveStarterHoldPatternStepsForLane('wellenstart'),
    });
    publishWaveStarterHoldPathForensicsSnapshot({
      state: waveStarterHoldGestureLoopRef.current,
      phase: frame.allowImmediateAudio
        ? 'initial-frame'
        : frame.reason === 'gesture-loop-owned-repeat'
          ? 'repeat-absorbed'
          : 'segment-idle',
      frame,
    });
    if (!frame.allowImmediateAudio) {
      recordAudioPressureAdaptiveAction('keyboard-input-hold-repeat-coalesced');
    }
    ensureHoldLoopRaf();
    return frame.allowImmediateAudio;
  };

  const shouldEmitKeyboardHoldWavePreview = (
    event: Pick<KeyboardEvent, 'key' | 'code' | 'repeat'>,
    payload?: { targetY: number; targetHz: number },
  ) => {
    const frame = resolveWaveStarterHoldGestureLoopFrame({
      state: waveStarterHoldGestureLoopRef.current,
      lane: 'klaviatur',
      keyId: event.code || event.key,
      isRepeat: event.repeat,
      nowMs: performance.now(),
      bpm: resolveHoldClockBpm(),
      segmentsPerBar: resolveKeyboardHoldSegmentsPerBar(),
      referenceBars: resolveKeyboardHoldReferenceBars(),
      targetHz: payload?.targetHz,
      sustainExtendActive: longToneHoldRef.current,
      activeSteps: resolveWaveStarterHoldPatternStepsForLane('klaviatur'),
    });
    publishWaveStarterHoldPathForensicsSnapshot({
      state: waveStarterHoldGestureLoopRef.current,
      phase: frame.allowImmediateAudio
        ? 'initial-frame'
        : frame.reason === 'gesture-loop-owned-repeat'
          ? 'repeat-absorbed'
          : 'segment-idle',
      frame,
    });
    if (!frame.allowImmediateAudio) {
      recordAudioPressureAdaptiveAction('keyboard-input-hold-repeat-coalesced');
    }
    ensureHoldLoopRaf();
    return frame.allowImmediateAudio;
  };

  const releaseWaveStarterHoldGestureForKey = (
    event: Pick<KeyboardEvent, 'key' | 'code'>,
  ) => {
    if (isResonanceSustainExtendKey(event)) return;
    if (event.key === 'Enter') {
      releaseWaveStarterHoldGestureLoop({
        state: waveStarterHoldGestureLoopRef.current,
        lane: 'wellenstart',
        keyId: 'Enter',
      });
      publishWaveStarterHoldPathForensicsSnapshot({
        state: waveStarterHoldGestureLoopRef.current,
        phase: 'release',
      });
      cancelIdleHoldLoopRaf();
      return;
    }
    releaseWaveStarterHoldGestureLoop({
      state: waveStarterHoldGestureLoopRef.current,
      lane: 'klaviatur',
      keyId: event.code || event.key,
    });
    publishWaveStarterHoldPathForensicsSnapshot({
      state: waveStarterHoldGestureLoopRef.current,
      phase: 'release',
    });
    cancelIdleHoldLoopRaf();
  };

  useEffect(() => {
    if (!resonanceInputActive) {
      holdLoopAliveRef.current = false;
      if (holdLoopRafRef.current !== null) cancelAnimationFrame(holdLoopRafRef.current);
      holdLoopRafRef.current = null;
      releaseWaveStarterHoldGestureLoop({ state: waveStarterHoldGestureLoopRef.current });
      publishWaveStarterHoldPathForensicsSnapshot({
        state: waveStarterHoldGestureLoopRef.current,
        phase: 'cleanup',
      });
      return;
    }

    holdLoopAliveRef.current = true;
    holdLoopFrameRef.current = () => {
      if (!holdLoopAliveRef.current) return;
      if (!hasActiveWaveStarterHoldGestureLoop({ state: waveStarterHoldGestureLoopRef.current })) {
        holdLoopRafRef.current = null;
        return;
      }
      const holdSpecialPathAllowed = isWaveStarterGestureLoopWorkletBridgeAllowedFromBrowser();
      const pulses = holdSpecialPathAllowed
        ? collectDueWaveStarterHoldGestureLoopPulses({
            state: waveStarterHoldGestureLoopRef.current,
            nowMs: performance.now(),
            bpm: resolveHoldClockBpm(),
            segmentsByLane: {
              wellenstart: resolveWaveStarterHoldSegmentsPerBar(),
              klaviatur: resolveKeyboardHoldSegmentsPerBar(),
            },
            referenceBarsByLane: {
              wellenstart: resolveWaveStarterHoldReferenceBars(),
              klaviatur: resolveKeyboardHoldReferenceBars(),
            },
            maxPulses: 6,
            sustainExtendActive: longToneHoldRef.current,
            activeStepsByLane: {
              wellenstart: resolveWaveStarterHoldPatternStepsForLane('wellenstart'),
              klaviatur: resolveWaveStarterHoldPatternStepsForLane('klaviatur'),
            },
          })
        : [];
      for (const pulse of pulses) {
        const freq = pulse.targetHz ?? freqFromY(nexusRefs.current.cursorY);
        if (Number.isFinite(freq)) {
          const bridgeDecision = resolveWaveStarterGestureLoopWorkletBridgeOptions({
            pulse,
            pressureBias: resolveAudioPressureBiasFromSnapshot(snapshotAudioPressureMap(750)).pressureBias,
            activeScheduledToneCount: activeScheduledTonesRef.current.length,
            audioReadyForPreview: !!audioCtxRef.current || !!audioCtx,
          });
          publishWaveStarterGestureLoopWorkletBridgeDecision(bridgeDecision);
          publishWaveStarterHoldPathForensicsSnapshot({
            state: waveStarterHoldGestureLoopRef.current,
            phase: 'segment-pulse',
            pulse,
            bridgeDecision,
          });
          playWaveStartSound(freq, false, {
            ...bridgeDecision.options,
            waveStarterPresetOverride: resolveWaveStarterHoldSoundPresetForLane(pulse.lane),
          });
        }
      }
      ensureHoldLoopRaf();
    };
    return () => {
      holdLoopAliveRef.current = false;
      if (holdLoopRafRef.current !== null) cancelAnimationFrame(holdLoopRafRef.current);
      holdLoopRafRef.current = null;
      holdLoopFrameRef.current = () => {};
      releaseWaveStarterHoldGestureLoop({ state: waveStarterHoldGestureLoopRef.current });
      publishWaveStarterHoldPathForensicsSnapshot({
        state: waveStarterHoldGestureLoopRef.current,
        phase: 'cleanup',
      });
    };
  }, [resonanceInputActive, audioCtx]);

  return {
    shouldEmitWellenstartHoldAudio,
    shouldEmitKeyboardHoldWavePreview,
    releaseWaveStarterHoldGestureForKey,
    resolveKeyboardWaveStarterSoundPreset: () => resolveWaveStarterHoldSoundPresetForLane('klaviatur'),
  } as const;
}
