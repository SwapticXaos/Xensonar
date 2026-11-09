import { useMemo, useState } from "react";
import { JI_NODES, TOPO_HEIGHT, TOPO_WIDTH } from "../constants";

type TopologyControls = {
  tension: number;
  slimLayers: number;
  rawReality: number;
};

export function TopologyRoom() {
  const [active, setActive] = useState(false);
  const [controls, setControls] = useState<TopologyControls>({
    tension: 0.5,
    slimLayers: 0.8,
    rawReality: 0.3,
  });

  const systemState = useMemo(() => {
    if (!active) return "[ OFFLINE ]";
    if (controls.tension > 0.7 && controls.rawReality < 0.4) return "Strukturelle Resonanz";
    if (controls.slimLayers < 0.35) return "Instabile Verdichtung";
    return "Fließendes Myzel";
  }, [active, controls]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="border border-neutral-800 bg-black p-6">
        <h2 className="text-2xl text-white mb-2">Die Begriffliche Ökologie (Dissipatives System)</h2>
        <p className="text-sm text-neutral-400 mb-6 leading-relaxed max-w-3xl">
          Sprache ist ein Feld mit Knoten und Vektoren. Die Energie entsteht durch Struktur und Relation. Die Verdichtung an einem Knoten ist kein Fehler, sondern ein Zustand des Systems.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
          {([
            ["Semantische Spannung", "tension"],
            ["Layer Slimness", "slimLayers"],
            ["Rohe Realität", "rawReality"],
          ] as const).map(([label, key]) => (
            <div key={key}>
              <label className="block text-xs text-neutral-500 mb-1">{label}</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={controls[key]}
                onChange={(event) =>
                  setControls((prev) => ({
                    ...prev,
                    [key]: parseFloat(event.target.value),
                  }))
                }
                className="w-full cursor-pointer"
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between items-end mb-2">
          <button
            onClick={() => setActive((prev) => !prev)}
            className={`px-6 py-2 border ${active ? "bg-amber-900 border-amber-500 text-amber-100" : "border-neutral-600 text-white hover:bg-neutral-800"}`}
          >
            {active ? "MYZEL DEAKTIVIEREN" : "MYZEL AKTIVIEREN"}
          </button>
          <div className="text-right">
            <span className="text-amber-400 text-sm tracking-wide">{systemState}</span>
          </div>
        </div>
        <div className="relative border border-neutral-800 bg-neutral-950 overflow-hidden" style={{ height: TOPO_HEIGHT }}>
          {active ? (
            <div className="absolute inset-0">
              {JI_NODES.map((node, index) => {
                const x = 10 + ((index * 71) % 80);
                const y = 10 + ((index * 29) % 70);
                return (
                  <div
                    key={node.label}
                    className="absolute -translate-x-1/2 -translate-y-1/2 text-[10px] text-neutral-300"
                    style={{ left: `${x}%`, top: `${y}%` }}
                  >
                    <div className="mb-1 h-2 w-2 rounded-full bg-white/80" />
                    {node.label}
                  </div>
                );
              })}
              <div className="absolute inset-x-0 bottom-3 text-center text-xs text-neutral-500">
                Canvas target: {TOPO_WIDTH} × {TOPO_HEIGHT}
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-neutral-700">[ OFFLINE ]</div>
          )}
        </div>
      </div>
    </div>
  );
}
