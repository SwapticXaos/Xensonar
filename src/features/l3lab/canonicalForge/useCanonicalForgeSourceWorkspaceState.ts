import { useState } from 'react';
import type { CanonicalForgeInitialState } from './canonicalForgeInitialState';

type CanonicalForgeSourceWorkspaceInitialState = Pick<
  CanonicalForgeInitialState,
  | 'rawSourceAsset'
  | 'sourceAsset'
  | 'bundle'
  | 'spectralData'
  | 'sourceView'
  | 'secondaryView'
  | 'viewBlend'
  | 'sourcePreviewMode'
  | 'auditionView'
  | 'auditionBlendAmount'
  | 'selectedProjectId'
>;

export function useCanonicalForgeSourceWorkspaceState(
  initialState: CanonicalForgeSourceWorkspaceInitialState,
) {
  const [rawSourceAsset, setRawSourceAsset] = useState(() => initialState.rawSourceAsset);
  const [sourceAsset, setSourceAsset] = useState(() => initialState.sourceAsset);
  const [bundle, setBundle] = useState(() => initialState.bundle);
  const [spectralData, setSpectralData] = useState(() => initialState.spectralData);
  const [sourceView, setSourceView] = useState(() => initialState.sourceView);
  const [secondaryView, setSecondaryView] = useState(() => initialState.secondaryView);
  const [viewBlend, setViewBlend] = useState(() => initialState.viewBlend);
  const [sourcePreviewMode, setSourcePreviewMode] = useState(() => initialState.sourcePreviewMode);
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [auditionView] = useState(() => initialState.auditionView);
  const [auditionBlendAmount] = useState(() => initialState.auditionBlendAmount);
  const [selectedProjectId] = useState(() => initialState.selectedProjectId);

  return {
    rawSourceAsset,
    setRawSourceAsset,
    sourceAsset,
    setSourceAsset,
    bundle,
    setBundle,
    spectralData,
    setSpectralData,
    sourceView,
    setSourceView,
    secondaryView,
    setSecondaryView,
    viewBlend,
    setViewBlend,
    sourcePreviewMode,
    setSourcePreviewMode,
    playheadPosition,
    setPlayheadPosition,
    isPlaying,
    setIsPlaying,
    busy,
    setBusy,
    revision,
    setRevision,
    auditionView,
    auditionBlendAmount,
    selectedProjectId,
  };
}
