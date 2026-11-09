import type { MouseEventHandler, RefObject } from "react";
import { SharedFieldCanvasLayer } from "../../../external/microto/features/refactorField/SharedFieldCanvasLayer";
import type { SharedFieldController } from "../family/refactor/sharedFieldController";

type ResonanceStagePanelProps = {
  nexusActive: boolean;
  resonanceInputIndicator: boolean;
  nexusCanvasRef: RefObject<HTMLCanvasElement | null>;
  gameWidth: number;
  gameHeight: number;
  installationSharedFieldActive: boolean;
  installationSharedFieldController: SharedFieldController | null;
  onTogglePower: () => void | Promise<void>;
  onCanvasContextMenu: MouseEventHandler<HTMLCanvasElement>;
  onCanvasMouseMove: MouseEventHandler<HTMLCanvasElement>;
  onCanvasMouseDown: MouseEventHandler<HTMLCanvasElement>;
  onCanvasMouseUp: MouseEventHandler<HTMLCanvasElement>;
  onCanvasMouseLeave: MouseEventHandler<HTMLCanvasElement>;
};

export function ResonanceStagePanel({
  nexusActive,
  resonanceInputIndicator,
  nexusCanvasRef,
  gameWidth,
  gameHeight,
  installationSharedFieldActive,
  installationSharedFieldController,
  onTogglePower,
  onCanvasContextMenu,
  onCanvasMouseMove,
  onCanvasMouseDown,
  onCanvasMouseUp,
  onCanvasMouseLeave,
}: ResonanceStagePanelProps) {
  return (
    <div className="border border-neutral-800 bg-black p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl text-purple-200">V. Xensonar Synth</h2>
          <p className="text-sm text-neutral-400">Bewege Maus/Touch oder die Pfeiltasten als Fokus-Vektor durch den harmonischen Raum. Ein Klick erzeugt einen Resonanz-Ripple. Duenes Fadenkreuz = Fokus-Cursor, heller Ball = Wellenstarter-Ball. Kammerton-Keys: 1-0, Q-P (abwaerts). Zielwellen: Y links, X rechts, C oben, V unten.</p>
        </div>
        <button
          onClick={onTogglePower}
          className={`h-12 w-[28rem] max-w-full rounded-sm border px-5 font-semibold tracking-wide transition-all ${nexusActive ? "border-violet-400 bg-gradient-to-r from-violet-900/90 to-purple-800/90 text-violet-100 shadow-[0_0_14px_rgba(167,139,250,0.28)]" : "border-neutral-500 bg-neutral-900 text-neutral-100 hover:bg-neutral-800"}`}
        >
          {nexusActive && resonanceInputIndicator ? "Hast du schon aus- und wieder anschalten probiert?" : "Power"}
        </button>
      </div>
      <div className="mb-4 flex flex-col gap-4">
        <div className="relative overflow-hidden border border-neutral-800 bg-neutral-900 cursor-crosshair">
          {!nexusActive && <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-neutral-700">[ OFFLINE - AKTIVIEREN FUER AUDIO & DRIFT ]</div>}
          <canvas
            ref={nexusCanvasRef}
            width={gameWidth}
            height={gameHeight}
            className="block h-auto w-full"
            onContextMenu={onCanvasContextMenu}
            onMouseMove={onCanvasMouseMove}
            onMouseDown={onCanvasMouseDown}
            onMouseUp={onCanvasMouseUp}
            onMouseLeave={onCanvasMouseLeave}
          />
          {installationSharedFieldActive && (
            <SharedFieldCanvasLayer
              width={gameWidth}
              height={gameHeight}
              controller={installationSharedFieldController}
              active
              interactive
            />
          )}
        </div>
      </div>
    </div>
  );
}
