import type { MaterialEntry } from '../../l3lab/materialLibrary';
import {
  markLiveRuntimeResourceFailed,
  markLiveRuntimeResourceReleased,
  registerLiveRuntimeResource,
  snapshotLiveRuntimeDisposalRegistry,
} from '../runtime/liveRuntimeDisposalRegistry';
import type { LiveRuntimeDisposalRegistrySnapshot, LiveRuntimeResourceSnapshotEntry } from '../runtime/liveRuntimeDisposalRegistryTypes';

export const MATERIAL_TRACK_AUDIO_SOURCE_RESOURCE_ID = 'material-track:active-audio-source';
export const MATERIAL_TRACK_GAIN_NODE_RESOURCE_ID = 'material-track:active-gain-node';
export const MATERIAL_TRACK_AUDIO_SOURCE_LABEL = 'material-track.audio-source';
export const MATERIAL_TRACK_GAIN_NODE_LABEL = 'material-track.gain-node';
export const MATERIAL_TRACK_CACHE_ENTRY_LABEL = 'material-track.cache-entry';

function safeEntryLabel(entry: Pick<MaterialEntry, 'name' | 'id'>) {
  return String(entry.name || entry.id || 'material').slice(0, 96);
}

export function materialTrackCacheEntryResourceId(entryId: string) {
  return `material-track:cache-entry:${entryId}`;
}

export function registerMaterialTrackCacheEntry(entry: MaterialEntry, buffer: AudioBuffer) {
  return registerLiveRuntimeResource({
    id: materialTrackCacheEntryResourceId(entry.id),
    kind: 'cache',
    subsystem: 'material-track',
    label: MATERIAL_TRACK_CACHE_ENTRY_LABEL,
    owner: 'material/materialTrackLifecycleRegistry.registerMaterialTrackCacheEntry',
    meta: {
      materialId: entry.id,
      materialName: safeEntryLabel(entry),
      durationSec: Number.isFinite(buffer.duration) ? Number(buffer.duration.toFixed(4)) : null,
      channels: buffer.numberOfChannels,
      sampleRate: buffer.sampleRate,
    },
  });
}

export function markMaterialTrackCacheEntryReleased(entryId: string, reason = 'material-track-cache-entry-released') {
  return markLiveRuntimeResourceReleased(materialTrackCacheEntryResourceId(entryId), reason);
}

export function markMaterialTrackAllCacheEntriesReleased(
  cache: Map<string, AudioBuffer>,
  reason = 'material-track-cache-cleared',
) {
  let released = 0;
  for (const entryId of cache.keys()) {
    if (markMaterialTrackCacheEntryReleased(entryId, reason)) released += 1;
  }
  return released;
}

export function registerMaterialTrackAudioSource(args: {
  entry: MaterialEntry;
  loopStart: number;
  loopEnd: number;
  playbackRate: number;
  startAt: number;
  syncToBeat: boolean;
}) {
  const { entry, loopStart, loopEnd, playbackRate, startAt, syncToBeat } = args;
  return registerLiveRuntimeResource({
    id: MATERIAL_TRACK_AUDIO_SOURCE_RESOURCE_ID,
    kind: 'audio-source',
    subsystem: 'material-track',
    label: MATERIAL_TRACK_AUDIO_SOURCE_LABEL,
    owner: 'material/materialTrackLifecycleRegistry.registerMaterialTrackAudioSource',
    meta: {
      materialId: entry.id,
      materialName: safeEntryLabel(entry),
      loopStart: Number(loopStart.toFixed(4)),
      loopEnd: Number(loopEnd.toFixed(4)),
      playbackRate: Number(playbackRate.toFixed(4)),
      startAt: Number(startAt.toFixed(4)),
      syncToBeat,
    },
  });
}

export function registerMaterialTrackGainNode(entry: MaterialEntry, volume: number) {
  return registerLiveRuntimeResource({
    id: MATERIAL_TRACK_GAIN_NODE_RESOURCE_ID,
    kind: 'audio-node',
    subsystem: 'material-track',
    label: MATERIAL_TRACK_GAIN_NODE_LABEL,
    owner: 'material/materialTrackLifecycleRegistry.registerMaterialTrackGainNode',
    meta: {
      materialId: entry.id,
      materialName: safeEntryLabel(entry),
      volume: Number(volume.toFixed(4)),
    },
  });
}

export function markMaterialTrackAudioSourceReleased(reason = 'material-track-audio-source-released') {
  return markLiveRuntimeResourceReleased(MATERIAL_TRACK_AUDIO_SOURCE_RESOURCE_ID, reason);
}

export function markMaterialTrackGainNodeReleased(reason = 'material-track-gain-node-released') {
  return markLiveRuntimeResourceReleased(MATERIAL_TRACK_GAIN_NODE_RESOURCE_ID, reason);
}

export function markMaterialTrackPlaybackNodesReleased(reason = 'material-track-playback-nodes-released') {
  return {
    source: markMaterialTrackAudioSourceReleased(reason),
    gain: markMaterialTrackGainNodeReleased(reason),
  };
}

export function markMaterialTrackPlaybackFailed(entry: MaterialEntry | null | undefined, reason = 'material-track-playback-failed') {
  markLiveRuntimeResourceFailed({
    id: entry ? `material-track:playback-failed:${entry.id}` : undefined,
    kind: 'audio-source',
    subsystem: 'material-track',
    label: MATERIAL_TRACK_AUDIO_SOURCE_LABEL,
    owner: 'material/materialTrackLifecycleRegistry.markMaterialTrackPlaybackFailed',
    reason,
  });
}

export type MaterialTrackLifecycleRegistrySummary = {
  active: number;
  released: number;
  replaced: number;
  unknown: number;
  failed: number;
  activeAudioSources: number;
  activeGainNodes: number;
  activeCacheEntries: number;
  activeResources: LiveRuntimeResourceSnapshotEntry[];
  recent: LiveRuntimeResourceSnapshotEntry[];
};

function isMaterialTrackResource(entry: LiveRuntimeResourceSnapshotEntry) {
  return entry.subsystem === 'material-track';
}

function countKind(entries: LiveRuntimeResourceSnapshotEntry[], kind: LiveRuntimeResourceSnapshotEntry['kind']) {
  return entries.filter((entry) => entry.kind === kind).length;
}

export function summarizeMaterialTrackLifecycleRegistry(
  snapshot: LiveRuntimeDisposalRegistrySnapshot = snapshotLiveRuntimeDisposalRegistry(),
): MaterialTrackLifecycleRegistrySummary {
  const activeResources = snapshot.activeResources.filter(isMaterialTrackResource);
  const recent = snapshot.recent.filter(isMaterialTrackResource);
  return {
    active: activeResources.length,
    released: recent.filter((entry) => entry.status === 'released').length,
    replaced: recent.filter((entry) => entry.status === 'replaced').length,
    unknown: recent.filter((entry) => entry.status === 'unknown').length,
    failed: recent.filter((entry) => entry.status === 'failed').length,
    activeAudioSources: countKind(activeResources, 'audio-source'),
    activeGainNodes: countKind(activeResources, 'audio-node'),
    activeCacheEntries: countKind(activeResources, 'cache'),
    activeResources,
    recent: recent.slice(-40),
  };
}
