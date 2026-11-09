import {
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type ReactNode,
  type RefObject,
} from "react";
import type { MaterialEntry } from "../../../l3lab/materialLibrary";
import {
  AUDIO_CUT_UPLOAD_SOURCES,
  type AudioCutUploadSource,
} from "../../domain/audioCutUploadEntryRequest";
import {
  decodePlaylistDropTarget,
  resolvePlaylistDropPreview,
  type PlaylistDropOperation,
} from "../../material/playlistDropOperation";
import { usePhaseShiftedPlaylistDragSession } from "../../ui/usePhaseShiftedPlaylistDragSession";
import {
  PlaylistDragActionHud,
  type PlaylistDragHudState,
} from "../PlaylistDragActionHud";
import { ROOT_FOLLOW_GM_SIDE_BY_SIDE_LAYOUT } from "./rootFollowSideBySideLayout";
import { RootFollowIconBadge } from "../RootFollowIconBadge";

function renderWindowIconBadge(windowIcon?: string) {
  if (!windowIcon) return null;
  const isRootFollowIcon = windowIcon === "🎼";
  if (!isRootFollowIcon) {
    return (
      <span
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-base leading-none"
        aria-hidden="true"
      >
        {windowIcon}
      </span>
    );
  }
  return <RootFollowIconBadge variant="window" />;
}

type LoopBankManagerDialogProps = {
  windowLabel: string;
  windowIcon?: string;
  managedEntry: MaterialEntry;
  managedIndex: number;
  total: number;
  entries: MaterialEntry[];
  hotkeyLabels: readonly string[];
  renameDraft: string;
  dragId: string;
  dropId: string;
  auxiliaryText: string;
  renameInputRef: RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onActivateEntry: (entryId: string) => void;
  onBrowse: (direction: -1 | 1) => void;
  onRenameDraftChange: (value: string) => void;
  onSaveRename: () => void;
  onShiftOrder: (direction: -1 | 1) => void;
  onDeleteEntry: (entryId: string) => void;
  onDragStart: (event: ReactDragEvent<HTMLElement>, entryId: string) => void;
  onDragOver: (
    event: ReactDragEvent<HTMLElement>,
    entryId: string,
    operation?: PlaylistDropOperation,
  ) => void;
  onDrop: (
    event: ReactDragEvent<HTMLElement>,
    entryId: string,
    operation?: PlaylistDropOperation,
    visibleOrderIds?: readonly string[],
    sessionDraggedId?: string,
  ) => void;
  onDragEnd: () => void;
  onSendToRootFollow?: (entryId: string) => void;
  onLoopUploadFile?: (file: File, bars: number) => Promise<void> | void;
  onAudioUploadAndCutFile?: (file: File, source: AudioCutUploadSource) => void;
  uploadTone?: "material" | "root-follow";
  sendToRootFollowDisabled?: boolean;
  sendToRootFollowLabel?: string;
  headerControl?: ReactNode;
  detailControls?: ReactNode;
  afterImportControls?: ReactNode;
  editColumnLowerControls?: ReactNode;
  prioritizeDetailControls?: boolean;
  sideBySideLeft?: boolean;
};

