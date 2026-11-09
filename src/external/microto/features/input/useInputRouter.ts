/**
 * Single global input router (vision §8: reduce duplicated keyboard handlers).
 * One keydown/keyup/pointer listener at App level; dispatches to global shortcuts first (if ref set), then to the active room's registered handlers. Rooms register via a registry ref when mounted.
 */

import { useEffect, useRef, type MutableRefObject } from "react";
import type { Room } from "../../app/roomRegistry";
import type { InputLogEntry } from "../../shared/input/useRoomInput";

export type KeymapRegistryEntry = {
  onKeyDown?: (e: KeyboardEvent) => void;
  onKeyUp?: (e: KeyboardEvent) => void;
  onPointerDown?: (e: PointerEvent) => void;
  onPointerMove?: (e: PointerEvent) => void;
  onPointerUp?: (e: PointerEvent) => void;
};

export type KeymapRegistryRef = MutableRefObject<Partial<Record<Room, KeymapRegistryEntry>>>;

/** Return true if the event was handled (caller should skip room dispatch). */
export type GlobalShortcutHandler = (e: KeyboardEvent) => boolean;

export type UseInputRouterOptions = {
  onInputEvent?: (entry: InputLogEntry) => void;
  /** When set, called on keydown before room dispatch; return true to skip room. Single listener (vision §8). */
  globalShortcutHandlerRef?: MutableRefObject<GlobalShortcutHandler | null | undefined>;
};

export function useInputRouter(
  room: Room,
  registryRef: KeymapRegistryRef,
  options?: UseInputRouterOptions,
) {
  const optsRef = useRef<UseInputRouterOptions | undefined>(options);
  optsRef.current = options;

  useEffect(() => {
    const emit = (type: InputLogEntry["type"], key?: string, pointer?: { x: number; y: number }) => {
      optsRef.current?.onInputEvent?.({ room, type, key, pointer });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      emit("keydown", e.key);
      if (optsRef.current?.globalShortcutHandlerRef?.current?.(e)) return;
      const entry = registryRef.current[room];
      entry?.onKeyDown?.(e);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      emit("keyup", e.key);
      const entry = registryRef.current[room];
      entry?.onKeyUp?.(e);
    };

    const handlePointerDown = (e: PointerEvent) => {
      emit("pointerdown", undefined, { x: e.clientX, y: e.clientY });
      const entry = registryRef.current[room];
      entry?.onPointerDown?.(e);
    };

    const handlePointerMove = (e: PointerEvent) => {
      emit("pointermove", undefined, { x: e.clientX, y: e.clientY });
      const entry = registryRef.current[room];
      entry?.onPointerMove?.(e);
    };

    const handlePointerUp = (e: PointerEvent) => {
      emit("pointerup", undefined, { x: e.clientX, y: e.clientY });
      const entry = registryRef.current[room];
      entry?.onPointerUp?.(e);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [room, registryRef]);
}
