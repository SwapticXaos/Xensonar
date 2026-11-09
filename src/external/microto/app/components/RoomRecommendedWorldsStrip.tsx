/**
 * Room-level "Recommended worlds for this room" strip (vision §5 discoverability; FUTURE-devOptions01).
 * Spine-backed: uses getRecommendedWorldsForRoom(room) from harmonicWorldSpine. Read-only; no new state.
 * Use in any room that receives onImportWorld to let users discover and load worlds suited to that room.
 */

import { useMemo } from "react";
import { getRecommendedWorldsForRoom } from "../../features/harmonicWorldSpine";
import { getRoomRegistryEntry } from "../roomRegistry";
import { exportMatchesWorld, type HarmonicWorld, type HarmonicWorldExport } from "../../domain/harmonicWorld";
import type { Room } from "../roomRegistry";

export type RoomRecommendedWorldsStripProps = {
  /** Current room; recommendations are tailored to this room. */
  room: Room;
  /** Callback to load a world (same contract as shell HUD / World Gallery). */
  onImportWorld?: (data: HarmonicWorldExport) => void;
  /** Optional current harmonic world; used to highlight the active world in the strip. */
  harmonicWorld?: HarmonicWorld | null;
  /** Max number of worlds to show. Default 5. */
  limit?: number;
  /** Optional class for the container. */
  className?: string;
};

/**
 * Renders a compact horizontal strip: "Recommended for [Room label]" and a row of world pills with "Load".
 * When onImportWorld is missing or the room has no recommendations, returns null.
 */
export function RoomRecommendedWorldsStrip({
  room,
  onImportWorld,
  harmonicWorld,
  limit = 5,
  className = "",
}: RoomRecommendedWorldsStripProps) {
  const worlds = useMemo(
    () => getRecommendedWorldsForRoom(room, { limit }),
    [room, limit],
  );

  const entry = getRoomRegistryEntry(room);
  const roomLabel = entry?.label ?? room;

  if (!onImportWorld || worlds.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[9px] text-neutral-500 uppercase tracking-widest">
        Recommended for {roomLabel}
      </span>
      <div className="flex flex-wrap gap-1.5 items-center">
        {worlds.map((world) => {
          const isActive = !!harmonicWorld && exportMatchesWorld(world, harmonicWorld);
          const label = world.label ?? world.id ?? "World";
          return (
            <button
              key={world.id ?? world.exportedAt ?? label}
              type="button"
              onClick={() => onImportWorld(world)}
              title={world.description ?? undefined}
              className={`px-2.5 py-1 border text-[10px] transition-colors ${
                isActive
                  ? "border-amber-400 text-amber-200 bg-amber-500/20 cursor-default"
                  : "border-neutral-600 text-neutral-300 hover:border-neutral-500 hover:bg-neutral-800/80"
              }`}
            >
              <span className="truncate max-w-[140px] inline-block align-middle">{label}</span>
              {!isActive && (
                <span className="ml-1.5 text-neutral-500 font-medium">Load</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
