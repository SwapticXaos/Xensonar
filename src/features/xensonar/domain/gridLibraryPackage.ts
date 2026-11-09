import {
  buildJsonPackageId,
  downloadJsonPackage,
  hashStableString,
  isRecord,
  parseJsonPackageMeta,
  serializeJsonPackage,
} from '../../../core/systemMemory/packageCore';
import {
  sanitizeActiveGridTuningRack,
  type CustomGridTuningId,
  type GridTuning,
  type StoredCustomGridTuning,
} from './instrumentData';

import type { GridLibraryArchive, GridLibraryArchiveEntry, GridLibraryArchivePayload } from './gridLibraryPackageTypes';
export type * from './gridLibraryPackageTypes';

function normalizeArchiveEntry(entry: GridLibraryArchiveEntry): GridLibraryArchiveEntry {
  return {
    ...entry,
    stepCents: [...entry.stepCents].sort((a, b) => a - b),
    contentHash: entry.contentHash ?? buildGridLibraryContentHash(entry),
  };
}

export function buildGridLibraryContentHash(entry: Pick<GridLibraryArchiveEntry, 'label' | 'family' | 'periodFamily' | 'divisionKind' | 'steps' | 'defaultModePolicy' | 'hotkeyCycleEligible' | 'description' | 'periodCents' | 'stepCents'>) {
  return hashStableString(JSON.stringify({
    label: entry.label,
    family: entry.family,
    periodFamily: entry.periodFamily,
    divisionKind: entry.divisionKind,
    steps: entry.steps,
    defaultModePolicy: entry.defaultModePolicy,
    hotkeyCycleEligible: entry.hotkeyCycleEligible,
    description: entry.description,
    periodCents: entry.periodCents,
    stepCents: [...entry.stepCents].sort((a, b) => a - b),
  }));
}

export function buildGridLibraryArchivePackageId() {
  return buildJsonPackageId('grid');
}

export function buildGridLibraryArchivePayload(args: {
  selectedTuning: GridTuning | null;
  activeRack: GridTuning[];
  customTunings: StoredCustomGridTuning[];
}): GridLibraryArchivePayload {
  return {
    selectedTuning: args.selectedTuning ?? null,
    activeRack: sanitizeActiveGridTuningRack(args.activeRack),
    customTunings: args.customTunings.map((entry) => normalizeArchiveEntry({
      archivedId: entry.id,
      label: entry.label,
      family: entry.family,
      periodFamily: entry.periodFamily,
      divisionKind: entry.divisionKind,
      steps: entry.steps,
      defaultModePolicy: entry.defaultModePolicy,
      hotkeyCycleEligible: entry.hotkeyCycleEligible !== false,
      description: entry.description,
      periodCents: entry.periodCents,
      stepCents: entry.stepCents,
      updatedAt: entry.updatedAt,
      contentHash: buildGridLibraryContentHash(entry),
    })),
  };
}

export function parseGridLibraryArchivePayload(parsed: unknown): GridLibraryArchivePayload | null {
  if (!isRecord(parsed)) return null;
  const selectedTuning = typeof parsed.selectedTuning === 'string' ? parsed.selectedTuning as GridTuning : null;
  const activeRack = Array.isArray(parsed.activeRack)
    ? sanitizeActiveGridTuningRack(parsed.activeRack as GridTuning[])
    : [];
  return {
    selectedTuning,
    activeRack,
    customTunings: (Array.isArray(parsed.customTunings) ? parsed.customTunings : []).filter(isRecord).map((entry) => normalizeArchiveEntry({
      archivedId: String((entry as Record<string, unknown>).archivedId ?? (entry as Record<string, unknown>).id ?? '') as CustomGridTuningId,
      label: typeof (entry as Record<string, unknown>).label === 'string' ? (entry as Record<string, unknown>).label as string : 'Importiertes Raster',
      family: ['edo','edt','cdo','cdt','ji'].includes(String((entry as Record<string, unknown>).family)) ? (entry as Record<string, unknown>).family as GridLibraryArchiveEntry['family'] : 'edo',
      periodFamily: (entry as Record<string, unknown>).periodFamily === 'tritave' ? 'tritave' : 'octave',
      divisionKind: (entry as Record<string, unknown>).divisionKind === 'custom' ? 'custom' : (entry as Record<string, unknown>).divisionKind === 'ratio' ? 'ratio' : 'equal',
      steps: Math.max(1, Number((entry as Record<string, unknown>).steps) || 1),
      defaultModePolicy: (entry as Record<string, unknown>).defaultModePolicy === 'bp_native' ? 'bp_native' : 'church_projection',
      hotkeyCycleEligible: (entry as Record<string, unknown>).hotkeyCycleEligible !== false,
      description: typeof (entry as Record<string, unknown>).description === 'string' ? (entry as Record<string, unknown>).description as string : 'Importiertes Raster.',
      periodCents: Number((entry as Record<string, unknown>).periodCents) || 1200,
      stepCents: Array.isArray((entry as Record<string, unknown>).stepCents) ? ((entry as Record<string, unknown>).stepCents as unknown[]).map(Number).filter((value) => Number.isFinite(value)) : [0],
      updatedAt: Number((entry as Record<string, unknown>).updatedAt) || Date.now(),
      contentHash: typeof (entry as Record<string, unknown>).contentHash === 'string' ? (entry as Record<string, unknown>).contentHash as string : null,
    })).filter((entry) => entry.archivedId.startsWith('custom:')),
  };
}

export function buildGridLibraryArchive(args: {
  packageId?: string;
  label: string;
  selectedTuning: GridTuning | null;
  activeRack: GridTuning[];
  customTunings: StoredCustomGridTuning[];
  warnings?: string[];
}): GridLibraryArchive {
  return {
    format: 'xensonar-grid-library',
    version: 1,
    packageId: args.packageId ?? buildGridLibraryArchivePackageId(),
    exportedAt: Date.now(),
    label: args.label,
    ...buildGridLibraryArchivePayload(args),
    warnings: args.warnings ?? [],
  };
}

export function serializeGridLibraryArchive(archive: GridLibraryArchive) {
  return serializeJsonPackage(archive);
}

export function parseGridLibraryArchive(json: string): GridLibraryArchive {
  const parsed = JSON.parse(json) as unknown;
  const meta = parseJsonPackageMeta({
    parsed,
    expectedFormat: 'xensonar-grid-library',
    expectedVersion: 1,
    fallbackLabel: 'Xensonar-Raster-Bibliothek',
    fallbackPackageId: buildGridLibraryArchivePackageId(),
  });
  const payload = parseGridLibraryArchivePayload(parsed);
  if (!payload) throw new Error('Raster-Bibliothek fehlt im Paket.');
  return {
    ...meta,
    ...payload,
  };
}

export function downloadGridLibraryArchive(json: string, label: string) {
  downloadJsonPackage(json, label, { prefix: 'xensonar-grid' });
}
