import { useMemo, useState } from "react";
import { GuardrailsPanel } from "../../components/xensonar/GuardrailsPanel";
import type { Room } from "./types";
import { RoomNav } from "./rooms/RoomNav";
import { TopologyRoom } from "./rooms/TopologyRoom";
import { GameRoom } from "./rooms/GameRoom";
import { ResonanceRoom } from "./rooms/ResonanceRoom";
import { CommonsRoom } from "./rooms/CommonsRoom";
import { Level3LabRoom } from "./rooms/Level3LabRoom";
import { openMaterialschmiede } from "./rooms/xenpolarShortcut";
import { MainRoom } from "./rooms/MainRoom";
import { XenpolarRoom, type XenpolarView } from "./rooms/XenpolarRoom";

const roomMeta: Record<Room, { title: string; description: string }> = {
  MAIN: {
    title: "IV Spiele",
    description: "Resonanzwerk und Zone als eigenständige, aber sichtbar verwandte Familienräume unter dem Xensonar-Dach.",
  },
  NEXUS: {
    title: "IV Spiele",
    description: "Der frühere Nexus wird in dieser UI-Runde nicht mehr separat geführt.",
  },
  TOPOLOGY: {
    title: "III. Nodal Installation",
    description: "Dissipatives System und semantische Ökologie als eigener visueller Forschungsraum.",
  },
  GAME: {
    title: "IV Spiele · Irrlicht Arena",
    description: "Experimental-musikalischer Arena-Zweig innerhalb von Xenpolar.",
  },
  XENPOLAR: {
    title: "IV Spiele",
    description: "Spiele-Bereich für Xensonar Familie und Arcade Games.",
  },
  RESONANCE: {
    title: "I. XENSONAR HAUPTRAUM",
    description: "Modulare Resonance-Oberfläche in Richtung der restaurierten Legacy-Version.",
  },
  COMMONS: {
    title: "Resonance Commons",
    description: "Platz für Hilfsansichten und ergänzende Resonance-Subsysteme.",
  },
  L3LAB: {
    title: "II. Materialschmiede",
    description: "Werkbankraum für spektrale Materialerzeugung und spätere Stoffkopplung an Xensonar.",
  },
};

export function XensonarApp() {
  const [room, setRoom] = useState<Room>("RESONANCE");
  const [xenpolarView, setXenpolarView] = useState<XenpolarView>("launcher");
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
        <div className="hidden xl:block text-[11px] text-amber-200/85 tracking-wide">
          (&quot;Auch&quot; für Banana-Groove geeignet!!!)
        </div>
        <RoomNav room={room} onSelect={(nextRoom) => {
          if (nextRoom === "L3LAB") {
            openMaterialschmiede(setRoom);
            return;
          }
          if (nextRoom === "XENPOLAR") {
            setXenpolarView("launcher");
          }
          setRoom(nextRoom);
        }} />
      </header>

      <main className="flex-1 p-6 relative space-y-4">
        {room === "MAIN" && <MainRoom onEnterResonance={() => setRoom("RESONANCE")} />}
        {room === "NEXUS" && (
          <div className="flex items-center justify-center h-full opacity-50 min-h-[40vh]">
            <p>{currentMeta.description}</p>
          </div>
        )}

        {room === "TOPOLOGY" && <TopologyRoom />}
        {room === "GAME" && <GameRoom />}
        {room === "XENPOLAR" && (
          <XenpolarRoom
            view={xenpolarView}
            onBackToLauncher={() => setXenpolarView("launcher")}
            onOpen={(view) => {
              if (view === "arena") {
                setRoom("GAME");
                return;
              }
              if (view === "xenpolar3") {
                openMaterialschmiede(setRoom);
                return;
              }
              setXenpolarView(view);
            }}
          />
        )}
        {room === "RESONANCE" && <ResonanceRoom />}
        {room === "COMMONS" && <CommonsRoom onBack={() => setRoom("RESONANCE")} />}
        {room === "L3LAB" && <Level3LabRoom onBack={() => setRoom("RESONANCE")} />}

        <div className="mb-3 flex flex-wrap gap-2 border border-neutral-800 bg-neutral-950/70 p-2 text-xs">
          <span className="text-neutral-500">Direktzugriff:</span>
          <button type="button" onClick={() => setRoom("XENPOLAR")} className="border border-neutral-700 px-2 py-1 text-neutral-300 hover:bg-neutral-900">IV. SPIELE</button>
        </div>

        <div className="border border-neutral-800 bg-neutral-950/40 p-4 text-xs text-neutral-500">
          Modulare Vergleichsbasis: Diese Oberfläche wird jetzt gezielt in Richtung der restaurierten Legacy-Version gebaut, damit Verhalten und Bedienung präziser zusammengeführt werden können.
        </div>

        <GuardrailsPanel />
      </main>
    </div>
  );
}
