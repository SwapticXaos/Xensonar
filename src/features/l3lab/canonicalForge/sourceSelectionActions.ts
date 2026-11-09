import type { AudioSourceAsset } from '../spectralForge/audio/AudioImporter';
import type { CanonicalSourceView } from './analysis';
import { clampSelectionBounds } from './spectralWorkspaceUtils';

export type SelectionDragMode = 'move' | 'resize-start' | 'resize-end';

export type SelectionDrag = {
  mode: SelectionDragMode;
  startSec: number;
  durationSec: number;
  anchorTime: number;
};

export type DetailSelectionDrag = {
  mode: 'new' | SelectionDragMode;
  startSec: number;
  durationSec: number;
  anchorTime: number;
};

export function updateSourcePreviewSelectionFromMouse(args: {
  clientX: number;
  rawSourceAsset: AudioSourceAsset | null;
  sourcePreviewElement: HTMLCanvasElement | null;
  selectionDrag: SelectionDrag | null;
  setSelectionStartSec: (value: number) => void;
  setSelectionDurationSec: (value: number) => void;
  setSelectionDirty: (value: boolean) => void;
}) {
  const {
    clientX,
    rawSourceAsset,
    sourcePreviewElement,
    selectionDrag,
    setSelectionStartSec,
    setSelectionDurationSec,
    setSelectionDirty,
  } = args;
  if (!rawSourceAsset || !selectionDrag || !sourcePreviewElement) return;
  const rect = sourcePreviewElement.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
  const time = ratio * rawSourceAsset.originalDuration;
  const minDuration = 0.25;
  if (selectionDrag.mode === 'move') {
    const nextStart = Math.max(0, Math.min(rawSourceAsset.originalDuration - selectionDrag.durationSec, selectionDrag.startSec + (time - selectionDrag.anchorTime)));
    setSelectionStartSec(nextStart);
  } else if (selectionDrag.mode === 'resize-start') {
    const end = selectionDrag.startSec + selectionDrag.durationSec;
    const nextStart = Math.max(0, Math.min(end - minDuration, time));
    setSelectionStartSec(nextStart);
    setSelectionDurationSec(Math.max(minDuration, end - nextStart));
  } else if (selectionDrag.mode === 'resize-end') {
    const nextEnd = Math.max(selectionDrag.startSec + minDuration, Math.min(rawSourceAsset.originalDuration, time));
    setSelectionDurationSec(nextEnd - selectionDrag.startSec);
  }
  setSelectionDirty(true);
}

export function beginSourcePreviewSelectionDrag(args: {
  clientX: number;
  rawSourceAsset: AudioSourceAsset | null;
  sourcePreviewElement: HTMLCanvasElement | null;
  selectionStartSec: number;
  selectionDurationSec: number;
  setSelectionStartSec: (value: number) => void;
  setSelectionDirty: (value: boolean) => void;
}): SelectionDrag | null {
  const {
    clientX,
    rawSourceAsset,
    sourcePreviewElement,
    selectionStartSec,
    selectionDurationSec,
    setSelectionStartSec,
    setSelectionDirty,
  } = args;
  if (!rawSourceAsset || !sourcePreviewElement) return null;
  const rect = sourcePreviewElement.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
  const time = ratio * rawSourceAsset.originalDuration;
  const start = selectionStartSec;
  const end = selectionStartSec + selectionDurationSec;
  const handleThreshold = (10 / Math.max(1, rect.width)) * rawSourceAsset.originalDuration;
  let mode: SelectionDragMode = 'move';
  if (Math.abs(time - start) <= handleThreshold) mode = 'resize-start';
  else if (Math.abs(time - end) <= handleThreshold) mode = 'resize-end';
  else if (time < start || time > end) {
    const nextStart = Math.max(0, Math.min(rawSourceAsset.originalDuration - selectionDurationSec, time - selectionDurationSec * 0.5));
    setSelectionStartSec(nextStart);
    setSelectionDirty(true);
  }
  return { mode, startSec: selectionStartSec, durationSec: selectionDurationSec, anchorTime: time };
}

