/**
 * HyperCalibration UI state and handlers (vision §6 modular domains; STRUCTURE simplify).
 * Isolates HyperCalibrate / HyperCali2 refs, state, and calibration flow so useResonanceOrchestrator
 * stays orchestration-only. Single concern; reusable if another room needs hypercalib UX.
 */

import { useRef, useState, useEffect } from "react";
import { buildHyperCali2Profile, buildHyperPatternFromTapTimes } from "../../domain/hyperCalibration";
import type { ResonanceState } from "./config/state";

export type HyperCalibUIState = {
  running: boolean;
  tapCount: number;
  doneAt: number;
};

export type HyperCalib2UIState = {
  running: boolean;
  moveCount: number;
  clickCount: number;
  doneAt: number;
};

export type UseHyperCalibUIArgs = {
  nParamsUI: ResonanceState;
  updateNParams: (partial: Partial<ResonanceState>) => void;
};

export function useHyperCalibUI({ nParamsUI, updateNParams }: UseHyperCalibUIArgs) {
  const hyperCalRef = useRef({ taps: [] as number[] });
  const hyperCal2Ref = useRef({
    moves: [] as Array<{ t: number; x: number; y: number }>,
    clicks: [] as Array<{ t: number; x: number; y: number }>,
    startAt: 0,
    captureMs: 12000,
  });
  const hyperCal2TimerRef = useRef<number | null>(null);

  const [hyperCalibUI, setHyperCalibUI] = useState<HyperCalibUIState>({
    running: false,
    tapCount: 0,
    doneAt: 0,
  });
  const [hyperCalib2UI, setHyperCalib2UI] = useState<HyperCalib2UIState>({
    running: false,
    moveCount: 0,
    clickCount: 0,
    doneAt: 0,
  });

  const stopHyperCali2Timer = () => {
    if (hyperCal2TimerRef.current !== null) {
      window.clearTimeout(hyperCal2TimerRef.current);
      hyperCal2TimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopHyperCali2Timer();
  }, []);

  const startHyperCalibration = () => {
    hyperCalRef.current.taps = [];
    setHyperCalibUI({ running: true, tapCount: 0, doneAt: 0 });
    updateNParams({ hyperCalibrateOn: false });
  };

  const registerHyperCalibrationTap = () => {
    if (!hyperCalibUI.running) return;
    const next = [...hyperCalRef.current.taps, performance.now()];
    hyperCalRef.current.taps = next;
    const tapCount = next.length;
    if (tapCount >= 10) {
      const pattern = buildHyperPatternFromTapTimes(next);
      updateNParams({
        hyperCalibratedPattern: pattern,
        hyperCalibratedReady: true,
        hyperCalibrateOn: true,
      });
      setHyperCalibUI({ running: false, tapCount: 10, doneAt: performance.now() });
      return;
    }
    setHyperCalibUI((prev) => ({ ...prev, tapCount }));
  };

  const handleHyperCalibrateButton = () => {
    if (hyperCalibUI.running) {
      registerHyperCalibrationTap();
      return;
    }
    if (!nParamsUI.hyperCalibratedReady) {
      startHyperCalibration();
      return;
    }
    updateNParams({ hyperCalibrateOn: !nParamsUI.hyperCalibrateOn });
  };

  const finishHyperCali2Calibration = () => {
    stopHyperCali2Timer();
    const capture = hyperCal2Ref.current;
    const profile = buildHyperCali2Profile(capture.moves, capture.clicks, capture.captureMs);
    updateNParams({
      hyperCali2Ready: true,
      hyperCali2On: true,
      hyperCali2Weights64: profile.weights as number[],
      hyperCali2PitchOffsets: profile.pitchOffsets,
    });
    setHyperCalib2UI({
      running: false,
      moveCount: capture.moves.length,
      clickCount: capture.clicks.length,
      doneAt: performance.now(),
    });
  };

  const startHyperCali2Calibration = () => {
    stopHyperCali2Timer();
    hyperCal2Ref.current = {
      moves: [],
      clicks: [],
      startAt: performance.now(),
      captureMs: 12000,
    };
    setHyperCalib2UI({ running: true, moveCount: 0, clickCount: 0, doneAt: 0 });
    updateNParams({ hyperCali2On: false });
    hyperCal2TimerRef.current = window.setTimeout(() => {
      finishHyperCali2Calibration();
    }, hyperCal2Ref.current.captureMs);
  };

  const registerHyperCali2Move = (x: number, y: number) => {
    if (!hyperCalib2UI.running) return;
    const now = performance.now();
    const capture = hyperCal2Ref.current;
    capture.moves.push({ t: now, x, y });
    if (capture.moves.length > 2800) {
      capture.moves.splice(0, capture.moves.length - 2800);
    }
    if (capture.moves.length % 16 === 0) {
      setHyperCalib2UI((prev) =>
        prev.running ? { ...prev, moveCount: capture.moves.length } : prev,
      );
    }
  };

  const registerHyperCali2Click = (x: number, y: number) => {
    if (!hyperCalib2UI.running) return;
    const now = performance.now();
    const capture = hyperCal2Ref.current;
    capture.clicks.push({ t: now, x, y });
    setHyperCalib2UI((prev) =>
      prev.running ? { ...prev, clickCount: capture.clicks.length } : prev,
    );
  };

  const handleHyperCali2Button = () => {
    if (hyperCalib2UI.running) {
      finishHyperCali2Calibration();
      return;
    }
    if (!nParamsUI.hyperCali2Ready) {
      startHyperCali2Calibration();
      return;
    }
    updateNParams({ hyperCali2On: !nParamsUI.hyperCali2On });
  };

  return {
    hyperCalibUI,
    hyperCalib2UI,
    startHyperCalibration,
    registerHyperCalibrationTap,
    handleHyperCalibrateButton,
    handleHyperCali2Button,
    registerHyperCali2Move,
    registerHyperCali2Click,
    stopHyperCali2Timer,
  };
}
