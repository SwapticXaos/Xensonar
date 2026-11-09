import type { RefObject } from "react";
import type { Room } from "../../app/roomRegistry";
import type { InputHandlers, UseRoomInputOptions } from "../../shared/input/useRoomInput";
import type { KeymapRegistryRef } from "../input/useInputRouter";
import type { UseKeymapRegistrationHandlers } from "../input/useKeymapRegistration";
import { useCanvasRoom } from "./useCanvasRoom";
import { useRoomLifecycle } from "./roomLifecycle";
import { useKeymapRegistration } from "../input/useKeymapRegistration";

type StandaloneRoomLifecycle = {
  onMount?: () => void;
  onUnmount?: () => void;
};

type StandaloneRoomRuntimeOptions = {
  room: Room;
  roomId: Room;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  active: boolean;
  /** Whether the keymap should be considered active; defaults to active when omitted. */
  keymapActive?: boolean;
  update: (dt: number, now?: number) => void;
  draw: (ctx: CanvasRenderingContext2D) => void;
  inputHandlers: InputHandlers;
  inputOptions?: UseRoomInputOptions;
  registerRaf?: boolean;
  inputActive?: boolean;
  /** Optional lifecycle callbacks for rooms that own audio or other resources. */
  lifecycle?: StandaloneRoomLifecycle;
  /** Optional keymap registration for key-driven standalone rooms (Commons, L3, Platformer, TuningLab). */
  keymapRegistryRef?: KeymapRegistryRef | null;
  keymapHandlers?: UseKeymapRegistrationHandlers;
};

/**
 * Canonical wiring helper for standalone-style canvas rooms.
 *
 * Encodes the common pattern:
 * - Canvas + simulation loop (useCanvasRoom)
 * - Optional keymap registration with the global input router
 * - Optional room lifecycle callbacks (mount/unmount)
 */
export function useStandaloneRoomRuntime({
  room,
  roomId,
  canvasRef,
  active,
  keymapActive,
  update,
  draw,
  inputHandlers,
  inputOptions,
  registerRaf,
  inputActive,
  lifecycle,
  keymapRegistryRef,
  keymapHandlers,
}: StandaloneRoomRuntimeOptions): void {
  if (keymapRegistryRef && keymapHandlers) {
    const kmActive = keymapActive ?? active;
    useKeymapRegistration(roomId, keymapRegistryRef, kmActive, keymapHandlers);
  }

  useCanvasRoom({
    room,
    roomId,
    canvasRef,
    active,
    update,
    draw,
    inputHandlers,
    inputOptions,
    registerRaf,
    inputActive,
  });

  if (lifecycle) {
    useRoomLifecycle(room, roomId, lifecycle);
  }
}

