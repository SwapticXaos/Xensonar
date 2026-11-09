import { getForge3BodyField } from '../../forge3/bodyField';
import type { AppState, Forge3MainSnapshot } from './storeTypes';

const MAX_UNDO = 30;

type StoreSet = (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>), replace?: boolean) => void;
type StoreGet = () => AppState;

type Forge3MainSnapshotStoreActionKey = 'pushUndo' | 'undo' | 'redo';

export type Forge3MainSnapshotStoreActions = Pick<AppState, Forge3MainSnapshotStoreActionKey>;

function captureForge3MainSnapshot(state: AppState): Forge3MainSnapshot {
  return {
    spectralSnapshot: state.spectralData.cloneData(),
    bodySnapshot: getForge3BodyField().captureSnapshot(),
    sourceAsset: state.sourceAsset,
    sourceAssetContext: state.sourceAssetContext,
    sourcePreviewMode: state.sourcePreviewMode,
    lastCommitDomain: state.lastCommitDomain,
    activeMediatedBody: state.activeMediatedBody,
  };
}

function restoreForge3MainSnapshot(snapshot: Forge3MainSnapshot, state: AppState): Partial<AppState> {
  state.spectralData.restoreData(snapshot.spectralSnapshot);
  getForge3BodyField().restoreSnapshot(snapshot.bodySnapshot);
  return {
    sourceAsset: snapshot.sourceAsset,
    sourceAssetContext: snapshot.sourceAssetContext,
    sourcePreviewMode: snapshot.sourcePreviewMode,
    lastCommitDomain: snapshot.lastCommitDomain,
    activeMediatedBody: snapshot.activeMediatedBody,
    renderVersion: state.renderVersion + 1,
    audioBufferDirty: true,
  };
}

export function createForge3MainSnapshotStoreActions(
  set: StoreSet,
  get: StoreGet
): Forge3MainSnapshotStoreActions {
  return {
    pushUndo: () => {
      const state = get();
      const newStack = [...state.undoStack, captureForge3MainSnapshot(state)];
      if (newStack.length > MAX_UNDO) newStack.shift();
      set({ undoStack: newStack, redoStack: [] });
    },

    undo: () => {
      const state = get();
      if (state.undoStack.length === 0) return;
      const newUndoStack = [...state.undoStack];
      const snapshot = newUndoStack.pop();
      if (!snapshot) return;
      const redoSnapshot = captureForge3MainSnapshot(state);
      set({
        ...restoreForge3MainSnapshot(snapshot, state),
        undoStack: newUndoStack,
        redoStack: [...state.redoStack, redoSnapshot],
      });
    },

    redo: () => {
      const state = get();
      if (state.redoStack.length === 0) return;
      const newRedoStack = [...state.redoStack];
      const snapshot = newRedoStack.pop();
      if (!snapshot) return;
      const undoSnapshot = captureForge3MainSnapshot(state);
      set({
        ...restoreForge3MainSnapshot(snapshot, state),
        redoStack: newRedoStack,
        undoStack: [...state.undoStack, undoSnapshot],
      });
    },
  };
}
