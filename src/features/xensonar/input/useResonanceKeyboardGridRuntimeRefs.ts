import { useRef } from "react";
import { createResonanceKeyboardPitchLaneState } from "./resonanceKeyboardPitchLane";

export function useResonanceKeyboardGridRuntimeRefs() {
  const keyboardMirrorRef = useRef(true);
  const activeGridLineFreqRef = useRef<number | null>(null);
  const activeGridLineSinceRef = useRef(0);
  const previousGridLineFreqRef = useRef<number | null>(null);
  const previousGridLineAtRef = useRef(0);
  const rootFollowInputTargetHzRef = useRef<number | null>(null);
  const resonanceKeyboardPitchLaneRef = useRef(createResonanceKeyboardPitchLaneState());
  const keyboardWindowOffsetRef = useRef(0);
  const activeGridDragStepRef = useRef<number | null>(null);
  const activeGridDragStartYRef = useRef<number | null>(null);
  const activeGridDragBaseOffsetRef = useRef(0);
  const activeGridDragMovedRef = useRef(false);

  return {
    keyboardMirrorRef,
    activeGridLineFreqRef,
    activeGridLineSinceRef,
    previousGridLineFreqRef,
    previousGridLineAtRef,
    rootFollowInputTargetHzRef,
    resonanceKeyboardPitchLaneRef,
    keyboardWindowOffsetRef,
    activeGridDragStepRef,
    activeGridDragStartYRef,
    activeGridDragBaseOffsetRef,
    activeGridDragMovedRef,
  };
}
