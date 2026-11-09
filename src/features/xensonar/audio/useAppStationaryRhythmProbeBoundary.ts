import { useStationaryRhythmPatternSnapshotInput } from "./useStationaryRhythmPatternSnapshotInput";
import { useStationaryRhythmWorkletProbeController } from "./useStationaryRhythmWorkletProbeController";

export type AppStationaryRhythmProbeUiState = {
  drumActive: boolean;
  drumPattern: string;
  drumVolume: number;
  bassActive: boolean;
  bassPatternMode: string;
  bassPattern: string;
  bassClipId?: string | null;
  bassVolume: number;
  bassRootMode: string;
  bassRootHz: number;
};

export type AppStationaryRhythmProbeBoundaryOptions = {
  ui: AppStationaryRhythmProbeUiState;
  tempoBpm: number;
  ensureAudioReady: () => Promise<AudioContext>;
  resolveDestination: (ctx: AudioContext) => AudioNode;
};

/**
 * Keeps the archived stationary-rhythm worklet probe wiring out of App.tsx.
 *
 * This boundary intentionally owns only the cold diagnostic probe adapter:
 * pattern snapshot shaping + inert probe controller. It must not grow into
 * rhythm scheduling, Wellenstarter orchestration, AudioEngine preview, or
 * Carrier/Pitch semantics.
 */
export function useAppStationaryRhythmProbeBoundary({
  ui,
  tempoBpm,
  ensureAudioReady,
  resolveDestination,
}: AppStationaryRhythmProbeBoundaryOptions) {
  const {
    input: stationaryRhythmPatternSnapshotInput,
    key: stationaryRhythmPatternSnapshotKey,
  } = useStationaryRhythmPatternSnapshotInput(ui, tempoBpm);

  return useStationaryRhythmWorkletProbeController({
    tempoBpm,
    ensureAudioReady,
    resolveDestination,
    patternSnapshotInput: stationaryRhythmPatternSnapshotInput,
    patternSnapshotKey: stationaryRhythmPatternSnapshotKey,
  });
}
