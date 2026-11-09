import {
  markLiveRuntimeResourceFailed,
  markLiveRuntimeResourceReleased,
  registerLiveRuntimeResource,
  snapshotLiveRuntimeDisposalRegistry,
} from '../../../xensonar/runtime/liveRuntimeDisposalRegistry';
import type { LiveRuntimeDisposalRegistrySnapshot, LiveRuntimeResourceSnapshotEntry } from '../../../xensonar/runtime/liveRuntimeDisposalRegistryTypes';
import type { AudioSourceAsset } from '../audio/AudioImporter';

export const SPECTRAL_FORGE_MAIN_SOURCE_ASSET_RESOURCE_ID = 'spectral-forge:source-asset:main';
export const SPECTRAL_FORGE_EMBODIMENT_SOURCE_ASSET_RESOURCE_ID = 'spectral-forge:source-asset:embodiment';
export const SPECTRAL_FORGE_PREVIEW_AUDIO_SOURCE_RESOURCE_ID = 'spectral-forge:preview-audio-source';
export const SPECTRAL_FORGE_PREVIEW_RAF_RESOURCE_ID = 'spectral-forge:preview-position-raf';

export const SPECTRAL_FORGE_SOURCE_ASSET_LABEL = 'spectral-forge.source-asset';
export const SPECTRAL_FORGE_PREVIEW_AUDIO_SOURCE_LABEL = 'spectral-forge.preview.audio-source';
export const SPECTRAL_FORGE_PREVIEW_RAF_LABEL = 'spectral-forge.preview.position-raf';
export const SPECTRAL_FORGE_DOWNLOAD_OBJECT_URL_LABEL = 'spectral-forge.download.object-url';
export const SPECTRAL_FORGE_IMAGE_OBJECT_URL_LABEL = 'spectral-forge.image.object-url';

export type SpectralForgeSourceAssetContext = 'main' | 'embodiment';

function safeNumber(value: number | null | undefined, digits = 4) {
  return Number.isFinite(value) ? Number((value as number).toFixed(digits)) : null;
}

function safeSourceAssetMeta(sourceAsset: AudioSourceAsset | null | undefined) {
  if (!sourceAsset) return undefined;
  return {
    fileName: sourceAsset.fileName,
    sampleRate: sourceAsset.sampleRate,
    originalDuration: safeNumber(sourceAsset.originalDuration),
    importStartSec: safeNumber(sourceAsset.importStartSec),
    importDurationSec: safeNumber(sourceAsset.importDurationSec),
    samples: sourceAsset.monoSamples?.length ?? null,
  };
}

function sourceAssetResourceId(context: SpectralForgeSourceAssetContext) {
  return context === 'embodiment'
    ? SPECTRAL_FORGE_EMBODIMENT_SOURCE_ASSET_RESOURCE_ID
    : SPECTRAL_FORGE_MAIN_SOURCE_ASSET_RESOURCE_ID;
}

export function registerSpectralForgeSourceAsset(
  sourceAsset: AudioSourceAsset | null | undefined,
  context: SpectralForgeSourceAssetContext,
) {
  if (!sourceAsset) return null;
  return registerLiveRuntimeResource({
    id: sourceAssetResourceId(context),
    kind: 'source-asset',
    subsystem: 'spectral-forge',
    label: SPECTRAL_FORGE_SOURCE_ASSET_LABEL,
    owner: 'spectralForge/lifecycle.registerSpectralForgeSourceAsset',
    meta: {
      context,
      ...safeSourceAssetMeta(sourceAsset),
    },
  });
}

export function markSpectralForgeSourceAssetReleased(
  context: SpectralForgeSourceAssetContext,
  reason = 'spectral-forge-source-asset-context-released',
) {
  return markLiveRuntimeResourceReleased(sourceAssetResourceId(context), reason);
}

export function registerSpectralForgePreviewAudioSource(meta: {
  mode: string;
  durationSec: number;
  playbackRate: number;
  loopPreview: boolean;
}) {
  return registerLiveRuntimeResource({
    id: SPECTRAL_FORGE_PREVIEW_AUDIO_SOURCE_RESOURCE_ID,
    kind: 'audio-source',
    subsystem: 'spectral-forge',
    label: SPECTRAL_FORGE_PREVIEW_AUDIO_SOURCE_LABEL,
    owner: 'spectralForge/lifecycle.registerSpectralForgePreviewAudioSource',
    meta: {
      mode: meta.mode,
      durationSec: safeNumber(meta.durationSec),
      playbackRate: safeNumber(meta.playbackRate),
      loopPreview: meta.loopPreview,
    },
  });
}

export function markSpectralForgePreviewAudioSourceReleased(reason = 'spectral-forge-preview-source-released') {
  return markLiveRuntimeResourceReleased(SPECTRAL_FORGE_PREVIEW_AUDIO_SOURCE_RESOURCE_ID, reason);
}

