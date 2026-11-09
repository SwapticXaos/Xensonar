import type { AppNexusParams } from '../rooms/nexusParamsInitialState';
import type { WaveStarterEmitOptions } from '../audio/waveStarterLaneRuntimeBridge';
import type { ResonanceWaveDirection } from '../resonanceKeyboard';
import type { DrumPlaylistConfigOption } from '../drumPatternPlaylistTypes';
import {
  runResonanceKeyboardAudioCommand,
  shouldIgnoreResonanceKeyboardDown,
  type ResonanceArrowState,
} from './resonanceKeyboardCommandActions';
import {
  readResonanceHotkeyMode,
  runResonanceHotkeyModeToggleBoundary,
  runResonanceLoopHotkeyModeRoutingBoundary,
} from './resonanceHotkeyModeRoutingBoundary';
import { runResonanceAuxiliaryHotkeyRoutingBoundary, runResonanceNonRepeatAuxiliaryHotkeyBoundary } from './resonanceAuxiliaryHotkeyRoutingBoundary';
import { runResonanceGridHotkeyRoutingBoundary } from './resonanceGridHotkeyRoutingBoundary';
import { runResonanceParticleSystemHotkeyBoundary } from './resonanceParticleSystemHotkeyBoundary';
import { runResonanceKeyboardPitchCommandAssemblyBoundary } from './resonanceKeyboardPitchCommandAssemblyBoundary';
import {
  runResonanceArrowKeyDownBoundary,
  runResonanceMomentaryHoldKeyDownBoundary,
} from './resonanceArrowHoldKeyBoundary';
import type { ResonanceKeyboardPitchLaneState } from './resonanceKeyboardPitchLane';

type RecentLoopHotkeyEntry = { id: string };

export type ResonanceKeyboardInputRouterHoldActions = {
  setSustainHoldActive: (isActive: boolean) => void;
  setSwellHoldActive: (isActive: boolean) => void;
  setOctaveHoldActive: (isActive: boolean) => void;
  setEnterHoldActive: (isActive: boolean) => void;
};

export type ResonanceKeyboardRouterRuntime = {
  event: KeyboardEvent;
  managedLoopMaterial: unknown;
  params: AppNexusParams;
  arrowState: ResonanceArrowState;
  cursorY: number;
  keyboardMirrorActive: boolean;
  keyboardWindowOffset: number;
  pitchLaneState: ResonanceKeyboardPitchLaneState;
  exportedDrumConfigs: readonly DrumPlaylistConfigOption[];
  recentLoopHotkeyEntries: readonly RecentLoopHotkeyEntry[];
  recentRootFollowHotkeyEntries: readonly RecentLoopHotkeyEntry[];
  rootFollowLoopActive: boolean;
};

export type ResonanceKeyboardRouterActions = {
  holdActions: ResonanceKeyboardInputRouterHoldActions;
  ensureAudioReady: () => Promise<unknown>;
  reportAudioReadyFailure: (error: unknown, context: Record<string, unknown>) => void;
  ensureKeyboardPitchAudioReadyOnce: () => boolean;
  cycleQuantizeGrid: () => void;
  runEnterWaveGesture: (options?: { isRepeat: boolean }) => void;
  updateNParams: (patch: Partial<AppNexusParams>) => void;
  toggleKeyboardMirror: () => void;
  triggerDirectedPulse: (direction: ResonanceWaveDirection) => void;
  previewKeyboardWindowShift: (direction: -1 | 1) => void;
  changeGridTuning: (nextTuning: AppNexusParams['gridTuning']) => void;
  setGridMode: (nextMode: AppNexusParams['gridMode']) => void;
  resetKeyboardWindow: () => void;
  setChurchMode: (nextMode: AppNexusParams['churchMode']) => void;
  cycleParticleSystem: (direction: 1 | -1) => void;
  selectMaterialLoopDirect: (entryId: string, source: 'hotkey') => void;
  selectRootFollowLoopDirect: (entryId: string) => void;
  toggleMaterialLoopDirect: () => void;
  toggleRootFollowLoopDirect: () => void;
  browseMaterialLoopWithUmlaut: (key: 'ö' | 'ä') => void;
  browseRootFollowLoopWithUmlaut: (key: 'ö' | 'ä') => void;
  toggleNexusAgent: (agentIndex: number, options?: { pingOnEnable?: boolean }) => void;
  nowMs: () => number;
  setRootFollowInputTargetHz: (targetHz: number) => void;
  recordAdaptiveAction: (action: 'keyboard-input-gliss-coalesced' | 'keyboard-input-wave-preview-suppressed' | 'keyboard-input-gliss-soft-attack' | 'keyboard-input-gliss-body-preserved' | 'keyboard-input-global-lane-protected' | 'keyboard-input-hold-repeat-coalesced' | 'root-follow-input-rate-limited' | 'root-follow-input-freeze-last-valid') => void;
  getAudioPressureBias?: () => number;
  getActiveScheduledToneCount?: () => number;
  commitCursorY: (targetY: number, options?: { previewWave?: boolean; syncHud?: true; syncRootFollowInput?: boolean; waveStarterOptions?: WaveStarterEmitOptions }) => void;
  shouldEmitKeyboardHoldWavePreview?: (event: Pick<KeyboardEvent, 'key' | 'code' | 'repeat'>, payload: { targetY: number; targetHz: number }) => boolean;
  resolveKeyboardWaveStarterSoundPreset?: () => string | undefined;
};

export type ResonanceKeyboardInputRouterArgs = {
  runtime: ResonanceKeyboardRouterRuntime;
  actions: ResonanceKeyboardRouterActions;
};

export type ResonanceKeyboardInputRouterResult =
  | { handled: true; route: string }
  | { handled: false; route: 'ignored' | 'unhandled' };

