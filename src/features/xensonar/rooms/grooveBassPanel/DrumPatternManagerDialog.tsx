import { useEffect, useState, type DragEvent as ReactDragEvent, type ReactNode } from 'react';
import { decodePlaylistDropTarget, resolvePlaylistDropPreview, type PlaylistDropOperation } from '../../material/playlistDropOperation';
import { usePhaseShiftedPlaylistDragSession } from '../../ui/usePhaseShiftedPlaylistDragSession';
import { DRUM_PLAYLIST_HOTKEY_HELP } from '../../drumPatternPlaylistHotkeys';
import type { DrumPlaylistEntry } from '../../drumPatternPlaylistTypes';
import { PlaylistDragActionHud, type PlaylistDragHudState } from '../PlaylistDragActionHud';

export type DrumPatternManagerDialogProps = {
  entries: DrumPlaylistEntry[];
  activeEntry: DrumPlaylistEntry | null;
  dragId: string;
  dropId: string;
  onClose: () => void;
  onSelectEntry: (entry: DrumPlaylistEntry) => void;
  onRenameEntry: (entryId: string, name: string) => void;
  onDeleteEntry: (entryId: string) => void;
  onDragStart: (event: ReactDragEvent<HTMLElement>, entryId: string) => void;
  onDragOver: (event: ReactDragEvent<HTMLElement>, entryId: string, operation: PlaylistDropOperation) => void;
  onDrop: (event: ReactDragEvent<HTMLElement>, entryId: string, operation: PlaylistDropOperation, visibleOrderIds?: readonly string[], sessionDraggedId?: string) => void;
  onDragEnd: () => void;
  onOpenDrumMachine: () => void;
  headerControl?: ReactNode;
  detailControls?: ReactNode;
};

