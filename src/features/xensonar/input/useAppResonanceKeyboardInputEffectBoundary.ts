import { useEffect } from "react";
import type { WaveStarterEmitOptions } from "../audio/waveStarterLaneRuntimeBridge";
import {
  runResonanceKeyboardInputRouter,
  type ResonanceKeyboardInputRouterArgs,
  type ResonanceKeyboardRouterActions,
  type ResonanceKeyboardRouterRuntime,
} from "./resonanceKeyboardInputRouter";
import { runResonanceKeyboardKeyUpRouter } from "./resonanceKeyboardKeyUpRouter";

type MutableRef<T> = { current: T };

type ResonanceKeyboardInputEffectBoundaryArgs = {
  readonly resonanceInputActive: boolean;
  readonly audioCtx: AudioContext | null;
  readonly myzelEnabled: boolean;
  readonly managedLoopMaterial: unknown;
  readonly paramsRef: MutableRef<any>;
  readonly arrowStateRef: MutableRef<any>;
  readonly nexusRefs: MutableRef<any>;
  readonly keyboardMirrorRef: MutableRef<boolean>;
  readonly keyboardWindowOffsetRef: MutableRef<number>;
  readonly pitchLaneStateRef: MutableRef<any>;
  readonly exportedDrumConfigs: readonly any[];
  readonly recentLoopHotkeyEntries: readonly any[];
  readonly recentRootFollowHotkeyEntries: readonly any[];
  readonly rootFollowInputTargetHzRef: MutableRef<number | null>;
  readonly rootFollowLoopActive?: boolean;
  readonly actions: {
    readonly setSustainHoldActive: (isActive: boolean) => void;
    readonly setSwellHoldActive: (isActive: boolean) => void;
    readonly setOctaveHoldActive: (isActive: boolean) => void;
    readonly setEnterHoldActive: (isActive: boolean) => void;
    readonly releaseHeldScheduledTones: () => void;
    readonly ensureAudioReady: () => Promise<unknown>;
    readonly reportAudioReadyFailure: (error: unknown, context: Record<string, unknown>) => void;
    readonly ensureKeyboardPitchAudioReadyOnce: () => boolean;
    readonly cycleQuantizeGrid: () => void;
    readonly runEnterWaveGesture: (options?: { isRepeat: boolean }) => void;
    readonly shouldEmitKeyboardHoldWavePreview?: (event: Pick<KeyboardEvent, 'key' | 'code' | 'repeat'>, payload: { targetY: number; targetHz: number }) => boolean;
    readonly resolveKeyboardWaveStarterSoundPreset?: () => string | undefined;
    readonly releaseWaveStarterHoldGestureForKey?: (event: KeyboardEvent) => void;
    readonly updateNParams: (patch: any) => void;
    readonly triggerDirectedPulse: (direction: any) => void;
    readonly previewKeyboardWindowShift: (direction: -1 | 1) => void;
    readonly changeGridTuning: (nextTuning: any) => void;
    readonly setGridMode: (nextMode: any) => void;
    readonly setChurchMode: (nextMode: any) => void;
    readonly cycleParticleSystem: (direction: 1 | -1) => void;
    readonly selectMaterialLoopDirect: (entryId: string, source: "hotkey") => void;
    readonly selectRootFollowLoopDirect: (entryId: string) => void;
    readonly toggleMaterialLoopDirect: () => void;
    readonly toggleRootFollowLoopDirect: () => void;
    readonly browseMaterialLoopWithUmlaut: (key: "ö" | "ä") => void;
    readonly browseRootFollowLoopWithUmlaut: (key: "ö" | "ä") => void;
    readonly toggleNexusAgent: (agentIndex: number, options?: { pingOnEnable?: boolean }) => void;
    readonly setKeyboardWindowStamp: (updater: (prev: number) => number) => void;
    readonly getAudioPressureBias?: () => number;
    readonly getActiveScheduledToneCount?: () => number;
    readonly recordAdaptiveAction: (action: "keyboard-input-gliss-coalesced" | "keyboard-input-wave-preview-suppressed" | "keyboard-input-gliss-soft-attack" | "keyboard-input-gliss-body-preserved" | "keyboard-input-global-lane-protected" | "keyboard-input-hold-repeat-coalesced" | "root-follow-input-rate-limited" | "root-follow-input-freeze-last-valid") => void;
    readonly commitCursorY: (targetY: number, options?: { previewWave?: boolean; syncHud?: true; syncRootFollowInput?: boolean; waveStarterOptions?: WaveStarterEmitOptions }) => void;
  };
};

