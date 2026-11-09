import type { MutableRefObject, RefObject } from "react";
import { RoomQuickStartCard } from "../../app/components/RoomQuickStartCard";
import { WorldSummaryHud } from "../../app/components/WorldSummaryHud";
import type { QuantizeSliceLike } from "../../shared/tuning/quantizeLabel";
import { useRoomFirstRunHint } from "../runtime/useRoomFirstRunHint";
import type { ArenaHud } from "./arenaState";
import type { GlobalHarmonicContext } from "../resonance/config/stateSlices";
import type { HarmonicWorld } from "../../domain/harmonicWorld";
import { mapWorldToArenaView } from "./harmonicAdapter";
import type { Room } from "../../app/roomRegistry";

type GameRoomViewProps = {
  gameActive: boolean;
  gameHud: ArenaHud;
  harmonicSlice: QuantizeSliceLike;
  globalHarmonicContext?: GlobalHarmonicContext;
  harmonicWorld?: HarmonicWorld | null;
  startGameRun: () => void | Promise<void>;
  gameCanvasRef: RefObject<HTMLCanvasElement | null>;
  gameWidth: number;
  gameHeight: number;
  /** Optional navigation callback used by world recommendations in the HUD. */
  onSelectRoom?: (room: Room) => void;
  /** When set, first-run dismiss is routed via global keydown (vision §8). */
  firstRunDismissRef?: MutableRefObject<(() => void) | null>;
};

/** Layout for GAME room (Irrlicht Arena): header, HUD, canvas. Keeps App.tsx room switch list thin. Vision §5: first-run hint for controls. */
export function GameRoomView({
  gameActive,
  gameHud,
  harmonicSlice,
  globalHarmonicContext,
  harmonicWorld,
  startGameRun,
  gameCanvasRef,
  gameWidth,
  gameHeight,
  onSelectRoom,
  firstRunDismissRef,
}: GameRoomViewProps) {
  const { firstRunHint, showFirstRunHint } = useRoomFirstRunHint("GAME", {
    dismissOnGlobalInput: true,
    firstRunDismissRef,
  });

  const { modeLabel, tuningLabel } = mapWorldToArenaView(harmonicWorld);

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="border border-neutral-800 bg-black p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-2xl text-amber-100">IV. Irrlicht Arena</h2>
            <p className="text-sm text-neutral-400">
              Waberndes Irrlicht in surrealer Landschaft. Unsichtbare JI-Anker (z.B. 3/2, 15/8) verschieben sich im
              Hintergrund und lenken seine Bahn. Steuerung: A/D oder Pfeile, Schuss: Space.
            </p>
            <p className="mt-1 text-xs text-amber-200/90">
              Anker bestimmen, in welche harmonische Zone das Irrlicht gezogen wird, Chaos regelt, wie wild es zwischen
              diesen Zonen taumelt. Jeder Treffer schreibt kurze, ankergespeiste Motive in die Klanglandschaft, Level-Ups
              verdichten Bewegung und Dichte der Tonfolgen.
            </p>
          </div>
          <button
            onClick={() => void startGameRun()}
            className="px-5 py-2 border border-amber-300 text-amber-100 hover:bg-amber-200/20"
          >
            {gameActive ? "Restart Run" : "Start Run"}
          </button>
        </div>

        <div className="mb-4 space-y-2">
          <WorldSummaryHud
            world={harmonicWorld}
            slice={harmonicSlice}
            rootHz={globalHarmonicContext?.baseFreq}
            tuningLabel={tuningLabel}
            modeLabel={modeLabel ?? "Irrlicht-Lauf"}
            onSelectRoom={onSelectRoom}
            worldHintChildren={
              <>
                Diese Arena teilt sich das harmonische Welt-Gitter mit Resonance. Waehle eine Szene oder Welt im Synth,
                dann laesst sich hier erkunden, wie sich die gleichen Intervalle als Bewegungs-Anker und Treffer-Motive
                anfuehlen.
              </>
            }
          />
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

        {showFirstRunHint && firstRunHint && (
          <RoomQuickStartCard className="mb-2 text-amber-200/90 border-amber-700/70 bg-amber-950/40">
            {firstRunHint}
          </RoomQuickStartCard>
        )}
        <div className="border border-neutral-800 bg-neutral-900 overflow-hidden">
          <canvas
            ref={gameCanvasRef}
            width={gameWidth}
            height={gameHeight}
            className="w-full h-auto touch-none"
          />
        </div>
      </div>
    </div>
  );
}
