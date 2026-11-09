import { useMemo } from 'react';
import type { StationaryRhythmPatternSnapshotInput } from './stationaryRhythmPatternSnapshotBridge';

type StationaryRhythmPatternSnapshotUiState = {
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

export function useStationaryRhythmPatternSnapshotInput(
  ui: StationaryRhythmPatternSnapshotUiState,
  tempoBpm: number,
): {
  input: Omit<StationaryRhythmPatternSnapshotInput, 'generation' | 'patternVersion' | 'bpm'>;
  key: string;
} {
  const key = `${ui.drumActive ? 1 : 0}|${ui.drumPattern}|${ui.drumVolume}|${ui.bassActive ? 1 : 0}|${ui.bassPatternMode}|${ui.bassPattern}|${ui.bassClipId ?? '-'}|${ui.bassVolume}|${ui.bassRootMode}|${ui.bassRootHz}|${tempoBpm}`;
  const input = useMemo(
    () => ({
      bars: 1,
      beatsPerBar: 4,
      stepsPerBar: 16,
      drumActive: ui.drumActive,
      bassActive: ui.bassActive,
      drumPattern: ui.drumPattern,
      bassPattern: ui.bassPatternMode === 'clip' ? 'offbeat' : ui.bassPattern,
      bassRootHz: ui.bassRootMode === 'fixed' ? ui.bassRootHz : 55,
      drumVolume: ui.drumVolume,
      bassVolume: ui.bassVolume,
      audibleMinimalVoices: true,
      shadowOnly: true,
    }),
    [
      ui.bassActive,
      ui.bassPattern,
      ui.bassPatternMode,
      ui.bassRootHz,
      ui.bassRootMode,
      ui.bassVolume,
      ui.drumActive,
      ui.drumPattern,
      ui.drumVolume,
    ],
  );
  return { input, key };
}
