/**
 * Nexus canvas and primary actions block for Resonance room.
 * Header (title, first-run hint), canvas with pointer handlers, and primary buttons
 * (Synth toggle, Arena, Save/Load). Keeps ResonanceRoom layout focused; vision §8 clearer modules.
 */

import { useState, type Dispatch, type PointerEvent, type RefObject, type SetStateAction } from "react";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../../../shared/canvasConstants";
import { mapPointerEventToCanvasPoint } from "../../../shared/input/canvasPointer";
import { droneFreqFromY } from "../config/mapping";
import type { HyperCalibUIState } from "../useHyperCalibUI";
import type { EnsureAudio } from "../../../shared/audio/audioInit";
import type { NexusRuntimeRefs, NexusRuntimeRefsRef } from "../resonanceRefs";
import type { PulseDirection } from "../resonanceKeymap";
import { setWaveDriveHeld, setWaveOctaveLatched } from "../resonanceWavePerformance";

export type NexusRefsShape = NexusRuntimeRefs;

type ResonanceNexusBlockProps = {
  nexusCanvasRef: RefObject<HTMLCanvasElement | null>;
  nexusRefs: NexusRuntimeRefsRef;
  echoOn: boolean;
  toggleEcho: () => void;
  nexusActive: boolean;
  setNexusActive: Dispatch<SetStateAction<boolean>>;
  initAudio: EnsureAudio;
  enterArenaWorkspace: (startLevel: number) => void;
  triggerSectorPulse: (direction: PulseDirection, mode?: "one_shot" | "persistent") => void;
  savePreset: () => void;
  loadPreset: () => void;
  firstRunHint: string;
  showFirstRunHint: boolean;
  dismissHint: () => void;
  registerHyperCali2Move: (x: number, y: number) => void;
  registerHyperCali2Click: (x: number, y: number) => void;
  hyperCalibUI: HyperCalibUIState;
  handleHyperCalibrateButton: () => void;
  syncPointerCursor: (x: number, y: number) => { x: number; y: number };
};

