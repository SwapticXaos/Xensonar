import * as React from 'react';
/**
 * Single facade for the resonance domain: owns runtime refs, runs orchestrator + runtime,
 * returns only what the shell needs (resonanceRoomProps + nexusCanvasRef).
 * Simplifies App flow and keeps resonance encapsulated (vision §6, CORE §7).
 */

import { useCallback, useMemo, useRef, useState, type ComponentProps, type RefObject } from "react";
import { type Room } from "../../app/roomRegistry";
import type { InputLogEntry } from "../../shared/input/useRoomInput";
import type { KeymapRegistryRef } from "../input/useInputRouter";
import { createTonePlayer } from "../audio";
import { clamp, clampFreq, type GridTuning } from "../../shared/tuning/grid";
import type { EnsureAudio } from "../../shared/audio/audioInit";
import { getQuantizedParticleSlice } from "./config/stateSlices";
import { droneFreqFromY, yFromDroneFreq, type ResonanceState } from "./runtimeConfig";
import { syncPointerDrivenCursor } from "./resonanceCursorControl";
import { useResonanceRefs } from "./resonanceRefs";
import { useResonanceOrchestrator } from "./useResonanceOrchestrator";
import { useResonanceRuntime } from "./useResonanceRuntime";
import { ResonanceRoom } from "./components/ResonanceRoom";

export type UseResonanceArgs = {
  room: Room;
  setRoom: (r: Room) => void;
  audioCtx: AudioContext | null;
  nexusParamsRef: React.MutableRefObject<ResonanceState>;
  nParamsUI: ResonanceState;
  updateNParams: (partial: Partial<ResonanceState>) => void;
  savePreset: () => void;
  loadPreset: () => void;
  initAudio: EnsureAudio;
  enterArenaWorkspace: (startLevel: number) => void;
  gameWidth: number;
  gameHeight: number;
  logInputEvent: (entry: InputLogEntry) => void;
  /** When provided, RESONANCE registers with global input router (vision §8). */
  keymapRegistryRef?: KeymapRegistryRef;
  /** When provided, Resonance room installs goToSignatureIndex and goToRatio so shell/global shortcuts work (vision §3 §5). */
  signatureShortcutRef?: React.MutableRefObject<{ goToSignatureIndex: (i: number) => void; goToRatio?: (ratio: number) => void } | null>;
  /** When shell "Go to interval" was clicked while not in Synth, Resonance consumes this on mount and runs goToSignatureIndex. */
  pendingSignatureRef?: React.MutableRefObject<number | null>;
  /** When shell "Surprise interval" was clicked while not in Synth, Resonance consumes this on mount and moves cursor to ratio. */
  pendingSurpriseRatioRef?: React.MutableRefObject<number | null>;
  gridHelpers: {
    freqFromY: (y: number) => number;
    yFromFreq: (f: number) => number;
    snapYToGrid: (y: number, base: number, tuning: GridTuning) => number;
    descendingGridFrequency: (base: number, tuning: GridTuning, stepDown: number) => number | null;
    stepYToGrid: (currentY: number, direction: 1 | -1, base: number, tuning: GridTuning) => number;
  };
};

export type UseResonanceResult = {
  resonanceRoomProps: ComponentProps<typeof ResonanceRoom>;
  nexusCanvasRef: RefObject<HTMLCanvasElement | null>;
  /** Live cursor interval label when in Resonance with grid on (for shell HUD — vision §5). */
  liveCursorInterval: string;
};

