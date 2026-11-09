import { useCallback, useMemo } from "react";
import {
  createInitialStationaryRhythmWorkletSnapshot,
  type StationaryRhythmWorkletSnapshot,
} from "./stationaryRhythmWorkletLaneContracts";

export type StationaryRhythmWorkletProbeControllerOptions = {
  tempoBpm: number;
  ensureAudioReady: () => Promise<AudioContext>;
  resolveDestination: (ctx: AudioContext) => AudioNode;
  onStartFailure?: (error: unknown) => void;
  patternSnapshotInput?: unknown;
  patternSnapshotKey?: string | number;
};

export type StationaryRhythmWorkletProbeController = {
  snapshot: StationaryRhythmWorkletSnapshot;
  toggleProbe: () => void;
  requestSnapshot: () => void;
  sendPatternSnapshot: () => void;
};

/**
 * Cold compatibility hook for the archived stationary-rhythm beat probe.
 *
 * The old controller eagerly imported the Worklet bridge, pressure feedback,
 * pattern snapshot assembly and audible probe helpers. That made a historical
 * diagnosis button part of the main audio branch's reachable bundle. The probe
 * is now intentionally inert: App.tsx can keep its merge-stable call-site, but
 * no AudioContext is requested, no Worklet bridge is created, no pressure report
 * is published, and no audible beat probe can be toggled from the app shell.
 */
export function useStationaryRhythmWorkletProbeController(
  _options: StationaryRhythmWorkletProbeControllerOptions,
): StationaryRhythmWorkletProbeController {
  const snapshot = useMemo(
    () => createInitialStationaryRhythmWorkletSnapshot(),
    [],
  );
  const noop = useCallback(() => {}, []);
  return {
    snapshot,
    toggleProbe: noop,
    requestSnapshot: noop,
    sendPatternSnapshot: noop,
  };
}
