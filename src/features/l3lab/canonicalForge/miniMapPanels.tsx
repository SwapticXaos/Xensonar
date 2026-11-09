import type { MouseEvent as ReactMouseEvent, RefObject } from 'react';
import {
  composerChannelCount,
  composerTrackById,
  getLoopTimeGuides,
  loopUnitsPerBeat,
  noteChannelIndex,
  noteDurationUnits,
  noteStartUnit,
  totalComposerSteps,
  type DrumViewportState,
  type LoopComposerState,
} from './loopDrumDomain';
import { getLoopComposerVerticalViewportWindow, getLoopComposerViewportWindow } from './viewportMath';

type ComposerViewportDragMode = 'move' | 'resize-start' | 'resize-end';

type DrumViewportNavigatorProps = {
  navigatorRef: RefObject<HTMLDivElement | null>;
  hitRatios: number[];
  viewport: DrumViewportState;
  onStartDrag: (mode: 'start' | 'end' | 'pan', clientX: number) => void;
  onReset: () => void;
};

export function DrumViewportNavigator({ navigatorRef, hitRatios, viewport, onStartDrag, onReset }: DrumViewportNavigatorProps) {
  return (
    <div
      ref={navigatorRef}
      className="relative h-12 rounded border border-neutral-800 bg-neutral-950/90 select-none"
      onMouseDown={(event) => {
        const target = event.target as HTMLElement;
        if (target.dataset.dragMode === 'start' || target.dataset.dragMode === 'end' || target.dataset.dragMode === 'pan') {
          event.preventDefault();
          onStartDrag(target.dataset.dragMode as 'start' | 'end' | 'pan', event.clientX);
        }
      }}
      onDoubleClick={onReset}
      title="Ziehen innen = scrollen · Griffe = Zoomgrenzen · Doppelklick = ganze Länge"
    >
      <div className="absolute inset-0 overflow-hidden rounded">
        {hitRatios.map((ratio, index) => (
          <span key={`${ratio}-${index}`} className="absolute top-[7px] h-[26px] w-[2px] rounded bg-cyan-400/35" style={{ left: `calc(${(ratio * 100).toFixed(4)}% - 1px)` }} />
        ))}
      </div>
      <div
        data-drag-mode="pan"
        className="absolute top-1 bottom-1 rounded border border-cyan-500/70 bg-cyan-500/14 shadow-[0_0_0_1px_rgba(34,211,238,0.12)_inset] cursor-grab active:cursor-grabbing"
        style={{ left: `${(viewport.startRatio * 100).toFixed(4)}%`, width: `${((viewport.endRatio - viewport.startRatio) * 100).toFixed(4)}%` }}
      >
        <div data-drag-mode="start" className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize bg-cyan-400/28" />
        <div data-drag-mode="end" className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize bg-cyan-400/28" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] text-cyan-100/80">sichtbarer Bereich</div>
      </div>
    </div>
  );
}

type LoopComposerHorizontalOverviewProps = {
  overviewRef: RefObject<HTMLDivElement | null>;
  loopComposer: LoopComposerState;
  onJump: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onStartDrag: (event: ReactMouseEvent<HTMLElement>, mode: ComposerViewportDragMode) => void;
};

