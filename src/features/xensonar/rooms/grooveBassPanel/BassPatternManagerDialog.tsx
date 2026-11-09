import { useEffect, useMemo, useRef, useState, type DragEvent as ReactDragEvent } from 'react';
import { decodePlaylistDropTarget, resolvePlaylistDropPreview, type PlaylistDropOperation } from '../../material/playlistDropOperation';
import { usePhaseShiftedPlaylistDragSession } from '../../ui/usePhaseShiftedPlaylistDragSession';
import { PlaylistDragActionHud, type PlaylistDragHudState } from '../PlaylistDragActionHud';
import {
  addBassClipSegmentMarker,
  buildBassPatternPreviewClip,
  createBassClipEvent,
  patchBassClipEvent,
  patchBassClipPitchMode,
  patchBassClipRootBinding,
  patchBassClipSegmentMarker,
  randomizeBassClipEvents,
  removeBassClipEvent,
  removeBassClipSegmentMarker,
  resizeBassClipTiming,
  type BassClip,
  type BassEvent,
  type BassPitchGuideKind,
  type BassPitchSnapMode,
  type BassRandomCharacter,
  type BassRootBinding,
} from '../../groove/bassPatternEvents';
import { BassPatternBodyPreview } from './BassPatternBodyPreview';
import { GrooveHeaderVolumeControl } from './GrooveHeaderVolumeControl';
import type { GrooveBassPanelNParams, UpdateResonanceNParams } from '../resonancePanelTypedContracts';

