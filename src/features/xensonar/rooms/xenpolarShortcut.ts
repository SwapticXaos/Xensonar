import type { Room } from '../types';

export type ForgeModeShortcut = 'legacy' | 'canonical' | 'experimental' | 'external';
export type ExternalDockView = 'host' | 'microto';

export const LEVEL3LAB_MODE_KEY = 'xensonar-level3lab-mode';
export const LEVEL3LAB_SESSION_MODE_KEY = 'xensonar-level3lab-mode-session';
export const LEVEL3LAB_LAST_REGULAR_MODE_KEY = 'xensonar-level3lab-last-regular-mode';
export const EXTERNAL_DOCK_VIEW_KEY = 'xensonar-external-dock-view';

export function readLevel3LabMode(): ForgeModeShortcut {
  if (typeof window === 'undefined') return 'legacy';
  const sessionRaw = window.sessionStorage.getItem(LEVEL3LAB_SESSION_MODE_KEY);
  if (sessionRaw === 'canonical' || sessionRaw === 'experimental' || sessionRaw === 'external') return sessionRaw;
  const raw = window.localStorage.getItem(LEVEL3LAB_MODE_KEY);
  return raw === 'canonical' || raw === 'experimental' || raw === 'external' ? raw : 'legacy';
}

export function readLastRegularLevel3LabMode(): Exclude<ForgeModeShortcut, 'legacy' | 'external'> | null {
  if (typeof window === 'undefined') return null;
  const sessionRaw = window.sessionStorage.getItem(LEVEL3LAB_LAST_REGULAR_MODE_KEY);
  if (sessionRaw === 'canonical' || sessionRaw === 'experimental') return sessionRaw;
  const raw = window.localStorage.getItem(LEVEL3LAB_LAST_REGULAR_MODE_KEY);
  return raw === 'canonical' || raw === 'experimental' ? raw : null;
}

export function readExternalDockView(): ExternalDockView {
  if (typeof window === 'undefined') return 'host';
  return window.localStorage.getItem(EXTERNAL_DOCK_VIEW_KEY) === 'microto' ? 'microto' : 'host';
}

export function writeLevel3LabMode(mode: ForgeModeShortcut) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LEVEL3LAB_MODE_KEY, mode);
  window.sessionStorage.setItem(LEVEL3LAB_SESSION_MODE_KEY, mode);
  if (mode === 'canonical' || mode === 'experimental') {
    window.localStorage.setItem(LEVEL3LAB_LAST_REGULAR_MODE_KEY, mode);
    window.sessionStorage.setItem(LEVEL3LAB_LAST_REGULAR_MODE_KEY, mode);
  }
}

export function writeExternalDockView(view: ExternalDockView) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(EXTERNAL_DOCK_VIEW_KEY, view);
}

export function openXenpolarShortcut(setRoom: (room: Room) => void) {
  writeLevel3LabMode('external');
  writeExternalDockView('microto');
  setRoom('L3LAB');
}

export function openMaterialschmiede(setRoom: (room: Room) => void) {
  const currentDockView = readExternalDockView();
  const lastRegularMode = readLastRegularLevel3LabMode();
  writeLevel3LabMode(lastRegularMode ?? 'legacy');
  if (currentDockView === 'microto') {
    writeExternalDockView('host');
  }
  setRoom('L3LAB');
}

export function isXenpolarShortcutActive(room: Room): boolean {
  return room === 'L3LAB' && readLevel3LabMode() === 'external' && readExternalDockView() === 'microto';
}
