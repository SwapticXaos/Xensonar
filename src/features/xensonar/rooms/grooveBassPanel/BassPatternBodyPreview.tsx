import { useRef, useState } from 'react';
import { applyBassPitchSnap, resolveBassEventFrequencyHz, summarizeBassClip, type BassClip, type BassEvent } from '../../groove/bassPatternEvents';

export function BassPatternBodyPreview({
  clip,
  editable = false,
  selectedEventId = '',
  onSelectEvent,
  onPatchEvent,
  onBeginEventEdit,
  onCreateEvent,
  onPatchSegment,
  onBeginSegmentEdit,
}: {
  clip: BassClip;
  editable?: boolean;
  selectedEventId?: string;
  onSelectEvent?: (eventId: string) => void;
  onPatchEvent?: (eventId: string, patch: Partial<BassEvent>, options?: { history?: boolean }) => void;
  onBeginEventEdit?: () => void;
  onCreateEvent?: (seed: Partial<BassEvent>) => void;
  onPatchSegment?: (markerId: string, step: number, options?: { history?: boolean }) => void;
  onBeginSegmentEdit?: () => void;
}) {
  const summary = summarizeBassClip(clip);
  const graphRef = useRef<HTMLDivElement | null>(null);
  const [dragEventId, setDragEventId] = useState('');
  const [dragMode, setDragMode] = useState<'move' | 'length'>('move');
  const [dragSegmentId, setDragSegmentId] = useState('');
  const effectiveRatios = clip.events.map((event) => event.ratioFromRoot * Math.pow(2, event.octave)).filter((value) => Number.isFinite(value) && value > 0);
  const minRatio = Math.min(0.25, ...(effectiveRatios.length ? effectiveRatios : [1]));
  const maxRatio = Math.max(2, ...(effectiveRatios.length ? effectiveRatios : [1]));
  const minLog = Math.log2(Math.max(0.0625, minRatio * 0.82));
  const maxLog = Math.log2(Math.max(0.125, maxRatio * 1.18));
  const spanLog = Math.max(0.2, maxLog - minLog);
  const ratioLines = [0.25, 0.5, 1, 16 / 15, 9 / 8, 6 / 5, 5 / 4, 4 / 3, 3 / 2, 7 / 4, 2, 3, 4]
    .filter((ratio) => ratio >= minRatio * 0.74 && ratio <= maxRatio * 1.34);
  const yForRatio = (ratio: number) => 100 - ((Math.log2(Math.max(0.0625, ratio)) - minLog) / spanLog) * 100;
  const ratioForY = (clientY: number) => {
    const rect = graphRef.current?.getBoundingClientRect();
    if (!rect) return 1;
    const usableHeight = Math.max(1, rect.height - 20);
    const y = Math.max(0, Math.min(usableHeight, clientY - rect.top));
    const normalized = 1 - y / usableHeight;
    return Math.pow(2, minLog + normalized * spanLog);
  };
  const stepPositionForX = (clientX: number) => {
    const rect = graphRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    return (x / Math.max(1, rect.width)) * clip.stepCount;
  };
  const stepForX = (clientX: number) => Math.max(0, Math.min(clip.stepCount - 0.1, Math.round((stepPositionForX(clientX) - 0.5) * 4) / 4));
  const patchFromPointer = (eventId: string, clientX: number, clientY: number, mode: 'move' | 'length' = dragMode) => {
    if (!editable || !onPatchEvent) return;
    const event = clip.events.find((entry) => entry.id === eventId);
    if (mode === 'length' && event) {
      const nextDuration = Math.max(0.1, Math.min(clip.stepCount, stepPositionForX(clientX) - event.startStep));
      onPatchEvent(eventId, { durationSteps: nextDuration }, { history: false });
      return;
    }
    const snapped = applyBassPitchSnap(ratioForY(clientY), clip.pitchSnapMode ?? 'magnet', clip.pitchGuideKind ?? 'ji');
    onPatchEvent(eventId, {
      startStep: stepForX(clientX),
      ratioFromRoot: snapped.ratioFromRoot,
      snapHint: snapped.snapHint,
      octave: 0,
    }, { history: false });
  };
  const sourceLabel = clip.generatorMeta.kind === 'rhythmforge'
    ? 'RhythmForge'
    : clip.generatorMeta.kind === 'psybass'
      ? 'PsyBass'
      : clip.generatorMeta.kind === 'classic'
        ? 'Classic'
        : 'Arbeitskopie';

  return (
    <div className="rounded border border-cyan-900/45 bg-cyan-950/10 p-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-200/70">Bass-Körper</div>
          <div className="text-sm font-semibold text-cyan-50">{clip.name}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {editable ? <div className="rounded border border-emerald-800/60 bg-emerald-950/25 px-2 py-1 text-[10px] uppercase tracking-widest text-emerald-100/80">beweglich</div> : null}
          <div className="rounded border border-cyan-900/60 bg-black/30 px-2 py-1 text-[10px] uppercase tracking-widest text-cyan-100/70">{sourceLabel}</div>
        </div>
      </div>
      <div
        ref={graphRef}
        className={`relative h-48 overflow-hidden rounded border border-cyan-900/45 bg-black/45 ${editable ? 'cursor-crosshair' : ''}`}
        onPointerMove={(event) => {
          if (dragSegmentId) {
            event.preventDefault();
            onPatchSegment?.(dragSegmentId, stepPositionForX(event.clientX), { history: false });
            return;
          }
          if (!dragEventId) return;
          event.preventDefault();
          patchFromPointer(dragEventId, event.clientX, event.clientY, dragMode);
        }}
        onPointerUp={() => { setDragEventId(''); setDragSegmentId(''); setDragMode('move'); }}
        onPointerLeave={() => { setDragEventId(''); setDragSegmentId(''); setDragMode('move'); }}
        onDoubleClick={(event) => {
          if (!editable || !onCreateEvent) return;
          const target = event.target as HTMLElement;
          if (target.closest('[data-bass-event-block]')) return;
          event.preventDefault();
          onCreateEvent({ startStep: stepForX(event.clientX), ratioFromRoot: ratioForY(event.clientY), octave: 0, durationSteps: 0.9, velocity: 0.78, accent: 0.72 });
        }}
      >
        {Array.from({ length: clip.stepCount + 1 }).map((_, index) => (
          <div key={`grid-${index}`} className="absolute bottom-0 top-0 border-l border-cyan-900/25" style={{ left: `${(index / clip.stepCount) * 100}%` }} />
        ))}
        {clip.segmentMarkers.map((marker) => {
          const left = `${(marker.step / clip.stepCount) * 100}%`;
          if (marker.kind === 'bar') {
            return <div key={marker.id} className="absolute bottom-0 top-0 border-l border-fuchsia-300/45" style={{ left }} title="Taktgrenze" />;
          }
          return (
            <div key={marker.id} className="absolute bottom-0 top-0 border-l border-amber-200/40" style={{ left }}>
              <button
                type="button"
                disabled={!editable}
                title={`Taktsegment ${marker.step.toFixed(2)}`}
                onPointerDown={(event) => {
                  if (!editable) return;
                  event.preventDefault();
                  event.stopPropagation();
                  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
                  onBeginSegmentEdit?.();
                  setDragSegmentId(marker.id);
                }}
                className="absolute -top-0.5 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[8px] border-x-transparent border-t-amber-200/85 disabled:cursor-default disabled:opacity-35"
              />
            </div>
          );
        })}
        {ratioLines.map((ratio) => {
          const top = Math.max(4, Math.min(96, yForRatio(ratio)));
          return (
            <div key={`ratio-${ratio}`} className="absolute left-0 right-0 border-t border-cyan-700/20" style={{ top: `${top}%` }}>
              <span className="absolute left-1 -translate-y-1/2 rounded bg-black/70 px-1 text-[9px] text-cyan-100/55">{ratio === 1 ? 'Root' : ratio.toFixed(ratio < 2 ? 3 : 2)}</span>
            </div>
          );
        })}
        <div className="absolute bottom-0 left-0 right-0 h-5 border-t border-fuchsia-900/30 bg-fuchsia-950/10">
          {Array.from({ length: clip.stepCount }).map((_, index) => (
            <span key={`tick-${index}`} className="absolute top-1 h-2 w-px bg-fuchsia-300/25" style={{ left: `${((index + 0.5) / clip.stepCount) * 100}%` }} />
          ))}
        </div>
        {clip.events.map((bassEvent) => {
          const ratio = bassEvent.ratioFromRoot * Math.pow(2, bassEvent.octave);
          const left = (bassEvent.startStep / clip.stepCount) * 100;
          const width = Math.max(3.8, Math.min(42, (bassEvent.durationSteps / clip.stepCount) * 100));
          const top = Math.max(9, Math.min(82, yForRatio(ratio) - 3));
          const opacity = Math.max(0.42, Math.min(1, 0.44 + bassEvent.accent * 0.48));
          const selected = bassEvent.id === selectedEventId;
          return (
            <div
              key={bassEvent.id}
              role={editable ? 'button' : undefined}
              tabIndex={editable ? 0 : undefined}
              data-bass-event-block="true"
              onPointerDown={(event) => {
                if (!editable) return;
                event.preventDefault();
                event.stopPropagation();
                (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
                onSelectEvent?.(bassEvent.id);
                onBeginEventEdit?.();
                setDragMode('move');
                setDragEventId(bassEvent.id);
                patchFromPointer(bassEvent.id, event.clientX, event.clientY, 'move');
              }}
              onClick={(event) => {
                if (!editable) return;
                event.stopPropagation();
                onSelectEvent?.(bassEvent.id);
              }}
              className={`absolute rounded-md border px-1 py-0.5 text-[9px] shadow-lg ${editable ? 'cursor-grab active:cursor-grabbing' : ''} ${selected ? 'ring-2 ring-amber-200' : ''} ${bassEvent.ghost ? 'border-dashed border-cyan-300/60 bg-cyan-700/25 text-cyan-50/75' : 'border-cyan-300/70 bg-cyan-500/30 text-cyan-50'}`}
              style={{ left: `${left}%`, width: `${width}%`, top: `${top}%`, opacity }}
              title={`Step ${bassEvent.startStep + 1} · ${(resolveBassEventFrequencyHz(bassEvent, 49)).toFixed(1)} Hz bei 49 Hz Root`}
            >
              <span className="block truncate">{ratio.toFixed(ratio < 2 ? 2 : 1)}×</span>
              {bassEvent.glide ? <span className="absolute -right-2 top-1/2 -translate-y-1/2 text-cyan-100/80">↗</span> : null}
              {editable ? (
                <span
                  className="absolute bottom-0 right-0 top-0 w-2 cursor-ew-resize rounded-r-md bg-amber-200/35"
                  aria-hidden="true"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    (event.currentTarget.parentElement as HTMLElement | null)?.setPointerCapture(event.pointerId);
                    onSelectEvent?.(bassEvent.id);
                    onBeginEventEdit?.();
                    setDragMode('length');
                    setDragEventId(bassEvent.id);
                    patchFromPointer(bassEvent.id, event.clientX, event.clientY, 'length');
                  }}
                />
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] text-cyan-100/70">
        <div className="rounded border border-cyan-900/40 bg-black/25 px-2 py-1">Events {summary.active}</div>
        <div className="rounded border border-cyan-900/40 bg-black/25 px-2 py-1">{clip.bars} T · {clip.stepsPerBar} Zeiteinheiten/T</div>
        <div className="rounded border border-cyan-900/40 bg-black/25 px-2 py-1">{clip.segmentCount} Taktsegmente</div>
      </div>
    </div>
  );
}

