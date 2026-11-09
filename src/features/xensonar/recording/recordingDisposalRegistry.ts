import {
  markLiveRuntimeResourceFailed,
  markLiveRuntimeResourceReleased,
  registerLiveRuntimeResource,
  snapshotLiveRuntimeDisposalRegistry,
} from '../runtime/liveRuntimeDisposalRegistry';
import type { LiveRuntimeDisposalRegistrySnapshot, LiveRuntimeResourceSnapshotEntry } from '../runtime/liveRuntimeDisposalRegistryTypes';
import type { RecordingSourceMode } from '../domain/runtimeTypes';

export const RECORDING_MEDIA_RECORDER_RESOURCE_ID = 'recording:media-recorder';
export const RECORDING_MAX_DURATION_TIMEOUT_RESOURCE_ID = 'recording:max-duration-timeout';
export const RECORDING_DURATION_DISPLAY_TICK_RESOURCE_ID = 'recording:duration-display-second-tick';
export const RECORDING_PREVIEW_PLAYHEAD_RAF_RESOURCE_ID = 'recording:preview-playhead-raf';
export const RECORDING_MARKER_HOTKEY_LISTENER_RESOURCE_ID = 'recording:marker-hotkey-listener';

export function recordingPreviewObjectUrlResourceId(url: string) {
  return `recording:object-url:${url}`;
}

export function recordingDownloadObjectUrlResourceId(url: string) {
  return `recording:download-object-url:${url}`;
}

export function registerRecordingPreviewObjectUrl(url: string, blob: Blob) {
  return registerLiveRuntimeResource({
    id: recordingPreviewObjectUrlResourceId(url),
    kind: 'object-url',
    subsystem: 'recording',
    label: 'recording.preview.object-url',
    owner: 'recording/recordingDisposalRegistry.registerRecordingPreviewObjectUrl',
    meta: {
      size: blob.size,
      type: blob.type || 'unknown',
    },
  });
}

export function markRecordingPreviewObjectUrlReleased(url: string | null | undefined, reason = 'recording-preview-object-url-revoked') {
  if (!url) return false;
  return markLiveRuntimeResourceReleased(recordingPreviewObjectUrlResourceId(url), reason);
}

export function registerRecordingDownloadObjectUrl(url: string, blob: Blob, filename: string, revokeDelayMs: number) {
  return registerLiveRuntimeResource({
    id: recordingDownloadObjectUrlResourceId(url),
    kind: 'object-url',
    subsystem: 'recording',
    label: 'recording.download.object-url',
    owner: 'recording/recordingDisposalRegistry.registerRecordingDownloadObjectUrl',
    meta: {
      filename,
      size: blob.size,
      type: blob.type || 'unknown',
      revokeDelayMs,
    },
  });
}

export function markRecordingDownloadObjectUrlReleased(url: string | null | undefined, reason = 'recording-download-object-url-revoked') {
  if (!url) return false;
  return markLiveRuntimeResourceReleased(recordingDownloadObjectUrlResourceId(url), reason);
}

export function registerRecordingDurationDisplaySecondTick() {
  return registerLiveRuntimeResource({
    id: RECORDING_DURATION_DISPLAY_TICK_RESOURCE_ID,
    kind: 'interval',
    subsystem: 'recording',
    label: 'recording.duration.display-second-tick',
    owner: 'recording/recordingDisposalRegistry.registerRecordingDurationDisplaySecondTick',
    meta: {
      visibleResolutionMs: 1000,
      pollIntervalMs: 1000,
    },
  });
}

export function registerRecordingPreviewPlayheadRaf(hasPreviewUrl: boolean) {
  return registerLiveRuntimeResource({
    id: RECORDING_PREVIEW_PLAYHEAD_RAF_RESOURCE_ID,
    kind: 'animation-frame',
    subsystem: 'recording',
    label: 'recording.preview.playhead-raf',
    owner: 'recording/recordingDisposalRegistry.registerRecordingPreviewPlayheadRaf',
    meta: { hasPreviewUrl },
  });
}

