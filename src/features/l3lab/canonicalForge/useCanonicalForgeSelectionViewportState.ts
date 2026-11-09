import { useState } from 'react';
import type { CanonicalForgeInitialState } from './canonicalForgeInitialState';

type CanonicalForgeSelectionViewportInitialState = Pick<
  CanonicalForgeInitialState,
  | 'selectionStartSec'
  | 'selectionDurationSec'
  | 'selectionDirty'
  | 'detailSelectionStartSec'
  | 'detailSelectionDurationSec'
  | 'detailSelectionDirty'
  | 'detailViewportStartSec'
  | 'detailViewportDurationSec'
  | 'detailZoom'
  | 'detailOffset'
>;

export function useCanonicalForgeSelectionViewportState(initialState: CanonicalForgeSelectionViewportInitialState) {
  const [selectionStartSec, setSelectionStartSec] = useState(() => initialState.selectionStartSec);
  const [selectionDurationSec, setSelectionDurationSec] = useState(() => initialState.selectionDurationSec);
  const [selectionDirty, setSelectionDirty] = useState(() => initialState.selectionDirty);
  const [detailSelectionStartSec, setDetailSelectionStartSec] = useState(() => initialState.detailSelectionStartSec);
  const [detailSelectionDurationSec, setDetailSelectionDurationSec] = useState(() => initialState.detailSelectionDurationSec);
  const [detailSelectionDirty, setDetailSelectionDirty] = useState(() => initialState.detailSelectionDirty);
  const [detailViewportStartSec, setDetailViewportStartSec] = useState(() => initialState.detailViewportStartSec);
  const [detailViewportDurationSec, setDetailViewportDurationSec] = useState(() => initialState.detailViewportDurationSec);
  const [detailZoom, setDetailZoom] = useState(() => initialState.detailZoom);
  const [detailOffset, setDetailOffset] = useState(() => initialState.detailOffset);

  return {
    selectionStartSec,
    setSelectionStartSec,
    selectionDurationSec,
    setSelectionDurationSec,
    selectionDirty,
    setSelectionDirty,
    detailSelectionStartSec,
    setDetailSelectionStartSec,
    detailSelectionDurationSec,
    setDetailSelectionDurationSec,
    detailSelectionDirty,
    setDetailSelectionDirty,
    detailViewportStartSec,
    setDetailViewportStartSec,
    detailViewportDurationSec,
    setDetailViewportDurationSec,
    detailZoom,
    setDetailZoom,
    detailOffset,
    setDetailOffset,
  };
}
