export { OPEN_BASS_PATTERN_MANAGER_EVENT, OPEN_DRUM_PATTERN_MANAGER_EVENT } from '../resonanceWorkspaceIntentEvents';

const LEVEL3LAB_MODE_KEY = 'xensonar-level3lab-mode';
const LEVEL3LAB_SESSION_MODE_KEY = 'xensonar-level3lab-mode-session';
const LEVEL3LAB_CANONICAL_VIEW_KEY = 'xensonar-level3lab-canonical-view';
const LEVEL3LAB_CANONICAL_VIEW_SESSION_KEY = 'xensonar-level3lab-canonical-view-session';

export function primeDrumMachineWorkspaceIntent() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LEVEL3LAB_MODE_KEY, 'canonical');
  window.sessionStorage.setItem(LEVEL3LAB_SESSION_MODE_KEY, 'canonical');
  window.localStorage.setItem(LEVEL3LAB_CANONICAL_VIEW_KEY, 'drums');
  window.sessionStorage.setItem(LEVEL3LAB_CANONICAL_VIEW_SESSION_KEY, 'drums');
}
