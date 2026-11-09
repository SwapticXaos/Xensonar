import { useMemo, useRef, type MutableRefObject } from "react";

export type ResonanceFieldRuntimeRefs = {
  nexusCanvasRef: MutableRefObject<HTMLCanvasElement | null>;
  nexusArrowRef: MutableRefObject<{ left: boolean; right: boolean; up: boolean; down: boolean }>;
  waveLaunchAtRef: MutableRefObject<number>;
  waveImpactDecayRef: MutableRefObject<number>;
};

export function useResonanceFieldRuntimeRefs(): ResonanceFieldRuntimeRefs {
  const nexusCanvasRef = useRef<HTMLCanvasElement>(null);
  const nexusArrowRef = useRef({ left: false, right: false, up: false, down: false });
  const waveLaunchAtRef = useRef(0);
  const waveImpactDecayRef = useRef(1);

  return useMemo(() => ({
    nexusCanvasRef,
    nexusArrowRef,
    waveLaunchAtRef,
    waveImpactDecayRef,
  }), []);
}
