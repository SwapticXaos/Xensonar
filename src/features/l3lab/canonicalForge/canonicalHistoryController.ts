import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { SpectralData } from '../spectralForge/audio/SpectralData';
import type { LoopComposerState } from './loopDrumDomain';
import type { MelodicPatternLinkMap, MelodicPatternVariantMap } from './melodicProjectLibrary';
import {
  createHistorySnapshot,
  restoreHistorySnapshot,
  type HistorySnapshot,
} from './spectralWorkspaceUtils';
import {
  cloneLoopComposerWorkspaceSnapshot,
  createLoopComposerWorkspaceSnapshot,
  pushBoundedHistoryEntry,
  resolveCanonicalHistoryDomain,
  restoreLoopComposerWorkspaceSnapshot,
  type LoopComposerWorkspaceSnapshot,
} from './canonicalHistoryMembrane';

export type { LoopComposerWorkspaceSnapshot } from './canonicalHistoryMembrane';

export function createCanonicalHistoryController(args: {
  spectralData: SpectralData;
  warpTimeColumnsRef: MutableRefObject<Float32Array | null>;
  warpPitchColumnsRef: MutableRefObject<Float32Array | null>;
  applyWarpSnapshot: (snapshot: { time: Float32Array | null; pitch: Float32Array | null }) => void;
  undoStackRef: MutableRefObject<HistorySnapshot[]>;
  redoStackRef: MutableRefObject<HistorySnapshot[]>;
  loopComposerUndoStackRef: MutableRefObject<LoopComposerWorkspaceSnapshot[]>;
  loopComposerRedoStackRef: MutableRefObject<LoopComposerWorkspaceSnapshot[]>;
  loopComposer: LoopComposerState;
  selectedMelodicProjectId: string;
  activeWorkspace: string;
  logicView: string;
  loopPatternVariantsRef: MutableRefObject<MelodicPatternVariantMap>;
  loopPatternLinksRef: MutableRefObject<MelodicPatternLinkMap>;
  setLoopComposer: Dispatch<SetStateAction<LoopComposerState>>;
  setLoopPatternVariants: Dispatch<SetStateAction<MelodicPatternVariantMap>>;
  setLoopPatternLinks: Dispatch<SetStateAction<MelodicPatternLinkMap>>;
  setSelectedMelodicProjectId: Dispatch<SetStateAction<string>>;
  setSelectedLoopNoteIds: Dispatch<SetStateAction<string[]>>;
  setComposerSelectionBox: Dispatch<SetStateAction<unknown | null>>;
  setShowChordGhost: Dispatch<SetStateAction<boolean>>;
  setDenseOverlapWarning: Dispatch<SetStateAction<string | null>>;
  setHistoryVersion: Dispatch<SetStateAction<number>>;
  setRevision: Dispatch<SetStateAction<number>>;
  setStatus: Dispatch<SetStateAction<string>>;
  invalidateAudioBuffer: () => void;
  maxHistory: number;
}) {
  const pushUndo = () => {
    const snapshot = createHistorySnapshot(args.spectralData, args.warpTimeColumnsRef.current, args.warpPitchColumnsRef.current);
    args.undoStackRef.current = pushBoundedHistoryEntry(args.undoStackRef.current, snapshot, args.maxHistory);
    args.redoStackRef.current = [];
    args.setHistoryVersion((version) => version + 1);
  };

  const pushLoopComposerUndo = (snapshot: LoopComposerWorkspaceSnapshot) => {
    args.loopComposerUndoStackRef.current = pushBoundedHistoryEntry(
      args.loopComposerUndoStackRef.current,
      cloneLoopComposerWorkspaceSnapshot(snapshot),
      args.maxHistory,
    );
    args.loopComposerRedoStackRef.current = [];
    args.setHistoryVersion((version) => version + 1);
  };

  const restoreLoopComposerSnapshot = (snapshot: LoopComposerWorkspaceSnapshot, statusMessage: string) => {
    restoreLoopComposerWorkspaceSnapshot({
      snapshot,
      patternVariantsRef: args.loopPatternVariantsRef,
      patternLinksRef: args.loopPatternLinksRef,
      setters: {
        setLoopComposer: args.setLoopComposer,
        setLoopPatternVariants: args.setLoopPatternVariants,
        setLoopPatternLinks: args.setLoopPatternLinks,
        setSelectedMelodicProjectId: args.setSelectedMelodicProjectId,
        setSelectedLoopNoteIds: args.setSelectedLoopNoteIds,
        setComposerSelectionBox: args.setComposerSelectionBox,
        setShowChordGhost: args.setShowChordGhost,
        setDenseOverlapWarning: args.setDenseOverlapWarning,
        setStatus: args.setStatus,
      },
      statusMessage,
    });
  };

  const performUndo = () => {
    const snapshot = args.undoStackRef.current.pop();
    if (!snapshot) return;
    args.redoStackRef.current = [
      ...args.redoStackRef.current,
      createHistorySnapshot(args.spectralData, args.warpTimeColumnsRef.current, args.warpPitchColumnsRef.current),
    ];
    restoreHistorySnapshot(args.spectralData, snapshot, (time, pitch) => args.applyWarpSnapshot({ time, pitch }));
    args.invalidateAudioBuffer();
    args.setRevision((version) => version + 1);
    args.setHistoryVersion((version) => version + 1);
    args.setStatus('Undo ausgeführt.');
  };

  const performLoopComposerUndo = () => {
    const snapshot = args.loopComposerUndoStackRef.current.pop();
    if (!snapshot) return;
    args.loopComposerRedoStackRef.current = pushBoundedHistoryEntry(
      args.loopComposerRedoStackRef.current,
      createLoopComposerWorkspaceSnapshot({
        composer: args.loopComposer,
        patternVariants: args.loopPatternVariantsRef.current,
        patternLinks: args.loopPatternLinksRef.current,
        selectedMelodicProjectId: args.selectedMelodicProjectId,
      }),
      args.maxHistory,
    );
    restoreLoopComposerSnapshot(snapshot, 'Melodic Loop: Undo ausgeführt.');
    args.setHistoryVersion((version) => version + 1);
  };

  const performRedo = () => {
    const snapshot = args.redoStackRef.current.pop();
    if (!snapshot) return;
    args.undoStackRef.current = [
      ...args.undoStackRef.current,
      createHistorySnapshot(args.spectralData, args.warpTimeColumnsRef.current, args.warpPitchColumnsRef.current),
    ];
    restoreHistorySnapshot(args.spectralData, snapshot, (time, pitch) => args.applyWarpSnapshot({ time, pitch }));
    args.invalidateAudioBuffer();
    args.setRevision((version) => version + 1);
    args.setHistoryVersion((version) => version + 1);
    args.setStatus('Redo ausgeführt.');
  };

  const performLoopComposerRedo = () => {
    const snapshot = args.loopComposerRedoStackRef.current.pop();
    if (!snapshot) return;
    args.loopComposerUndoStackRef.current = pushBoundedHistoryEntry(
      args.loopComposerUndoStackRef.current,
      createLoopComposerWorkspaceSnapshot({
        composer: args.loopComposer,
        patternVariants: args.loopPatternVariantsRef.current,
        patternLinks: args.loopPatternLinksRef.current,
        selectedMelodicProjectId: args.selectedMelodicProjectId,
      }),
      args.maxHistory,
    );
    restoreLoopComposerSnapshot(snapshot, 'Melodic Loop: Redo ausgeführt.');
    args.setHistoryVersion((version) => version + 1);
  };

  const performActiveUndo = () => {
    if (resolveCanonicalHistoryDomain({ activeWorkspace: args.activeWorkspace, logicView: args.logicView }) === 'loop-composer') {
      performLoopComposerUndo();
      return;
    }
    performUndo();
  };

  const performActiveRedo = () => {
    if (resolveCanonicalHistoryDomain({ activeWorkspace: args.activeWorkspace, logicView: args.logicView }) === 'loop-composer') {
      performLoopComposerRedo();
      return;
    }
    performRedo();
  };

  return {
    pushUndo,
    pushLoopComposerUndo,
    performUndo,
    performRedo,
    performLoopComposerUndo,
    performLoopComposerRedo,
    performActiveUndo,
    performActiveRedo,
  };
}
