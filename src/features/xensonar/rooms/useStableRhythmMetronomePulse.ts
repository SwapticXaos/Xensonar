import { useCallback, useMemo, useRef, useState, type MutableRefObject } from "react";

export type StableRhythmMetronomePulsePlan = {
  step16: number;
  timeSec: number;
};

export type StableRhythmMetronomePulseState = {
  metronomePulse: number;
  metronomeTimeoutsRef: MutableRefObject<number[]>;
  scheduleStableRhythmMetronomePulse: (plan: StableRhythmMetronomePulsePlan, audioNowSec: number) => void;
  clearStableRhythmMetronomeTimeouts: () => void;
};

export function useStableRhythmMetronomePulse(): StableRhythmMetronomePulseState {
  const [metronomePulse, setMetronomePulse] = useState(0);
  const metronomeTimeoutsRef = useRef<number[]>([]);

  const scheduleStableRhythmMetronomePulse = useCallback((plan: StableRhythmMetronomePulsePlan, audioNowSec: number) => {
    if (plan.step16 % 4 !== 0) return;
    const delayMs = Math.max(0, (plan.timeSec - audioNowSec) * 1000);
    const timeoutId = window.setTimeout(() => {
      setMetronomePulse((prev) => prev + 1);
    }, delayMs);
    metronomeTimeoutsRef.current.push(timeoutId);
  }, []);

  const clearStableRhythmMetronomeTimeouts = useCallback(() => {
    metronomeTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
    metronomeTimeoutsRef.current = [];
  }, []);

  return useMemo(() => ({
    metronomePulse,
    metronomeTimeoutsRef,
    scheduleStableRhythmMetronomePulse,
    clearStableRhythmMetronomeTimeouts,
  }), [clearStableRhythmMetronomeTimeouts, metronomePulse, scheduleStableRhythmMetronomePulse]);
}
