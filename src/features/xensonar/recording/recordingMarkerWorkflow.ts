import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { RecordingMarker, RecordingState } from '../domain/runtimeTypes';
import { appendRecordingMarkerState } from './recordingMarkerState';
import {
  createLogoMarkerPulseId,
  createRecordingMarker,
  createSideMarkerPulseId,
  formatRecordingMarkerMessage,
  type RecordingMarkerSource,
} from './recordingMarkerHelpers';

import type { LogoMarkerPulse, SideMarkerPulse } from './recordingMarkerWorkflowTypes';

export type { LogoMarkerPulse, SideMarkerPulse } from './recordingMarkerWorkflowTypes';

export function triggerLogoMarkerPulse(setLogoMarkerPulses: Dispatch<SetStateAction<LogoMarkerPulse[]>>) {
  const id = createLogoMarkerPulseId();
  setLogoMarkerPulses((prev) => [...prev, { id }]);
  window.setTimeout(() => {
    setLogoMarkerPulses((prev) => prev.filter((pulse) => pulse.id !== id));
  }, 1200);
}

export function triggerSideMarkerPulse(
  side: 'left' | 'right',
  setSideMarkerPulses: Dispatch<SetStateAction<SideMarkerPulse[]>>,
) {
  const id = createSideMarkerPulseId(side);
  setSideMarkerPulses((prev) => [...prev, { id, side }]);
  window.setTimeout(() => {
    setSideMarkerPulses((prev) => prev.filter((pulse) => pulse.id !== id));
  }, 1200);
}

export function addRecordingMarkerWorkflow(args: {
  source?: RecordingMarkerSource;
  isRecording: boolean;
  recordingStartAtRef: MutableRefObject<number | null>;
  recordingMarkersRef: MutableRefObject<RecordingMarker[]>;
  setRecordingMarkers: Dispatch<SetStateAction<RecordingMarker[]>>;
  setRecordingState: Dispatch<SetStateAction<RecordingState>>;
  onLogoPulse?: () => void;
}) {
  const {
    source = 'key',
    isRecording,
    recordingStartAtRef,
    recordingMarkersRef,
    setRecordingMarkers,
    setRecordingState,
    onLogoPulse,
  } = args;

  const startedAt = recordingStartAtRef.current ?? performance.now();
  let accepted = false;

  setRecordingMarkers((prev) => {
    const nextState = appendRecordingMarkerState({
      isRecording,
      startedAt,
      markers: prev,
      source,
      createRecordingMarker,
      formatRecordingMarkerMessage,
    });
    if (!nextState.accepted) return prev;
    accepted = true;
    recordingMarkersRef.current = nextState.nextMarkers;
    setRecordingState((state) => ({
      ...state,
      exportMessage: nextState.message,
    }));
    return nextState.nextMarkers;
  });

  if (!accepted) return false;
  if (source === 'logo') onLogoPulse?.();
  return true;
}
