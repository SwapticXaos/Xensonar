import type { DragEvent } from "react";
import type { ForgeProjectMeta } from "../../projectLibrary";
import {
  dragOperationLabel,
  type LibraryDragState,
  type LibrarySortMode,
} from "./carrierIntegralLibraryDrag";
import { formatLibraryDate } from "./carrierIntegralVerwaltenFormatters";

export type CarrierIntegralLibrarySectionProps = {
  projectName: string;
  onProjectNameChange: (value: string) => void;
  libraryBusy: boolean;
  selectedProjectId: string | null;
  librarySortMode: LibrarySortMode;
  onLibrarySortModeChange: (mode: LibrarySortMode) => void;
  libraryMessage: string | null;
  libraryError: string | null;
  sortedLibraryEntries: readonly ForgeProjectMeta[];
  libraryDrag: LibraryDragState | null;
  onSaveAsNewProject: () => void;
  onDeleteSelectedProject: () => void;
  onSelectLibraryEntry: (entry: ForgeProjectMeta) => void;
  onBeginLibraryDrag: (entryId: string, event: DragEvent<HTMLElement>) => void;
  onUpdateLibraryDragOver: (
    entryId: string,
    event: DragEvent<HTMLElement>,
  ) => void;
  onFinishLibraryDrop: (entryId: string, event: DragEvent<HTMLElement>) => void;
  onClearLibraryDrag: () => void;
};

export function CarrierIntegralLibrarySection({
  projectName,
  onProjectNameChange,
  libraryBusy,
  selectedProjectId,
  librarySortMode,
  onLibrarySortModeChange,
  libraryMessage,
  libraryError,
  sortedLibraryEntries,
  libraryDrag,
  onSaveAsNewProject,
  onDeleteSelectedProject,
  onSelectLibraryEntry,
  onBeginLibraryDrag,
  onUpdateLibraryDragOver,
  onFinishLibraryDrop,
  onClearLibraryDrag,
}: CarrierIntegralLibrarySectionProps) {
  return (
    <div
      className="min-h-0 overflow-y-auto border-r border-neutral-800 bg-neutral-950/70 p-4"
      data-xensonar-carrier-integral-quiet-library="true"
      data-xensonar-carrier-integral-library-section="true"
    >
      <div className="mb-3">
        <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-200/80">
          1 · ◇ Figur wählen
        </div>
        <div className="mt-1 text-xs text-cyan-50">Bibliothek</div>
        <div className="text-[10px] text-cyan-100/55">anklicken · auflegen</div>
      </div>

      <label className="block space-y-1">
        <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
          Name für Sicherung
        </span>
        <input
          value={projectName}
          onChange={(event) => onProjectNameChange(event.currentTarget.value)}
          className="w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-100"
        />
      </label>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={libraryBusy}
          onClick={onSaveAsNewProject}
          className="rounded border border-cyan-700/70 bg-cyan-950/30 px-2 py-1 text-cyan-100 hover:bg-cyan-900/30 disabled:opacity-50"
        >
          Neu sichern
        </button>
        <button
          type="button"
          disabled={libraryBusy || !selectedProjectId}
          onClick={onDeleteSelectedProject}
          className="rounded border border-rose-800/80 px-2 py-1 text-rose-100 hover:bg-rose-950/35 disabled:opacity-50"
        >
          Auswahl löschen
        </button>
      </div>

      <label className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
          Sortierung
        </span>
        <select
          value={librarySortMode}
          onChange={(event) =>
            onLibrarySortModeChange(
              event.currentTarget.value as LibrarySortMode,
            )
          }
          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-100"
        >
          <option value="updated-desc">zuletzt geändert</option>
          <option value="created-desc">zuletzt erstellt</option>
          <option value="name-asc">Name A–Z</option>
          <option value="manual">eigene Ordnung</option>
        </select>
      </label>

      {libraryMessage ? (
        <div className="mt-3 rounded border border-emerald-900/60 bg-emerald-950/20 px-2 py-1 text-[10px] text-emerald-200">
          {libraryMessage}
        </div>
      ) : null}
      {libraryError ? (
        <div className="mt-3 rounded border border-red-900/70 bg-red-950/40 px-2 py-1 text-[10px] text-red-200">
          {libraryError}
        </div>
      ) : null}

      <div className="mt-3 space-y-2 pr-1">
        {sortedLibraryEntries.length === 0 ? (
          <div className="rounded border border-dashed border-neutral-800 px-3 py-3 text-[11px] text-neutral-500">
            Noch keine Forge-Zustände gespeichert.
          </div>
        ) : null}
        {sortedLibraryEntries.map((entry) => {
          const projectSelected = entry.id === selectedProjectId;
          const dragActive = libraryDrag?.dragId === entry.id;
          const dragOver = libraryDrag?.overId === entry.id;
          const operation = dragOver ? (libraryDrag?.operation ?? null) : null;
          return (
            <button
              key={entry.id}
              type="button"
              draggable
              onDragStart={(event) => onBeginLibraryDrag(entry.id, event)}
              onDragOver={(event) => onUpdateLibraryDragOver(entry.id, event)}
              onDrop={(event) => onFinishLibraryDrop(entry.id, event)}
              onDragEnd={onClearLibraryDrag}
              onClick={() => onSelectLibraryEntry(entry)}
              className={`relative w-full rounded border p-3 text-left transition ${projectSelected ? "border-cyan-500 bg-cyan-500/10 shadow-[0_0_12px_rgba(6,182,212,0.08)]" : "border-neutral-800 bg-black/30 hover:border-neutral-700 hover:bg-neutral-900/70"} ${dragActive ? "opacity-60" : ""} ${dragOver && operation === "swap" ? "ring-1 ring-fuchsia-400/70" : ""} ${dragOver && operation !== "swap" ? "ring-1 ring-blue-400/70" : ""}`}
              data-xensonar-carrier-integral-audition-entry="true"
              data-xensonar-carrier-integral-drag-contract={
                dragOver ? dragOperationLabel(operation) : undefined
              }
              title="Figur wählen · ziehen zum Tauschen/Reinschieben"
            >
              {dragOver && operation ? (
                <span
                  className={`absolute right-2 top-2 rounded border px-2 py-0.5 text-[10px] ${operation === "swap" ? "border-fuchsia-500 bg-fuchsia-950/60 text-fuchsia-100" : "border-blue-500 bg-blue-950/60 text-blue-100"}`}
                >
                  {dragOperationLabel(operation)}
                </span>
              ) : null}
              <div className="flex items-start justify-between gap-2 pr-14">
                <span
                  className={`text-xs font-semibold ${projectSelected ? "text-cyan-100" : "text-neutral-100"}`}
                >
                  {entry.name}
                </span>
                <span className="shrink-0 rounded border border-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-500">
                  {entry.bars}T
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-neutral-600">
                <span>geändert {formatLibraryDate(entry.updatedAt)}</span>
                <span>{projectSelected ? "auf Werkbank" : "wählen"}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
