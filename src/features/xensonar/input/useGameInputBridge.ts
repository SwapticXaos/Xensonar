import { useEffect } from 'react';
import { isEditableTarget } from '../resonanceKeyboard';
import { applyGameKeyState, isForgeHotkeyTarget, type GameKeyState } from '../rooms/resonanceInputRouting';

type MutableRefLike<T> = { current: T };

type GameInputBridgeArgs = {
  gameInputActive: boolean;
  keyRef: MutableRefLike<GameKeyState>;
};

/**
 * Key-state bridge for Xenpolar/game extras. Keeping it out of App.tsx helps
 * separate extras input plumbing from the Xensonar Hauptraum audio surface.
 */
export function useGameInputBridge({ gameInputActive, keyRef }: GameInputBridgeArgs) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!gameInputActive || isEditableTarget(event.target) || isForgeHotkeyTarget(event.target)) return;
      applyGameKeyState(event, true, keyRef.current);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (!gameInputActive || isEditableTarget(event.target) || isForgeHotkeyTarget(event.target)) return;
      applyGameKeyState(event, false, keyRef.current);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameInputActive, keyRef]);
}
