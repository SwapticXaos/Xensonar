import { useRef } from 'react';
import type { ComposerVerticalViewportDragState, ComposerViewportDragState } from './loopComposerViewportInteraction';
import type { CanonicalComposerDragState } from './useCanonicalLoopComposerInteractions';

export function useCanonicalForgeComposerInteractionRefs() {
  const composerDragRef = useRef<CanonicalComposerDragState | null>(null);
  const composerOverviewRef = useRef<HTMLDivElement | null>(null);
  const composerViewportDragRef = useRef<ComposerViewportDragState | null>(null);
  const composerVerticalOverviewRef = useRef<HTMLDivElement | null>(null);
  const composerVerticalViewportDragRef = useRef<ComposerVerticalViewportDragState | null>(null);

  return {
    composerDragRef,
    composerOverviewRef,
    composerViewportDragRef,
    composerVerticalOverviewRef,
    composerVerticalViewportDragRef,
  };
}
