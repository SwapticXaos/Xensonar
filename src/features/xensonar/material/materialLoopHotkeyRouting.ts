import { MATERIAL_LOOP_HOTKEY_KEYS } from '../rooms/resonanceUiConfig';

export const MATERIAL_LOOP_HOTKEY_MODE_TOGGLE_LABEL = '^/°';

export function isMaterialLoopHotkeyModeToggleEvent(event: Pick<KeyboardEvent, 'code' | 'ctrlKey' | 'metaKey' | 'altKey'>) {
  // German keyboard: physical key left of 1. This key is no longer used for keyboard mirroring.
  return event.code === 'Backquote' && !event.ctrlKey && !event.metaKey && !event.altKey;
}

export function isMaterialLoopHotkeyModeToggleKey(_key: string) {
  // Kept for legacy callers; the active handler uses isMaterialLoopHotkeyModeToggleEvent.
  return false;
}

type RecentLoopHotkeyEntry = {
  id: string;
};

type MaterialLoopHotkeyMode = 'material' | 'root-follow' | 'particle-classic' | undefined;

type HandleMaterialLoopHotkeysArgs = {
  key: string;
  hotkeyMode: MaterialLoopHotkeyMode;
  recentLoopHotkeyEntries: readonly RecentLoopHotkeyEntry[];
  selectLoopDirect: (entryId: string, source: 'hotkey') => void;
  toggleLoopDirect: () => void;
  browseLoopWithUmlaut: (key: 'ö' | 'ä') => void;
};

export function handleMaterialLoopHotkeys(args: HandleMaterialLoopHotkeysArgs) {
  const {
    key,
    hotkeyMode,
    recentLoopHotkeyEntries,
    selectLoopDirect,
    toggleLoopDirect,
    browseLoopWithUmlaut,
  } = args;

  if (hotkeyMode === 'particle-classic') return false;

  const materialIndex = MATERIAL_LOOP_HOTKEY_KEYS.indexOf(
    key as (typeof MATERIAL_LOOP_HOTKEY_KEYS)[number],
  );
  if (materialIndex !== -1 && materialIndex < recentLoopHotkeyEntries.length) {
    selectLoopDirect(recentLoopHotkeyEntries[materialIndex].id, 'hotkey');
    return true;
  }

  if (key === '#' || key === "'") {
    toggleLoopDirect();
    return true;
  }

  if (key === 'ö' || key === 'ä') {
    browseLoopWithUmlaut(key);
    return true;
  }

  return false;
}
