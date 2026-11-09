import { useEffect } from 'react';
import { isEditableTarget } from '../resonanceKeyboard';
import { isForgeHotkeyTarget } from '../rooms/resonanceInputRouting';

type GlobalArrowCaptureArgs = {
  gameInputActive: boolean;
  resonanceInputActive: boolean;
};

const ARROW_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);

/**
 * Captures browser arrow-key scrolling only while an explicit musical/game
 * surface owns the arrows. The actual resonance/game key behavior stays outside.
 */
export function useGlobalArrowCapture({ gameInputActive, resonanceInputActive }: GlobalArrowCaptureArgs) {
  useEffect(() => {
    const handleArrowKeyCapture = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if (!ARROW_KEYS.has(event.key)) return;
      if (isForgeHotkeyTarget(event.target) || gameInputActive || resonanceInputActive) {
        event.preventDefault();
      }
    };
    window.addEventListener('keydown', handleArrowKeyCapture, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleArrowKeyCapture, true);
    };
  }, [gameInputActive, resonanceInputActive]);
}