export function runResonanceKeyboardInputRouter({
  runtime,
  actions,
}: ResonanceKeyboardInputRouterArgs): ResonanceKeyboardInputRouterResult {
  const {
    event,
    managedLoopMaterial,
    params,
    arrowState,
    cursorY,
    keyboardMirrorActive,
    keyboardWindowOffset,
    pitchLaneState,
    exportedDrumConfigs,
    recentLoopHotkeyEntries,
    recentRootFollowHotkeyEntries,
    rootFollowLoopActive,
  } = runtime;
  const {
    holdActions,
    ensureAudioReady,
    reportAudioReadyFailure,
    ensureKeyboardPitchAudioReadyOnce,
    cycleQuantizeGrid,
    runEnterWaveGesture,
    updateNParams,
    toggleKeyboardMirror,
    triggerDirectedPulse,
    previewKeyboardWindowShift,
    changeGridTuning,
    setGridMode,
    resetKeyboardWindow,
    setChurchMode,
    cycleParticleSystem,
    selectMaterialLoopDirect,
    selectRootFollowLoopDirect,
    toggleMaterialLoopDirect,
    toggleRootFollowLoopDirect,
    browseMaterialLoopWithUmlaut,
    browseRootFollowLoopWithUmlaut,
    toggleNexusAgent,
    nowMs,
    recordAdaptiveAction,
    commitCursorY,
  } = actions;
  if (shouldIgnoreResonanceKeyboardDown(event, managedLoopMaterial)) {
    return { handled: false, route: 'ignored' };
  }

  const key = event.key.toLowerCase();
  const preventDefault = () => event.preventDefault();
  const runWithAudio = (command: () => void, failureContext: Record<string, unknown> = {}) => {
    runResonanceKeyboardAudioCommand({
      event,
      key,
      ensureAudioReady,
      command,
      failureContext,
      reportFailure: reportAudioReadyFailure,
    });
  };

  if (runResonanceArrowKeyDownBoundary({
    event,
    params,
    arrowState,
    cursorY,
    preventDefault,
    commitCursorY: (nextY) => commitCursorY(nextY, { previewWave: true }),
  })) {
    return { handled: true, route: 'arrow-keydown' };
  }

  if (runResonanceMomentaryHoldKeyDownBoundary(event, holdActions, recordAdaptiveAction)) {
    return { handled: true, route: 'momentary-hold-keydown' };
  }

  if (event.code === 'Tab' && params.quantizeOn) {
    preventDefault();
    cycleQuantizeGrid();
    return { handled: true, route: 'quantize-grid-cycle' };
  }

  if (event.key === 'Enter') {
    holdActions.setEnterHoldActive(true);
    runWithAudio(() => runEnterWaveGesture({ isRepeat: event.repeat }));
    return { handled: true, route: 'enter-wave-hotkey' };
  }

  const currentResonanceHotkeyMode = readResonanceHotkeyMode(params);
  if (runResonanceHotkeyModeToggleBoundary({
    event,
    currentMode: currentResonanceHotkeyMode,
    updateNParams,
    preventDefault,
  })) {
    return { handled: true, route: 'hotkey-mode-toggle' };
  }

  if (runResonanceAuxiliaryHotkeyRoutingBoundary({
    event,
    key,
    preventDefault,
    toggleKeyboardMirror,
    runWithAudio,
    triggerDirectedPulse,
    previewKeyboardWindowShift,
  })) {
    return { handled: true, route: 'auxiliary-hotkey' };
  }

  if (runResonanceGridHotkeyRoutingBoundary({
    event,
    params,
    runWithAudio,
    changeGridTuning,
    setGridMode,
    resetKeyboardWindow,
  })) {
    return { handled: true, route: 'grid-hotkey' };
  }

  if (!event.repeat) {
    if (runResonanceParticleSystemHotkeyBoundary({
      event,
      params,
      setChurchMode,
      cycleParticleSystem,
      preventDefault,
    })) {
      return { handled: true, route: 'particle-system-hotkey' };
    }

    if (runResonanceLoopHotkeyModeRoutingBoundary({
      key,
      currentMode: currentResonanceHotkeyMode,
      recentLoopHotkeyEntries,
      recentRootFollowHotkeyEntries,
      selectMaterialLoopDirect,
      selectRootFollowLoopDirect,
      toggleMaterialLoopDirect,
      toggleRootFollowLoopDirect,
      browseMaterialLoopWithUmlaut,
      browseRootFollowLoopWithUmlaut,
      preventDefault,
    })) {
      return { handled: true, route: 'loop-hotkey-mode' };
    }

    if (runResonanceNonRepeatAuxiliaryHotkeyBoundary({
      event,
      key,
      params,
      exportedDrumConfigs,
      updateNParams,
      toggleNexusAgent,
      runWithAudio,
      preventDefault,
    })) {
      return { handled: true, route: 'non-repeat-auxiliary-hotkey' };
    }
  }

  if (runResonanceKeyboardPitchCommandAssemblyBoundary({
    event,
    keyboardMirrorActive,
    keyboardWindowOffset,
    params,
    pitchLaneState,
    nowMs: nowMs(),
    rootFollowLoopActive,
    preventDefault,
    ensureKeyboardPitchAudioReadyOnce,
    recordAdaptiveAction,
    commitCursorY,
    shouldEmitKeyboardHoldWavePreview: actions.shouldEmitKeyboardHoldWavePreview,
    resolveKeyboardWaveStarterSoundPreset: actions.resolveKeyboardWaveStarterSoundPreset,
  })) {
    return { handled: true, route: 'keyboard-pitch-command' };
  }

  return { handled: false, route: 'unhandled' };
}
