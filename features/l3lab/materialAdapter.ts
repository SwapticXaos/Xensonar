import {
  XENSONAR_MATERIAL_SCHEMA_VERSION,
  type XensonarMaterialManifestV1,
  type XensonarMaterialPackageV1,
  type XensonarMaterialRole,
} from './materialSchema';
import type { ExportedMaterialMeta, MaterialEntry } from './materialLibrary';

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '') || 'material';
}

function coerceBpm(meta: ExportedMaterialMeta) {
  if (Number.isFinite(meta.bpm) && meta.bpm > 0) return meta.bpm;
  if (Number.isFinite(meta.tempo16) && (meta.tempo16 ?? 0) > 0) return Math.max(1, (meta.tempo16 as number) / 4);
  return 108;
}

function coerceBars(value: number) {
  return Number.isFinite(value) ? Math.max(1, Math.round(value)) : 1;
}

function coerceLoopBoundary(value: number, fallback: number) {
  return Number.isFinite(value) ? Math.max(0, value) : fallback;
}

export function createMaterialPackageFromExport(meta: ExportedMaterialMeta, blob: Blob): XensonarMaterialPackageV1 {
  const bpm = coerceBpm(meta);
  const bars = coerceBars(meta.bars);
  const nowIso = new Date().toISOString();
  const durationSec = Number.isFinite(meta.durationSec) ? Math.max(0, meta.durationSec) : undefined;
  const safeLoopEnd = coerceLoopBoundary(meta.loopEndSec, durationSec ?? 0);
  const intendedLoopDurationSec = Number.isFinite(meta.intendedLoopDurationSec)
    ? Math.max(0, meta.intendedLoopDurationSec as number)
    : safeLoopEnd;

  return {
    schemaVersion: XENSONAR_MATERIAL_SCHEMA_VERSION,
    id: meta.stableId?.trim() || `${slugify(meta.name)}-${Math.random().toString(36).slice(2, 8)}`,
    name: meta.name,
    role: meta.role as XensonarMaterialRole,
    audio: {
      kind: 'wav',
      blob,
      mimeType: blob.type || 'audio/wav',
      durationSec,
    },
    timing: {
      bpm,
      bars,
      loopStartSec: coerceLoopBoundary(meta.loopStartSec, 0),
      loopEndSec: safeLoopEnd,
      intendedLoopDurationSec,
    },
    guide: {
      segmentsPerBar: Number.isFinite(meta.guideSegments) ? Math.max(1, Math.round(meta.guideSegments)) : undefined,
      markers16: Array.isArray(meta.guideMarkers) ? meta.guideMarkers.slice() : undefined,
    },
    pitch: {
      rootHz: meta.rootHz ?? null,
    },
    renderInfo: {
      sourceDevice: 'SpectralForge',
      sourceVersion: meta.sourceVersion,
      renderMode: meta.renderMode,
      preferredMyzelGroup: meta.preferredMyzelGroup,
      workspaceOrigin: meta.workspaceOrigin,
      transitionGuard: meta.transitionGuard,
      balanceCarrier: meta.balanceCarrier,
      routeSummary: meta.routeSummary,
      stabilizeBy: meta.stabilizeBy,
    },
    provenance: {
      createdAt: nowIso,
    },
  };
}

export function validateMaterialPackage(pkg: XensonarMaterialPackageV1): string[] {
  const errors: string[] = [];
  if (pkg.schemaVersion !== XENSONAR_MATERIAL_SCHEMA_VERSION) errors.push('unsupported schemaVersion');
  if (!pkg.id) errors.push('missing id');
  if (!pkg.name) errors.push('missing name');
  if (!pkg.role) errors.push('missing role');
  if (!pkg.audio?.blob) errors.push('missing audio blob');
  if (!Number.isFinite(pkg.timing?.bpm) || (pkg.timing?.bpm ?? 0) <= 0) errors.push('invalid bpm');
  if (!Number.isFinite(pkg.timing?.bars) || (pkg.timing?.bars ?? 0) <= 0) errors.push('invalid bars');
  if (!Number.isFinite(pkg.timing?.loopStartSec)) errors.push('invalid loopStartSec');
  if (!Number.isFinite(pkg.timing?.loopEndSec)) errors.push('invalid loopEndSec');
  if (!Number.isFinite(pkg.timing?.intendedLoopDurationSec)) errors.push('invalid intendedLoopDurationSec');
  return errors;
}

export function createMaterialManifest(pkg: XensonarMaterialPackageV1, fileName?: string): XensonarMaterialManifestV1 {
  return {
    ...pkg,
    audio: {
      kind: pkg.audio.kind,
      mimeType: pkg.audio.mimeType,
      durationSec: pkg.audio.durationSec,
      channels: pkg.audio.channels,
      sampleRate: pkg.audio.sampleRate,
      fileName,
    },
  };
}

export function packageToMaterialEntry(pkg: XensonarMaterialPackageV1): MaterialEntry {
  return {
    id: pkg.id,
    name: pkg.name,
    role: pkg.role,
    bpm: pkg.timing.bpm,
    bars: pkg.timing.bars,
    guideSegments: pkg.guide?.segmentsPerBar ?? 1,
    guideMarkers: pkg.guide?.markers16 ? pkg.guide.markers16.slice() : [],
    loopStartSec: pkg.timing.loopStartSec,
    loopEndSec: pkg.timing.loopEndSec,
    rootHz: pkg.pitch?.rootHz ?? null,
    sourceVersion: pkg.renderInfo?.sourceVersion ?? 'unknown',
    renderMode: pkg.renderInfo?.renderMode ?? 'unknown',
    durationSec: pkg.audio.durationSec ?? pkg.timing.loopEndSec,
    intendedLoopDurationSec: pkg.timing.intendedLoopDurationSec,
    preferredMyzelGroup: pkg.renderInfo?.preferredMyzelGroup,
    workspaceOrigin: pkg.renderInfo?.workspaceOrigin,
    transitionGuard: pkg.renderInfo?.transitionGuard,
    balanceCarrier: pkg.renderInfo?.balanceCarrier,
    routeSummary: pkg.renderInfo?.routeSummary,
    stabilizeBy: pkg.renderInfo?.stabilizeBy,
    blob: pkg.audio.blob,
    blobUrl: URL.createObjectURL(pkg.audio.blob),
    createdAt: Date.parse(pkg.provenance?.createdAt ?? '') || Date.now(),
  };
}