export function beginSourceDetailSelectionDrag(args: {
  clientX: number;
  rawSourceAsset: AudioSourceAsset | null;
  sourceDetailElement: HTMLCanvasElement | null;
  detailViewportStartSec: number;
  detailViewportDurationSec: number;
  detailSelectionStartSec: number;
  detailSelectionDurationSec: number;
  detailSelectionDirty: boolean;
  setDetailSelectionStartSec: (value: number) => void;
  setDetailSelectionDurationSec: (value: number) => void;
  setDetailSelectionDirty: (value: boolean) => void;
}): DetailSelectionDrag | null {
  const {
    clientX,
    rawSourceAsset,
    sourceDetailElement,
    detailViewportStartSec,
    detailViewportDurationSec,
    detailSelectionStartSec,
    detailSelectionDurationSec,
    detailSelectionDirty,
    setDetailSelectionStartSec,
    setDetailSelectionDurationSec,
    setDetailSelectionDirty,
  } = args;
  if (!rawSourceAsset || !sourceDetailElement) return null;
  const rect = sourceDetailElement.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
  const time = detailViewportStartSec + ratio * detailViewportDurationSec;
  const start = detailSelectionStartSec;
  const end = detailSelectionStartSec + detailSelectionDurationSec;
  const handleThreshold = (10 / Math.max(1, rect.width)) * detailViewportDurationSec;
  let mode: DetailSelectionDrag['mode'] = 'new';
  if (detailSelectionDirty) {
    if (Math.abs(time - start) <= handleThreshold) mode = 'resize-start';
    else if (Math.abs(time - end) <= handleThreshold) mode = 'resize-end';
    else if (time > start && time < end) mode = 'move';
  }
  if (mode === 'new') {
    setDetailSelectionStartSec(time);
    setDetailSelectionDurationSec(Math.max(0.05, detailViewportDurationSec * 0.2));
    setDetailSelectionDirty(true);
  }
  return {
    mode,
    startSec: detailSelectionStartSec,
    durationSec: detailSelectionDurationSec,
    anchorTime: time,
  };
}

export function updateDetailSelectionFromMouse(args: {
  clientX: number;
  rawSourceAsset: AudioSourceAsset | null;
  sourceDetailElement: HTMLCanvasElement | null;
  detailSelectionDrag: DetailSelectionDrag | null;
  detailViewportStartSec: number;
  detailViewportDurationSec: number;
  setDetailSelectionStartSec: (value: number) => void;
  setDetailSelectionDurationSec: (value: number) => void;
  setDetailSelectionDirty: (value: boolean) => void;
}) {
  const {
    clientX,
    rawSourceAsset,
    sourceDetailElement,
    detailSelectionDrag,
    detailViewportStartSec,
    detailViewportDurationSec,
    setDetailSelectionStartSec,
    setDetailSelectionDurationSec,
    setDetailSelectionDirty,
  } = args;
  if (!rawSourceAsset || !detailSelectionDrag || !sourceDetailElement) return;
  const rect = sourceDetailElement.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
  const time = detailViewportStartSec + ratio * detailViewportDurationSec;
  const minDuration = Math.max(0.05, Math.min(0.25, detailViewportDurationSec));
  let nextStart = detailSelectionDrag.startSec;
  let nextDuration = detailSelectionDrag.durationSec;
  if (detailSelectionDrag.mode === 'move') {
    nextStart = detailSelectionDrag.startSec + (time - detailSelectionDrag.anchorTime);
  } else if (detailSelectionDrag.mode === 'resize-start') {
    const end = detailSelectionDrag.startSec + detailSelectionDrag.durationSec;
    nextStart = Math.min(time, end - minDuration);
    nextDuration = end - nextStart;
  } else if (detailSelectionDrag.mode === 'resize-end') {
    const nextEnd = Math.max(detailSelectionDrag.startSec + minDuration, time);
    nextDuration = nextEnd - detailSelectionDrag.startSec;
  } else {
    nextStart = Math.min(detailSelectionDrag.anchorTime, time);
    nextDuration = Math.abs(time - detailSelectionDrag.anchorTime);
  }
  const clamped = clampSelectionBounds(nextStart - detailViewportStartSec, nextDuration, detailViewportDurationSec, minDuration);
  setDetailSelectionStartSec(detailViewportStartSec + clamped.startSec);
  setDetailSelectionDurationSec(clamped.durationSec);
  setDetailSelectionDirty(true);
}

