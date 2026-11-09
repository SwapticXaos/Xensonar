import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { GridTuning } from '../domain/instrumentData';
import { keyboardWindowFrequency, shiftKeyboardWindowOffset, yFromFreq } from './resonanceRuntimeMath';

type ResonanceParams = {
  gridBase: number;
  gridTuning: GridTuning;
  manualGridMutedSteps?: number[];
  manualGridStepOffsets?: number[];
};

type PreviewKeyboardWindowShiftArgs = {
  params: ResonanceParams;
  direction: 1 | -1;
  keyboardWindowOffsetRef: MutableRefObject<number>;
  setKeyboardWindowStamp: Dispatch<SetStateAction<number>>;
  commitResonanceCursorY: (rawY: number, options?: { previewWave?: boolean }) => number;
};

export function previewKeyboardWindowShiftAction({
  params,
  direction,
  keyboardWindowOffsetRef,
  setKeyboardWindowStamp,
  commitResonanceCursorY,
}: PreviewKeyboardWindowShiftArgs) {
  keyboardWindowOffsetRef.current = shiftKeyboardWindowOffset(
    params.gridBase,
    params.gridTuning,
    keyboardWindowOffsetRef.current,
    direction,
    params.manualGridMutedSteps,
    params.manualGridStepOffsets,
  );
  const preview = keyboardWindowFrequency(
    params.gridBase,
    params.gridTuning,
    keyboardWindowOffsetRef.current,
    0,
    params.manualGridMutedSteps,
    params.manualGridStepOffsets,
  );
  setKeyboardWindowStamp((prev) => prev + 1);
  if (preview !== null) {
    commitResonanceCursorY(yFromFreq(preview), { previewWave: true });
  }
  return preview;
}

type TriggerKeyboardWindowPitchArgs = {
  params: ResonanceParams;
  pitchIdx: number;
  keyboardWindowOffsetRef: MutableRefObject<number>;
  commitResonanceCursorY: (rawY: number, options?: { previewWave?: boolean }) => number;
};

export function triggerKeyboardWindowPitchAction({
  params,
  pitchIdx,
  keyboardWindowOffsetRef,
  commitResonanceCursorY,
}: TriggerKeyboardWindowPitchArgs) {
  const freq = keyboardWindowFrequency(
    params.gridBase,
    params.gridTuning,
    keyboardWindowOffsetRef.current,
    pitchIdx,
    params.manualGridMutedSteps,
    params.manualGridStepOffsets,
  );
  if (freq !== null) {
    commitResonanceCursorY(yFromFreq(freq), { previewWave: true });
  }
  return freq;
}
