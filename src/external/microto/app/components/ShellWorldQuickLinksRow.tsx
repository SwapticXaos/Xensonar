/**
 * Shell HUD row: Suggested rooms, Recent worlds, Worlds for this room.
 * Single responsibility: quick links for room nav and world import (vision §5 discoverability).
 * Extracted from AppShellHarmonicWorldHud for LOC discipline and reuse (STRUCTURE).
 */

import type { HarmonicWorldExport } from "../../domain/harmonicWorld";
import { worldFromExport } from "../../domain/harmonicWorld";
import { isFavoriteWorld } from "../../domain/worldFavorites";
import type { WorldHistoryEntry } from "../../domain/worldHistory";
import { getRoomRegistryEntry, type Room } from "../roomRegistry";
import {
  SHELL_ALREADY_IN_FAVORITES_LABEL,
  SHELL_PIN_TO_FAVORITES_LABEL,
} from "../copy";

export type ShellWorldQuickLinksRowProps = {
  /** Suggested rooms for current world (from spine). */
  recommendedRooms: Room[];
  /** Recent imported worlds (from history). */
  recentWorlds: WorldHistoryEntry[];
  setRecentWorlds: (next: WorldHistoryEntry[]) => void;
  /** Worlds recommended for the active room (from spine). */
  recommendedWorldsForActiveRoom: HarmonicWorldExport[];
  onSelectRoom: (room: Room) => void;
  onImportWorld?: (data: HarmonicWorldExport) => void;
  onClearHistory: () => void;
  /** Favorites list for pin state. */
  favorites: import("../../domain/worldFavorites").WorldFavorite[];
  onPinRecentToFavorites: (exportData: WorldHistoryEntry) => void;
};

export function ShellWorldQuickLinksRow({
  recommendedRooms,
  recentWorlds,
  setRecentWorlds,
  recommendedWorldsForActiveRoom,
  onSelectRoom,
  onImportWorld,
  onClearHistory,
  favorites,
  onPinRecentToFavorites,
}: ShellWorldQuickLinksRowProps) {
  return (
    <>
      {recommendedRooms.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <span className="text-[9px] text-neutral-500 uppercase tracking-widest mr-1">
            Suggested rooms
          </span>
          {recommendedRooms.map((suggestedRoom) => {
            const entry = getRoomRegistryEntry(suggestedRoom);
            return (
              <button
                key={suggestedRoom}
                type="button"
                onClick={() => onSelectRoom(suggestedRoom)}
                className="px-2 py-0.5 border border-neutral-700 text-[10px] text-neutral-300 hover:border-neutral-500 hover:bg-neutral-900"
                title={entry.intentLabel}
              >
                {entry.label}
              </button>
            );
          })}
        </div>
      )}
      {onImportWorld && recentWorlds.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <span className="text-[9px] text-neutral-500 uppercase tracking-widest mr-1">
            Recent worlds
          </span>
          {recentWorlds.map((world) => {
            const label = world.label ?? world.id ?? "World";
            const asWorld = worldFromExport(world);
            const isPinned = isFavoriteWorld(favorites, asWorld);
            return (
              <span key={world.id ?? world.exportedAt} className="inline-flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => onImportWorld(world)}
                  className="px-2 py-0.5 border border-neutral-700 text-[10px] text-neutral-300 hover:border-neutral-500 hover:bg-neutral-900"
                  title={
                    [world.description, world.mood ? `Mood: ${world.mood}` : null]
                      .filter(Boolean)
                      .join(" · ") || undefined
                  }
                >
                  {label}
                </button>
                <button
                  type="button"
                  onClick={() => onPinRecentToFavorites(world)}
                  disabled={isPinned}
                  className={`p-0.5 border text-[9px] ${
                    isPinned
                      ? "border-amber-500/50 text-amber-400/80 bg-amber-500/20 cursor-default"
                      : "border-neutral-600 text-neutral-400 hover:border-amber-500/60 hover:text-amber-300 hover:bg-amber-500/10"
                  }`}
                  title={isPinned ? SHELL_ALREADY_IN_FAVORITES_LABEL : SHELL_PIN_TO_FAVORITES_LABEL}
                  aria-label={isPinned ? "In favorites" : "Pin to favorites"}
                >
                  ★
                </button>
              </span>
            );
          })}
          <button
            type="button"
            onClick={() => {
              onClearHistory();
              setRecentWorlds([]);
            }}
            className="ml-1 px-2 py-0.5 border border-neutral-800 text-[9px] text-neutral-400 hover:border-red-500 hover:text-red-200 hover:bg-red-900/40"
            title="Clear recent worlds history"
          >
            Clear
          </button>
        </div>
      )}
      {onImportWorld && recommendedWorldsForActiveRoom.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <span className="text-[9px] text-neutral-500 uppercase tracking-widest mr-1">
            Worlds for this room
          </span>
          {recommendedWorldsForActiveRoom.map((world) => {
            const entry = world.label ?? world.id ?? "World";
            return (
              <button
                key={world.id ?? world.exportedAt}
                type="button"
                onClick={() => onImportWorld(world)}
                className="px-2 py-0.5 border border-neutral-700 text-[10px] text-neutral-300 hover:border-neutral-500 hover:bg-neutral-900"
                title={
                  [world.description, world.mood ? `Mood: ${world.mood}` : null]
                    .filter(Boolean)
                    .join(" · ") || undefined
                }
              >
                {entry}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