export function loadDetailSelectionIntoMainSelection(args: {
  detailSelectionStartSec: number;
  detailSelectionDurationSec: number;
  maxDuration: number;
  setSelectionStartSec: (value: number) => void;
  setSelectionDurationSec: (value: number) => void;
  setSelectionDirty: (value: boolean) => void;
  setDetailSelectionDirty: (value: boolean) => void;
  clearLastAutoCorrect: () => void;
  setStatus: (value: string) => void;
}) {
  const {
    detailSelectionStartSec,
    detailSelectionDurationSec,
    maxDuration,
    setSelectionStartSec,
    setSelectionDurationSec,
    setSelectionDirty,
    setDetailSelectionDirty,
    clearLastAutoCorrect,
    setStatus,
  } = args;
  const next = clampSelectionBounds(detailSelectionStartSec, detailSelectionDurationSec, Math.max(0.05, maxDuration));
  setSelectionStartSec(next.startSec);
  setSelectionDurationSec(next.durationSec);
  setSelectionDirty(true);
  setDetailSelectionDirty(true);
  clearLastAutoCorrect();
  setStatus('Feinauswahl geladen. Oben bestimmt jetzt wieder, was unten sichtbar ist; die untere Maske selbst bleibt erhalten.');
}

export function applySourceViewAudition(args: {
  view: CanonicalSourceView;
  sourceViews: { id: CanonicalSourceView; label: string }[];
  setSourceView: (view: CanonicalSourceView) => void;
  setSourcePreviewMode: (updater: (mode: 'forge' | 'sourceWindow' | 'sourceFull') => 'forge' | 'sourceWindow' | 'sourceFull') => void;
  setAuditionView: (updater: (current: CanonicalSourceView | 'none') => CanonicalSourceView | 'none') => void;
  setAuditionBlendAmount: (updater: number | ((amount: number) => number)) => void;
  setStatus: (value: string) => void;
}) {
  const {
    view,
    sourceViews,
    setSourceView,
    setSourcePreviewMode,
    setAuditionView,
    setAuditionBlendAmount,
    setStatus,
  } = args;
  setSourceView(view);
  setSourcePreviewMode((mode) => (mode === 'forge' ? 'sourceWindow' : mode));
  setAuditionView((current) => {
    if (current === view) {
      setAuditionBlendAmount((amount: number) => (amount >= 0.36 ? 0.12 : Math.round((amount + 0.12) * 100) / 100));
    } else {
      setAuditionBlendAmount(0.12);
    }
    return view;
  });
  setStatus(`${sourceViews.find((entry) => entry.id === view)?.label ?? view} wird der Original-WAV im oberen WAV-Fenster und im unteren Loop-Vorhörer leicht beigemischt. Erst „Auf Arbeitsfläche übertragen“ macht den harten Umbau.`);
}

export function resetSourceAuditionBlend(args: {
  setAuditionView: (value: CanonicalSourceView | 'none') => void;
  setAuditionBlendAmount: (value: number) => void;
  setStatus: (value: string) => void;
}) {
  const { setAuditionView, setAuditionBlendAmount, setStatus } = args;
  setAuditionView('none');
  setAuditionBlendAmount(0);
  setStatus('Preview wieder auf reine Original-WAV zurückgesetzt.');
}