export function useAppResonanceKeyboardInputEffectBoundary(args: ResonanceKeyboardInputEffectBoundaryArgs): void {
  useEffect(() => {
    if (!args.resonanceInputActive) return;

    // Live-input contract: keep the generic router shape stable for the lifetime
    // of this effect. Keyboard bursts are synchronous; rebuilding the complete
    // runtime/actions graph (plus cloning both hotkey lists) for every keydown
    // adds allocation/GC pressure directly in front of the audio attack.
    const routerActions: ResonanceKeyboardRouterActions = {
      holdActions: {
        setSustainHoldActive: args.actions.setSustainHoldActive,
        setSwellHoldActive: args.actions.setSwellHoldActive,
        setOctaveHoldActive: args.actions.setOctaveHoldActive,
        setEnterHoldActive: args.actions.setEnterHoldActive,
      },
      ensureAudioReady: args.actions.ensureAudioReady,
      reportAudioReadyFailure: args.actions.reportAudioReadyFailure,
      ensureKeyboardPitchAudioReadyOnce: args.actions.ensureKeyboardPitchAudioReadyOnce,
      cycleQuantizeGrid: args.actions.cycleQuantizeGrid,
      runEnterWaveGesture: args.actions.runEnterWaveGesture,
      updateNParams: args.actions.updateNParams,
      toggleKeyboardMirror: () => {
        args.keyboardMirrorRef.current = !args.keyboardMirrorRef.current;
      },
      triggerDirectedPulse: args.actions.triggerDirectedPulse,
      previewKeyboardWindowShift: args.actions.previewKeyboardWindowShift,
      changeGridTuning: args.actions.changeGridTuning,
      setGridMode: args.actions.setGridMode,
      resetKeyboardWindow: () => {
        args.keyboardWindowOffsetRef.current = 0;
        args.actions.setKeyboardWindowStamp((prev) => prev + 1);
      },
      setChurchMode: args.actions.setChurchMode,
      cycleParticleSystem: args.actions.cycleParticleSystem,
      selectMaterialLoopDirect: args.actions.selectMaterialLoopDirect,
      selectRootFollowLoopDirect: args.actions.selectRootFollowLoopDirect,
      toggleMaterialLoopDirect: args.actions.toggleMaterialLoopDirect,
      toggleRootFollowLoopDirect: args.actions.toggleRootFollowLoopDirect,
      browseMaterialLoopWithUmlaut: args.actions.browseMaterialLoopWithUmlaut,
      browseRootFollowLoopWithUmlaut: args.actions.browseRootFollowLoopWithUmlaut,
      toggleNexusAgent: args.actions.toggleNexusAgent,
      nowMs: () => performance.now(),
      setRootFollowInputTargetHz: (targetHz) => {
        args.rootFollowInputTargetHzRef.current = targetHz;
      },
      getAudioPressureBias: args.actions.getAudioPressureBias,
      getActiveScheduledToneCount: args.actions.getActiveScheduledToneCount,
      recordAdaptiveAction: args.actions.recordAdaptiveAction,
      commitCursorY: args.actions.commitCursorY,
      shouldEmitKeyboardHoldWavePreview: args.actions.shouldEmitKeyboardHoldWavePreview,
      resolveKeyboardWaveStarterSoundPreset: args.actions.resolveKeyboardWaveStarterSoundPreset,
    };

    let routerRuntime: ResonanceKeyboardRouterRuntime | null = null;
    let routerArgs: ResonanceKeyboardInputRouterArgs | null = null;

    const handleResonanceKeyDown = (event: KeyboardEvent) => {
      if (routerRuntime === null) {
        routerRuntime = {
          event,
          managedLoopMaterial: args.managedLoopMaterial,
          params: args.paramsRef.current,
          arrowState: args.arrowStateRef.current,
          cursorY: args.nexusRefs.current.cursorY,
          keyboardMirrorActive: args.keyboardMirrorRef.current,
          keyboardWindowOffset: args.keyboardWindowOffsetRef.current,
          pitchLaneState: args.pitchLaneStateRef.current,
          exportedDrumConfigs: args.exportedDrumConfigs,
          recentLoopHotkeyEntries: args.recentLoopHotkeyEntries,
          recentRootFollowHotkeyEntries: args.recentRootFollowHotkeyEntries,
          rootFollowLoopActive: args.rootFollowLoopActive === true,
        };
        routerArgs = { runtime: routerRuntime, actions: routerActions };
      } else {
        routerRuntime.event = event;
        routerRuntime.params = args.paramsRef.current;
        routerRuntime.arrowState = args.arrowStateRef.current;
        routerRuntime.cursorY = args.nexusRefs.current.cursorY;
        routerRuntime.keyboardMirrorActive = args.keyboardMirrorRef.current;
        routerRuntime.keyboardWindowOffset = args.keyboardWindowOffsetRef.current;
        routerRuntime.pitchLaneState = args.pitchLaneStateRef.current;
      }
      runResonanceKeyboardInputRouter(routerArgs!);
    };

    const handleResonanceKeyUp = (event: KeyboardEvent) => {
      args.actions.releaseWaveStarterHoldGestureForKey?.(event);
      runResonanceKeyboardKeyUpRouter({
        runtime: {
          event,
          arrowState: args.arrowStateRef.current,
        },
        actions: {
          holdActions: {
            setSustainHoldActive: args.actions.setSustainHoldActive,
            setSwellHoldActive: args.actions.setSwellHoldActive,
            setOctaveHoldActive: args.actions.setOctaveHoldActive,
            setEnterHoldActive: args.actions.setEnterHoldActive,
            releaseHeldScheduledTones: args.actions.releaseHeldScheduledTones,
          },
        },
      });
    };

    window.addEventListener("keydown", handleResonanceKeyDown);
    window.addEventListener("keyup", handleResonanceKeyUp);
    return () => {
      window.removeEventListener("keydown", handleResonanceKeyDown);
      window.removeEventListener("keyup", handleResonanceKeyUp);
    };
  }, [
    args.resonanceInputActive,
    args.audioCtx,
    args.myzelEnabled,
    args.managedLoopMaterial,
    args.exportedDrumConfigs,
    args.recentLoopHotkeyEntries,
    args.recentRootFollowHotkeyEntries,
    args.rootFollowLoopActive,
  ]);
}
