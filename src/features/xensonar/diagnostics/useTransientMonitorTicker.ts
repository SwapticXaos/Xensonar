import { useEffect } from 'react';
import type { TransientRuntime, TransientRuntimeSnapshot } from '../../resonance/transientRuntime';

type MutableRefLike<T> = { current: T };

type TransientMonitorTickerArgs = {
  transientRuntimeRef: MutableRefLike<TransientRuntime>;
  setTransientRuntimeMonitor: (snapshot: TransientRuntimeSnapshot) => void;
  intervalMs?: number;
};

/**
 * Diagnostics-only ticker for the transient pressure monitor. It observes the
 * runtime snapshot; it does not schedule, admit, reduce, or release voices.
 */
export function useTransientMonitorTicker({
  transientRuntimeRef,
  setTransientRuntimeMonitor,
  intervalMs = 320,
}: TransientMonitorTickerArgs) {
  useEffect(() => {
    const publish = () => {
      if (document.hidden) return;
      setTransientRuntimeMonitor(transientRuntimeRef.current.getSnapshot());
    };
    publish();
    const timer = window.setInterval(publish, intervalMs);
    const onVisibilityChange = () => {
      if (!document.hidden) publish();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [intervalMs, setTransientRuntimeMonitor, transientRuntimeRef]);
}
