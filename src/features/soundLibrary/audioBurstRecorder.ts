import type { AudioEventIntakeState, AudioTapPoint } from './audioEventIntake';
import type { AudioTapMonitorSummary } from './audioTapDiagnostics';

export type AudioBurstRecorderEntry =
  | {
      kind: 'snapshot';
      wallClockIso: string;
      perfNowMs: number;
      audioNowSec: number;
      room: string;
      taps: AudioTapMonitorSummary['taps'];
      hottestTap: AudioTapPoint | null;
      diagnosis: string;
      activeVoices: number;
      materialLoopActive: boolean;
      waveSoundEnabled: boolean;
      liveMasteringEnabled: boolean;
      liveMasterMonitor: {
        main: number;
        drone: number;
        rhythm: number;
        space: number;
        trim: number;
      };
      eventIntake: Pick<AudioEventIntakeState, 'pendingIntents' | 'latestDecisions'>;
      audioTraffic?: unknown;
    }
  | {
      kind: 'marker';
      wallClockIso: string;
      perfNowMs: number;
      audioNowSec: number | null;
      room: string;
      marker: 'backspace';
      targetTag: string | null;
      targetRole: string | null;
      note: string;
      taps: AudioTapMonitorSummary['taps'];
      hottestTap: AudioTapPoint | null;
      diagnosis: string;
      audioTraffic?: unknown;
    };

export type AudioBurstRecorderState = {
  isRecording: boolean;
  startedAtIso: string | null;
  entries: AudioBurstRecorderEntry[];
  markerCount: number;
};

export const createEmptyAudioBurstRecorderState = (): AudioBurstRecorderState => ({
  isRecording: false,
  startedAtIso: null,
  entries: [],
  markerCount: 0,
});

export const appendAudioBurstRecorderEntry = (
  state: AudioBurstRecorderState,
  entry: AudioBurstRecorderEntry,
  maxEntries = 4800,
): AudioBurstRecorderState => ({
  ...state,
  entries: [...state.entries, entry].slice(-maxEntries),
  markerCount: state.markerCount + (entry.kind === 'marker' ? 1 : 0),
});

export const createAudioBurstRecorderLogPayload = (
  state: AudioBurstRecorderState,
  metadata: Record<string, unknown> = {},
) => ({
  exportedAtIso: new Date().toISOString(),
  startedAtIso: state.startedAtIso,
  entryCount: state.entries.length,
  markerCount: state.markerCount,
  metadata,
  entries: state.entries,
});

export const downloadAudioBurstRecorderLog = (
  state: AudioBurstRecorderState,
  metadata: Record<string, unknown> = {},
) => {
  const payload = createAudioBurstRecorderLogPayload(state, metadata);
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  const suggestedFilename = typeof metadata.suggestedFilename === 'string' && metadata.suggestedFilename.endsWith('.json')
    ? metadata.suggestedFilename
    : `xensonar-burst-log-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  anchor.download = suggestedFilename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};
