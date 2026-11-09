import type { AudioSourceAsset } from '../audio/AudioImporterTypes';
import type { CommitDomain, SourceAssetContext } from '../model/forge3Layers';
import type { Forge3EditTarget, SourcePreviewMode } from './storeTypes';

export type SourcePreviewCommitState = {
  sourceAsset: AudioSourceAsset | null;
  sourceAssetContext: SourceAssetContext;
  sourcePreviewMode: SourcePreviewMode;
  lastCommitDomain: CommitDomain;
  forge3EditTarget: Forge3EditTarget;
};

export type SourcePreviewCommitStoreActions = {
  setSourceAsset: (asset: AudioSourceAsset | null, context?: SourceAssetContext) => void;
  setSourcePreviewMode: (mode: SourcePreviewMode) => void;
  setLastCommitDomain: (domain: CommitDomain) => void;
  setForge3EditTarget: (target: Forge3EditTarget) => void;
};

export function createInitialSourcePreviewCommitState(): SourcePreviewCommitState {
  return {
    sourceAsset: null,
    sourceAssetContext: 'none',
    sourcePreviewMode: 'forge',
    lastCommitDomain: 'none',
    forge3EditTarget: 'linked_body',
  };
}

export function setSourceAssetState<T extends SourcePreviewCommitState>(
  state: T,
  asset: AudioSourceAsset | null,
  context?: SourceAssetContext,
): Partial<T> {
  return {
    sourceAsset: asset,
    sourceAssetContext: asset ? (context ?? 'forge3_main') : 'none',
    sourcePreviewMode: asset ? state.sourcePreviewMode : 'forge',
  } as Partial<T>;
}

export function setSourcePreviewModeState<T extends SourcePreviewCommitState>(
  _state: T,
  mode: SourcePreviewMode,
): Partial<T> {
  return { sourcePreviewMode: mode } as Partial<T>;
}

export function setLastCommitDomainState<T extends SourcePreviewCommitState>(
  _state: T,
  domain: CommitDomain,
): Partial<T> {
  return { lastCommitDomain: domain } as Partial<T>;
}

export function setForge3EditTargetState<T extends SourcePreviewCommitState>(
  _state: T,
  target: Forge3EditTarget,
): Partial<T> {
  return { forge3EditTarget: target } as Partial<T>;
}

type StoreSet<T extends SourcePreviewCommitState> = (partial: Partial<T> | ((state: T) => Partial<T>), replace?: boolean) => void;
export function createSourcePreviewCommitStoreActions<T extends SourcePreviewCommitState>(
  set: StoreSet<T>,
): SourcePreviewCommitStoreActions {
  return {
    setSourceAsset: (asset, context) => set((state) => setSourceAssetState(state, asset, context)),
    setSourcePreviewMode: (mode) => set((state) => setSourcePreviewModeState(state, mode)),
    setLastCommitDomain: (domain) => set((state) => setLastCommitDomainState(state, domain)),
    setForge3EditTarget: (target) => set((state) => setForge3EditTargetState(state, target)),
  };
}
