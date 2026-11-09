import { useCallback,useEffect } from 'react';
import type { CanonicalLogicView } from './sessionTypes';

export function useCanonicalForgeLogicViewBridge(args: {
  externalLogicView?: CanonicalLogicView;
  onExternalLogicViewChange?: (mode: CanonicalLogicView) => void;
  setLogicView: (view: CanonicalLogicView | ((current: CanonicalLogicView) => CanonicalLogicView)) => void;
}) {
  const { externalLogicView, onExternalLogicViewChange, setLogicView } = args;

  useEffect(() => {
    if (!externalLogicView) return;
    setLogicView((current) => (current === externalLogicView ? current : externalLogicView));
  }, [externalLogicView, setLogicView]);

  return useCallback((nextView: CanonicalLogicView) => {
    setLogicView(nextView);
    onExternalLogicViewChange?.(nextView);
  }, [onExternalLogicViewChange, setLogicView]);
}