export function DrumPatternManagerDialog({
  entries,
  activeEntry,
  dragId,
  dropId,
  onClose,
  onSelectEntry,
  onRenameEntry,
  onDeleteEntry,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onOpenDrumMachine,
  headerControl,
  detailControls,
}: DrumPatternManagerDialogProps) {
  const [renameDraft, setRenameDraft] = useState(activeEntry?.name ?? '');

  useEffect(() => {
    setRenameDraft(activeEntry?.name ?? '');
  }, [activeEntry?.id, activeEntry?.name]);

  const [dragHud, setDragHud] = useState<PlaylistDragHudState | null>(null);
  const draggedEntry = dragId ? entries.find((entry) => entry.id === dragId) : null;
  const draggedEntryIndex = draggedEntry ? entries.findIndex((entry) => entry.id === draggedEntry.id) : -1;
  const dropPreview = resolvePlaylistDropPreview(
    dropId,
    entries.map((entry) => ({ id: entry.id, title: entry.name })),
    dragId,
  );
  const dropLabel = dropPreview?.label ?? '';
  const dropTargetLine = dropPreview?.targetLine ?? '';
  const draggedEntrySubtitle = draggedEntry
    ? `Platz ${draggedEntryIndex >= 0 ? draggedEntryIndex + 1 : '—'}${draggedEntry.bars ? ` · ${draggedEntry.bars} Takte` : ''}${draggedEntry.drumKit ? ` · ${draggedEntry.drumKit}` : ''}`
    : '';
  const insertNeighborIds = new Set(dropPreview && dropPreview.operation !== 'swap' ? dropPreview.highlightedEntryIds : []);
  const playlistDragSession = usePhaseShiftedPlaylistDragSession();
  const handlePlaylistDragOver = (event: ReactDragEvent<HTMLElement>) => {
    const target = playlistDragSession.updatePreviewFromDragEvent(event);
    if (!target) return;
    setDragHud({ x: event.clientX, y: event.clientY });
    onDragOver(event, target.entryId, target.operation);
  };
  const handlePlaylistDrop = (event: ReactDragEvent<HTMLElement>) => {
    const session = playlistDragSession.getSession();
    if (!session) return;
    const target = playlistDragSession.getDropTarget();
    setDragHud(null);
    if (!target) {
      event.preventDefault();
      return;
    }
    onDrop(event, target.entryId, target.operation, session.originVisibleIds, session.draggedId);
  };

  return (
    <div
      data-hotkey-scope="drum-pattern-manager"
      className="fixed inset-0 z-[145] flex items-center justify-center bg-black/65 p-4"
      onKeyDownCapture={(event) => {
        event.stopPropagation();
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <PlaylistDragActionHud state={dragHud} label={dropLabel} title={dropTargetLine} sourceTitle={draggedEntry?.name} sourceSubtitle={draggedEntrySubtitle} tone="fuchsia" />
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-fuchsia-800/70 bg-neutral-950 p-4 text-[11px] shadow-2xl shadow-black/60" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-fuchsia-300/80">🥁 Drum Pattern verwalten</div>
            <div className="mt-1 text-base font-semibold text-fuchsia-50">{activeEntry?.name ?? 'Kein Drum Pattern gewählt'}</div>
            <div className="text-fuchsia-100/70">{entries.length} Einträge · {DRUM_PLAYLIST_HOTKEY_HELP}</div>
          </div>
          {headerControl ? <div className="ml-auto min-w-[12rem] max-w-xs flex-1">{headerControl}</div> : <span className="ml-auto" />}
          <button type="button" onClick={onClose} aria-label="Fenster schließen" className="rounded-full border border-fuchsia-800/70 px-3 py-1 text-base font-bold leading-none text-fuchsia-100 hover:bg-fuchsia-950/40">×</button>
        </div>

        <div className="mt-4 grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[minmax(0,1.28fr)_minmax(21rem,0.9fr)]">
          <div className="flex min-h-0 flex-col">
            <div className="flex min-h-0 flex-1 flex-col rounded border border-fuchsia-900/50 bg-fuchsia-950/20 p-3">
              <div className="mb-2 text-[10px] uppercase tracking-[0.25em] text-fuchsia-200/70">Playlist ordnen</div>
              <div className="mb-2 text-[10px] leading-relaxed text-fuchsia-100/75">Ziehe einen Eintrag: Die Aktion erscheint am gezogenen Block. Auf Einträgen wird getauscht, an Grenzen eingeschoben.</div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1" onDragOver={handlePlaylistDragOver} onDrop={handlePlaylistDrop}>
                {entries.map((entry, index) => {
                  const isActive = activeEntry?.id === entry.id;
                  const decoded = decodePlaylistDropTarget(dropId);
                  const isSwapTarget = decoded?.entryId === entry.id && decoded.operation === 'swap' && dragId && dragId !== entry.id;
                  const isInsertTarget = insertNeighborIds.has(entry.id) && dragId && dragId !== entry.id;
                  return (
                    <div
                      key={entry.id}
                      ref={(element) => {
                        playlistDragSession.registerRow(entry.id, element);
                      }}
                      className="relative"
                    >
                      <button
                        type="button"
                        draggable
                        onDragStart={(event) => {
                          playlistDragSession.beginDrag({ draggedId: entry.id, originVisibleIds: entries.map((candidate) => candidate.id), payload: undefined });
                          onDragStart(event, entry.id);
                        }}
                        onDragEnd={() => { playlistDragSession.clearDrag(); setDragHud(null); onDragEnd(); }}
                        onClick={() => onSelectEntry(entry)}
                        className={`flex w-full items-center justify-between gap-3 rounded border px-3 py-2 text-left ${isActive ? 'border-fuchsia-400 bg-fuchsia-950/40 text-fuchsia-50' : 'border-fuchsia-900/40 bg-black/30 text-fuchsia-100/80 hover:bg-fuchsia-950/20'} ${isSwapTarget ? 'ring-1 ring-amber-300' : isInsertTarget ? 'ring-1 ring-cyan-300' : ''}`}
                      >
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{entry.name}</div>
                          <div className="text-[10px] text-fuchsia-100/55">Platz {index + 1}{entry.bars ? ` · ${entry.bars} Takte` : ''}{entry.drumKit ? ` · ${entry.drumKit}` : ''}</div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="rounded border border-fuchsia-900/50 px-2 py-1 text-[10px] uppercase tracking-widest text-fuchsia-100/70">{entry.kind === 'exported' ? 'Export' : 'Preset'}</span>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto pr-1">
            <div className="space-y-3">
              <div className="rounded border border-fuchsia-900/50 bg-fuchsia-950/20 p-3">
                <div className="mb-2 text-[10px] uppercase tracking-[0.25em] text-fuchsia-200/70">Eintrag bearbeiten</div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-fuchsia-100/70">Name</label>
                <input value={renameDraft} onChange={(event) => setRenameDraft(event.target.value)} className="mt-1 w-full rounded border border-fuchsia-900/50 bg-neutral-950 px-3 py-2 text-sm text-fuchsia-50" />
                <div className="mt-3 grid gap-2">
                  <button type="button" disabled={!activeEntry} onClick={() => activeEntry && onRenameEntry(activeEntry.id, renameDraft)} className="rounded border border-fuchsia-700/80 px-3 py-2 text-fuchsia-100 hover:bg-fuchsia-950/35 disabled:opacity-40">Speichern</button>
                  <button type="button" disabled={!activeEntry} onClick={() => activeEntry && onDeleteEntry(activeEntry.id)} className="rounded border border-red-900/70 px-3 py-2 text-red-200 hover:bg-red-950/40 disabled:opacity-40">Aus dieser Playlist entfernen</button>
                </div>
              </div>
              {detailControls}
              <div className="rounded border border-cyan-800/60 bg-cyan-950/15 p-3">
                <div className="mb-2 text-[10px] uppercase tracking-[0.25em] text-cyan-200/75">Eigenes Drum Pattern gestalten</div>
                <button
                  type="button"
                  onClick={onOpenDrumMachine}
                  className="w-full rounded border border-cyan-700/80 px-3 py-2 text-cyan-100 hover:bg-cyan-950/35"
                >
                  Zur Drum Machine
                </button>
              </div>
              <div className="rounded border border-neutral-800 bg-neutral-950/60 p-3 text-[11px] leading-relaxed text-neutral-400">Preset-Patterns und Forge-Exports stehen hier in einer gemeinsamen Spielliste. Der interne Ursprung bleibt erhalten, blockiert aber nicht den Live-Flow.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


