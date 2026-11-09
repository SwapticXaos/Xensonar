import * as React from 'react';
import { computeSampleInspectorMenuPosition, type SampleInspectorMenuPosition } from './sampleInspectorMenuPosition';

export type UseSampleInspectorMenuPositionArgs = {
  menuRef: React.RefObject<HTMLDivElement | null>;
  anchorX: number;
  anchorY: number;
  fallbackMenuWidth: number;
  repositionKeys?: React.DependencyList;
};

export function useSampleInspectorMenuPosition({
  menuRef,
  anchorX,
  anchorY,
  fallbackMenuWidth,
  repositionKeys = [],
}: UseSampleInspectorMenuPositionArgs): SampleInspectorMenuPosition {
  const [menuPosition, setMenuPosition] = React.useState<SampleInspectorMenuPosition>(() => ({ left: anchorX, top: anchorY }));

  React.useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      setMenuPosition({ left: anchorX, top: anchorY });
      return;
    }

    let rafId = 0;
    const updatePosition = () => {
      const element = menuRef.current;
      const measuredWidth = element?.offsetWidth ?? fallbackMenuWidth;
      const measuredHeight = element?.offsetHeight ?? 160;
      setMenuPosition(computeSampleInspectorMenuPosition({
        anchorX,
        anchorY,
        menuWidth: measuredWidth,
        menuHeight: measuredHeight,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      }));
    };

    updatePosition();
    rafId = window.requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updatePosition);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorX, anchorY, fallbackMenuWidth, menuRef, ...repositionKeys]);

  return menuPosition;
}
