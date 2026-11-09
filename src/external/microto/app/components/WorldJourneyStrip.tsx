import type { Room } from "../roomRegistry";
import type { HarmonicWorld } from "../../domain/harmonicWorld";
import { describeHarmonicWorld } from "../../domain/harmonicWorld";
import { mapWorldToTopologyView } from "../../features/topology/harmonicAdapter";
import { mapWorldToArenaView } from "../../features/arena/harmonicAdapter";
import { mapWorldToCommonsView } from "../../features/commons/harmonicAdapter";
import { mapWorldToLevel3View } from "../../features/level3/harmonicAdapter";
import { mapWorldToPlatformerView } from "../../game/jumpRunSoundtrack/platformerHarmonicAdapter";

type WorldJourneyStripProps = {
  world: HarmonicWorld;
  activeRoom: Room;
  onSelectRoom: (room: Room) => void;
};

type JourneyEntry = {
  id: Room;
  label: string;
  title?: string;
};

function buildJourneyEntries(world: HarmonicWorld): JourneyEntry[] {
  const baseSummary = describeHarmonicWorld(world);
  const moodSuffix = world.mood ? ` · Mood: ${world.mood}` : "";

  const topology = mapWorldToTopologyView(world);
  const arena = mapWorldToArenaView(world);
  const commons = mapWorldToCommonsView(world, "ji");
  const l3 = mapWorldToLevel3View(world);
  const platformer = mapWorldToPlatformerView(world, world.quantizeBpm || 120);

  const entries: JourneyEntry[] = [
    {
      id: "RESONANCE",
      label: "Synth",
      title: (baseSummary || world.description || undefined)
        ? `${baseSummary || world.description}${moodSuffix}`
        : undefined,
    },
    {
      id: "TOPOLOGY",
      label: "Topology",
      title:
        topology.modeLabel && topology.tuningLabel
          ? `${topology.modeLabel} · ${topology.tuningLabel}`
          : topology.tuningLabel ?? undefined,
    },
    {
      id: "GAME",
      label: "Arena",
      title:
        arena.modeLabel && arena.tuningLabel
          ? `${arena.modeLabel} · ${arena.tuningLabel}`
          : arena.tuningLabel ?? undefined,
    },
    {
      id: "COMMONS",
      label: "Commons",
      title:
        commons.modeLabel && commons.tuningLabel
          ? `${commons.modeLabel} · ${commons.tuningLabel}`
          : commons.modeLabel ?? undefined,
    },
    {
      id: "L3LAB",
      label: "L3 Lab",
      title:
        l3.modeLabel && l3.tuningLabel
          ? `${l3.modeLabel} · ${l3.tuningLabel}`
          : l3.tuningLabel ?? undefined,
    },
    {
      id: "PLATFORMER",
      label: "Platformer",
      title: platformer.modeLabel ?? platformer.tuningLabel ?? undefined,
    },
  ];

  return entries;
}

export function WorldJourneyStrip({
  world,
  activeRoom,
  onSelectRoom,
}: WorldJourneyStripProps) {
  const entries = buildJourneyEntries(world);
  if (entries.length === 0) return null;

  const worldLabel = world.label ?? "World";

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1 text-[9px] text-neutral-500">
      <span className="uppercase tracking-widest mr-1">World journey</span>
      <span className="text-neutral-300 mr-1">{worldLabel}</span>
      <span className="text-neutral-700">⟶</span>
      {entries.map((entry, index) => (
        <span key={entry.id} className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onSelectRoom(entry.id)}
            title={entry.title}
            className={`px-2 py-0.5 border rounded-sm ${
              activeRoom === entry.id
                ? "border-emerald-400 text-emerald-200 bg-emerald-500/10"
                : "border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:bg-neutral-900"
            }`}
          >
            {entry.label}
          </button>
          {index < entries.length - 1 && (
            <span className="text-neutral-700">→</span>
          )}
        </span>
      ))}
    </div>
  );
}