export function registerRecordingMarkerHotkeyListener() {
  return registerLiveRuntimeResource({
    id: RECORDING_MARKER_HOTKEY_LISTENER_RESOURCE_ID,
    kind: 'event-listener',
    subsystem: 'recording',
    label: 'recording.marker.hotkey-listener',
    owner: 'recording/recordingDisposalRegistry.registerRecordingMarkerHotkeyListener',
    meta: { event: 'keydown' },
  });
}

export function registerRecordingMediaRecorder(mode: RecordingSourceMode, mimeType: string) {
  return registerLiveRuntimeResource({
    id: RECORDING_MEDIA_RECORDER_RESOURCE_ID,
    kind: 'media-recorder',
    subsystem: 'recording',
    label: 'recording.media-recorder',
    owner: 'recording/recordingDisposalRegistry.registerRecordingMediaRecorder',
    meta: { sourceMode: mode, mimeType: mimeType || 'default' },
  });
}

export function markRecordingMediaRecorderReleased(reason = 'recording-media-recorder-released') {
  return markLiveRuntimeResourceReleased(RECORDING_MEDIA_RECORDER_RESOURCE_ID, reason);
}

export function markRecordingMediaRecorderFailed(reason = 'recording-media-recorder-failed') {
  markLiveRuntimeResourceFailed({
    id: `${RECORDING_MEDIA_RECORDER_RESOURCE_ID}:failed`,
    kind: 'media-recorder',
    subsystem: 'recording',
    label: 'recording.media-recorder',
    owner: 'recording/recordingDisposalRegistry.markRecordingMediaRecorderFailed',
    reason,
  });
}

export function registerRecordingMaxDurationTimeout(maxRecordingMs: number) {
  return registerLiveRuntimeResource({
    id: RECORDING_MAX_DURATION_TIMEOUT_RESOURCE_ID,
    kind: 'timeout',
    subsystem: 'recording',
    label: 'recording.max-duration-timeout',
    owner: 'recording/recordingDisposalRegistry.registerRecordingMaxDurationTimeout',
    meta: { maxRecordingMs },
  });
}

export function markRecordingMaxDurationTimeoutReleased(reason = 'recording-max-duration-timeout-released') {
  return markLiveRuntimeResourceReleased(RECORDING_MAX_DURATION_TIMEOUT_RESOURCE_ID, reason);
}

export type RecordingDisposalRegistrySummary = {
  active: number;
  released: number;
  replaced: number;
  unknown: number;
  failed: number;
  activeObjectUrls: number;
  activeAnimationFrames: number;
  activeTimeouts: number;
  activeMediaRecorders: number;
  activeListeners: number;
  activeResources: LiveRuntimeResourceSnapshotEntry[];
  recent: LiveRuntimeResourceSnapshotEntry[];
};

function isRecordingResource(entry: LiveRuntimeResourceSnapshotEntry) {
  return entry.subsystem === 'recording';
}

function countKind(entries: LiveRuntimeResourceSnapshotEntry[], kind: LiveRuntimeResourceSnapshotEntry['kind']) {
  return entries.filter((entry) => entry.kind === kind).length;
}

export function summarizeRecordingDisposalRegistry(snapshot: LiveRuntimeDisposalRegistrySnapshot = snapshotLiveRuntimeDisposalRegistry()): RecordingDisposalRegistrySummary {
  const activeResources = snapshot.activeResources.filter(isRecordingResource);
  const recent = snapshot.recent.filter(isRecordingResource);
  return {
    active: activeResources.length,
    released: recent.filter((entry) => entry.status === 'released').length,
    replaced: recent.filter((entry) => entry.status === 'replaced').length,
    unknown: recent.filter((entry) => entry.status === 'unknown').length,
    failed: recent.filter((entry) => entry.status === 'failed').length,
    activeObjectUrls: countKind(activeResources, 'object-url'),
    activeAnimationFrames: countKind(activeResources, 'animation-frame'),
    activeTimeouts: countKind(activeResources, 'timeout'),
    activeMediaRecorders: countKind(activeResources, 'media-recorder'),
    activeListeners: countKind(activeResources, 'event-listener'),
    activeResources,
    recent: recent.slice(-40),
  };
}
