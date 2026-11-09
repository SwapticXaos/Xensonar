import { useEffect, useRef } from "react";
import type { Room } from "../../app/roomRegistry";
import { type InputLogEntryEmit } from "./inputLogTypes";

export type InputHandlers = {
  onKeyDown?: (e: KeyboardEvent) => void;
  onKeyUp?: (e: KeyboardEvent) => void;
  onPointerDown?: (e: PointerEvent) => void;
  onPointerMove?: (e: PointerEvent) => void;
  onPointerUp?: (e: PointerEvent) => void;
};

/** Emit shape for input events; canonical type in shared/input/inputLogTypes. */
export type InputLogEntry = InputLogEntryEmit;

export type UseRoomInputOptions = {
  onInputEvent?: (entry: InputLogEntry) => void;
  /** When true, do not attach listeners (caller uses global input router instead). */
  useRouter?: boolean;
};

export function useRoomInput(
  activeRoom: Room | string | null | undefined,
  expectedRoom: Room,
  handlers: InputHandlers,
  options?: UseRoomInputOptions,
) {
  const latestHandlers = useRef(handlers);
  const latestOptions = useRef(options);
  latestHandlers.current = handlers;
  latestOptions.current = options;

  useEffect(() => {
    if (activeRoom !== expectedRoom) return;
    if (latestOptions.current?.useRouter) return;

    const emit = (type: InputLogEntryEmit["type"], key?: string, pointer?: { x: number; y: number }) => {
      latestOptions.current?.onInputEvent?.({ room: expectedRoom, type, key, pointer });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      emit("keydown", e.key);
      latestHandlers.current.onKeyDown?.(e);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      emit("keyup", e.key);
      latestHandlers.current.onKeyUp?.(e);
    };
    const handlePointerDown = (e: PointerEvent) => {
      emit("pointerdown", undefined, { x: e.clientX, y: e.clientY });
      latestHandlers.current.onPointerDown?.(e);
    };
    const handlePointerMove = (e: PointerEvent) => {
      emit("pointermove", undefined, { x: e.clientX, y: e.clientY });
      latestHandlers.current.onPointerMove?.(e);
    };
    const handlePointerUp = (e: PointerEvent) => {
      emit("pointerup", undefined, { x: e.clientX, y: e.clientY });
      latestHandlers.current.onPointerUp?.(e);
    };

    const activeEvents: { type: string; listener: EventListener }[] = [];

    if (handlers.onKeyDown) {
      window.addEventListener("keydown", handleKeyDown as EventListener);
      activeEvents.push({ type: "keydown", listener: handleKeyDown as EventListener });
    }
    if (handlers.onKeyUp) {
      window.addEventListener("keyup", handleKeyUp as EventListener);
      activeEvents.push({ type: "keyup", listener: handleKeyUp as EventListener });
    }
    if (handlers.onPointerDown) {
      window.addEventListener("pointerdown", handlePointerDown as EventListener);
      activeEvents.push({ type: "pointerdown", listener: handlePointerDown as EventListener });
    }
    if (handlers.onPointerMove) {
      window.addEventListener("pointermove", handlePointerMove as EventListener);
      activeEvents.push({ type: "pointermove", listener: handlePointerMove as EventListener });
    }
    if (handlers.onPointerUp) {
      window.addEventListener("pointerup", handlePointerUp as EventListener);
      activeEvents.push({ type: "pointerup", listener: handlePointerUp as EventListener });
    }

    return () => {
      activeEvents.forEach(({ type, listener }) => {
        window.removeEventListener(type, listener);
      });
    };
  }, [
    activeRoom,
    expectedRoom,
    !!handlers.onKeyDown,
    !!handlers.onKeyUp,
    !!handlers.onPointerDown,
    !!handlers.onPointerMove,
    !!handlers.onPointerUp,
  ]);
}
