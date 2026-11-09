import { useEffect } from 'react';
import { isWheelScrollAllowedTarget } from '../rooms/resonanceInputRouting';

/**
 * Browser-level scroll guard for the live instrument surface. This is UI input
 * containment only; it does not touch musical routing or audio scheduling.
 */
export function useGlobalScrollCapture() {
  useEffect(() => {
    const handleWheelCapture = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        return;
      }
      if (isWheelScrollAllowedTarget(event.target)) return;
      event.preventDefault();
    };
    window.addEventListener('wheel', handleWheelCapture, { passive: false, capture: true });
    return () => {
      window.removeEventListener('wheel', handleWheelCapture, true);
    };
  }, []);
}
