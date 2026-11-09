import * as React from 'react';
import { reportXensonarPromiseFailure } from '@/features/xensonar/diagnostics/runtimeIssueReporter';
import type { SavedMelodicSampleMeta } from './melodicSampleLibrary';
import type { LoopComposerState, LoopNoteEvent } from './loopDrumDomain';
import type { SelectedNotePreviewOptions } from './selectedNotePreviewContract';
import { LocalFieldWorkbench } from './LocalFieldWorkbench';
import { ensureLocalFieldState } from './localField';
import { EdgeDragMaskSurface, clampEdgeDragMaskRange } from '@/features/xensonar/ui/edgeDragMaskSurface';
import {
  drawSelectedSampleWaveformStrip,
  loadSelectedSampleWaveformPreview,
  type SelectedSampleWaveformPreview,
} from './selectedSampleWaveformPreview';

type Props = {
  sample: SavedMelodicSampleMeta;
  selectedNote: LoopNoteEvent;
  onOpenSampleDetails: (sampleId: string) => void;
  onPreviewSelectedNote: (options?: SelectedNotePreviewOptions) => Promise<void> | void;
  onStopPreview: (statusMessage?: string) => void;
  onFreezeSelectedNoteToSample: () => Promise<void> | void;
  onMutateLoopComposer: (updater: (draft: LoopComposerState) => void, statusMessage?: string) => void;
  onScrollToWorkspace?: () => void;
};

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function SelectedSampleEffectStrip({ sample, selectedNote, onOpenSampleDetails, onPreviewSelectedNote, onStopPreview, onFreezeSelectedNoteToSample, onMutateLoopComposer, onScrollToWorkspace }: Props) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [preview, setPreview] = React.useState<SelectedSampleWaveformPreview | null>(null);
  const field = React.useMemo(() => ensureLocalFieldState(selectedNote.localField), [selectedNote.localField]);
  const [liveRange, setLiveRange] = React.useState(field.range);
  const liveRangeRef = React.useRef(field.range);
  const activePreviewUntilRef = React.useRef(0);
  const livePreviewRefreshFrameRef = React.useRef<number | null>(null);

  React.useEffect(() => () => {
    if (livePreviewRefreshFrameRef.current != null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(livePreviewRefreshFrameRef.current);
    }
    livePreviewRefreshFrameRef.current = null;
  }, []);

  React.useEffect(() => {
    activePreviewUntilRef.current = 0;
  }, [selectedNote.id]);

  React.useEffect(() => {
    const next = field.range;
    liveRangeRef.current = next;
    setLiveRange(next);
  }, [selectedNote.id, field.range.startRatio, field.range.endRatio]);

  const maskStart = liveRange.startRatio;
  const maskEnd = liveRange.endRatio;

  React.useEffect(() => {
    let cancelled = false;
    setPreview(null);
    void loadSelectedSampleWaveformPreview(sample.id, selectedNote, sample.durationSec)
      .then((next) => {
        if (!cancelled) setPreview(next);
      })
      .catch((error) => {
        if (!cancelled) {
          reportXensonarPromiseFailure('samples', 'selected-sample-waveform-preview', error, { sampleId: sample.id, noteId: selectedNote.id });
          setPreview(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [sample.id, sample.durationSec, selectedNote.id, selectedNote.sampleOffsetSec, selectedNote.samplePlaybackDurationSec]);

  React.useEffect(() => {
    if (!canvasRef.current) return;
    drawSelectedSampleWaveformStrip(canvasRef.current, preview, maskStart, maskEnd);
  }, [preview, maskStart, maskEnd]);

  const visibleDurationSec = preview?.durationSec ?? sample.durationSec;

  const buildLiveNoteOverride = React.useCallback((scrubRatio?: number, rangeOverride = liveRangeRef.current): LoopNoteEvent => {
    const nextField = ensureLocalFieldState({
      ...field,
      range: rangeOverride,
    });
    const noteOverride: LoopNoteEvent = {
      ...selectedNote,
      localField: nextField,
    };
    if (typeof scrubRatio === 'number') {
      const sourceStart = preview?.segmentStartSec ?? Math.max(0, selectedNote.sampleOffsetSec ?? 0);
      const sourceDuration = Math.max(0.01, preview?.segmentDurationSec ?? selectedNote.samplePlaybackDurationSec ?? sample.durationSec);
      const safeRatio = clamp01(scrubRatio);
      const nextOffset = sourceStart + sourceDuration * safeRatio;
      const sourceEnd = sourceStart + sourceDuration;
      noteOverride.sampleOffsetSec = Math.max(0, nextOffset);
      noteOverride.samplePlaybackDurationSec = Math.max(0.01, sourceEnd - nextOffset);
    }
    return noteOverride;
  }, [field, preview?.segmentDurationSec, preview?.segmentStartSec, sample.durationSec, selectedNote]);

  const markSampleMaskPreviewActive = React.useCallback(() => {
    activePreviewUntilRef.current = Date.now() + Math.max(2600, Math.min(12000, visibleDurationSec * 1000 + 1400));
  }, [visibleDurationSec]);

  const hardForgetSampleMaskPreviewSnapshot = React.useCallback((statusMessage = 'Masken-Vorschau wird auf den aktuellen Zipfelstand gesetzt ...') => {
    if (livePreviewRefreshFrameRef.current != null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(livePreviewRefreshFrameRef.current);
    }
    livePreviewRefreshFrameRef.current = null;
    onStopPreview(statusMessage);
  }, [onStopPreview]);

  const previewLiveSelection = React.useCallback((scrubRatio?: number, rangeOverride = liveRangeRef.current) => {
    hardForgetSampleMaskPreviewSnapshot(typeof scrubRatio === 'number' ? 'Masken-Vorschau springt zur Klickposition ...' : 'Masken-Vorschau neu gestartet ...');
    markSampleMaskPreviewActive();
    void onPreviewSelectedNote({ noteOverride: buildLiveNoteOverride(scrubRatio, rangeOverride) });
  }, [buildLiveNoteOverride, hardForgetSampleMaskPreviewSnapshot, markSampleMaskPreviewActive, onPreviewSelectedNote]);

  const refreshActiveMaskPreview = React.useCallback((rangeOverride: typeof liveRangeRef.current) => {
    if (Date.now() > activePreviewUntilRef.current) return;
    if (livePreviewRefreshFrameRef.current != null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(livePreviewRefreshFrameRef.current);
    }
    const run = () => {
      livePreviewRefreshFrameRef.current = null;
      if (Date.now() > activePreviewUntilRef.current) return;
      hardForgetSampleMaskPreviewSnapshot('Masken-Vorschau vergisst den alten Play-Snapshot ...');
      markSampleMaskPreviewActive();
      void onPreviewSelectedNote({ noteOverride: buildLiveNoteOverride(undefined, rangeOverride) });
    };
    if (typeof requestAnimationFrame !== 'undefined') {
      livePreviewRefreshFrameRef.current = requestAnimationFrame(run);
    } else {
      run();
    }
  }, [buildLiveNoteOverride, hardForgetSampleMaskPreviewSnapshot, markSampleMaskPreviewActive, onPreviewSelectedNote]);

  const updateRange = (patch: Partial<typeof field.range>, statusMessage?: string) => {
    const current = liveRangeRef.current;
    const nextRange = clampEdgeDragMaskRange({
      ...current,
      ...patch,
    });
    liveRangeRef.current = nextRange;
    setLiveRange(nextRange);
    refreshActiveMaskPreview(nextRange);
    onMutateLoopComposer((draft) => {
      const note = draft.notes.find((entry) => entry.id === selectedNote.id);
      if (!note) return;
      const currentField = ensureLocalFieldState(note.localField);
      note.localField = ensureLocalFieldState({
        ...currentField,
        range: nextRange,
      });
    }, statusMessage);
  };

  return (
    <div className="mt-3 rounded border border-fuchsia-900/50 bg-fuchsia-950/20 p-3 text-[11px] text-fuchsia-100/80">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-semibold text-fuchsia-100">Sample-Block</div>
          <div className="mt-1 text-fuchsia-100/70">{sample.name}</div>
        </div>
        <button
          type="button"
          className="rounded border border-fuchsia-700/70 px-2 py-1 text-xs text-fuchsia-100 hover:bg-fuchsia-950/30"
          onClick={() => onOpenSampleDetails(sample.id)}
        >
          Sample-Details öffnen
        </button>
      </div>
      <div className="mt-3 rounded border border-fuchsia-800/50 bg-black/50 p-2">
        <EdgeDragMaskSurface
          value={{ startRatio: maskStart, endRatio: maskEnd }}
          onChange={updateRange}
          onHandleDragStart={() => {
            hardForgetSampleMaskPreviewSnapshot('Masken-Vorschau vergisst den alten Play-Snapshot ...');
            markSampleMaskPreviewActive();
          }}
          onMiddlePointerDown={(ratio) => previewLiveSelection(ratio)}
          statusLabel="Wirkbereich"
          className="rounded border border-fuchsia-900/30 bg-black"
        >
          <canvas ref={canvasRef} width={980} height={108} className="block h-[108px] w-full cursor-pointer rounded bg-black" data-xensonar-sample-mask-middle-preview="click-scrub" />
        </EdgeDragMaskSurface>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-[0.14em] text-fuchsia-100/60">
        <span>Wirkbereich {(maskStart * 100).toFixed(0)}–{(maskEnd * 100).toFixed(0)}%</span>
        <span>{visibleDurationSec.toFixed(2)} s</span>
      </div>
      <div className="mt-3">
        <LocalFieldWorkbench selectedNote={selectedNote} onMutateLoopComposer={onMutateLoopComposer} title="Kurven" description="" statusDescription="" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 rounded border border-fuchsia-900/40 bg-black/20 p-2">
        <button
          type="button"
          className="rounded border border-cyan-700/70 bg-cyan-950/20 px-2 py-1 text-[11px] text-cyan-100 hover:bg-cyan-900/30"
          onClick={() => previewLiveSelection()}
          data-xensonar-sample-mask-preview-restarts-from-live-range="true"
        >
          Vorhören
        </button>
        <button
          type="button"
          className="rounded border border-emerald-700/70 bg-emerald-950/20 px-2 py-1 text-[11px] text-emerald-100 hover:bg-emerald-900/30"
          onClick={() => {
            onMutateLoopComposer((draft) => draft, 'Sample-Block bleibt direkt im Projekt.');
            onScrollToWorkspace?.();
          }}
        >
          Übernehmen
        </button>
        <button
          type="button"
          className="rounded border border-fuchsia-700/70 bg-fuchsia-950/20 px-2 py-1 text-[11px] text-fuchsia-100 hover:bg-fuchsia-900/30"
          onClick={() => { void onFreezeSelectedNoteToSample(); }}
          title="Rendert den aktuellen Sample-Block als neuen Sample-Ast."
        >
          Als Sample speichern
        </button>
        <button
          type="button"
          className="rounded border border-neutral-700 px-2 py-1 text-[11px] text-neutral-500"
          disabled
          title="Eigene Synth-Instrumente folgen als eigener Speicherschritt."
        >
          Als eigenes Synth-Instrument speichern
        </button>
      </div>
    </div>
  );
}
