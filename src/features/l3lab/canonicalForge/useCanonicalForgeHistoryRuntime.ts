import { useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { SpectralData } from '../spectralForge/audio/SpectralData';
import { createCanonicalHistoryController, type LoopComposerWorkspaceSnapshot } from './canonicalHistoryController';
import { MAX_HISTORY, type LoopComposerState } from './loopDrumDomain';
import type { MelodicPatternLinkMap, MelodicPatternVariantMap } from './melodicPatternStoreContract';
import type { CanonicalForgeWorkspace, CanonicalLogicView } from './sessionTypes';
import type { HistorySnapshot } from './spectralWorkspaceUtils';

type CanonicalForgeHistoryRuntimeArgs = {
  spectralData: SpectralData;
  warpTimeColumnsRef: MutableRefObject<Float32Array | null>;
  warpPitchColumnsRef: MutableRefObject<Float32Array | null>;
  applyWarpSnapshot: (snapshot: { time: Float32Array | null; pitch: Float32Array | null }) => void;
  loopComposer: LoopComposerState;
  selectedMelodicProjectId: string;
  activeWorkspace: CanonicalForgeWorkspace;
  logicView: CanonicalLogicView;
  loopPatternVariantsRef: MutableRefObject<MelodicPatternVariantMap>;
  loopPatternLinksRef: MutableRefObject<MelodicPatternLinkMap>;
  setLoopComposer: (...args: any[]) => void;
  setLoopPatternVariants: (...args: any[]) => void;
  setLoopPatternLinks: (...args: any[]) => void;
  setSelectedMelodicProjectId: (...args: any[]) => void;
  setSelectedLoopNoteIds: (...args: any[]) => void;
  setComposerSelectionBox: (...args: any[]) => void;
  setShowChordGhost: (...args: any[]) => void;
  setDenseOverlapWarning: (...args: any[]) => void;
  setRevision: (...args: any[]) => void;
  setStatus: (...args: any[]) => void;
  invalidateAudioBuffer: () => void;
};

export function useCanonicalForgeHistoryRuntime(args: CanonicalForgeHistoryRuntimeArgs) {
  const undoStackRef = useRef<HistorySnapshot[]>([]);
  const redoStackRef = useRef<HistorySnapshot[]>([]);
  const loopComposerUndoStackRef = useRef<LoopComposerWorkspaceSnapshot[]>([]);
  const loopComposerRedoStackRef = useRef<LoopComposerWorkspaceSnapshot[]>([]);
  const [, setHistoryVersion] = useState(0);

  const actions = createCanonicalHistoryController({
    spectralData: args.spectralData,
    warpTimeColumnsRef: args.warpTimeColumnsRef,
    warpPitchColumnsRef: args.warpPitchColumnsRef,
    applyWarpSnapshot: args.applyWarpSnapshot,
    undoStackRef,
    redoStackRef,
    loopComposerUndoStackRef,
    loopComposerRedoStackRef,
    loopComposer: args.loopComposer,
    selectedMelodicProjectId: args.selectedMelodicProjectId,
    activeWorkspace: args.activeWorkspace,
    logicView: args.logicView,
    loopPatternVariantsRef: args.loopPatternVariantsRef,
    loopPatternLinksRef: args.loopPatternLinksRef,
    setLoopComposer: args.setLoopComposer,
    setLoopPatternVariants: args.setLoopPatternVariants,
    setLoopPatternLinks: args.setLoopPatternLinks,
    setSelectedMelodicProjectId: args.setSelectedMelodicProjectId,
    setSelectedLoopNoteIds: args.setSelectedLoopNoteIds,
    setComposerSelectionBox: args.setComposerSelectionBox,
    setShowChordGhost: args.setShowChordGhost,
    setDenseOverlapWarning: args.setDenseOverlapWarning,
    setHistoryVersion,
    setRevision: args.setRevision,
    setStatus: args.setStatus,
    invalidateAudioBuffer: args.invalidateAudioBuffer,
    maxHistory: MAX_HISTORY,
  } as any);

  return {
    ...actions,
    canUndo: args.logicView === 'melodic'
      ? loopComposerUndoStackRef.current.length > 0
      : undoStackRef.current.length > 0,
    canRedo: args.logicView === 'melodic'
      ? loopComposerRedoStackRef.current.length > 0
      : redoStackRef.current.length > 0,
  };
}
