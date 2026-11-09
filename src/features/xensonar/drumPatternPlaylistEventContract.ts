export const DRUM_PATTERN_PLAYLIST_UPDATED_EVENT = 'xensonar:drum-pattern-playlist-updated';

export function dispatchDrumPatternPlaylistUpdated(): boolean {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return false;
  window.dispatchEvent(new CustomEvent(DRUM_PATTERN_PLAYLIST_UPDATED_EVENT));
  return true;
}

export function listenDrumPatternPlaylistUpdated(handler: EventListener): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(DRUM_PATTERN_PLAYLIST_UPDATED_EVENT, handler);
  return () => window.removeEventListener(DRUM_PATTERN_PLAYLIST_UPDATED_EVENT, handler);
}
