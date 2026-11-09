import { useEffect, useRef } from "react";

type UseXensonarRefactorFrameRuntimeArgs = {
  powered: boolean;
  syncSharedField: () => void;
  stepSimulation: (dt: number, nowMs: number) => void;
  draw: () => void;
};

export function useXensonarRefactorFrameRuntime({
  powered,
  syncSharedField,
  stepSimulation,
  draw,
}: UseXensonarRefactorFrameRuntimeArgs) {
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      syncSharedField();
      if (powered) stepSimulation(dt, now);
      draw();
      animationRef.current = requestAnimationFrame(loop);
    };
    animationRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [draw, powered, stepSimulation, syncSharedField]);
}
