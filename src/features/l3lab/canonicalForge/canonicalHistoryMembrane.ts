import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import {
  cloneLoopComposerState,
  type LoopComposerState,
} from './loopDrumDomain';
import {
  cloneMelodicPatternLinkMap,
  cloneMelodicPatternVariantMap,
  type MelodicPatternLinkMap,
  type MelodicPatternVariantMap,
} from './melodicProjectLibrary';
import {
  commitMelodicPatternStores,
  type LoopComposerWorkspaceSnapshot,
} from './melodicPatternStoreContract';

export {
  cloneLoopComposerWorkspaceSnapshot,
  createLoopComposerWorkspaceSnapshot,
} from './melodicPatternStoreContract';
export type {
  LoopComposerWorkspaceSnapshot,
} from './melodicPatternStoreContract';

export type LoopComposerWorkspaceRestoreSetters = {
  setLoopComposer: Dispatch<SetStateAction<LoopComposerState>>;
  setLoopPatternVariants: Dispatch<SetStateAction<MelodicPatternVariantMap>>;
  setLoopPatternLinks: Dispatch<SetStateAction<MelodicPatternLinkMap>>;
  setSelectedMelodicProjectId: Dispatch<SetStateAction<string>>;
  setSelectedLoopNoteIds: Dispatch<SetStateAction<string[]>>;
  setComposerSelectionBox: Dispatch<SetStateAction<unknown | null>>;
  setShowChordGhost: Dispatch<SetStateAction<boolean>>;
  setDenseOverlapWarning: Dispatch<SetStateAction<string | null>>;
  setStatus: Dispatch<SetStateAction<string>>;
};

export function pushBoundedHistoryEntry<T>(stack: T[], entry: T, maxHistory: number): T[] {
  const next = [...stack, entry];
  if (next.length > maxHistory) next.shift();
  return next;
}

export function restoreLoopComposerWorkspaceSnapshot(args: {
  snapshot: LoopComposerWorkspaceSnapshot;
  patternVariantsRef: MutableRefObject<MelodicPatternVariantMap>;
  patternLinksRef: MutableRefObject<MelodicPatternLinkMap>;
  setters: LoopComposerWorkspaceRestoreSetters;
  statusMessage: string;
}) {
  const restored = cloneLoopComposerState(args.snapshot.composer);
  const restoredVariants = cloneMelodicPatternVariantMap(args.snapshot.patternVariants);
  const restoredLinks = cloneMelodicPatternLinkMap(args.snapshot.patternLinks);
  args.setters.setLoopComposer(restored);
  commitMelodicPatternStores({
    stores: { variants: restoredVariants, links: restoredLinks },
    patternVariantsRef: args.patternVariantsRef,
    patternLinksRef: args.patternLinksRef,
    setLoopPatternVariants: args.setters.setLoopPatternVariants,
    setLoopPatternLinks: args.setters.setLoopPatternLinks,
  });
  args.setters.setSelectedMelodicProjectId(args.snapshot.selectedMelodicProjectId);
  args.setters.setSelectedLoopNoteIds(restored.selectedNoteId ? [restored.selectedNoteId] : []);
  args.setters.setComposerSelectionBox(null);
  args.setters.setShowChordGhost(false);
  args.setters.setDenseOverlapWarning(null);
  args.setters.setStatus(args.statusMessage);
}

export function resolveCanonicalHistoryDomain(args: {
  activeWorkspace: string;
  logicView: string;
}): 'spectral' | 'loop-composer' {
  return args.activeWorkspace === 'microtonal-logic' && args.logicView === 'melodic'
    ? 'loop-composer'
    : 'spectral';
}