export function registerSpectralForgePreviewAnimationFrame(meta: {
  mode: string;
  loopPreview: boolean;
}) {
  return registerLiveRuntimeResource({
    id: SPECTRAL_FORGE_PREVIEW_RAF_RESOURCE_ID,
    kind: 'animation-frame',
    subsystem: 'spectral-forge',
    label: SPECTRAL_FORGE_PREVIEW_RAF_LABEL,
    owner: 'spectralForge/lifecycle.registerSpectralForgePreviewAnimationFrame',
    meta: {
      mode: meta.mode,
      loopPreview: meta.loopPreview,
    },
  });
}

export function markSpectralForgePreviewAnimationFrameReleased(reason = 'spectral-forge-preview-raf-released') {
  return markLiveRuntimeResourceReleased(SPECTRAL_FORGE_PREVIEW_RAF_RESOURCE_ID, reason);
}

export function markSpectralForgePreviewFailed(mode: string, reason = 'spectral-forge-preview-failed') {
  markLiveRuntimeResourceFailed({
    id: `spectral-forge:preview-failed:${mode}:${Date.now()}`,
    kind: 'preview-audio',
    subsystem: 'spectral-forge',
    label: SPECTRAL_FORGE_PREVIEW_AUDIO_SOURCE_LABEL,
    owner: 'spectralForge/lifecycle.markSpectralForgePreviewFailed',
    reason,
  });
}

function objectUrlResourceId(prefix: string, url: string) {
  return `spectral-forge:${prefix}:${url}`;
}

export function registerSpectralForgeDownloadObjectUrl(
  url: string,
  blob: Blob,
  fileName: string,
  owner = 'spectral-forge-download',
) {
  return registerLiveRuntimeResource({
    id: objectUrlResourceId('download-object-url', url),
    kind: 'object-url',
    subsystem: 'spectral-forge',
    label: SPECTRAL_FORGE_DOWNLOAD_OBJECT_URL_LABEL,
    owner,
    meta: {
      fileName,
      size: blob.size,
      type: blob.type || 'unknown',
    },
  });
}

export function markSpectralForgeDownloadObjectUrlReleased(
  url: string | null | undefined,
  reason = 'spectral-forge-download-object-url-revoked',
) {
  if (!url) return false;
  return markLiveRuntimeResourceReleased(objectUrlResourceId('download-object-url', url), reason);
}

export function registerSpectralForgeImageObjectUrl(
  url: string,
  source: Blob,
  purpose: string,
  owner = 'spectral-forge-image-import',
) {
  return registerLiveRuntimeResource({
    id: objectUrlResourceId('image-object-url', url),
    kind: 'object-url',
    subsystem: 'spectral-forge',
    label: SPECTRAL_FORGE_IMAGE_OBJECT_URL_LABEL,
    owner,
    meta: {
      purpose,
      size: source.size,
      type: source.type || 'unknown',
    },
  });
}

export function markSpectralForgeImageObjectUrlReleased(
  url: string | null | undefined,
  reason = 'spectral-forge-image-object-url-revoked',
) {
  if (!url) return false;
  return markLiveRuntimeResourceReleased(objectUrlResourceId('image-object-url', url), reason);
}

export type SpectralForgePreviewLifecycleSummary = {
  active: number;
  released: number;
  replaced: number;
  unknown: number;
  failed: number;
  activeAudioSources: number;
  activeAnimationFrames: number;
  activeObjectUrls: number;
  activeSourceAssets: number;
  activeResources: LiveRuntimeResourceSnapshotEntry[];
  recent: LiveRuntimeResourceSnapshotEntry[];
};

function isSpectralForgeResource(entry: LiveRuntimeResourceSnapshotEntry) {
  return entry.subsystem === 'spectral-forge';
}

function countKind(entries: LiveRuntimeResourceSnapshotEntry[], kind: LiveRuntimeResourceSnapshotEntry['kind']) {
  return entries.filter((entry) => entry.kind === kind).length;
}

export function summarizeSpectralForgePreviewLifecycleRegistry(
  snapshot: LiveRuntimeDisposalRegistrySnapshot = snapshotLiveRuntimeDisposalRegistry(),
): SpectralForgePreviewLifecycleSummary {
  const activeResources = snapshot.activeResources.filter(isSpectralForgeResource);
  const recent = snapshot.recent.filter(isSpectralForgeResource);
  return {
    active: activeResources.length,
    released: recent.filter((entry) => entry.status === 'released').length,
    replaced: recent.filter((entry) => entry.status === 'replaced').length,
    unknown: recent.filter((entry) => entry.status === 'unknown').length,
    failed: recent.filter((entry) => entry.status === 'failed').length,
    activeAudioSources: countKind(activeResources, 'audio-source'),
    activeAnimationFrames: countKind(activeResources, 'animation-frame'),
    activeObjectUrls: countKind(activeResources, 'object-url'),
    activeSourceAssets: countKind(activeResources, 'source-asset'),
    activeResources,
    recent: recent.slice(-40),
  };
}
