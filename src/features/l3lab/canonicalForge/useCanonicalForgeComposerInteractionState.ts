import { useState } from 'react';
import type { CanonicalForgeInitialState } from './canonicalForgeInitialState';
import type { LoopNoteSelectionBox } from './loopDrumDomain';

type CanonicalForgeComposerInteractionInitialState = Pick<
  CanonicalForgeInitialState,
  'selectedLoopNoteIds'
>;

type ComposerHoverState = {
  stepIndex: number | null;
  gridStep: number | null;
};

type ComposerCursor = 'grab' | 'grabbing' | 'ew-resize' | 'crosshair';

type DenseOverlapWarning = {
  stepId: string;
  gridStep: number;
  count: number;
};

export function useCanonicalForgeComposerInteractionState(
  initialState: CanonicalForgeComposerInteractionInitialState,
) {
  const [composerHover, setComposerHover] = useState<ComposerHoverState>({
    stepIndex: null,
    gridStep: null,
  });
  const [selectedLoopNoteIds, setSelectedLoopNoteIds] = useState<string[]>(
    () => initialState.selectedLoopNoteIds,
  );
  const [composerSelectionBox, setComposerSelectionBox] = useState<LoopNoteSelectionBox | null>(null);
  const [showChordGhost, setShowChordGhost] = useState(false);
  const [, setDenseOverlapWarning] = useState<DenseOverlapWarning | null>(null);
  const [composerCursor, setComposerCursor] = useState<ComposerCursor>('grab');

  return {
    composerHover,
    setComposerHover,
    selectedLoopNoteIds,
    setSelectedLoopNoteIds,
    composerSelectionBox,
    setComposerSelectionBox,
    showChordGhost,
    setShowChordGhost,
    setDenseOverlapWarning,
    composerCursor,
    setComposerCursor,
  };
}
