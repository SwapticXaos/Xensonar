import { getForge3BodyField } from '../../forge3/bodyField';
import type { SpectralData } from '../audio/SpectralData';
import type { AudioSourceAsset } from '../audio/AudioImporterTypes';
import type { MediatedAudioBody } from '../body/mediatedAudioBodyTypes';
import type { CommitDomain, SourceAssetContext } from '../model/forge3Layers';
import type { SourcePreviewMode } from './storeTypes';

export type Forge3MainPathHostState = {
  spectralData: SpectralData;
  pushUndo: () => void;
  sourceAsset: AudioSourceAsset | null;
  sourceAssetContext: SourceAssetContext;
  sourcePreviewMode: SourcePreviewMode;
  lastCommitDomain: CommitDomain;
  activeMediatedBody: MediatedAudioBody | null;
  renderVersion: number;
  audioBufferDirty: boolean;
};

type StoreSet<T extends Forge3MainPathHostState> = (partial: Partial<T> | ((state: T) => Partial<T>), replace?: boolean) => void;
type StoreGet<T extends Forge3MainPathHostState> = () => T;

export type Forge3MainPathStoreActions = {
  clearCanvas: () => void;
  resetForgeMainPath: () => void;
};

export function clearForge3MainCanvas<T extends Forge3MainPathHostState>(state: T): Partial<T> {
  state.spectralData.clear();
  getForge3BodyField().clear();
  return {
    renderVersion: state.renderVersion + 1,
    audioBufferDirty: true,
  } as Partial<T>;
}

export function resetForge3MainPathState<T extends Forge3MainPathHostState>(state: T): Partial<T> {
  state.spectralData.clear();
  getForge3BodyField().clear();
  return {
    sourceAsset: null,
    sourceAssetContext: 'none',
    sourcePreviewMode: 'forge',
    lastCommitDomain: 'none',
    activeMediatedBody: null,
    renderVersion: state.renderVersion + 1,
    audioBufferDirty: true,
  } as Partial<T>;
}

export function createForge3MainPathStoreActions<T extends Forge3MainPathHostState>(
  set: StoreSet<T>,
  get: StoreGet<T>
): Forge3MainPathStoreActions {
  return {
    clearCanvas: () => {
      get().pushUndo();
      set((state) => clearForge3MainCanvas(state));
    },
    resetForgeMainPath: () => {
      get().pushUndo();
      set((state) => resetForge3MainPathState(state));
    },
  };
}
