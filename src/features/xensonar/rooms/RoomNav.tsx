import type { Room } from "../types";
import { isXenpolarShortcutActive } from "./xenpolarShortcut";

const PRIMARY_ROOMS: { value: Room; label: string; active: string }[] = [
  { value: "RESONANCE", label: "I. XENSONAR HAUPTRAUM", active: "bg-purple-300 text-black" },
  { value: "L3LAB", label: "II. MATERIALSCHMIEDE", active: "bg-cyan-200 text-black" },
  { value: "TOPOLOGY", label: "III. NODAL INSTALLATION", active: "bg-white text-black" },
  { value: "XENPOLAR", label: "IV. SPIELE", active: "bg-amber-200 text-black" },
];

type RoomNavProps = {
  room: Room;
  onSelect: (room: Room) => void;
};

export function RoomNav({ room, onSelect }: RoomNavProps) {
  const gamesActive = room === "XENPOLAR" || room === "GAME" || room === "MAIN" || isXenpolarShortcutActive(room);
  return (
    <nav className="flex flex-wrap gap-2 justify-end">
      {PRIMARY_ROOMS.map((entry) => {
        const active = entry.value === "L3LAB"
          ? room === "L3LAB" && !isXenpolarShortcutActive(room)
          : entry.value === "XENPOLAR"
            ? gamesActive
            : room === entry.value;
        return (
          <button
            key={entry.value}
            type="button"
            onClick={() => onSelect(entry.value)}
            className={`px-4 py-1 text-sm ${active ? entry.active : "border border-neutral-700"}`}
          >
            {entry.label}
          </button>
        );
      })}
    </nav>
  );
}
