import type { RefObject } from "react";

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

export type IrrlichtArenaPanelProps = {
  gameActive: boolean;
  gameHud: GameHud;
  gameCanvasRef: RefObject<HTMLCanvasElement | null>;
  arenaSeedStatus: string;
  onBackToLauncher: () => void;
  onArenaSeedExport: () => void;
  onStartRun: () => void | Promise<void>;
  gameWidth: number;
  gameHeight: number;
};

export function IrrlichtArenaPanel({
  gameActive,
  gameHud,
  gameCanvasRef,
  arenaSeedStatus,
  onBackToLauncher,
  onArenaSeedExport,
  onStartRun,
  gameWidth,
  gameHeight,
}: IrrlichtArenaPanelProps) {
  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-neutral-800 bg-neutral-950/80 p-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.28em] text-neutral-500">IV Spiele</div>
          <div className="mt-1 text-lg font-semibold text-neutral-100">Irrlicht Arena</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onBackToLauncher}
            className="rounded-full border border-cyan-700/60 bg-cyan-950/30 px-4 py-2 text-xs uppercase tracking-[0.22em] text-cyan-100 hover:bg-cyan-900/40"
          >
            ← zurück zu Arcade Games
          </button>
          <button
            type="button"
            onClick={onArenaSeedExport}
            className="rounded-full border border-amber-700/60 bg-amber-950/30 px-4 py-2 text-xs uppercase tracking-[0.22em] text-amber-100 hover:bg-amber-900/40"
          >
            Arena-DNA → Melodic Loop
          </button>
        </div>
      </div>
      <div className="rounded-2xl border border-amber-700/30 bg-amber-950/10 p-4 text-xs leading-relaxed text-neutral-300">
        <div className="font-semibold text-amber-100">Interpretationsbrücke</div>
        <div className="mt-1">{arenaSeedStatus}</div>
        <div className="mt-2 text-neutral-400">
          Die Arena bleibt als Spielraum unverändert lesbar, kann jetzt aber zusätzlich als Seed-Quelle in denselben
          Melodic-Loop-Interpreter geben, der bereits einen Jump’n’Run-Zweig auswertet.
        </div>
      </div>
      <div className="border border-neutral-800 bg-black p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-2xl text-amber-100">IV. Irrlicht Arena</h2>
            <p className="text-sm text-neutral-400">Waberndes Irrlicht in surrealer Landschaft. Unsichtbare JI-Anker (z.B. 3/2, 15/8) verschieben sich im Hintergrund und lenken seine Bahn. Steuerung: A/D oder Pfeile, Schuss: Space.</p>
          </div>
          <button onClick={() => void onStartRun()} className="px-5 py-2 border border-amber-300 text-amber-100 hover:bg-amber-200/20">
            {gameActive ? "Restart Run" : "Start Run"}
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm mb-4">
          <div className="border border-neutral-800 p-2">Score: <span className="text-amber-200">{gameHud.score}</span> / {gameHud.goal}</div>
          <div className="border border-neutral-800 p-2">Total: <span className="text-yellow-100">{gameHud.total}</span></div>
          <div className="border border-neutral-800 p-2">HP: <span className="text-cyan-200">{gameHud.hp}</span></div>
          <div className="border border-neutral-800 p-2">Phase: <span className="text-fuchsia-200">{gameHud.phase}</span></div>
          <div className="border border-neutral-800 p-2">Zeit: <span className="text-emerald-200">{gameHud.time.toFixed(1)}s</span></div>
          <div className="border border-neutral-800 p-2">Level: <span className="text-orange-200">{gameHud.level}</span></div>
          <div className="border border-neutral-800 p-2">Anchor: <span className="text-violet-200">{gameHud.anchor}</span></div>
          <div className="border border-neutral-800 p-2 col-span-2 md:col-span-2">{gameHud.message}</div>
        </div>
        <div className="border border-neutral-800 bg-neutral-900 overflow-hidden"><canvas ref={gameCanvasRef} width={gameWidth} height={gameHeight} className="w-full h-auto" /></div>
      </div>
    </div>
  );
}
