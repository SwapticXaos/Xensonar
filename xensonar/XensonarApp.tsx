import { useMemo, useState } from "react";
import { GuardrailsPanel } from "../../components/xensonar/GuardrailsPanel";
import type { Room } from "./types";
import { RoomNav } from "./rooms/RoomNav";
import { TopologyRoom } from "./rooms/TopologyRoom";
import { GameRoom } from "./rooms/GameRoom";
import { ResonanceRoom } from "./rooms/ResonanceRoom";
import { CommonsRoom } from "./rooms/CommonsRoom";
import { Level3LabRoom } from "./rooms/Level3LabRoom";

const roomMeta: Record<Room, { title: string; description: string }> = {
  MAIN: {
    title: "I. Das Instrument",
    description: "Die konventionellen Räume I und II sind im modularen Mirror zunächst archiviert.",
  },
  NEXUS: {
    title: "II. Der Nexus",
    description: "Die modulare Version orientiert sich hier jetzt bewusst wieder an der Legacy-Oberfläche.",
  },
  TOPOLOGY: {
    title: "III. Topological Manifold",
    description: "Dissipatives System und semantische Ökologie als eigener visueller Forschungsraum.",
  },
  GAME: {
    title: "IV. Irrlicht Arena",
    description: "Separierter Raum für Orb-, Projectile-, Anchor- und Level-Mechaniken.",
  },
  RESONANCE: {
    title: "V. Xensonar Synth",
    description: "Modulare Resonance-Oberfläche in Richtung der restaurierten Legacy-Version.",
  },
  COMMONS: {
    title: "Resonance Commons",
    description: "Platz für Hilfsansichten und ergänzende Resonance-Subsysteme.",
  },
  L3LAB: {
    title: "III.2 Materialschmiede",
    description: "Werkbankraum für spektrale Materialerzeugung und spätere Stoffkopplung an Xensonar.",
  },
};

export function XensonarApp() {
  const [room, setRoom] = useState<Room>("RESONANCE");
  const currentMeta = useMemo(() => roomMeta[room], [room]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-300 font-mono flex flex-col">
      <header className="p-4 border-b border-neutral-800 flex justify-between items-center bg-black">
        <div className="flex items-center gap-3">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-500">
            <path d="M2 12h4l3-9 5 18 3-9h5" />
          </svg>
          <div>
            <h1 className="text-2xl font-bold tracking-widest bg-gradient-to-r from-blue-400 to-pink-500 bg-clip-text text-transparent italic" style={{ fontFamily: "'Trebuchet MS', serif" }}>
              XENSONAR
            </h1>
            <p className="text-[10px] text-neutral-400 tracking-widest uppercase mt-0.5">Microtonal Synthesizer • Modular Mirror</p>
          </div>
        </div>
        <RoomNav room={room} onSelect={setRoom} />
      </header>

      <main className="flex-1 p-6 relative space-y-4">
        {(room === "MAIN" || room === "NEXUS") && (
          <div className="flex items-center justify-center h-full opacity-50 min-h-[40vh]">
            <p>{currentMeta.description}</p>
          </div>
        )}

        {room === "TOPOLOGY" && <TopologyRoom />}
        {room === "GAME" && <GameRoom />}
        {room === "RESONANCE" && <ResonanceRoom />}
        {room === "COMMONS" && <CommonsRoom onBack={() => setRoom("RESONANCE")} />}
        {room === "L3LAB" && <Level3LabRoom onBack={() => setRoom("RESONANCE")} />}

        <div className="mb-3 flex flex-wrap gap-2 border border-neutral-800 bg-neutral-950/70 p-2 text-xs">
          <span className="text-neutral-500">Direktzugriff:</span>
          <button type="button" onClick={() => setRoom("MAIN")} className="border border-neutral-700 px-2 py-1 text-neutral-300 hover:bg-neutral-900">I. Das Instrument</button>
          <button type="button" onClick={() => setRoom("NEXUS")} className="border border-neutral-700 px-2 py-1 text-neutral-300 hover:bg-neutral-900">II. Der Nexus</button>
        </div>

        <div className="border border-neutral-800 bg-neutral-950/40 p-4 text-xs text-neutral-500">
          Modulare Vergleichsbasis: Diese Oberfläche wird jetzt gezielt in Richtung der restaurierten Legacy-Version gebaut, damit Verhalten und Bedienung präziser zusammengeführt werden können.
        </div>

        <GuardrailsPanel />
      </main>
    </div>
  );
}