export function LoopComposerHorizontalOverview({ overviewRef, loopComposer, onJump, onStartDrag }: LoopComposerHorizontalOverviewProps) {
  const totalUnits = Math.max(1, totalComposerSteps(loopComposer));
  const channels = Math.max(1, composerChannelCount(loopComposer) - 1 || 1);
  const unitsPerBeat = loopUnitsPerBeat(loopComposer);
  const viewport = getLoopComposerViewportWindow(loopComposer);
  return (
    <div ref={overviewRef} className="relative mt-3 h-16 overflow-hidden rounded-lg border border-neutral-800 bg-[#070b17]" onMouseDown={onJump}>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,13,24,0.96),rgba(3,6,15,0.96))]" />
      {getLoopTimeGuides(loopComposer).map((marker) => {
        const left = `${((marker.beat * unitsPerBeat) / totalUnits) * 100}%`;
        const isBar = marker.kind === 'bar';
        const mutedGuide = marker.kind === 'guide' && marker.muted;
        return (
          <div
            key={`overview-${marker.id}`}
            className="absolute top-0 bottom-0"
            style={{ left, width: isBar ? '2px' : '1px', opacity: mutedGuide ? 0.22 : (isBar ? 0.9 : 0.55), background: isBar ? 'rgba(34,211,238,0.75)' : 'rgba(250,204,21,0.45)' }}
          />
        );
      })}
      {loopComposer.notes.slice(0, 96).map((note) => {
        const topRatio = noteChannelIndex(loopComposer, note) / channels;
        const left = `${(noteStartUnit(loopComposer, note) / totalUnits) * 100}%`;
        const width = `${Math.max(0.6, (noteDurationUnits(loopComposer, note) / totalUnits) * 100)}%`;
        const track = composerTrackById(loopComposer, note.trackId);
        return (
          <div
            key={`overview-note-${note.id}`}
            className="absolute rounded-sm"
            style={{ left, width, top: `${8 + topRatio * 40}px`, height: '4px', background: `${track?.color ?? '#67e8f9'}cc`, boxShadow: note.id === loopComposer.selectedNoteId ? '0 0 0 1px rgba(255,255,255,0.65)' : 'none' }}
          />
        );
      })}
      <div className="absolute top-1 bottom-1 rounded-md border border-cyan-300/80 bg-cyan-400/10 shadow-[0_0_0_1px_rgba(34,211,238,0.15)]" style={{ left: `${viewport.startRatio * 100}%`, width: `${viewport.widthRatio * 100}%` }} onMouseDown={(event) => onStartDrag(event, 'move')}>
        <button type="button" aria-label="Viewport links anpassen" className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize rounded-l-md border-r border-cyan-200/60 bg-cyan-200/25" onMouseDown={(event) => onStartDrag(event, 'resize-start')} />
        <button type="button" aria-label="Viewport rechts anpassen" className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize rounded-r-md border-l border-cyan-200/60 bg-cyan-200/25" onMouseDown={(event) => onStartDrag(event, 'resize-end')} />
        <div className="absolute inset-x-4 top-1/2 h-[2px] -translate-y-1/2 rounded bg-cyan-100/60" />
      </div>
    </div>
  );
}

type LoopComposerVerticalOverviewProps = {
  overviewRef: RefObject<HTMLDivElement | null>;
  loopComposer: LoopComposerState;
  activeLoopPitchIndex: number;
  onJump: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onStartDrag: (event: ReactMouseEvent<HTMLElement>, mode: ComposerViewportDragMode) => void;
  onReset: () => void;
};

export function LoopComposerVerticalOverview({ overviewRef, loopComposer, activeLoopPitchIndex, onJump, onStartDrag, onReset }: LoopComposerVerticalOverviewProps) {
  const channelCount = Math.max(1, composerChannelCount(loopComposer) - 1 || 1);
  const viewport = getLoopComposerVerticalViewportWindow(loopComposer);
  return (
    <div ref={overviewRef} className="relative h-[700px] overflow-hidden rounded-md border border-neutral-800 bg-[#070b17]" onMouseDown={onJump} title="Innen greifen = vertikal scrollen · Oben/unten greifen = vertikalen Ausschnitt vergrößern oder verkleinern · Doppelklick = voller Bereich" onDoubleClick={onReset}>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,13,24,0.96),rgba(3,6,15,0.96))]" />
      {loopComposer.pitchLines.map((line, index) => {
        const top = `${(index / channelCount) * 100}%`;
        const isActive = index === activeLoopPitchIndex;
        return <div key={`vertical-line-${line.id}`} className="absolute left-[6px] right-[6px] h-[1px]" style={{ top, background: isActive ? 'rgba(125,211,252,0.95)' : (line.muted ? 'rgba(113,113,122,0.35)' : 'rgba(255,255,255,0.24)') }} />;
      })}
      <div className="absolute left-1 right-1 rounded-md border border-cyan-300/80 bg-cyan-400/10 shadow-[0_0_0_1px_rgba(34,211,238,0.15)]" style={{ top: `${viewport.startRatio * 100}%`, height: `${Math.max(8, viewport.heightRatio * 100)}%` }} onMouseDown={(event) => onStartDrag(event, 'move')}>
        <button type="button" aria-label="Viewport oben anpassen (hohe Lagen)" className="absolute left-0 right-0 top-0 h-3 cursor-ns-resize rounded-t-md border-b border-cyan-200/60 bg-cyan-200/25" onMouseDown={(event) => onStartDrag(event, 'resize-start')} />
        <button type="button" aria-label="Viewport unten anpassen (tiefe Lagen)" className="absolute left-0 right-0 bottom-0 h-3 cursor-ns-resize rounded-b-md border-t border-cyan-200/60 bg-cyan-200/25" onMouseDown={(event) => onStartDrag(event, 'resize-end')} />
        <div className="absolute inset-y-4 left-1/2 w-[2px] -translate-x-1/2 rounded bg-cyan-100/60" />
      </div>
    </div>
  );
}
