import { type MutableRefObject, useEffect, useRef } from "react";
import { type Room } from "../../app/roomRegistry";
import { type ResonanceState } from "./config/state";
import { getGridSlice, getSimulationSlice } from "./config/stateSlices";
import { useRoomInput, type InputLogEntry } from "../../shared/input/useRoomInput";
import type { GridTuning } from "../../shared/tuning/grid";
import type { KeymapRegistryRef } from "../input/useInputRouter";
import type { NexusArrowRef, NexusRuntimeRefsRef } from "./resonanceRefs";
import { setKeyboardCursorPitch, stepKeyboardGridCursor } from "./resonanceCursorControl";
import {
  RESONANCE_KEYDOWN_MAP,
  RESONANCE_KEYUP_MAP,
  SET_ROOT_FROM_CURSOR_KEY,
  type PulseDirection,
} from "./resonanceKeymap";
import {
  handleWaveOctaveBoostKeyDown,
  handleWaveOctaveBoostKeyUp,
  setWaveDriveHeld,
} from "./resonanceWavePerformance";

/** Full resonance state ref; input reads via state slices (vision §6, CORE §3.1). */
type NexusParamsRef = MutableRefObject<ResonanceState>;

type UseResonanceInputArgs = {
  room: Room;
  nexusParamsRef: NexusParamsRef;
  nexusRefs: NexusRuntimeRefsRef;
  nexusArrowRef: NexusArrowRef;
  gameHeight: number;
  yFromFreq: (freq: number) => number;
  snapYToGrid: (y: number, base: number, tuning: GridTuning) => number;
  descendingGridFrequency: (base: number, tuning: GridTuning, stepDown: number) => number | null;
  stepYToGrid: (currentY: number, direction: 1 | -1, base: number, tuning: GridTuning) => number;
  triggerQuantizedSectorPulse: (
    direction: PulseDirection,
    mode?: "one_shot" | "persistent",
  ) => void;
  toggleNexusAgent: (index: number) => void;
  armWaveImpactDecay: () => void;
  /** Set global harmonic root from current cursor pitch (Shift+R). When provided, key is active. */
  setGlobalRootFromCursor?: () => void;
  /** Trigger an immediate particle note at the given frequency (vision §3: keyboard playability). When provided, pitch keys also play a note. */
  triggerKeyboardPitch?: (freq: number) => void;
  onInputEvent?: (entry: InputLogEntry) => void;
  /** When provided, RESONANCE registers with global input router (vision §8). */
  keymapRegistryRef?: KeymapRegistryRef;
};

