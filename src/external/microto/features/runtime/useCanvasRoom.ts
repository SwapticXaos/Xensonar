/**
 * Composes useRoomInput + useSimulationLoop for canvas rooms that need both.
 * Single contract: one hook call for input + RAF loop; keeps room components simpler
 * and enforces "canvas room = input + loop" (vision §6 modular domains, §8 reduce duplication).
 *
 * Use when a room component owns both keyboard/pointer handling and a simulation loop.
 * Rooms that delegate to a dedicated loop hook (e.g. useArenaLoop, useResonanceSimulation)
 * keep using those hooks; this is for standalone-style canvas rooms. Used by: Sandbox, Commons, L3, Platformer, TuningLab.
 */

import type { RefObject } from "react";
import type { Room } from "../../app/roomRegistry";
import type { InputHandlers, UseRoomInputOptions } from "../../shared/input/useRoomInput";
import { useRoomInput } from "../../shared/input/useRoomInput";
import { useSimulationLoop } from "./useSimulationLoop";
import { VISUAL_RUNTIME_DEFAULT_MAX_FRAME_MS } from "./visualRuntimeContract";

export type UseCanvasRoomOptions = {
  room: Room;
  roomId: Room;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  active: boolean;
  update: (dt: number, now?: number) => void;
  draw: (ctx: CanvasRenderingContext2D) => void;
  inputHandlers: InputHandlers;
  inputOptions?: UseRoomInputOptions;
  /** When true (default), register/unregister with rafCount for DiagnosticsHUD. */
  registerRaf?: boolean;
  /** When set, input is active when true; loop uses `active`. Use when input must work while loop is paused (e.g. Platformer). */
  inputActive?: boolean;
  /** Frame-pacing guard (ms). When frame delta exceeds this, draw is skipped (vision §5 stable ~60 FPS). Default 18. */
  maxFrameMs?: number;
};

/**
 * Single hook for canvas rooms that need room-scoped input and a simulation loop.
 * Calls useRoomInput((inputActive ?? active) ? room : "NONE", roomId, ...) and useSimulationLoop(active, ...).
 */
export function useCanvasRoom({
  room,
  roomId,
  canvasRef,
  active,
  update,
  draw,
  inputHandlers,
  inputOptions,
  registerRaf = true,
  inputActive,
  maxFrameMs = VISUAL_RUNTIME_DEFAULT_MAX_FRAME_MS,
}: UseCanvasRoomOptions): void {
  const inputOn = inputActive ?? active;
  useRoomInput(inputOn ? room : ("NONE" as Room), roomId, inputHandlers, inputOptions);
  useSimulationLoop({
    canvasRef,
    active,
    update,
    draw,
    registerRaf,
    roomId: registerRaf ? roomId : undefined,
    maxFrameMs,
  });
}
