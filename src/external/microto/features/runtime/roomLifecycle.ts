/**
 * Room lifecycle contract for XENSONAR room runtimes.
 * See docu/Room-lifecycle-contract-v1.md for full contract and checklist.
 *
 * Room hooks (Resonance, Topology, Arena, Commons, L3, Platformer) should:
 * - Mount: start RAF, bind input (useRoomInput), create/resume audio when room is active.
 * - Unmount: stop RAF, unbind input, pause/disconnect room-owned audio in effect cleanup.
 */

import { useEffect, useRef } from "react";

/** Phases a room runtime is expected to respect (documentation only; no runtime enforcement). */
export type RoomLifecyclePhase = "init" | "mount" | "unmount" | "dispose";

/**
 * Contract: on mount (room active), start loops and bind input;
 * on unmount (room inactive or component unmount), stop loops and unbind input, clean up room-owned audio.
 */
export const ROOM_LIFECYCLE_CONTRACT = {
  mount: "Start RAF, bind input (useRoomInput), create/resume room audio.",
  unmount: "Stop RAF, unbind input, pause/disconnect room-owned audio in effect cleanup.",
} as const;

/**
 * Optional helper: run onMount when room becomes active, onUnmount when leaving or on cleanup.
 * Use for consistent mount/unmount behavior when adding new rooms; existing rooms may keep their own useEffect pattern.
 * Callbacks are read from refs so inline functions do not cause repeated mount/unmount.
 */
export function useRoomLifecycle<T extends string>(
  room: T,
  roomId: T,
  callbacks: { onMount?: () => void; onUnmount?: () => void }
): void {
  const onMountRef = useRef(callbacks.onMount);
  const onUnmountRef = useRef(callbacks.onUnmount);
  onMountRef.current = callbacks.onMount;
  onUnmountRef.current = callbacks.onUnmount;
  const didMountRef = useRef(false);

  useEffect(() => {
    if (room !== roomId) {
      if (didMountRef.current) {
        onUnmountRef.current?.();
        didMountRef.current = false;
      }
      return;
    }
    didMountRef.current = true;
    onMountRef.current?.();
    return () => {
      onUnmountRef.current?.();
      didMountRef.current = false;
    };
  }, [room, roomId]);
}
