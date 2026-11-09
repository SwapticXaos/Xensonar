import { type MutableRefObject, useMemo, useRef, useState } from "react";
import { type Room } from "../../app/roomRegistry";
import { type ResonanceState } from "../resonance/config/state";
import { CANVAS_HEIGHT_TOPOLOGY, CANVAS_WIDTH } from "../../shared/canvasConstants";
import type { EnsureAudio } from "../../shared/audio/audioInit";
import { useTopologyLoop, type TopologyParams, type TopologyRefsRef } from "./useTopologyLoop";
import { useRoomFirstRunHint } from "../runtime/useRoomFirstRunHint";
import { RoomQuickStartCard } from "../../app/components/RoomQuickStartCard";
import { WorldSummaryHud } from "../../app/components/WorldSummaryHud";
import type { QuantizeSliceLike } from "../../shared/tuning/quantizeLabel";
import type { GlobalHarmonicContext } from "../resonance/config/stateSlices";
import type { HarmonicWorld } from "../../domain/harmonicWorld";
import { mapWorldToTopologyView } from "./harmonicAdapter";

const TOPO_WIDTH = CANVAS_WIDTH;
const TOPO_HEIGHT = CANVAS_HEIGHT_TOPOLOGY;
const FREQ = (base: number, cents: number) => base * Math.pow(2, cents / 1200);

type Props = {
  room: Room;
  audioCtx: AudioContext | null;
  initAudio: EnsureAudio;
  topologyQuantizeRef: MutableRefObject<
    Pick<ResonanceState, "quantizeOn" | "quantizeBpm" | "quantizeSubdivision">
  >;
  globalHarmonicContext?: GlobalHarmonicContext;
  harmonicWorld?: HarmonicWorld;
  /** When set, first-run dismiss is routed via global keydown (vision §8). */
  firstRunDismissRef?: MutableRefObject<(() => void) | null>;
};

export function TopologyRoom({
  room,
  audioCtx,
  initAudio,
  topologyQuantizeRef,
  globalHarmonicContext,
  harmonicWorld,
  firstRunDismissRef,
}: Props) {
  const [topologyActive, setTopologyActive] = useState(false);
  const [tParams, setTParams] = useState<TopologyParams>({
    tension: 0.5,
    slimLayers: 0.8,
    rawReality: 0.3,
  });
  const [systemState, setSystemState] = useState("Fließendes Myzel");
  const topologyCanvasRef = useRef<HTMLCanvasElement>(null);
  const topologyRefs = useRef<TopologyRefsRef["current"]>({
    nodes: [],
    cursor: { x: 0, y: 0, vx: 0, vy: 0 },
    osc: null,
    filter: null,
    gain: null,
    fmOsc: null,
    fmGain: null,
  });

  const quantizeSlice: QuantizeSliceLike = useMemo(
    () => ({
      quantizeOn: topologyQuantizeRef.current.quantizeOn,
      quantizeBpm: topologyQuantizeRef.current.quantizeBpm,
      quantizeSubdivision: topologyQuantizeRef.current.quantizeSubdivision,
    }),
    [topologyQuantizeRef],
  );

  useTopologyLoop({
    room,
    topologyActive,
    audioCtx,
    topologyCanvasRef,
    topologyRefs,
    tParams,
    setSystemState,
    topologyQuantizeRef,
    topoWidth: TOPO_WIDTH,
    topoHeight: TOPO_HEIGHT,
    freq: FREQ,
  });

  const { firstRunHint, showFirstRunHint } = useRoomFirstRunHint("TOPOLOGY", {
    dismissOnGlobalInput: true,
    firstRunDismissRef,
  });

  const worldView = mapWorldToTopologyView(harmonicWorld);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="border border-neutral-800 bg-black p-6">
        <h2 className="text-2xl text-white mb-2">Die Begriffliche Ökologie (Dissipatives System)</h2>
        <p className="text-sm text-neutral-400 mb-6 leading-relaxed max-w-3xl">
          Sprache ist ein Feld mit Knoten und Vektoren. Die Energie entsteht durch Struktur und Relation.
          Die Verdichtung an einem Knoten ist kein Fehler, sondern ein Zustand des Systems.
        </p>

        <RoomQuickStartCard>
          <span className="font-semibold text-neutral-200 mr-1">Quick start:</span>
          Bewege den Zeiger über das Myzel, um Knoten anzuregen, und halte die Taste{" "}
          <span className="text-neutral-200">Leertaste</span> oder berühre und ziehe, um Klang zu erzeugen. Nutze den
          Regler für <span className="text-neutral-200">Semantische Spannung</span>, <span className="text-neutral-200">Layer Slimness</span> und{" "}
          <span className="text-neutral-200">Rohe Realität</span>, um das Feld zu verändern. Aktiviere das Myzel mit dem
          Button unten rechts; das Quantisierungslabel zeigt dir, ob das Feld frei oder an ein rhythmisches Raster
          gekoppelt ist.
        </RoomQuickStartCard>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Semantische Spannung</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={tParams.tension}
              onChange={(e) => setTParams({ ...tParams, tension: parseFloat(e.target.value) })}
              className="w-full cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Layer Slimness</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={tParams.slimLayers}
              onChange={(e) => setTParams({ ...tParams, slimLayers: parseFloat(e.target.value) })}
              className="w-full cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Rohe Realität</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={tParams.rawReality}
              onChange={(e) => setTParams({ ...tParams, rawReality: parseFloat(e.target.value) })}
              className="w-full cursor-pointer"
            />
          </div>
        </div>

        <div className="flex justify-between items-end mb-2">
          <button
            onClick={() => {
              if (!topologyActive) {
                void initAudio().then((ctx) => {
                  if (!ctx) return;
                  setTopologyActive(true);
                });
                return;
              }
              setTopologyActive(false);
            }}
            className={`px-6 py-2 border ${
              topologyActive ? "bg-amber-900 border-amber-500 text-amber-100" : "border-neutral-600 text-white hover:bg-neutral-800"
            }`}
          >
            {topologyActive ? "MYZEL DEAKTIVIEREN" : "MYZEL AKTIVIEREN"}
          </button>
          <div className="text-right space-y-1">
            <div>
              <span className="text-amber-400 text-sm tracking-wide">{systemState}</span>
            </div>
            <div className="inline-flex flex-col items-end gap-2 max-w-xs text-left">
              <WorldSummaryHud
                world={harmonicWorld}
                slice={quantizeSlice}
                rootHz={globalHarmonicContext?.baseFreq}
                tuningLabel={worldView.tuningLabel}
                modeLabel={worldView.modeLabel}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <div className="relative border border-neutral-800 bg-neutral-950 overflow-hidden" style={{ height: TOPO_HEIGHT }}>
          {topologyActive ? (
            <canvas ref={topologyCanvasRef} width={TOPO_WIDTH} height={TOPO_HEIGHT} className="w-full h-full touch-none" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-neutral-700">[ OFFLINE ]</div>
          )}
          {showFirstRunHint && firstRunHint && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/90 border border-amber-600/60 text-amber-100 px-4 py-3 rounded text-sm max-w-[90%] text-center">
                {firstRunHint}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
