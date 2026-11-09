import { useEffect, useState } from 'react';
import { listenDrumPatternPlaylistUpdated } from '../drumPatternPlaylistEventContract';

/**
 * Keeps drum playlist-derived selectors reactive without leaving the storage/event
 * listener directly in App.tsx. This hook owns no musical playback state; it only
 * forces a React refresh when the playlist library changes in this tab or another tab.
 */
export function useDrumPlaylistRevisionBridge() {
  const [, setDrumPlaylistRevision] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const bumpDrumPlaylistRevision = () => setDrumPlaylistRevision((prev) => prev + 1);
    const unlistenPlaylist = listenDrumPatternPlaylistUpdated(bumpDrumPlaylistRevision as EventListener);
    window.addEventListener('storage', bumpDrumPlaylistRevision);
    return () => {
      unlistenPlaylist();
      window.removeEventListener('storage', bumpDrumPlaylistRevision);
    };
  }, []);
}
