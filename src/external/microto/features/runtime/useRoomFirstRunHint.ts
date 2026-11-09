/**
 * Shared room discoverability hook.
 * Keeps first-run room hint text and storage keys anchored to roomRegistry instead of duplicated in room components.
 */

import { type Room, requireRoomFirstRunConfig } from "../../app/roomRegistry";
import { type UseFirstRunHintOptions, useFirstRunHint } from "./useFirstRunHint";

export function useRoomFirstRunHint(
  room: Room,
  options?: UseFirstRunHintOptions,
): { firstRunHint: string; showFirstRunHint: boolean; dismissHint: () => void } {
  const { hint, storageKey } = requireRoomFirstRunConfig(room);
  const { showFirstRunHint, dismissHint } = useFirstRunHint(storageKey, options);
  return {
    firstRunHint: hint,
    showFirstRunHint,
    dismissHint,
  };
}
