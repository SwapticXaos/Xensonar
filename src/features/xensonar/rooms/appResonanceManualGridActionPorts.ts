import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { GridTuning } from '../domain/instrumentData';
import type { AppNexusParams, NexusUiPatch } from './nexusParamsInitialState';
import type { ResonanceNexusRuntimeRefObject } from './resonanceNexusRuntimeRefs';
import {
  changeGridTuningAction,
  getVisibleGridLinesAction,
  setManualGridStepOffsetAction,
  toggleManualGridStepMuteAction,
} from './manualGridActions';

export type AppResonanceManualGridActionPorts = {
  readonly toggleManualGridStepMute: (step: number) => void;
  readonly setManualGridStepOffset: (step: number, offsetValue: number) => void;
  readonly changeGridTuning: (nextTuning: GridTuning) => void;
  readonly getVisibleGridLines: () => ReturnType<typeof getVisibleGridLinesAction>;
};

type CommitCursorY = (rawY: number, options?: { syncHud?: boolean; refreshKeyboardWindow?: boolean }) => number;

export type BuildAppResonanceManualGridActionPortsInput = {
  readonly nexusParamsRef: MutableRefObject<AppNexusParams>;
  readonly nexusRefs: ResonanceNexusRuntimeRefObject;
  readonly updateNParams: (partial: NexusUiPatch) => void;
  readonly commitResonanceCursorY: CommitCursorY;
  readonly keyboardWindowOffsetRef: MutableRefObject<number>;
  readonly setKeyboardWindowStamp: Dispatch<SetStateAction<number>>;
};

export const APP_RESONANCE_MANUAL_GRID_ACTION_PORTS_PROBE = {
  cleanupKind: 'app-resonance-manual-grid-action-ports',
  ownsRuntime: false,
  ownsEffects: false,
  ownsAudioGraph: false,
  ownsKeyboardWindowPolicy: false,
  onlyMovesExistingManualGridUiActions: true,
  movedFromAppCallsite: [
    'toggleManualGridStepMute',
    'setManualGridStepOffset',
    'changeGridTuning',
    'getVisibleGridLines',
  ] as const,
  explicitlyNotMoved: [
    'lock-to-grid semantics inside manualGridActions',
    'keyboard-window stamp policy inside changeGridTuningAction',
    'commitResonanceCursorY implementation',
    'resonance keyboard input effect',
    'root-follow/wellenstarter behavior',
  ] as const,
} as const;

export function buildAppResonanceManualGridActionPorts({
  nexusParamsRef,
  nexusRefs,
  updateNParams,
  commitResonanceCursorY,
  keyboardWindowOffsetRef,
  setKeyboardWindowStamp,
}: BuildAppResonanceManualGridActionPortsInput): AppResonanceManualGridActionPorts {
  const toggleManualGridStepMute = (step: number) => {
    toggleManualGridStepMuteAction({
      params: nexusParamsRef.current,
      step,
      updateNParams,
      commitResonanceCursorY,
      currentCursorY: nexusRefs.current.cursorY,
    });
  };

  const setManualGridStepOffset = (step: number, offsetValue: number) => {
    setManualGridStepOffsetAction({
      params: nexusParamsRef.current,
      step,
      offsetValue,
      updateNParams,
      commitResonanceCursorY,
      currentCursorY: nexusRefs.current.cursorY,
    });
  };

  const changeGridTuning = (nextTuning: GridTuning) => {
    changeGridTuningAction({
      params: nexusParamsRef.current,
      nextTuning,
      updateNParams,
      keyboardWindowOffsetRef,
      commitResonanceCursorY,
      setKeyboardWindowStamp,
      currentCursorY: nexusRefs.current.cursorY,
    });
  };

  const getVisibleGridLines = () => getVisibleGridLinesAction({
    gridTuning: nexusParamsRef.current.gridTuning,
    gridBase: nexusParamsRef.current.gridBase,
    manualGridMutedSteps: nexusParamsRef.current.manualGridMutedSteps,
    manualGridStepOffsets: nexusParamsRef.current.manualGridStepOffsets,
  });

  return {
    toggleManualGridStepMute,
    setManualGridStepOffset,
    changeGridTuning,
    getVisibleGridLines,
  };
}
