export type DrumPlaylistHotkeyDirection = -1 | 1;

export const DRUM_PLAYLIST_HOTKEY_HELP = "Caps Lock vorwärts · linke Umschalt-Taste rückwärts";

export type DrumPlaylistHotkeyEvent = Pick<KeyboardEvent, "code" | "repeat" | "altKey" | "ctrlKey" | "metaKey">;

export function resolveDrumPlaylistHotkeyDirection(event: DrumPlaylistHotkeyEvent): DrumPlaylistHotkeyDirection | null {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return null;
  if (event.code === "CapsLock") return 1;
  if (event.code === "ShiftLeft") return -1;
  return null;
}