export function useResonanceInput({
  room,
  nexusParamsRef,
  nexusRefs,
  nexusArrowRef,
  gameHeight,
  yFromFreq,
  snapYToGrid,
  descendingGridFrequency,
  stepYToGrid,
  triggerQuantizedSectorPulse,
  toggleNexusAgent,
  armWaveImpactDecay,
  setGlobalRootFromCursor,
  triggerKeyboardPitch,
  onInputEvent,
  keymapRegistryRef,
}: UseResonanceInputArgs) {
  const normalizeKey = (event: KeyboardEvent) => {
    if (
      event.key === "ArrowLeft" ||
      event.key === "ArrowRight" ||
      event.key === "ArrowUp" ||
      event.key === "ArrowDown"
    ) {
      return event.key;
    }
    if (event.key === " ") return "space";
    return event.key.toLowerCase();
  };

  const latestRef = useRef({
    nexusParamsRef,
    nexusRefs,
    nexusArrowRef,
    gameHeight,
    yFromFreq,
    snapYToGrid,
    descendingGridFrequency,
    stepYToGrid,
    triggerQuantizedSectorPulse,
    toggleNexusAgent,
    armWaveImpactDecay,
    setGlobalRootFromCursor,
    triggerKeyboardPitch,
  });

  latestRef.current = {
    nexusParamsRef,
    nexusRefs,
    nexusArrowRef,
    gameHeight,
    yFromFreq,
    snapYToGrid,
    descendingGridFrequency,
    stepYToGrid,
    triggerQuantizedSectorPulse,
    toggleNexusAgent,
    armWaveImpactDecay,
    setGlobalRootFromCursor,
    triggerKeyboardPitch,
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const key = normalizeKey(event);
    if (key === SET_ROOT_FROM_CURSOR_KEY && event.shiftKey && latestRef.current.setGlobalRootFromCursor) {
      event.preventDefault();
      latestRef.current.setGlobalRootFromCursor();
      return;
    }
    const entry = RESONANCE_KEYDOWN_MAP[key];
    if (!entry) return;

    const latest = latestRef.current;
    const grid = getGridSlice(latest.nexusParamsRef);
    const sim = getSimulationSlice(latest.nexusParamsRef);

    switch (entry.action) {
      case "cursor": {
        event.preventDefault();
        const dir = entry.dir;
        if (dir === "left") latest.nexusArrowRef.current.left = true;
        if (dir === "right") latest.nexusArrowRef.current.right = true;
        if (dir === "up") {
          latest.nexusArrowRef.current.up = true;
          if (grid.lockCursorToGrid) {
            stepKeyboardGridCursor(latest.nexusRefs.current, 1, {
              lockCursorToGrid: grid.lockCursorToGrid,
              gridBase: grid.gridBase,
              gridTuning: grid.gridTuning,
              gameHeight: latest.gameHeight,
              snapYToGrid: latest.snapYToGrid,
              stepYToGrid: latest.stepYToGrid,
            });
          }
        }
        if (dir === "down") {
          latest.nexusArrowRef.current.down = true;
          if (grid.lockCursorToGrid) {
            stepKeyboardGridCursor(latest.nexusRefs.current, -1, {
              lockCursorToGrid: grid.lockCursorToGrid,
              gridBase: grid.gridBase,
              gridTuning: grid.gridTuning,
              gameHeight: latest.gameHeight,
              snapYToGrid: latest.snapYToGrid,
              stepYToGrid: latest.stepYToGrid,
            });
          }
        }
        return;
      }
      case "sectorPulse": {
        event.preventDefault();
        latest.armWaveImpactDecay();
        latest.triggerQuantizedSectorPulse(entry.dir, entry.persistent ? "persistent" : "one_shot");
        return;
      }
      case "pitch": {
        const freq = latest.descendingGridFrequency(grid.gridBase, grid.gridTuning, entry.index);
        if (freq != null) {
          event.preventDefault();
          if (!event.repeat && latest.triggerKeyboardPitch) {
            latest.triggerKeyboardPitch(freq);
          }
          setKeyboardCursorPitch(
            latest.nexusRefs.current,
            latest.yFromFreq(freq),
            { lockCursorToGrid: grid.lockCursorToGrid, gameHeight: latest.gameHeight },
          );
        }
        return;
      }
      case "agentToggle": {
        if (!event.repeat && entry.index < sim.agentEnabled.length) {
          event.preventDefault();
          latest.toggleNexusAgent(entry.index);
        }
        return;
      }
      case "waveOctaveBoost": {
        event.preventDefault();
        if (event.repeat) return;
        handleWaveOctaveBoostKeyDown(latest.nexusRefs.current, performance.now());
        return;
      }
      case "waveDrive": {
        event.preventDefault();
        setWaveDriveHeld(latest.nexusRefs.current, true);
        return;
      }
    }
  };

  const onKeyUp = (event: KeyboardEvent) => {
    const key = normalizeKey(event);
    const entry = RESONANCE_KEYUP_MAP[key];
    if (!entry) return;
    const latest = latestRef.current;
    switch (entry.action) {
      case "cursor":
        if (entry.dir === "left") latest.nexusArrowRef.current.left = false;
        if (entry.dir === "right") latest.nexusArrowRef.current.right = false;
        if (entry.dir === "up") latest.nexusArrowRef.current.up = false;
        if (entry.dir === "down") latest.nexusArrowRef.current.down = false;
        return;
      case "waveOctaveBoost":
        handleWaveOctaveBoostKeyUp(latest.nexusRefs.current);
        return;
      case "waveDrive":
        setWaveDriveHeld(latest.nexusRefs.current, false);
        return;
    }
  };

  useEffect(() => {
    if (room !== "RESONANCE" || !keymapRegistryRef) return;
    keymapRegistryRef.current["RESONANCE"] = { onKeyDown, onKeyUp };
    return () => {
      delete keymapRegistryRef.current["RESONANCE"];
    };
  }, [room, keymapRegistryRef]);

  useRoomInput(
    room,
    "RESONANCE",
    { onKeyDown, onKeyUp },
    onInputEvent ? { onInputEvent, useRouter: !!keymapRegistryRef } : { useRouter: !!keymapRegistryRef },
  );
}
