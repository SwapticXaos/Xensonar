import { type ReactNode, useEffect, useMemo, useState } from "react";
import type { HarmonicWorld } from "../../domain/harmonicWorld";
import { describeHarmonicWorld, exportHarmonicWorld } from "../../domain/harmonicWorld";
import { getWorldNote, setWorldNote } from "../../domain/worldNotes";
import {
  getJourneysForWorldId,
  getJourneyProgressForWorld,
  getRecommendedRoomsForWorld,
} from "../../features/harmonicWorldSpine";
import { getRoomRegistryEntry } from "../roomRegistry";
import {
  addFavoriteWorld,
  isFavoriteWorld,
  loadWorldFavorites,
  removeFavoriteWorld,
  saveWorldFavorites,
  WORLD_FAVORITES_STORAGE_KEY,
  type WorldFavorite,
} from "../../domain/worldFavorites";
import { useStorageKeyListener } from "../../shared/browser/useStorageKeyListener";

type WorldHintCardProps = {
  world: HarmonicWorld | null | undefined;
  children?: ReactNode;
  className?: string;
  /** Optional callback to navigate to a recommended room. When omitted, recommendations are text-only. */
  onSelectRoom?: (roomId: import("../roomRegistry").Room) => void;
};

export function WorldHintCard({ world, children, className = "", onSelectRoom }: WorldHintCardProps) {
  if (!world || !world.label) {
    return null;
  }

  const summary = describeHarmonicWorld(world);
  const hasTags = world.tags.length > 0;
  const [note, setNote] = useState("");
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [favorites, setFavorites] = useState<WorldFavorite[]>([]);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const recommendedRooms = useMemo(() => getRecommendedRoomsForWorld(world), [world]);
  const journeys = useMemo(() => getJourneysForWorldId(world.id ?? null), [world]);
  const primaryJourney = journeys[0] ?? null;
  const primaryJourneyProgress =
    primaryJourney != null ? getJourneyProgressForWorld(primaryJourney, world.id ?? null) : null;
  const isFavorite = useMemo(
    () => isFavoriteWorld(favorites, world),
    [favorites, world],
  );

  useEffect(() => {
    setNote(getWorldNote(world));
  }, [world]);

  useEffect(() => {
    setFavorites(loadWorldFavorites());
  }, []);

  useStorageKeyListener(WORLD_FAVORITES_STORAGE_KEY, () => setFavorites(loadWorldFavorites()));

  const toggleFavorite = () => {
    setFavorites((current) => {
      const exists = isFavoriteWorld(current, world);
      if (exists) {
        const target = current.find((fav) => fav.id === (world.id ?? null));
        if (!target) return current;
        const next = removeFavoriteWorld(current, target);
        saveWorldFavorites(next);
        return next;
      }
      const next = addFavoriteWorld(current, world);
      saveWorldFavorites(next);
      return next;
    });
  };

  const handleCopyExport = async () => {
    try {
      const exportData = exportHarmonicWorld(world);
      const json = JSON.stringify(exportData);
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(json);
        setCopyFeedback("Copied JSON");
      } else {
        setCopyFeedback("Clipboard unavailable");
      }
    } catch {
      setCopyFeedback("Copy failed");
    } finally {
      window.setTimeout(() => setCopyFeedback(null), 1600);
    }
  };

  return (
    <div className={`mb-3 border border-neutral-800 bg-black/40 p-3 text-xs text-neutral-300 ${className}`}>
      <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1">
        Aktive Welt
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
        <span className="text-neutral-100 font-semibold">{world.label}</span>
        {world.mood && (
          <span className="rounded border border-neutral-700 px-1.5 py-0.5 text-[9px] bg-neutral-900/60 text-neutral-300">
            {world.mood}
          </span>
        )}
        {copyFeedback && (
          <span className="ml-auto text-[9px] text-emerald-300">{copyFeedback}</span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopyExport}
            className="rounded border border-neutral-700 bg-neutral-900/80 px-1.5 py-0.5 text-[9px] text-neutral-300 transition-colors hover:border-sky-400 hover:text-sky-100"
            title="Copy this world's JSON export to the clipboard"
          >
            Copy JSON
          </button>
          <button
            type="button"
            onClick={toggleFavorite}
            className="rounded border border-neutral-700 bg-neutral-900/80 px-1.5 py-0.5 text-[9px] text-neutral-300 transition-colors hover:border-amber-400 hover:text-amber-100"
            title={isFavorite ? "Remove this world from your favorites" : "Add this world to your favorites"}
          >
            {isFavorite ? "★ Favorite" : "☆ Favorite"}
          </button>
        </div>
      </div>
      {world.description && (
        <div className="text-neutral-300 mb-1">
          {world.description}
        </div>
      )}
      {summary && (
        <div className="text-[10px] text-neutral-400 mb-1">
          {summary}
        </div>
      )}
      {hasTags && (
        <div className="flex flex-wrap gap-1 mb-1">
          {world.tags.map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 border border-neutral-700 text-[9px] rounded-sm bg-neutral-900/60 text-neutral-200"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      {journeys.length > 0 && (
        <div className="mt-1 text-[10px] text-neutral-400 flex flex-wrap items-center gap-1">
          <span className="uppercase tracking-widest text-neutral-500 mr-1">Journeys:</span>
          <span>
            {journeys.map((journey) => journey.label).join(" · ")}
          </span>
          {primaryJourney && primaryJourneyProgress && (
            <span className="rounded border border-emerald-500/60 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] text-emerald-100">
              Step {primaryJourneyProgress.index + 1} of {primaryJourneyProgress.total}
            </span>
          )}
        </div>
      )}
      {summary && !hasTags && (
        <div className="text-[10px] text-neutral-400 mb-1">
          {summary}
        </div>
      )}
      {(note || isEditingNote) && (
        <div className="mt-1">
          {note && !isEditingNote && (
            <div className="mb-1 text-[10px] text-neutral-400 italic whitespace-pre-line">
              {note}
            </div>
          )}
          {isEditingNote && (
            <textarea
              value={note}
              onChange={(e) => {
                const value = e.target.value;
                setNote(value);
                setWorldNote(world, value);
              }}
              rows={2}
              className="w-full min-h-[40px] resize-y rounded-sm border border-neutral-800 bg-black/60 px-1.5 py-1 text-[10px] text-neutral-200 focus:border-neutral-500 focus:outline-none"
              placeholder="Jot down ideas or setlist notes for this world…"
            />
          )}
          <button
            type="button"
            onClick={() => setIsEditingNote((current) => !current)}
            className="mt-1 rounded border border-neutral-700 bg-neutral-900/80 px-1.5 py-0.5 text-[9px] text-neutral-300 transition-colors hover:border-neutral-500 hover:bg-neutral-800"
          >
            {isEditingNote ? "Done" : note ? "Edit world note" : "Add world note"}
          </button>
        </div>
      )}
      {recommendedRooms.length > 0 && (
        <div className="mt-1 text-[10px] text-neutral-400">
          <span className="uppercase tracking-widest text-neutral-500 mr-1">Empfohlen für:</span>
          {onSelectRoom ? (
            <div className="mt-0.5 flex flex-wrap gap-1">
              {recommendedRooms.map((roomId) => {
                const entry = getRoomRegistryEntry(roomId);
                return (
                  <button
                    key={roomId}
                    type="button"
                    onClick={() => onSelectRoom(roomId)}
                    className="rounded border border-neutral-700 bg-neutral-900/70 px-1.5 py-0.5 text-[9px] text-neutral-200 transition-colors hover:border-emerald-400 hover:text-emerald-50"
                  >
                    {entry.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <span>
              {recommendedRooms
                .map((roomId) => getRoomRegistryEntry(roomId).label)
                .join(" · ")}
            </span>
          )}
        </div>
      )}
      {children && <div className="mt-1 text-neutral-400">{children}</div>}
    </div>
  );
}

