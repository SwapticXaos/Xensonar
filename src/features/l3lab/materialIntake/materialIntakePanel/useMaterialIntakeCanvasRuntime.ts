import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { loopPreviewEngine } from '../LoopPreviewEngine';
import { intersectRanges, rangeEnd } from '../selectionMath';
import type { IntakeSelectionState, IntakeSource, MaterialIntakeMeterConfig, TimeRange } from '../types';
import { buildRegionPreview, clamp01, drawPlaystrip, drawWaveform, timeToX } from './materialIntakeCanvas';
import { detectDragMode, updateDraggedRange, type DragState } from './materialIntakeDrag';

export type MaterialIntakeCanvasCursor = 'crosshair' | 'ew-resize' | 'pointer';

export function useMaterialIntakeCanvasRuntime(args: {
  source: IntakeSource | null;
  selection: IntakeSelectionState | null;
  previewPlaying: boolean;
  meter?: MaterialIntakeMeterConfig;
  setDetailViewport: (range: TimeRange) => void;
  setFineLoopRange: (range: TimeRange) => void;
  clearRepairUndo: () => void;
  scrubPreviewAt: (pointSec: number, rangeOverride?: TimeRange) => Promise<boolean>;
  updateActivePreviewRange: (range: TimeRange) => boolean;
}) {
  const {
    source,
    selection,
    previewPlaying,
    meter,
    setDetailViewport,
    setFineLoopRange,
    clearRepairUndo,
    scrubPreviewAt,
    updateActivePreviewRange,
  } = args;
  const overviewRef = useRef<HTMLCanvasElement>(null);
  const detailRef = useRef<HTMLCanvasElement>(null);
  const playstripRef = useRef<HTMLCanvasElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [previewOffsetSec, setPreviewOffsetSec] = useState<number | null>(null);
  const [overviewCursor, setOverviewCursor] = useState<MaterialIntakeCanvasCursor>('crosshair');
  const [detailCursor, setDetailCursor] = useState<MaterialIntakeCanvasCursor>('crosshair');

  useEffect(() => {
    if (!previewPlaying || !selection) {
      setPreviewOffsetSec(null);
      return;
    }
    let frame = 0;
    const tick = () => {
      setPreviewOffsetSec(loopPreviewEngine.getPlaybackOffsetSec());
      frame = window.requestAnimationFrame(tick);
    };
    tick();
    return () => window.cancelAnimationFrame(frame);
  }, [previewPlaying, selection]);

  useEffect(() => {
    const canvas = overviewRef.current;
    if (!canvas || !source || !selection) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(148,163,184,0.35)';
    ctx.beginPath();
    ctx.moveTo(0, height * 0.5 + 0.5);
    ctx.lineTo(width, height * 0.5 + 0.5);
    ctx.stroke();
    drawWaveform(ctx, source.waveformPreview, width, height, 'rgba(248,250,252,0.92)');

    const viewportX = timeToX(selection.detailViewport.startSec, source.durationSec, width);
    const viewportW = Math.max(2, timeToX(selection.detailViewport.durationSec, source.durationSec, width));
    ctx.fillStyle = 'rgba(34, 211, 238, 0.12)';
    ctx.fillRect(viewportX, 0, viewportW, height);
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.95)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(viewportX + 0.5, 0.5, Math.max(1, viewportW - 1), height - 1);

    const loopX = timeToX(selection.fineLoopRange.startSec, source.durationSec, width);
    const loopW = Math.max(2, timeToX(selection.fineLoopRange.durationSec, source.durationSec, width));
    ctx.fillStyle = 'rgba(168, 85, 247, 0.13)';
    ctx.fillRect(loopX, 6, loopW, height - 12);
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.95)';
    ctx.strokeRect(loopX + 0.5, 6.5, Math.max(1, loopW - 1), height - 13);
  }, [selection, source]);

  useEffect(() => {
    const canvas = detailRef.current;
    if (!canvas || !source || !selection) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(148,163,184,0.35)';
    ctx.beginPath();
    ctx.moveTo(0, height * 0.5 + 0.5);
    ctx.lineTo(width, height * 0.5 + 0.5);
    ctx.stroke();
    const preview = buildRegionPreview(
      source.sourceAsset.monoSamples,
      source.sourceAsset.sampleRate,
      selection.detailViewport,
      width,
    );
    drawWaveform(ctx, preview, width, height, 'rgba(248,250,252,0.92)');

    const visibleLoop = intersectRanges(selection.fineLoopRange, selection.detailViewport);
    if (visibleLoop) {
      const relStart = (visibleLoop.startSec - selection.detailViewport.startSec) / Math.max(0.0001, selection.detailViewport.durationSec);
      const relDuration = visibleLoop.durationSec / Math.max(0.0001, selection.detailViewport.durationSec);
      const x = relStart * width;
      const w = Math.max(2, relDuration * width);
      ctx.fillStyle = 'rgba(168, 85, 247, 0.16)';
      ctx.fillRect(x, 0, w, height);
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.95)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 0.5, 0.5, Math.max(1, w - 1), height - 1);

      if (previewPlaying && previewOffsetSec != null) {
        const playheadTimeSec = selection.fineLoopRange.startSec + previewOffsetSec;
        if (playheadTimeSec >= visibleLoop.startSec && playheadTimeSec <= rangeEnd(visibleLoop)) {
          const relPlayhead = (playheadTimeSec - selection.detailViewport.startSec) / Math.max(0.0001, selection.detailViewport.durationSec);
          const playheadX = relPlayhead * width;
          ctx.strokeStyle = 'rgba(34, 197, 94, 0.98)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(playheadX + 0.5, 0);
          ctx.lineTo(playheadX + 0.5, height);
          ctx.stroke();
        }
      }
    }
  }, [meter, previewOffsetSec, previewPlaying, selection, source]);

  useEffect(() => {
    const canvas = playstripRef.current;
    if (!canvas || !selection) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const playheadTimeSec = previewPlaying && previewOffsetSec != null
      ? selection.fineLoopRange.startSec + previewOffsetSec
      : null;
    drawPlaystrip(ctx, canvas.width, canvas.height, selection.detailViewport, selection.fineLoopRange, meter, playheadTimeSec);
  }, [meter, previewOffsetSec, previewPlaying, selection]);

  useEffect(() => {
    if (!dragState || !source || !selection) return;
    const handleMove = (event: PointerEvent | MouseEvent) => {
      const canvas = dragState.target === 'overview' ? overviewRef.current : detailRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = 'clientX' in event ? event.clientX : 0;
      const ratio = clamp01((clientX - rect.left) / Math.max(1, rect.width));
      const maxDuration = source.durationSec;
      if (dragState.target === 'overview') {
        const pointSec = ratio * source.durationSec;
        setDetailViewport(updateDraggedRange(pointSec, dragState, maxDuration, 0.15));
      } else {
        const viewport = selection.detailViewport;
        const pointSec = viewport.startSec + ratio * viewport.durationSec;
        const next = updateDraggedRange(pointSec, dragState, maxDuration, 0.05);
        setFineLoopRange(next);
        if (previewPlaying) updateActivePreviewRange(next);
      }
    };
    const handleUp = () => setDragState(null);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [dragState, previewPlaying, selection, setDetailViewport, setFineLoopRange, source, updateActivePreviewRange]);

  const updateOverviewCursor = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!source || !selection) {
      setOverviewCursor('crosshair');
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = clamp01((event.clientX - rect.left) / Math.max(1, rect.width));
    const pointSec = ratio * source.durationSec;
    const mode = detectDragMode(pointSec, selection.detailViewport, source.durationSec / Math.max(1, rect.width));
    setOverviewCursor(mode === 'resize-start' || mode === 'resize-end' ? 'ew-resize' : mode === 'move' ? 'pointer' : 'crosshair');
  };

  const updateDetailCursor = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!source || !selection) {
      setDetailCursor('crosshair');
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = clamp01((event.clientX - rect.left) / Math.max(1, rect.width));
    const pointSec = selection.detailViewport.startSec + ratio * selection.detailViewport.durationSec;
    const overlap = intersectRanges(selection.fineLoopRange, selection.detailViewport) ?? selection.fineLoopRange;
    const mode = detectDragMode(pointSec, overlap, selection.detailViewport.durationSec / Math.max(1, rect.width));
    setDetailCursor(mode === 'resize-start' || mode === 'resize-end' ? 'ew-resize' : mode === 'move' ? 'pointer' : 'crosshair');
  };

  const beginOverviewDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!source || !selection) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = clamp01((event.clientX - rect.left) / Math.max(1, rect.width));
    const pointSec = ratio * source.durationSec;
    const mode = detectDragMode(pointSec, selection.detailViewport, source.durationSec / Math.max(1, rect.width));
    if (mode === 'move') {
      // Preserve the existing click-to-scrub behavior, but do not consume the
      // gesture: the already-supported move drag can now translate the whole
      // cyan viewport mask while keeping its duration unchanged.
      void scrubPreviewAt(pointSec);
    }
    setDragState({
      target: 'overview',
      mode,
      anchorTime: pointSec,
      startSec: mode === 'new' ? pointSec : selection.detailViewport.startSec,
      durationSec: mode === 'new' ? 0.15 : selection.detailViewport.durationSec,
    });
  };

  const beginDetailDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!source || !selection) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = clamp01((event.clientX - rect.left) / Math.max(1, rect.width));
    const pointSec = selection.detailViewport.startSec + ratio * selection.detailViewport.durationSec;
    const overlap = intersectRanges(selection.fineLoopRange, selection.detailViewport) ?? selection.fineLoopRange;
    const mode = detectDragMode(pointSec, overlap, selection.detailViewport.durationSec / Math.max(1, rect.width));
    if (mode === 'move') {
      // A plain click still scrubs the selected loop as before. Keeping the
      // gesture alive additionally lets a drag from the purple mask interior
      // translate the full loop without changing its duration.
      void scrubPreviewAt(pointSec, selection.fineLoopRange);
    }
    if (mode === 'new') clearRepairUndo();
    setDragState({
      target: 'detail',
      mode,
      anchorTime: pointSec,
      startSec: mode === 'new' ? pointSec : selection.fineLoopRange.startSec,
      durationSec: mode === 'new' ? 0.05 : selection.fineLoopRange.durationSec,
    });
  };

  return {
    overviewRef,
    detailRef,
    playstripRef,
    overviewCursor,
    detailCursor,
    resetOverviewCursor: () => setOverviewCursor('crosshair'),
    resetDetailCursor: () => setDetailCursor('crosshair'),
    updateOverviewCursor,
    updateDetailCursor,
    beginOverviewDrag,
    beginDetailDrag,
  };
}
