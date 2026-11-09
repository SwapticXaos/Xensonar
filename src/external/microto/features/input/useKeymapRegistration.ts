/**
 * Registers a room's key handlers with the global input router (keymapRegistryRef).
 * Uses refs for handlers so the effect only depends on active/keymapRegistryRef/roomId,
 * avoiding re-registration when callback identity changes (vision §8 reduce duplication).
 * Use in standalone key-driven rooms (Commons, L3, Platformer, TuningLab) that receive keymapRegistryRef.
 */

import { useEffect, useRef } from "react";
import type { Room } from "../../app/roomRegistry";
import type { KeymapRegistryRef } from "./useInputRouter";

export type UseKeymapRegistrationHandlers = {
  onKeyDown?: (e: KeyboardEvent) => void;
  onKeyUp?: (e: KeyboardEvent) => void;
};

/**
 * When active and keymapRegistryRef is set, registers roomId in the registry with
 * onKeyDown/onKeyUp (read from refs so handlers can change without re-running the effect).
 * Cleanup on unmount or when active becomes false.
 */
export function useKeymapRegistration(
  roomId: Room,
  keymapRegistryRef: KeymapRegistryRef | null | undefined,
  active: boolean,
  handlers: UseKeymapRegistrationHandlers,
): void {
  const onKeyDownRef = useRef<((e: KeyboardEvent) => void) | undefined>(undefined);
  const onKeyUpRef = useRef<((e: KeyboardEvent) => void) | undefined>(undefined);
  onKeyDownRef.current = handlers.onKeyDown;
  onKeyUpRef.current = handlers.onKeyUp;

  useEffect(() => {
    if (!active || !keymapRegistryRef) return;
    keymapRegistryRef.current[roomId] = {
      onKeyDown: (e: KeyboardEvent) => onKeyDownRef.current?.(e),
      onKeyUp: (e: KeyboardEvent) => onKeyUpRef.current?.(e),
    };
    return () => {
      delete keymapRegistryRef.current[roomId];
    };
  }, [active, keymapRegistryRef, roomId]);
}