export function BassPatternManagerDialog({
  activeName,
  nParamsUI,
  updateNParams,
  bassPatterns,
  bassPreviewContext,
  bassClips,
  dragId,
  dropId,
  dragHud,
  setDragHud,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onSaveClip,
  onUpdateClip,
  onRenameClip,
  onRemoveClip,
  onSelectPreset,
  onSelectClip,
  onClose,
}: {
  activeName: string;
  nParamsUI: Pick<GrooveBassPanelNParams, 'bassActive' | 'bassClipId' | 'bassGrit' | 'bassPattern' | 'bassPatternMode' | 'bassRootHz' | 'bassRootMode' | 'bassTone' | 'bassVolume' | 'grooveSwing'>;
  updateNParams: UpdateResonanceNParams;
  bassPatterns: Array<{ value: string; label: string }>;
  bassPreviewContext?: { seed?: number; barIndex?: number; descriptors?: Record<string, number> };
  bassClips: BassClip[];
  dragId: string;
  dropId: string;
  dragHud: PlaylistDragHudState | null;
  setDragHud: (state: PlaylistDragHudState | null) => void;
  onDragStart: (event: ReactDragEvent<HTMLElement>, entryId: string) => void;
  onDragOver: (event: ReactDragEvent<HTMLElement>, entryId: string, operation: PlaylistDropOperation) => void;
  onDrop: (event: ReactDragEvent<HTMLElement>, entryId: string, operation: PlaylistDropOperation) => void;
  onDragEnd: () => void;
  onSaveClip: (clip: BassClip) => BassClip;
  onUpdateClip: (clip: BassClip) => void;
  onRenameClip: (id: string, name: string) => void;
  onRemoveClip: (id: string) => void;
  onSelectPreset: (pattern: string) => void;
  onSelectClip: (clip: BassClip) => void;
  onClose: () => void;
}) {
  const activeClip = nParamsUI.bassPatternMode === 'clip'
    ? bassClips.find((clip) => clip.id === nParamsUI.bassClipId) ?? null
    : null;
  const generatorPreviewClip = useMemo(() => buildBassPatternPreviewClip({
    pattern: String(nParamsUI.bassPattern ?? 'offbeat'),
    rootHz: Number(nParamsUI.bassRootHz ?? 49),
    swing: Number(nParamsUI.grooveSwing ?? 0.06),
    bassGrit: Number(nParamsUI.bassGrit ?? 0.18),
    seed: bassPreviewContext?.seed,
    barIndex: bassPreviewContext?.barIndex,
    descriptors: bassPreviewContext?.descriptors,
  }), [nParamsUI.bassPattern, nParamsUI.bassRootHz, nParamsUI.grooveSwing, nParamsUI.bassGrit, bassPreviewContext?.seed, bassPreviewContext?.barIndex, bassPreviewContext?.descriptors]);
  const previewClip = activeClip ?? generatorPreviewClip;
  const editable = !!activeClip;
  const [selectedEventId, setSelectedEventId] = useState('');
  const [renameDraft, setRenameDraft] = useState('');
  const [clipHistoryById, setClipHistoryById] = useState<Record<string, { past: BassClip[]; future: BassClip[] }>>({});
  const lastHistorySnapshotRef = useRef<{ clipId: string; signature: string } | null>(null);
  const selectedEvent = previewClip.events.find((event) => event.id === selectedEventId) ?? previewClip.events[0] ?? null;
  const [randomCharacter, setRandomCharacter] = useState<BassRandomCharacter>('frei');
  const dropPreview = resolvePlaylistDropPreview(
    dropId,
    bassClips.map((clip) => ({ id: clip.id, title: clip.name })),
    dragId,
  );
  const draggedClip = bassClips.find((clip) => clip.id === dragId) ?? null;
  const insertNeighborIds = new Set(dropPreview && dropPreview.operation !== 'swap' ? dropPreview.highlightedEntryIds : []);
  const bassPlaylistDragSession = usePhaseShiftedPlaylistDragSession();
  const handleBassPlaylistDragOver = (event: ReactDragEvent<HTMLElement>) => {
    const target = bassPlaylistDragSession.updatePreviewFromDragEvent(event);
    if (!target) return;
    setDragHud({ x: event.clientX, y: event.clientY });
    onDragOver(event, target.entryId, target.operation);
  };
  const handleBassPlaylistDrop = (event: ReactDragEvent<HTMLElement>) => {
    const session = bassPlaylistDragSession.getSession();
    if (!session) return;
    const target = bassPlaylistDragSession.getDropTarget();
    setDragHud(null);
    if (!target) {
      event.preventDefault();
      return;
    }
    onDrop(event, target.entryId, target.operation);
  };

  useEffect(() => {
    setSelectedEventId((current) => previewClip.events.some((event) => event.id === current) ? current : previewClip.events[0]?.id ?? '');
    setRenameDraft(activeClip?.name ?? '');
  }, [activeClip?.id, previewClip.id]);

  const activeHistory = activeClip ? clipHistoryById[activeClip.id] ?? { past: [], future: [] } : { past: [], future: [] };

  const pushActiveClipHistorySnapshot = () => {
    if (!activeClip) return;
    const signature = JSON.stringify(activeClip);
    if (lastHistorySnapshotRef.current?.clipId === activeClip.id && lastHistorySnapshotRef.current.signature === signature) return;
    lastHistorySnapshotRef.current = { clipId: activeClip.id, signature };
    setClipHistoryById((current) => {
      const history = current[activeClip.id] ?? { past: [], future: [] };
      const lastPast = history.past[history.past.length - 1];
      if (lastPast && JSON.stringify(lastPast) === signature) return current;
      return {
        ...current,
        [activeClip.id]: {
          past: [...history.past.slice(-19), activeClip],
          future: [],
        },
      };
    });
  };

  const commitActiveClipUpdate = (nextClip: BassClip, options: { history?: boolean } = {}) => {
    if (options.history !== false) pushActiveClipHistorySnapshot();
    onUpdateClip(nextClip);
  };

  const undoActiveClip = () => {
    if (!activeClip || !activeHistory.past.length) return;
    const previous = activeHistory.past[activeHistory.past.length - 1];
    setClipHistoryById((current) => {
      const history = current[activeClip.id] ?? { past: [], future: [] };
      return {
        ...current,
        [activeClip.id]: {
          past: history.past.slice(0, -1),
          future: [activeClip, ...history.future].slice(0, 20),
        },
      };
    });
    lastHistorySnapshotRef.current = null;
    onUpdateClip(previous);
    setSelectedEventId(previous.events[0]?.id ?? '');
  };

  const redoActiveClip = () => {
    if (!activeClip || !activeHistory.future.length) return;
    const next = activeHistory.future[0];
    setClipHistoryById((current) => {
      const history = current[activeClip.id] ?? { past: [], future: [] };
      return {
        ...current,
        [activeClip.id]: {
          past: [...history.past.slice(-19), activeClip],
          future: history.future.slice(1),
        },
      };
    });
    lastHistorySnapshotRef.current = null;
    onUpdateClip(next);
    setSelectedEventId(next.events[0]?.id ?? '');
  };

  const patchSelectedClipEvent = (eventId: string, patch: Partial<BassEvent>, options: { history?: boolean } = {}) => {
    if (!activeClip) return;
    commitActiveClipUpdate(patchBassClipEvent(activeClip, eventId, patch), options);
  };
  const nudgeSelected = (patch: Partial<BassEvent>) => {
    if (!selectedEvent) return;
    patchSelectedClipEvent(selectedEvent.id, patch);
  };
  const addEditableEvent = (seedOverride?: Partial<BassEvent>) => {
    if (!activeClip) {
      const workcopy = onSaveClip(generatorPreviewClip);
      onSelectClip(workcopy);
      return;
    }
    const seed = seedOverride ?? selectedEvent ?? activeClip.events[activeClip.events.length - 1];
    const nextStartStep = seedOverride?.startStep ?? (seed ? Math.min(activeClip.stepCount - 1, (seed.startStep ?? 0) + 1) : 0);
    const seedPatch = seed ? {
      startStep: nextStartStep,
      durationSteps: seed.durationSteps,
      ratioFromRoot: seed.ratioFromRoot,
      octave: seed.octave,
      velocity: seed.velocity,
      accent: seed.accent,
      ghost: seed.ghost,
      tie: seed.tie,
      glide: seed.glide,
    } : { startStep: nextStartStep };
    const nextClip = createBassClipEvent(activeClip, seedPatch);
    const added = nextClip.events.find((event) => !activeClip.events.some((oldEvent) => oldEvent.id === event.id));
    commitActiveClipUpdate(nextClip);
    if (added) setSelectedEventId(added.id);
  };
  const removeEditableEvent = () => {
    if (!activeClip || !selectedEvent) return;
    const nextClip = removeBassClipEvent(activeClip, selectedEvent.id);
    commitActiveClipUpdate(nextClip);
    setSelectedEventId(nextClip.events[0]?.id ?? '');
  };
  const fixCurrentGenerator = () => {
    const workcopy = onSaveClip(generatorPreviewClip);
    onSelectClip(workcopy);
  };
  const randomizeCurrentBassBody = () => {
    const base = activeClip ?? generatorPreviewClip;
    const randomized = randomizeBassClipEvents(base, { character: randomCharacter });
    onUpdateClip(randomized);
    onSelectClip(randomized);
    setSelectedEventId(randomized.events[0]?.id ?? '');
  };
  const patchActiveTiming = (bars: number, stepsPerBar: number, segmentCount = activeClip?.segmentCount ?? previewClip.segmentCount) => {
    if (!activeClip) return;
    commitActiveClipUpdate(resizeBassClipTiming(activeClip, bars, stepsPerBar, segmentCount));
  };
  const patchActivePitchMode = (mode: BassPitchSnapMode, guideKind?: BassPitchGuideKind) => {
    if (!activeClip) return;
    commitActiveClipUpdate(patchBassClipPitchMode(activeClip, mode, guideKind));
  };
  const patchActiveSegment = (markerId: string, step: number, options: { history?: boolean } = {}) => {
    if (!activeClip) return;
    commitActiveClipUpdate(patchBassClipSegmentMarker(activeClip, markerId, step), options);
  };
  const addSegmentNearSelection = () => {
    if (!activeClip) return;
    const step = selectedEvent?.startStep ?? activeClip.stepCount / 2;
    commitActiveClipUpdate(addBassClipSegmentMarker(activeClip, step));
  };
  const removeSegmentNearSelection = () => {
    if (!activeClip) return;
    const step = selectedEvent?.startStep ?? activeClip.stepCount / 2;
    const removable = activeClip.segmentMarkers.filter((marker) => !marker.locked).sort((a, b) => Math.abs(a.step - step) - Math.abs(b.step - step))[0];
    if (removable) commitActiveClipUpdate(removeBassClipSegmentMarker(activeClip, removable.id));
  };

  return (
    <div
      data-hotkey-scope="bass-pattern-manager"
      className="fixed inset-0 z-[145] flex items-center justify-center bg-black/65 p-4"
      onKeyDownCapture={(event) => {
        event.stopPropagation();
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <PlaylistDragActionHud state={dragHud} label={dropPreview?.label ?? ''} title={dropPreview?.targetLine ?? ''} sourceTitle={draggedClip?.name} sourceSubtitle={draggedClip ? 'Arbeitskopie' : ''} tone="cyan" />
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col rounded-2xl border border-fuchsia-800/70 bg-neutral-950 p-4 text-[11px] shadow-2xl shadow-black/60" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-fuchsia-300/80">🎸 Bassläufe</div>
            <div className="mt-1 text-base font-semibold text-fuchsia-50">{activeClip ? activeClip.name : activeName}</div>
            <div className="text-fuchsia-100/70">Generatoren fixieren, Arbeitskopien formen, über den Hauptraum-Bass spielen.</div>
          </div>
          <div className="ml-auto min-w-[12rem] max-w-xs flex-1">
            <GrooveHeaderVolumeControl label="Bass Lautstärke" value={nParamsUI.bassVolume} onChange={(value) => updateNParams({ bassVolume: value })} />
          </div>
          <button type="button" onClick={onClose} aria-label="Fenster schließen" className="rounded-full border border-fuchsia-800/70 px-3 py-1 text-base font-bold leading-none text-fuchsia-100 hover:bg-fuchsia-950/40">×</button>
        </div>
        <div className="mt-4 grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[minmax(14rem,0.82fr)_minmax(28rem,1.34fr)_minmax(15rem,0.8fr)]">
          <div className="min-h-0 overflow-y-auto rounded border border-fuchsia-900/45 bg-fuchsia-950/10 p-3 pr-2">
            <div className="mb-2 text-[10px] uppercase tracking-[0.25em] text-fuchsia-200/70">Quellen</div>
            <div className="space-y-1">
              {bassPatterns.map((entry) => {
                const active = !activeClip && nParamsUI.bassPattern === entry.value;
                return (
                  <button
                    type="button"
                    key={entry.value}
                    onClick={() => onSelectPreset(entry.value)}
                    className={`flex w-full items-center justify-between gap-2 rounded border px-2 py-1.5 text-left ${active ? 'border-fuchsia-400 bg-fuchsia-950/40 text-fuchsia-50' : 'border-fuchsia-900/30 bg-black/25 text-fuchsia-100/75 hover:bg-fuchsia-950/20'}`}
                  >
                    <span className="truncate">{entry.label}</span>
                    <span className="rounded border border-fuchsia-900/40 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-fuchsia-100/55">Preset</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-200/70">Arbeitskopien</div>
              <button type="button" onClick={fixCurrentGenerator} className="rounded border border-cyan-800/70 px-2 py-1 text-[10px] text-cyan-100 hover:bg-cyan-950/35">Fixieren</button>
            </div>
            <div className="mt-2 space-y-1" onDragOver={handleBassPlaylistDragOver} onDrop={handleBassPlaylistDrop}>
              {bassClips.length ? bassClips.map((clip, index) => {
                const active = activeClip?.id === clip.id;
                const decoded = decodePlaylistDropTarget(dropId);
                const isSwapTarget = decoded?.entryId === clip.id && decoded.operation === 'swap' && dragId && dragId !== clip.id;
                const isInsertTarget = insertNeighborIds.has(clip.id) && dragId && dragId !== clip.id;
                return (
                  <div
                    key={clip.id}
                    ref={(element) => {
                      bassPlaylistDragSession.registerRow(clip.id, element);
                    }}
                    className="relative"
                  >
                    <button
                      type="button"
                      draggable
                      onDragStart={(event) => {
                        bassPlaylistDragSession.beginDrag({ draggedId: clip.id, originVisibleIds: bassClips.map((candidate) => candidate.id), payload: undefined });
                        onDragStart(event, clip.id);
                      }}
                      onDragEnd={() => { bassPlaylistDragSession.clearDrag(); setDragHud(null); onDragEnd(); }}
                      onClick={() => onSelectClip(clip)}
                      className={`flex w-full items-center justify-between gap-2 rounded border px-2 py-1.5 text-left ${active ? 'border-cyan-300 bg-cyan-950/35 text-cyan-50' : 'border-cyan-900/35 bg-black/25 text-cyan-100/75 hover:bg-cyan-950/20'} ${isSwapTarget ? 'ring-1 ring-amber-300' : isInsertTarget ? 'ring-1 ring-cyan-300' : ''}`}
                    >
                      <span className="min-w-0 truncate">{clip.name}</span>
                      <span className="rounded border border-cyan-900/45 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-cyan-100/55">{index + 1}</span>
                    </button>
                  </div>
                );
              }) : <div className="rounded border border-cyan-900/30 bg-black/20 px-2 py-2 text-cyan-100/55">Noch keine Arbeitskopie.</div>}
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto pr-1">
            <BassPatternBodyPreview
              clip={previewClip}
              editable={editable}
              selectedEventId={selectedEventId}
              onSelectEvent={setSelectedEventId}
              onPatchEvent={patchSelectedClipEvent}
              onBeginEventEdit={pushActiveClipHistorySnapshot}
              onCreateEvent={(seed) => addEditableEvent(seed)}
              onPatchSegment={patchActiveSegment}
              onBeginSegmentEdit={pushActiveClipHistorySnapshot}
            />
            {!editable ? <button type="button" onClick={fixCurrentGenerator} className="mt-3 w-full rounded border border-cyan-700/80 bg-cyan-950/25 px-3 py-2 text-cyan-50 hover:bg-cyan-900/30">Als Arbeitskopie öffnen und sofort bearbeiten</button> : null}
            <div className="mt-3 rounded border border-cyan-900/45 bg-cyan-950/10 p-3">
              <div className="mb-2 text-[10px] uppercase tracking-[0.25em] text-cyan-200/70">Zeitkörper</div>
              <div className="grid gap-2 md:grid-cols-5">
                <label className="block text-[10px] text-cyan-100/70">Takte
                  <input type="number" min="1" max="16" step="1" disabled={!editable} value={previewClip.bars} onChange={(event) => patchActiveTiming(parseInt(event.target.value || '1', 10), previewClip.stepsPerBar, previewClip.segmentCount)} className="mt-1 w-full rounded border border-cyan-900/50 bg-neutral-950 px-2 py-1 text-cyan-50 disabled:opacity-40" />
                </label>
                <label className="block text-[10px] text-cyan-100/70">Zeiteinheiten/Takt
                  <input type="number" min="1" max="96" step="1" disabled={!editable} value={previewClip.stepsPerBar} onChange={(event) => patchActiveTiming(previewClip.bars, parseInt(event.target.value || '16', 10), previewClip.segmentCount)} className="mt-1 w-full rounded border border-cyan-900/50 bg-neutral-950 px-2 py-1 text-cyan-50 disabled:opacity-40" />
                </label>
                <label className="block text-[10px] text-cyan-100/70">Taktsegmente
                  <input type="number" min="1" max="32" step="1" disabled={!editable} value={previewClip.segmentCount} onChange={(event) => patchActiveTiming(previewClip.bars, previewClip.stepsPerBar, parseInt(event.target.value || '4', 10))} className="mt-1 w-full rounded border border-cyan-900/50 bg-neutral-950 px-2 py-1 text-cyan-50 disabled:opacity-40" />
                </label>
                <button type="button" disabled={!editable} onClick={addSegmentNearSelection} className="self-end rounded border border-amber-700/70 px-2 py-1.5 text-amber-100 disabled:opacity-35 hover:bg-amber-950/30">Segment +</button>
                <button type="button" disabled={!editable || previewClip.segmentMarkers.filter((marker) => marker.kind === 'segment').length < 1} onClick={removeSegmentNearSelection} className="self-end rounded border border-amber-900/70 px-2 py-1.5 text-amber-200 disabled:opacity-35 hover:bg-amber-950/25">Segment −</button>
              </div>
            </div>
            <div className="mt-3 rounded border border-neutral-800 bg-neutral-950/60 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-[10px] uppercase tracking-[0.25em] text-neutral-400">Ereignis</div>
                {editable ? <span className="text-[10px] text-cyan-100/65">Blöcke ziehen: Zeit und Verhältnis ändern</span> : <button type="button" onClick={fixCurrentGenerator} className="rounded border border-cyan-800/70 px-2 py-1 text-[10px] text-cyan-100 hover:bg-cyan-950/35">Fixieren und bearbeiten</button>}
              </div>
              {selectedEvent ? (
                <div className="space-y-3">
                  <div className="grid gap-2 md:grid-cols-6">
                    <label className="block text-[10px] text-neutral-400">Step
                      <input
                        type="number"
                        min="0"
                        max={Math.max(0, previewClip.stepCount - 0.1)}
                        step="0.25"
                        disabled={!editable}
                        value={Number(selectedEvent.startStep.toFixed(2))}
                        onChange={(event) => nudgeSelected({ startStep: Math.max(0, Math.min(previewClip.stepCount - 0.1, parseFloat(event.target.value || '0'))) })}
                        className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-100 disabled:opacity-35"
                      />
                    </label>
                    <label className="block text-[10px] text-neutral-400">Länge
                      <input
                        type="number"
                        min="0.1"
                        max={previewClip.stepCount}
                        step="0.05"
                        disabled={!editable}
                        value={Number(selectedEvent.durationSteps.toFixed(2))}
                        onChange={(event) => nudgeSelected({ durationSteps: Math.max(0.1, Math.min(previewClip.stepCount, parseFloat(event.target.value || '0.1'))) })}
                        className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-100 disabled:opacity-35"
                      />
                    </label>
                    <label className="block text-[10px] text-neutral-400">Ratio
                      <input
                        type="number"
                        min="0.03125"
                        max="32"
                        step="0.001"
                        disabled={!editable}
                        value={Number(selectedEvent.ratioFromRoot.toFixed(4))}
                        onChange={(event) => nudgeSelected({ ratioFromRoot: Math.max(0.03125, Math.min(32, parseFloat(event.target.value || '1'))), octave: selectedEvent.octave })}
                        className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-100 disabled:opacity-35"
                      />
                    </label>
                    <label className="block text-[10px] text-neutral-400">Accent
                      <input
                        type="number"
                        min="0"
                        max="1.5"
                        step="0.01"
                        disabled={!editable}
                        value={Number(selectedEvent.accent.toFixed(2))}
                        onChange={(event) => nudgeSelected({ accent: Math.max(0, Math.min(1.5, parseFloat(event.target.value || '0'))) })}
                        className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-100 disabled:opacity-35"
                      />
                    </label>
                    <label className="block text-[10px] text-neutral-400">Velocity
                      <input
                        type="number"
                        min="0"
                        max="1.5"
                        step="0.01"
                        disabled={!editable}
                        value={Number(selectedEvent.velocity.toFixed(2))}
                        onChange={(event) => nudgeSelected({ velocity: Math.max(0, Math.min(1.5, parseFloat(event.target.value || '0'))) })}
                        className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-100 disabled:opacity-35"
                      />
                    </label>
                    <label className="block text-[10px] text-neutral-400">Oktave
                      <input
                        type="number"
                        min="-4"
                        max="4"
                        step="1"
                        disabled={!editable}
                        value={selectedEvent.octave}
                        onChange={(event) => nudgeSelected({ octave: Math.max(-4, Math.min(4, parseInt(event.target.value || '0', 10))) })}
                        className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-100 disabled:opacity-35"
                      />
                    </label>
                  </div>
                  <div className="grid gap-2 md:grid-cols-4">
                  <button type="button" disabled={!editable} onClick={() => nudgeSelected({ startStep: Math.max(0, selectedEvent.startStep - 1) })} className="rounded border border-neutral-700 px-2 py-1 text-neutral-200 disabled:opacity-35">Step −</button>
                  <button type="button" disabled={!editable} onClick={() => nudgeSelected({ startStep: Math.min(previewClip.stepCount - 1, selectedEvent.startStep + 1) })} className="rounded border border-neutral-700 px-2 py-1 text-neutral-200 disabled:opacity-35">Step +</button>
                  <button type="button" disabled={!editable} onClick={() => nudgeSelected({ ratioFromRoot: selectedEvent.ratioFromRoot / Math.pow(2, 1 / 24), octave: selectedEvent.octave })} className="rounded border border-neutral-700 px-2 py-1 text-neutral-200 disabled:opacity-35">Tiefe −</button>
                  <button type="button" disabled={!editable} onClick={() => nudgeSelected({ ratioFromRoot: selectedEvent.ratioFromRoot * Math.pow(2, 1 / 24), octave: selectedEvent.octave })} className="rounded border border-neutral-700 px-2 py-1 text-neutral-200 disabled:opacity-35">Höhe +</button>
                  <button type="button" disabled={!editable} onClick={() => nudgeSelected({ durationSteps: Math.max(0.1, selectedEvent.durationSteps - 0.25) })} className="rounded border border-neutral-700 px-2 py-1 text-neutral-200 disabled:opacity-35">Kürzer</button>
                  <button type="button" disabled={!editable} onClick={() => nudgeSelected({ durationSteps: Math.min(previewClip.stepCount, selectedEvent.durationSteps + 0.25) })} className="rounded border border-neutral-700 px-2 py-1 text-neutral-200 disabled:opacity-35">Länger</button>
                  <button type="button" disabled={!editable} onClick={() => nudgeSelected({ ghost: !selectedEvent.ghost })} className="rounded border border-neutral-700 px-2 py-1 text-neutral-200 disabled:opacity-35">Ghost</button>
                  <button type="button" disabled={!editable} onClick={() => nudgeSelected({ glide: selectedEvent.glide ? undefined : { mode: 'bend-up' } })} className="rounded border border-neutral-700 px-2 py-1 text-neutral-200 disabled:opacity-35">Glide</button>
                  <button type="button" onClick={() => addEditableEvent()} className="rounded border border-cyan-800/70 px-2 py-1 text-cyan-100 hover:bg-cyan-950/35">Note +</button>
                  <button type="button" disabled={!editable} onClick={removeEditableEvent} className="rounded border border-red-900/70 px-2 py-1 text-red-200 disabled:opacity-35 hover:bg-red-950/35">Löschen</button>
                  <button type="button" disabled={!editable || !activeHistory.past.length} onClick={undoActiveClip} className="rounded border border-neutral-700 px-2 py-1 text-neutral-200 disabled:opacity-35">Undo</button>
                  <button type="button" disabled={!editable || !activeHistory.future.length} onClick={redoActiveClip} className="rounded border border-neutral-700 px-2 py-1 text-neutral-200 disabled:opacity-35">Redo</button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto rounded border border-neutral-800 bg-neutral-950/60 p-3">
            <div className="space-y-3 text-neutral-300">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={nParamsUI.bassActive} onChange={(event) => updateNParams({ bassActive: event.target.checked })} />Bass Aktiv</label>
              <div className="rounded border border-emerald-900/45 bg-emerald-950/10 p-2">
                <div className="mb-2 text-[10px] uppercase tracking-[0.22em] text-emerald-200/70">Neu würfeln</div>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <select value={randomCharacter} onChange={(event) => setRandomCharacter(event.target.value as BassRandomCharacter)} className="rounded border border-emerald-900/60 bg-neutral-950 px-2 py-1 text-xs text-emerald-50">
                    <option value="frei">frei</option>
                    <option value="sparsam">sparsam</option>
                    <option value="dicht">dicht</option>
                    <option value="psy">psy</option>
                    <option value="forge">forge</option>
                    <option value="kick-nah">kick-nah</option>
                  </select>
                  <button type="button" onClick={randomizeCurrentBassBody} className="rounded border border-emerald-700/80 px-2 py-1 text-emerald-100 hover:bg-emerald-950/35">Neu würfeln</button>
                </div>
              </div>
              {activeClip ? (
                <div className="rounded border border-cyan-900/45 bg-cyan-950/10 p-2">
                  <div className="mb-2 text-[10px] uppercase tracking-[0.22em] text-cyan-200/70">Pitch</div>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={activeClip.pitchSnapMode ?? 'magnet'} onChange={(event) => patchActivePitchMode(event.target.value as BassPitchSnapMode)} className="rounded border border-cyan-900/60 bg-neutral-950 px-2 py-1 text-xs text-cyan-50">
                      <option value="free">frei</option>
                      <option value="magnet">Magnet</option>
                      <option value="locked">fest</option>
                    </select>
                    <select value={activeClip.pitchGuideKind ?? 'ji'} onChange={(event) => patchActivePitchMode(activeClip.pitchSnapMode ?? 'magnet', event.target.value as BassPitchGuideKind)} className="rounded border border-cyan-900/60 bg-neutral-950 px-2 py-1 text-xs text-cyan-50">
                      <option value="ji">JI</option>
                      <option value="grid">Raster</option>
                      <option value="both">beides</option>
                    </select>
                  </div>
                </div>
              ) : null}
              <label className="block">
                <span className="mb-1 block text-xs text-neutral-400">Bass Root Mode</span>
                <select value={nParamsUI.bassRootMode} onChange={(event) => updateNParams({ bassRootMode: event.target.value as 'auto' | 'fixed' })} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
                  <option value="auto">Auto</option>
                  <option value="fixed">Fixed</option>
                </select>
              </label>
              {nParamsUI.bassRootMode === 'fixed' ? (
                <label className="block">
                  <span className="mb-1 block text-xs text-neutral-400">Root Hz: {nParamsUI.bassRootHz}Hz</span>
                  <input type="range" min="30" max="100" step="1" value={nParamsUI.bassRootHz} onChange={(event) => updateNParams({ bassRootHz: parseInt(event.target.value) })} className="w-full cursor-pointer accent-fuchsia-500" />
                </label>
              ) : null}
              {activeClip ? (
                <label className="block">
                  <span className="mb-1 block text-xs text-neutral-400">Root-Kopplung</span>
                  <select
                    value={activeClip.generatorMeta.rootBinding ?? 'live-step-root'}
                    onChange={(event) => commitActiveClipUpdate(patchBassClipRootBinding(activeClip, event.target.value as BassRootBinding, Number(nParamsUI.bassRootHz ?? activeClip.generatorMeta.rootHz ?? 49)))}
                    className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300"
                  >
                    <option value="live-step-root">folgt live</option>
                    <option value="bar-frozen">Taktwurzel halten</option>
                    <option value="free">freie Basis</option>
                  </select>
                </label>
              ) : null}
              <label className="block">
                <span className="mb-1 block text-xs text-neutral-400">Bass Tone: {nParamsUI.bassTone.toFixed(2)}</span>
                <input type="range" min="0" max="1" step="0.01" value={nParamsUI.bassTone} onChange={(event) => updateNParams({ bassTone: parseFloat(event.target.value) })} className="w-full cursor-pointer accent-fuchsia-500" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-neutral-400">Bass Grit: {nParamsUI.bassGrit.toFixed(2)}</span>
                <input type="range" min="0" max="1" step="0.01" value={nParamsUI.bassGrit} onChange={(event) => updateNParams({ bassGrit: parseFloat(event.target.value) })} className="w-full cursor-pointer accent-fuchsia-500" />
              </label>
              {activeClip ? (
                <div className="rounded border border-cyan-900/45 bg-cyan-950/10 p-2">
                  <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-cyan-200/70">Arbeitskopie</div>
                  <input value={renameDraft} onChange={(event) => setRenameDraft(event.target.value)} className="w-full rounded border border-cyan-900/50 bg-neutral-950 px-2 py-1 text-cyan-50" />
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => onRenameClip(activeClip.id, renameDraft)} className="rounded border border-cyan-800/70 px-2 py-1 text-cyan-100 hover:bg-cyan-950/35">Speichern</button>
                    <button type="button" onClick={() => onRemoveClip(activeClip.id)} className="rounded border border-red-900/70 px-2 py-1 text-red-200 hover:bg-red-950/35">Entfernen</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={fixCurrentGenerator} className="w-full rounded border border-cyan-800/70 px-3 py-2 text-cyan-100 hover:bg-cyan-950/35">Als Arbeitskopie fixieren</button>
              )}
              <div className="rounded border border-neutral-800 bg-black/25 p-2 text-[10px] leading-relaxed text-neutral-400">Arbeitskopien spielen über den Hauptraum-Bass-Synth und übernehmen RhythmForge-/PsyBass-Timing aus der Quelle.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