export function useResonance(args: UseResonanceArgs): UseResonanceResult {
  const {
    room,
    setRoom: _setRoom,
    audioCtx,
    nexusParamsRef,
    nParamsUI,
    updateNParams,
    savePreset,
    loadPreset,
    initAudio,
    enterArenaWorkspace,
    gameWidth,
    gameHeight,
    logInputEvent,
    keymapRegistryRef,
    signatureShortcutRef,
    pendingSignatureRef,
    pendingSurpriseRatioRef,
    gridHelpers,
  } = args;

  const [droneVolume, setDroneVolume] = useState(0.36);
  const [nexusActive, setNexusActive] = useState(false);
  const [liveCursorInterval, setLiveCursorInterval] = useState("");
  const liveCursorIntervalPrevRef = useRef("");

  const onLiveCursorIntervalChange = useCallback((label: string) => {
    if (label === liveCursorIntervalPrevRef.current) return;
    liveCursorIntervalPrevRef.current = label;
    setLiveCursorInterval(label);
  }, []);

  const playScheduledTone = useMemo(
    () => createTonePlayer(() => audioCtx),
    [audioCtx],
  );

  const nexusCanvasRef = useRef<HTMLCanvasElement>(null);
  const { nexusRefs, nexusArrowRef } = useResonanceRefs(gameWidth, gameHeight);
  const impactDecayOn = true;

  const {
    applyRealtimeDroneOvertones,
    setDronePreset,
    setSwarmProfile,
    triggerQuantizedSectorPulse,
    toggleNexusAgent,
    setNexusAgentVolume,
    handleHyperCalibrateButton,
    handleHyperCali2Button,
    registerHyperCali2Move,
    registerHyperCali2Click,
    setSwarmCount,
    setParticleSystem,
    setChurchMode,
    playNexusAgentTone,
    armWaveImpactDecay,
    hyperCalibUI,
    hyperCalib2UI,
    waveLaunchAtRef,
    waveImpactDecayRef,
  } = useResonanceOrchestrator({
    audioCtx,
    nexusParamsRef,
    nParamsUI,
    updateNParams,
    nexusRefs,
    droneVolume,
    nexusActive,
    gameWidth,
    gameHeight,
    playScheduledTone,
  });

  /** Set global root (gridBase) from current cursor pitch — harmonic center follows cursor (vision: harmonic first-class). */
  const setGlobalRootFromCursor = useCallback(() => {
    const y = nexusRefs.current.cursorY;
    const freq = droneFreqFromY(y, gameHeight);
    updateNParams({ gridBase: clampFreq(freq) });
  }, [gameHeight, updateNParams]);

  /** Move cursor to a target frequency (for signature-interval recall). Sets keyboardCursorYOverride so the next frame does not overwrite when lockCursorToGrid is on; when grid lock is on, snaps Y to grid. */
  const moveCursorToFreq = useCallback(
    (freq: number) => {
      const grid = nexusParamsRef.current;
      let y = yFromDroneFreq(freq, gameHeight);
      if (grid.lockCursorToGrid) {
        y = gridHelpers.snapYToGrid(y, grid.gridBase, grid.gridTuning);
      }
      y = clamp(y, 0, gameHeight);
      nexusRefs.current.cursorY = y;
      nexusRefs.current.keyboardCursorYOverride = y;
    },
    [gameHeight, gridHelpers, nexusParamsRef, nexusRefs],
  );

  /** Current cursor frequency (for pin-as-signature). */
  const getCurrentCursorFreq = useCallback(
    () => droneFreqFromY(nexusRefs.current.cursorY, gameHeight),
    [gameHeight, nexusRefs],
  );

  /** Trigger an immediate particle note at the given frequency (vision §3: keyboard playability in Resonance). */
  const triggerKeyboardPitch = useCallback(
    (freq: number) => {
      if (!audioCtx) return;
      const q = getQuantizedParticleSlice(nexusParamsRef);
      const preset = q.particlePreset ?? "glass_ping";
      const amp = clamp((q.particleVolume ?? 0.3) * 0.85, 0, 0.6);
      const dueTime = audioCtx.currentTime + 0.01;
      nexusRefs.current.quantizedHitQueue.push({
        dueTime,
        freq: clamp(freq, 40, 4000),
        amp,
        preset,
      });
    },
    [audioCtx, nexusParamsRef, nexusRefs],
  );

  const syncNexusPointerCursor = useCallback((x: number, y: number) => {
    const grid = nexusParamsRef.current;
    return syncPointerDrivenCursor(nexusRefs.current, x, y, {
      lockCursorToGrid: grid.lockCursorToGrid,
      gridBase: grid.gridBase,
      gridTuning: grid.gridTuning,
      gameWidth,
      gameHeight,
      snapYToGrid: gridHelpers.snapYToGrid,
    });
  }, [gameHeight, gameWidth, gridHelpers, nexusParamsRef, nexusRefs]);

  useResonanceRuntime({
    room,
    nexusActive,
    audioCtx,
    nexusParamsRef,
    nexusRefs,
    nexusArrowRef,
    droneVolume,
    ...gridHelpers,
    lockCursorToGrid: nParamsUI.lockCursorToGrid,
    gridBase: nParamsUI.gridBase,
    gridTuning: nParamsUI.gridTuning,
    nParamsParticleVolume: nParamsUI.particleVolume,
    impactDecayOn,
    waveLaunchAtRef,
    waveImpactDecayRef,
    nexusCanvasRef,
    applyRealtimeDroneOvertones,
    playNexusAgentTone,
    clampFreq,
    droneFreqFromY: (y: number) => droneFreqFromY(y, gameHeight),
    yFromDroneFreq: (f: number) => yFromDroneFreq(f, gameHeight),
    triggerQuantizedSectorPulse,
    toggleNexusAgent,
    armWaveImpactDecay,
    setGlobalRootFromCursor,
    triggerKeyboardPitch,
    updateNParams,
    playScheduledTone,
    gameWidth,
    gameHeight,
    onInputEvent: logInputEvent,
    keymapRegistryRef,
    onLiveCursorIntervalChange,
  });

  const resonanceRoomProps: ComponentProps<typeof ResonanceRoom> = {
    nexusCanvasRef,
    nParamsUI,
    setDronePreset,
    updateNParams,
    nexusActive,
    setNexusActive,
    initAudio,
    nexusRefs,
    droneVolume,
    setDroneVolume,
    enterArenaWorkspace,
    triggerSectorPulse: (direction, mode) => triggerQuantizedSectorPulse(direction, mode),
    toggleNexusAgent,
    setNexusAgentVolume,
    hyperCalibUI,
    hyperCalib2UI,
    handleHyperCalibrateButton,
    handleHyperCali2Button,
    registerHyperCali2Move,
    registerHyperCali2Click,
    setSwarmProfile,
    setSwarmCount,
    setParticleSystem,
    setChurchMode,
    savePreset,
    loadPreset,
    setGlobalRootFromCursor,
    syncPointerCursor: syncNexusPointerCursor,
    moveCursorToFreq,
    getCurrentCursorFreq,
    signatureShortcutRef,
    pendingSignatureRef,
    pendingSurpriseRatioRef,
  };

  return { resonanceRoomProps, nexusCanvasRef, liveCursorInterval };
}
