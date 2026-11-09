import { useEffect } from 'react';
import { drawLoopComposerCanvas } from './loopComposerRendering';
import { drawDrumComputerCanvas } from './viewportMath';
import { resolveLoopNoteSampleId } from './loopDrumDomain';
import { ensureMelodicSampleAmplitudePreview, getCachedMelodicSampleAmplitudePreview } from './melodicSampleAmplitudePreview';

export function useCanonicalForgeRenderEffects(args: {
  logicView: any;
  activeWorkspace: any;
  materialExportBars: number;
  drumComputerRef: { current: HTMLCanvasElement | null };
  visibleDrumComputer: any;
  clipPreviewRatio: number;
  drumMarkerDragIndex: number | null;
  safeDrumViewport: any;
  clipComposerRef: { current: HTMLCanvasElement | null };
  loopComposer: any;
  selectedLoopNoteIds: string[];
  composerHover: { stepIndex: number | null; gridStep: number | null };
  clipPreviewStep: number;
  grooveDrumPattern: string;
  composerSelectionBox: any;
  chordGhostNotes: any;
  materialFragmentGuideSnapshot: any;
}) {
  const {
    logicView, activeWorkspace, materialExportBars, drumComputerRef, visibleDrumComputer,
    clipPreviewRatio, drumMarkerDragIndex, safeDrumViewport, clipComposerRef, loopComposer,
    selectedLoopNoteIds, composerHover, clipPreviewStep, grooveDrumPattern, composerSelectionBox,
    chordGhostNotes, materialFragmentGuideSnapshot,
  } = args;

  useEffect(() => {
    const canvas = drumComputerRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawDrumComputerCanvas(ctx, visibleDrumComputer, { playheadRatio: clipPreviewRatio, markerDragIndex: drumMarkerDragIndex, viewport: safeDrumViewport });
  }, [activeWorkspace, clipPreviewRatio, drumComputerRef, drumMarkerDragIndex, logicView, safeDrumViewport, visibleDrumComputer]);

  useEffect(() => {
    const canvas = clipComposerRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let disposed = false;
    const hasPendingPitchAnchor = loopComposer.notes.some((note: any) => note.pendingPitchAnchor === true);
    const sampleIds: string[] = Array.from(new Set<string>(loopComposer.notes.map((note: any) => resolveLoopNoteSampleId(loopComposer, note)).filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)));
    const drawCurrentFrame = (animationTimeMs = performance.now()) => {
      const sampleAmplitudePreviews = new Map(sampleIds.map((sampleId) => [sampleId, getCachedMelodicSampleAmplitudePreview(sampleId)]).filter((entry): entry is [string, NonNullable<ReturnType<typeof getCachedMelodicSampleAmplitudePreview>>] => !!entry[1]));
      drawLoopComposerCanvas(ctx, loopComposer, {
        selectedTrackId: loopComposer.selectedTrackId,
        selectedNoteId: loopComposer.selectedNoteId,
        selectedNoteIds: selectedLoopNoteIds,
        hoverChannelIndex: composerHover.stepIndex,
        hoverGridUnit: composerHover.gridStep,
        playheadStep: clipPreviewStep,
        drumPattern: grooveDrumPattern,
        exportBars: materialExportBars,
        selectionBox: composerSelectionBox,
        ghostNotes: chordGhostNotes,
        materialGuideHighlightActive: materialFragmentGuideSnapshot != null,
        animationTimeMs,
        sampleAmplitudePreviews,
      });
    };
    const animatePendingAnchor = (animationTimeMs = performance.now()) => {
      if (disposed) return;
      drawCurrentFrame(animationTimeMs);
      if (!disposed && hasPendingPitchAnchor) raf = window.requestAnimationFrame(animatePendingAnchor);
    };
    animatePendingAnchor();
    if (sampleIds.length) {
      void Promise.all(sampleIds.map((sampleId) => ensureMelodicSampleAmplitudePreview(sampleId))).then(() => {
        if (disposed || hasPendingPitchAnchor) return;
        drawCurrentFrame();
      });
    }
    return () => {
      disposed = true;
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [activeWorkspace, chordGhostNotes, clipComposerRef, clipPreviewStep, composerHover, composerSelectionBox, grooveDrumPattern, logicView, loopComposer, materialExportBars, materialFragmentGuideSnapshot, selectedLoopNoteIds]);
}
