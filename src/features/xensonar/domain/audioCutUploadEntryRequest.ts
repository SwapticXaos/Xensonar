import { dispatchXensonarEvent, XENSONAR_EVENT_NAMES } from '../runtime/xensonarEventChannels';

export const AUDIO_CUT_UPLOAD_EVENT = XENSONAR_EVENT_NAMES.spectralForgeAudioCutUpload;

export const AUDIO_CUT_UPLOAD_SOURCES = {
  MATERIAL_TRACK_MANAGER: 'material-track-manager',
  ROOT_FOLLOW_MANAGER: 'root-follow-manager',
  MASTER_RECORDING_RACK: 'master-recording-rack',
} as const;

export type AudioCutUploadSource = typeof AUDIO_CUT_UPLOAD_SOURCES[keyof typeof AUDIO_CUT_UPLOAD_SOURCES];

export type AudioCutUploadEventDetail = {
  file: File;
  source: AudioCutUploadSource;
  requestedAt: number;
};

export type AudioCutUploadEntryRequest = {
  eventType: typeof AUDIO_CUT_UPLOAD_EVENT;
  detail: AudioCutUploadEventDetail;
};

export function createAudioCutUploadEntryRequest(
  file: File,
  source: AudioCutUploadSource,
  requestedAt = Date.now(),
): AudioCutUploadEntryRequest {
  return {
    eventType: AUDIO_CUT_UPLOAD_EVENT,
    detail: {
      file,
      source,
      requestedAt,
    },
  };
}

export function dispatchAudioCutUploadEntryRequest(
  request: AudioCutUploadEntryRequest,
  target?: Window,
) {
  if (typeof window !== 'undefined' && target && target !== window) {
    target.dispatchEvent(new CustomEvent<AudioCutUploadEventDetail>(request.eventType, { detail: request.detail }));
    return;
  }
  dispatchXensonarEvent('spectralForgeAudioCutUpload', request.detail);
}