export function LoopBankManagerDialog({
  windowLabel,
  windowIcon,
  managedEntry,
  managedIndex,
  total,
  entries,
  hotkeyLabels,
  renameDraft,
  dragId,
  dropId,
  auxiliaryText,
  renameInputRef,
  onClose,
  onActivateEntry,
  onBrowse,
  onRenameDraftChange,
  onSaveRename,
  onShiftOrder,
  onDeleteEntry,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onSendToRootFollow,
  onLoopUploadFile,
  onAudioUploadAndCutFile,
  uploadTone = "material",
  sendToRootFollowDisabled = false,
  sendToRootFollowLabel = "an Root Follow Loop senden",
  headerControl,
  detailControls,
  afterImportControls,
  editColumnLowerControls,
  prioritizeDetailControls = false,
  sideBySideLeft = false,
}: LoopBankManagerDialogProps) {
  const uploadFileRef = useRef<HTMLInputElement | null>(null);
  const cutFileRef = useRef<HTMLInputElement | null>(null);
  const [uploadBars, setUploadBars] = useState(4);
  const uploadLabel =
    uploadTone === "root-follow" ? "Root-Follow-Loop Upload" : "Loop Upload";
  const cutUploadSource =
    uploadTone === "root-follow"
      ? AUDIO_CUT_UPLOAD_SOURCES.ROOT_FOLLOW_MANAGER
      : AUDIO_CUT_UPLOAD_SOURCES.MATERIAL_TRACK_MANAGER;
  const [dragHud, setDragHud] = useState<PlaylistDragHudState | null>(null);
  const draggedEntry = dragId
    ? entries.find((entry) => entry.id === dragId)
    : null;
  const draggedEntryIndex = draggedEntry
    ? entries.findIndex((entry) => entry.id === draggedEntry.id)
    : -1;
  const dragDropPreview = resolvePlaylistDropPreview(
    dropId,
    entries.map((entry) => ({ id: entry.id, title: entry.name })),
    dragId,
  );
  const dragHudLabel = dragDropPreview?.label ?? "";
  const dragHudTargetLine = dragDropPreview?.targetLine ?? "";
  const dragHudSubtitle = draggedEntry
    ? `Platz ${draggedEntryIndex >= 0 ? draggedEntryIndex + 1 : "—"} · ${draggedEntry.bars} Takte · ${draggedEntry.renderMode}`
    : "";
  const insertNeighborIds = new Set(
    dragDropPreview && dragDropPreview.operation !== "swap"
      ? dragDropPreview.highlightedEntryIds
      : [],
  );
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
    onDrop(
      event,
      target.entryId,
      target.operation,
      session.originVisibleIds,
      session.draggedId,
    );
  };
  const renderLoopImportControls = (
    className = "rounded border border-cyan-700/70 bg-cyan-950/20 p-3 shadow-[0_0_0_1px_rgba(34,211,238,0.08)]",
  ) => (
    <div
      className={className}
      data-xensonar-loop-import-placement={
        prioritizeDetailControls ? "edit-column" : "grid-column"
      }
    >
      <div className="mb-2 text-[10px] uppercase tracking-[0.25em] text-cyan-200/75">
        Loop-Import
      </div>
      <input
        ref={uploadFileRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          event.currentTarget.value = "";
          if (file && onLoopUploadFile) void onLoopUploadFile(file, uploadBars);
        }}
      />
      <input
        ref={cutFileRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          event.currentTarget.value = "";
          if (file && onAudioUploadAndCutFile)
            onAudioUploadAndCutFile(file, cutUploadSource);
        }}
      />
      <label className="block text-[10px] uppercase tracking-[0.2em] text-cyan-100/70">
        Takte für Loop Upload
      </label>
      <input
        type="number"
        min={1}
        max={64}
        step={1}
        value={uploadBars}
        onChange={(event) =>
          setUploadBars(
            Math.max(
              1,
              Math.min(64, Math.round(Number(event.target.value) || 1)),
            ),
          )
        }
        className="mt-1 w-full rounded border border-cyan-900/50 bg-neutral-950 px-3 py-2 text-sm text-cyan-50"
      />
      <div className="mt-3 grid gap-2">
        <button
          type="button"
          disabled={!onLoopUploadFile}
          onClick={() => uploadFileRef.current?.click()}
          className="rounded border border-cyan-700/80 px-3 py-2 text-cyan-100 hover:bg-cyan-950/35 disabled:opacity-40"
        >
          {uploadLabel}
        </button>
        <button
          type="button"
          disabled={!onAudioUploadAndCutFile}
          onClick={() => cutFileRef.current?.click()}
          className="rounded border border-amber-700/80 px-3 py-2 text-amber-100 hover:bg-amber-950/35 disabled:opacity-40"
        >
          Audio Upload und Schneiden
        </button>
      </div>
    </div>
  );
  return (
    <div
      data-hotkey-scope="material-loop-manager"
      data-xensonar-loop-manager-clicks-do-not-trigger-wavestarter="true"
      className={`fixed inset-0 z-[140] flex items-start ${sideBySideLeft ? ROOT_FOLLOW_GM_SIDE_BY_SIDE_LAYOUT.leftOverlayClass : "justify-center bg-black/65 px-4 pb-4 pt-4"} overflow-hidden`}
      onPointerDownCapture={(event) => event.stopPropagation()}
      onMouseDownCapture={(event) => event.stopPropagation()}
      onKeyDownCapture={(event) => {
        event.stopPropagation();
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <PlaylistDragActionHud
        state={dragHud}
        label={dragHudLabel}
        title={dragHudTargetLine}
        sourceTitle={draggedEntry?.name}
        sourceSubtitle={dragHudSubtitle}
        tone="fuchsia"
      />
      <div
        className={`flex w-full flex-col overflow-hidden rounded-2xl border border-fuchsia-800/70 bg-neutral-950 p-4 text-[11px] shadow-2xl shadow-black/60 ${sideBySideLeft ? ROOT_FOLLOW_GM_SIDE_BY_SIDE_LAYOUT.leftDialogClass : "max-h-[calc(100vh-2rem)] max-w-[96rem]"}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-fuchsia-300/80">
              {renderWindowIconBadge(windowIcon)}
              <span>{windowLabel}</span>
            </div>
            <div className="mt-1 text-base font-semibold text-fuchsia-50">
              {managedEntry.name}
            </div>
            <div className="text-fuchsia-100/70">
              Platz {managedIndex >= 0 ? managedIndex + 1 : "—"} von {total} ·{" "}
              {managedEntry.bars} Takte
            </div>
          </div>
          {headerControl ? (
            <div className="ml-auto min-w-[12rem] max-w-xs flex-1">
              {headerControl}
            </div>
          ) : (
            <span className="ml-auto" />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fenster schließen"
            className="rounded-full border border-fuchsia-800/70 px-3 py-1 text-base font-bold leading-none text-fuchsia-100 hover:bg-fuchsia-950/40"
          >
            ×
          </button>
        </div>
        <div className="mt-4 grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(34rem,1.35fr)]">
          <div className="flex min-h-0 flex-col">
            <div className="flex min-h-0 flex-1 flex-col rounded border border-fuchsia-900/50 bg-fuchsia-950/20 p-3">
              <div className="mb-2 text-[10px] uppercase tracking-[0.25em] text-fuchsia-200/70">
                Playlist ordnen
              </div>
              <div className="mb-2 text-[10px] leading-relaxed text-fuchsia-100/75">
                Ziehe die Titel wie in einer modernen Playlist hoch oder runter.
                Ein Klick lädt den Loop sofort, damit du ihn beim Benennen oder
                Umordnen direkt hörst.
              </div>
              <div
                className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1"
                onDragOver={handlePlaylistDragOver}
                onDrop={handlePlaylistDrop}
              >
                {entries.map((entry, index) => {
                  const isSelected = entry.id === managedEntry.id;
                  const decodedDrop = decodePlaylistDropTarget(dropId);
                  const isSwapTarget =
                    decodedDrop?.operation === "swap" &&
                    decodedDrop.entryId === entry.id &&
                    dragId &&
                    dragId !== entry.id;
                  const isInsertTarget =
                    insertNeighborIds.has(entry.id) &&
                    dragId &&
                    dragId !== entry.id;
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
                          playlistDragSession.beginDrag({
                            draggedId: entry.id,
                            originVisibleIds: entries.map(
                              (candidate) => candidate.id,
                            ),
                            payload: undefined,
                          });
                          onDragStart(event, entry.id);
                        }}
                        onDragEnd={() => {
                          playlistDragSession.clearDrag();
                          setDragHud(null);
                          onDragEnd();
                        }}
                        onClick={() => onActivateEntry(entry.id)}
                        className={`flex w-full items-center justify-between gap-3 rounded border px-3 py-2 text-left ${isSelected ? "border-fuchsia-400 bg-fuchsia-950/40 text-fuchsia-50" : "border-fuchsia-900/40 bg-black/30 text-fuchsia-100/80 hover:bg-fuchsia-950/20"} ${isSwapTarget ? "ring-1 ring-amber-300" : isInsertTarget ? "ring-1 ring-cyan-300" : ""}`}
                      >
                        <div className="min-w-0">
                          <div className="truncate font-semibold">
                            {entry.name}
                          </div>
                          <div className="text-[10px] text-fuchsia-100/55">
                            Platz {index + 1} · {entry.bars} Takte ·{" "}
                            {entry.renderMode}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="rounded border border-fuchsia-900/50 px-2 py-1 text-[10px] uppercase tracking-widest text-fuchsia-100/70">
                            {hotkeyLabels[index] ?? index + 1}
                          </span>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="min-h-0 pr-1">
            <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              {prioritizeDetailControls && detailControls ? (
                <div className="min-w-0 max-w-full">{detailControls}</div>
              ) : null}
              <div className="min-w-0 rounded border border-fuchsia-900/50 bg-fuchsia-950/20 p-3">
                <div className="mb-2 text-[10px] uppercase tracking-[0.25em] text-fuchsia-200/70">
                  Loop bearbeiten
                </div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-fuchsia-100/70">
                  Name
                </label>
                <input
                  ref={renameInputRef}
                  value={renameDraft}
                  onChange={(event) => onRenameDraftChange(event.target.value)}
                  className="mt-1 w-full rounded border border-fuchsia-900/50 bg-neutral-950 px-3 py-2 text-sm text-fuchsia-50"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onSaveRename}
                    className="rounded border border-fuchsia-700/80 px-3 py-2 text-fuchsia-100 hover:bg-fuchsia-950/35"
                  >
                    Speichern
                  </button>
                  <button
                    type="button"
                    onClick={() => onBrowse(-1)}
                    className="rounded border border-neutral-700 px-3 py-2 text-neutral-200 hover:bg-neutral-900"
                  >
                    Zurück
                  </button>
                  <button
                    type="button"
                    onClick={() => onBrowse(1)}
                    className="rounded border border-neutral-700 px-3 py-2 text-neutral-200 hover:bg-neutral-900"
                  >
                    Weiter
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onShiftOrder(-1)}
                    className="rounded border border-neutral-700 px-3 py-2 text-neutral-200 hover:bg-neutral-900"
                  >
                    Nach oben
                  </button>
                  <button
                    type="button"
                    onClick={() => onShiftOrder(1)}
                    className="rounded border border-neutral-700 px-3 py-2 text-neutral-200 hover:bg-neutral-900"
                  >
                    Nach unten
                  </button>
                </div>
                {onSendToRootFollow ? (
                  <button
                    type="button"
                    disabled={sendToRootFollowDisabled}
                    onClick={() => onSendToRootFollow(managedEntry.id)}
                    className="mt-3 w-full rounded border border-violet-800/70 px-3 py-2 text-violet-100 hover:bg-violet-950/35 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {sendToRootFollowLabel}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onDeleteEntry(managedEntry.id)}
                  className="mt-3 w-full rounded border border-red-900/70 px-3 py-2 text-red-200 hover:bg-red-950/40"
                >
                  Aus dieser Bank entfernen
                </button>
                {prioritizeDetailControls
                  ? renderLoopImportControls(
                      "mt-3 rounded border border-cyan-700/70 bg-cyan-950/20 p-3 shadow-[0_0_0_1px_rgba(34,211,238,0.08)]",
                    )
                  : null}
                {prioritizeDetailControls && afterImportControls ? (
                  <div
                    className="mt-3 space-y-3"
                    data-xensonar-rfl-tools-under-loop-import="true"
                  >
                    {afterImportControls}
                  </div>
                ) : null}
                {prioritizeDetailControls && editColumnLowerControls ? (
                  <div
                    className="mt-4 space-y-3"
                    data-xensonar-rfl-edit-column-lower-controls="true"
                  >
                    {editColumnLowerControls}
                  </div>
                ) : null}
              </div>
              {!prioritizeDetailControls ? renderLoopImportControls() : null}
              {!prioritizeDetailControls && detailControls
                ? detailControls
                : null}
              <div className="rounded border border-neutral-800 bg-neutral-950/60 p-3 text-[11px] leading-relaxed text-neutral-400">
                {auxiliaryText}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EmptyLoopBankManagerDialog({
  windowLabel,
  windowIcon,
  description,
  headerControl,
  detailControls,
  onClose,
  sideBySideLeft = false,
}: {
  windowLabel: string;
  windowIcon?: string;
  description: string;
  headerControl?: ReactNode;
  detailControls: ReactNode;
  onClose: () => void;
  sideBySideLeft?: boolean;
}) {
  const positionClass = sideBySideLeft
    ? ROOT_FOLLOW_GM_SIDE_BY_SIDE_LAYOUT.emptyLeftPositionClass
    : "items-center justify-center";
  return (
    <div
      data-hotkey-scope="material-loop-manager"
      data-xensonar-loop-manager-clicks-do-not-trigger-wavestarter="true"
      className={`fixed inset-0 z-[140] flex ${positionClass} bg-black/65 p-4`}
      onPointerDownCapture={(event) => event.stopPropagation()}
      onMouseDownCapture={(event) => event.stopPropagation()}
      onKeyDownCapture={(event) => {
        event.stopPropagation();
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <div
        className={`flex w-full flex-col overflow-hidden rounded-2xl border border-fuchsia-800/70 bg-neutral-950 p-4 text-[11px] shadow-2xl shadow-black/60 ${sideBySideLeft ? ROOT_FOLLOW_GM_SIDE_BY_SIDE_LAYOUT.leftDialogClass : "h-auto max-h-[calc(100vh-2rem)] max-w-6xl"}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-fuchsia-300/80">
              {renderWindowIconBadge(windowIcon)}
              <span>{windowLabel}</span>
            </div>
            <div className="mt-1 text-base font-semibold text-fuchsia-50">
              Playlist ist leer
            </div>
            <div className="text-fuchsia-100/70">{description}</div>
          </div>
          <div className="flex min-w-[18rem] max-w-sm flex-1 items-start justify-end gap-3">
            {headerControl ? (
              <div className="w-full max-w-[18rem]">{headerControl}</div>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fenster schließen"
              className="rounded-full border border-fuchsia-800/70 px-3 py-1 text-base font-bold leading-none text-fuchsia-100 hover:bg-fuchsia-950/40"
            >
              ×
            </button>
          </div>
        </div>
        <div className="mt-4 grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
          <div className="min-h-0 rounded border border-fuchsia-900/50 bg-fuchsia-950/20 p-3">
            <div className="mb-2 text-[10px] uppercase tracking-[0.25em] text-fuchsia-200/70">
              Playlist ordnen
            </div>
            <div className="flex h-full min-h-[16rem] items-center justify-center rounded border border-dashed border-fuchsia-900/50 bg-black/20 px-4 text-center text-[12px] leading-relaxed text-fuchsia-100/65">
              Noch keine Einträge. Nutze rechts den Upload oder Audio Upload und
              Schneiden; sobald ein Loop vorhanden ist, erscheint hier die
              sortierbare Playlist.
            </div>
          </div>
          <div className="min-h-0 min-w-0 pr-1">{detailControls}</div>
        </div>
      </div>
    </div>
  );
}