export function ResonanceNexusBlock({
  nexusCanvasRef,
  nexusRefs,
  echoOn,
  toggleEcho,
  nexusActive,
  setNexusActive,
  initAudio,
  enterArenaWorkspace,
  triggerSectorPulse,
  savePreset,
  loadPreset,
  firstRunHint,
  showFirstRunHint,
  dismissHint,
  registerHyperCali2Move,
  registerHyperCali2Click,
  hyperCalibUI,
  handleHyperCalibrateButton,
  syncPointerCursor,
}: ResonanceNexusBlockProps) {
  const [cursorForTooltip, setCursorForTooltip] = useState<{ x: number; y: number } | null>(null);
  const [octaveLatched, setOctaveLatched] = useState(false);

  const applyPointerCursor = (event: PointerEvent<HTMLCanvasElement>) => {
    if (showFirstRunHint) dismissHint();
    const { x, y } = mapPointerEventToCanvasPoint(event);
    const nextCursor = syncPointerCursor(x, y);
    setCursorForTooltip(nextCursor);
    registerHyperCali2Move(nextCursor.x, nextCursor.y);
    return nextCursor;
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    applyPointerCursor(event);
  };

  const handlePointerLeave = () => {
    setCursorForTooltip(null);
  };

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (showFirstRunHint) dismissHint();
    applyPointerCursor(event);
    if (event.button === 2) {
      event.preventDefault();
      toggleEcho();
      return;
    }
    if (event.button !== 0) {
      return;
    }
    const now = performance.now();
    nexusRefs.current.swarmCollapseX = nexusRefs.current.cursorX;
    nexusRefs.current.swarmCollapseY = nexusRefs.current.cursorY;
    nexusRefs.current.swarmCollapseUntil = now + 760;
    nexusRefs.current.swarmScatterSeed = Math.random() * 100000;
    nexusRefs.current.wobble = Math.min(1.2, nexusRefs.current.wobble + 0.6);
    nexusRefs.current.ripples.push({
      x: nexusRefs.current.cursorX,
      y: nexusRefs.current.cursorY,
      radius: 0,
      life: 1,
      hitAgents: [],
      lastImpactAt: 0,
    });
    if (nexusRefs.current.ripples.length > 24) {
      nexusRefs.current.ripples.shift();
    }
    registerHyperCali2Click(nexusRefs.current.cursorX, nexusRefs.current.cursorY);
    if (hyperCalibUI.running) {
      handleHyperCalibrateButton();
    }
  };

  return (
    <div className="border border-neutral-800 bg-black p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl text-purple-200">V. XENSONAR SYNTH</h2>
          <p className="text-xs text-neutral-400">
            Move your pointer over the field to aim the cursor. Left-click gathers note particles into temporary constellations, Y/X/C/V fire directional waves, and right click toggles echo. Backspace lifts the wave octave, Space pushes new wave tones forward.
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-neutral-500">
            Echo: <span className={echoOn ? "text-fuchsia-200" : "text-neutral-300"}>{echoOn ? "On" : "Off"}</span>
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-neutral-400">
            <span className="mr-1 text-neutral-300">Pulse (Pointer):</span>
            <button
              type="button"
              className="px-1.5 py-0.5 border border-neutral-700 text-neutral-200 hover:bg-neutral-800"
              onClick={() => triggerSectorPulse("left", "one_shot")}
            >
              ←
            </button>
            <button
              type="button"
              className="px-1.5 py-0.5 border border-neutral-700 text-neutral-200 hover:bg-neutral-800"
              onClick={() => triggerSectorPulse("right", "persistent")}
            >
              →
            </button>
            <button
              type="button"
              className="px-1.5 py-0.5 border border-neutral-700 text-neutral-200 hover:bg-neutral-800"
              onClick={() => triggerSectorPulse("up", "one_shot")}
            >
              ↑
            </button>
            <button
              type="button"
              className="px-1.5 py-0.5 border border-neutral-700 text-neutral-200 hover:bg-neutral-800"
              onClick={() => triggerSectorPulse("down", "one_shot")}
            >
              ↓
            </button>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-neutral-400">
            <span className="mr-1 text-neutral-300">Wave performance (Pointer):</span>
            <button
              type="button"
              className="px-1.5 py-0.5 border border-neutral-700 text-neutral-200 hover:bg-neutral-800"
              onPointerDown={() => setWaveDriveHeld(nexusRefs.current, true)}
              onPointerUp={() => setWaveDriveHeld(nexusRefs.current, false)}
              onPointerLeave={() => setWaveDriveHeld(nexusRefs.current, false)}
            >
              Drive Push
            </button>
            <button
              type="button"
              className={`px-1.5 py-0.5 border ${octaveLatched ? "border-yellow-400 text-yellow-200 bg-neutral-800/80" : "border-neutral-700 text-neutral-200 hover:bg-neutral-800"}`}
              onClick={() => {
                const next = !octaveLatched;
                setOctaveLatched(next);
                setWaveOctaveLatched(nexusRefs.current, next);
              }}
            >
              Oct+1 {octaveLatched ? "Latched" : "Toggle"}
            </button>
          </div>
          {showFirstRunHint && firstRunHint && (
            <p className="text-xs text-amber-200/90 mt-1">
              {firstRunHint}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={`px-4 py-2 border ${nexusActive ? "border-rose-400 text-rose-200" : "border-emerald-400 text-emerald-200"}`}
            onClick={async () => {
              if (!nexusActive) {
                const ctx = await initAudio();
                if (!ctx) return;
              }
              setNexusActive((prev) => !prev);
            }}
          >
            {nexusActive ? "Synth Stoppen" : "Synth Aktivieren"}
          </button>
          <button className="px-4 py-2 border border-amber-300 text-amber-100" onClick={() => enterArenaWorkspace(1)}>
            Arena Workspace
          </button>
          <button className="px-3 py-2 border border-neutral-600 text-neutral-300 hover:bg-neutral-800" onClick={savePreset} title="Save current state to browser storage">
            Save preset
          </button>
          <button className="px-3 py-2 border border-neutral-600 text-neutral-300 hover:bg-neutral-800" onClick={loadPreset} title="Load preset from browser storage">
            Load preset
          </button>
        </div>
      </div>

      <div className="relative border border-neutral-800 bg-neutral-950 overflow-hidden">
        <canvas
          ref={nexusCanvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-auto touch-none"
          onContextMenu={(event) => event.preventDefault()}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          onPointerLeave={handlePointerLeave}
        />
        {cursorForTooltip && (
          <div
            className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/80 text-amber-200/90 text-xs font-mono pointer-events-none"
            aria-live="polite"
          >
            ~{droneFreqFromY(cursorForTooltip.y, CANVAS_HEIGHT).toFixed(1)} Hz
          </div>
        )}
      </div>
    </div>
  );
}
