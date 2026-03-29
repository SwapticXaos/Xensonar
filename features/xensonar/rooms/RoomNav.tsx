import type { Room } from "../types";

const ROOMS: { value: Room; label: string; active: string }[] = [
  { value: "MAIN", label: "I. DAS INSTRUMENT", active: "bg-white text-black" },
  { value: "NEXUS", label: "II. DER NEXUS", active: "bg-white text-black" },
  { value: "TOPOLOGY", label: "III. TOPOLOGICAL MANIFOLD", active: "bg-white text-black" },
  { value: "L3LAB", label: "III.2 MATERIALSCHMIEDE", active: "bg-cyan-200 text-black" },
  { value: "GAME", label: "IV. IRRLICHT ARENA", active: "bg-amber-200 text-black" },
  { value: "RESONANCE", label: "V. XENSONAR SYNTH", active: "bg-purple-300 text-black" },
];

type RoomNavProps = {
  room: Room;
  onSelect: (room: Room) => void;
};

export function RoomNav({ room, onSelect }: RoomNavProps) {
  return (
    <nav className="flex flex-wrap gap-2 justify-end">
      {ROOMS.map((entry) => {
        const active = room === entry.value;
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
