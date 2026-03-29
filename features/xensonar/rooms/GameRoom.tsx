import { useMemo, useState } from "react";
import { GAME_HEIGHT, GAME_WIDTH, JI_NODES } from "../constants";

type GameHud = {
  score: number;
  goal: number;
  total: number;
  hp: number;
  phase: string;
  time: number;
  level: number;
  anchor: string;
  message: string;
};

const INITIAL_HUD: GameHud = {
  score: 0,
  goal: 46,
  total: 0,
  hp: 6,
  phase: "Dormant",
  time: 0,
  level: 1,
  anchor: "Root",
  message: "Run bereit. Die volle Arena-Logik wird als eigenes Modul wieder angeschlossen.",
};

export function GameRoom() {
  const [running, setRunning] = useState(false);
  const [hud, setHud] = useState(INITIAL_HUD);
  const visibleAnchors = useMemo(() => JI_NODES.slice(0, 8), []);

  const startRun = () => {
    setRunning(true);
    setHud({
      score: 0,
      goal: 46,
      total: 0,
      hp: 6,
      phase: "Dormant",
      time: 0,
      level: 1,
      anchor: "Root",
      message: "Arena vorbereitet. Nächster Schritt: physikalische Orb-, Bolt- und Audio-Loop-Rückführung.",
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="border border-neutral-800 bg-black p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-2xl text-amber-100">IV. Irrlicht Arena</h2>
            <p className="text-sm text-neutral-400">
              Waberndes Irrlicht in surrealer Landschaft. Unsichtbare JI-Anker verschieben sich im Hintergrund und lenken seine Bahn. Die modulare Version orientiert sich nun wieder an der Legacy-Oberfläche.
            </p>
          </div>
          <button onClick={startRun} className="px-5 py-2 border border-amber-300 text-amber-100 hover:bg-amber-200/20">
            {running ? "Restart Run" : "Start Run"}
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm mb-4">
          <div className="border border-neutral-800 p-2">Score: <span className="text-amber-200">{hud.score}</span> / {hud.goal}</div>
          <div className="border border-neutral-800 p-2">Total: <span className="text-yellow-100">{hud.total}</span></div>
          <div className="border border-neutral-800 p-2">HP: <span className="text-cyan-200">{hud.hp}</span></div>
          <div className="border border-neutral-800 p-2">Phase: <span className="text-fuchsia-200">{hud.phase}</span></div>
          <div className="border border-neutral-800 p-2">Zeit: <span className="text-emerald-200">{hud.time.toFixed(1)}s</span></div>
          <div className="border border-neutral-800 p-2">Level: <span className="text-orange-200">{hud.level}</span></div>
          <div className="border border-neutral-800 p-2">Anchor: <span className="text-violet-200">{hud.anchor}</span></div>
          <div className="border border-neutral-800 p-2 col-span-2 md:col-span-2">{hud.message}</div>
        </div>
        <div className="border border-neutral-800 bg-neutral-900 overflow-hidden relative" style={{ minHeight: GAME_HEIGHT * 0.72 }}>
          <div className="absolute inset-x-0 top-8 flex items-center justify-center">
            <div className="h-16 w-16 rounded-full bg-amber-100/80 shadow-[0_0_50px_rgba(253,224,71,0.4)]" />
          </div>
          <div className="absolute inset-x-0 bottom-12 flex items-end justify-center">
            <div className="h-10 w-20 rounded-t-3xl border border-white/20 bg-slate-800/80" />
          </div>
          {visibleAnchors.map((anchor, index) => (
            <div
              key={anchor.label}
              className="absolute text-[11px] tracking-[0.2em] text-violet-100/80"
              style={{ left: `${12 + index * 10}%`, top: `${24 + (index % 3) * 11}%` }}
            >
              {anchor.label}
            </div>
          ))}
          <div className="absolute bottom-4 left-4 right-4 text-center text-xs text-neutral-500">
            Canvas target: {GAME_WIDTH} × {GAME_HEIGHT}
          </div>
        </div>
      </div>
    </div>
  );
}
