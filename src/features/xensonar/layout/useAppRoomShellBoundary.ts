import { useState } from "react";
import { isXenpolarShortcutActive } from "../rooms/xenpolarShortcut";
import { useSpectralForgeEntryUploadState } from "../rooms/useSpectralForgeEntryUploadState";
import type { Room } from "../domain/runtimeTypes";

export type AppFamilyRequest = "melodieQuest" | null;

export function useAppRoomShellBoundary() {
  const [room, setRoom] = useState<Room>("RESONANCE");
  const [familyRequestedActive, setFamilyRequestedActive] = useState<AppFamilyRequest>(null);
  const spectralForgeEntryUploadState = useSpectralForgeEntryUploadState();
  const xenpolarShortcutActive = isXenpolarShortcutActive(room);

  return {
    room,
    setRoom,
    familyRequestedActive,
    setFamilyRequestedActive,
    spectralForgeEntryUploadState,
    xenpolarShortcutActive,
  };
}
