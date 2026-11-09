import type { MouseEvent, MutableRefObject, RefObject } from 'react';
import type { AudioSourceAsset } from '../spectralForge/audio/AudioImporter';
import type { CanonicalSourceView } from './analysis';
import {
  applySourceViewAudition,
  beginSourceDetailSelectionDrag,
  beginSourcePreviewSelectionDrag,
  loadDetailSelectionIntoMainSelection,
  resetSourceAuditionBlend,
  updateDetailSelectionFromMouse as updateDetailSelectionFromMouseAction,
  updateSourcePreviewSelectionFromMouse,
  type DetailSelectionDrag,
  type SelectionDrag,
} from './sourceSelectionActions';

export function createCanonicalSourceSelectionController(args: {
  rawSourceAsset: AudioSourceAsset | null;
  sourcePreviewRef: RefObject<HTMLCanvasElement | null>;
  sourceDetailRef: RefObject<HTMLCanvasElement | null>;
  selectionDragRef: MutableRefObject<SelectionDrag | null>;
  detailSelectionDragRef: MutableRefObject<DetailSelectionDrag | null>;
  selectionStartSec: number;
  selectionDurationSec: number;
  detailSelectionStartSec: number;
  detailSelectionDurationSec: number;
  detailSelectionDirty: boolean;
  detailViewportRange: { startSec: number; durationSec: number };
  sourceViews: Array<{ id: CanonicalSourceView; label: string }>;
  setSelectionStartSec: (value: number) => void;
  setSelectionDurationSec: (value: number) => void;
  setSelectionDirty: (value: boolean) => void;
  setDetailSelectionStartSec: (value: number) => void;
  setDetailSelectionDurationSec: (value: number) => void;
  setDetailSelectionDirty: (value: boolean) => void;
  setSourceView: (view: CanonicalSourceView) => void;
  setSourcePreviewMode: (updater: (mode: 'forge' | 'sourceWindow' | 'sourceFull') => 'forge' | 'sourceWindow' | 'sourceFull') => void;
  setAuditionView: (updaterOrValue: any) => void;
  setAuditionBlendAmount: (updaterOrValue: any) => void;
  clearLastAutoCorrect: () => void;
  setStatus: (value: string) => void;
}) {
  const updateSelectionFromMouse = (clientX: number) => {
    updateSourcePreviewSelectionFromMouse({
      clientX,
      rawSourceAsset: args.rawSourceAsset,
      sourcePreviewElement: args.sourcePreviewRef.current,
      selectionDrag: args.selectionDragRef.current,
      setSelectionStartSec: args.setSelectionStartSec,
      setSelectionDurationSec: args.setSelectionDurationSec,
      setSelectionDirty: args.setSelectionDirty,
    });
  };

  const handleSourcePreviewDown = (event: MouseEvent<HTMLCanvasElement>) => {
    args.selectionDragRef.current = beginSourcePreviewSelectionDrag({
      clientX: event.clientX,
      rawSourceAsset: args.rawSourceAsset,
      sourcePreviewElement: args.sourcePreviewRef.current,
      selectionStartSec: args.selectionStartSec,
      selectionDurationSec: args.selectionDurationSec,
      setSelectionStartSec: args.setSelectionStartSec,
      setSelectionDirty: args.setSelectionDirty,
    });
  };

  const handleSourceDetailDown = (event: MouseEvent<HTMLCanvasElement>) => {
    args.detailSelectionDragRef.current = beginSourceDetailSelectionDrag({
      clientX: event.clientX,
      rawSourceAsset: args.rawSourceAsset,
      sourceDetailElement: args.sourceDetailRef.current,
      detailViewportStartSec: args.detailViewportRange.startSec,
      detailViewportDurationSec: args.detailViewportRange.durationSec,
      detailSelectionStartSec: args.detailSelectionStartSec,
      detailSelectionDurationSec: args.detailSelectionDurationSec,
      detailSelectionDirty: args.detailSelectionDirty,
      setDetailSelectionStartSec: args.setDetailSelectionStartSec,
      setDetailSelectionDurationSec: args.setDetailSelectionDurationSec,
      setDetailSelectionDirty: args.setDetailSelectionDirty,
    });
  };

  const updateDetailSelectionFromMouse = (clientX: number) => {
    updateDetailSelectionFromMouseAction({
      clientX,
      rawSourceAsset: args.rawSourceAsset,
      sourceDetailElement: args.sourceDetailRef.current,
      detailSelectionDrag: args.detailSelectionDragRef.current,
      detailViewportStartSec: args.detailViewportRange.startSec,
      detailViewportDurationSec: args.detailViewportRange.durationSec,
      setDetailSelectionStartSec: args.setDetailSelectionStartSec,
      setDetailSelectionDurationSec: args.setDetailSelectionDurationSec,
      setDetailSelectionDirty: args.setDetailSelectionDirty,
    });
  };

  const loadDetailSelection = () => {
    loadDetailSelectionIntoMainSelection({
      detailSelectionStartSec: args.detailSelectionStartSec,
      detailSelectionDurationSec: args.detailSelectionDurationSec,
      maxDuration: args.rawSourceAsset?.originalDuration ?? args.selectionDurationSec,
      setSelectionStartSec: args.setSelectionStartSec,
      setSelectionDurationSec: args.setSelectionDurationSec,
      setSelectionDirty: args.setSelectionDirty,
      setDetailSelectionDirty: args.setDetailSelectionDirty,
      clearLastAutoCorrect: args.clearLastAutoCorrect,
      setStatus: args.setStatus,
    });
  };

  const handleSourceViewAuditionClick = (view: CanonicalSourceView) => {
    applySourceViewAudition({
      view,
      sourceViews: args.sourceViews,
      setSourceView: args.setSourceView,
      setSourcePreviewMode: args.setSourcePreviewMode,
      setAuditionView: args.setAuditionView,
      setAuditionBlendAmount: args.setAuditionBlendAmount,
      setStatus: args.setStatus,
    });
  };

  const resetAuditionBlend = () => {
    resetSourceAuditionBlend({
      setAuditionView: args.setAuditionView,
      setAuditionBlendAmount: args.setAuditionBlendAmount,
      setStatus: args.setStatus,
    });
  };

  return {
    updateSelectionFromMouse,
    handleSourcePreviewDown,
    handleSourceDetailDown,
    updateDetailSelectionFromMouse,
    loadDetailSelection,
    handleSourceViewAuditionClick,
    resetAuditionBlend,
  };
}
