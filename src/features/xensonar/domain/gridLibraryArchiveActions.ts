import {
  buildGridLibraryArchive,
  buildGridLibraryContentHash,
  downloadGridLibraryArchive,
  parseGridLibraryArchive,
  serializeGridLibraryArchive,
} from './gridLibraryPackage';
import type { GridLibraryArchiveEntry, GridLibraryArchivePayload } from './gridLibraryPackageTypes';
import {
  sanitizeActiveGridTuningRack,
  type CustomGridTuningId,
  type GridTuning,
  type StoredCustomGridTuning,
} from './instrumentData';
import {
  readGridLibraryMemorySnapshot,
  replaceGridLibraryMemorySnapshot,
} from './gridLibraryMemory';
import type { WorkspacePackageImportMode } from '../../../core/systemMemory/packageCore';
import { buildContentHashLookup, ensureUniqueImportedLabel, resolveImportedStableId } from '../../../core/systemMemory/importMergeUtils';

function createImportedGridTuningId(): CustomGridTuningId {
  return `custom:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}` as CustomGridTuningId;
}


function toStoredCustomGridTuning(entry: GridLibraryArchiveEntry, id: CustomGridTuningId, label: string): StoredCustomGridTuning {
  return {
    id,
    label,
    family: entry.family,
    periodFamily: entry.periodFamily,
    divisionKind: entry.divisionKind === 'ratio' ? 'custom' : entry.divisionKind,
    steps: entry.steps,
    defaultModePolicy: entry.defaultModePolicy,
    hotkeyCycleEligible: entry.hotkeyCycleEligible !== false,
    description: entry.description,
    periodCents: entry.periodCents,
    stepCents: [...entry.stepCents].sort((a, b) => a - b),
    builtIn: false,
    updatedAt: entry.updatedAt || Date.now(),
  };
}

function remapImportedTuning(tuning: GridTuning | null | undefined, importedIdMap: Map<GridTuning, GridTuning>) {
  if (!tuning) return null;
  return importedIdMap.get(tuning) ?? tuning;
}

export async function exportGridLibraryArchiveAction(args: {
  currentTuning: GridTuning;
  activeRack?: GridTuning[];
  label?: string;
}) {
  const currentMemory = readGridLibraryMemorySnapshot();
  const activeRack = args.activeRack ?? currentMemory.activeRack;
  const archive = buildGridLibraryArchive({
    label: args.label?.trim() || 'Raster-Bibliothek',
    selectedTuning: args.currentTuning,
    activeRack,
    customTunings: currentMemory.customTunings,
    warnings: [],
  });
  downloadGridLibraryArchive(serializeGridLibraryArchive(archive), archive.label);
  return {
    archive,
    statusMessage: `Raster-Paket geladen: ${archive.customTunings.length} Custom-Raster · ${archive.activeRack.length} Rack-Slots.`,
  };
}

export function applyGridLibraryArchivePayload(args: {
  payload: GridLibraryArchivePayload;
  mode: WorkspacePackageImportMode;
  fallbackCurrentTuning: GridTuning;
}) {
  const currentMemory = readGridLibraryMemorySnapshot();
  const existing = args.mode === 'replace' ? [] : currentMemory.customTunings;
  const nextCustomTunings = [...existing];
  const usedIds = new Set(nextCustomTunings.map((entry) => entry.id));
  const takenLabels = new Set(nextCustomTunings.map((entry) => entry.label));
  const knownByHash = buildContentHashLookup(nextCustomTunings, (entry) => buildGridLibraryContentHash({
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
  }));
  const importedIdMap = new Map<GridTuning, GridTuning>();
  let importedCount = 0;
  let firstImportedTuning: GridTuning | null = null;

  for (const archived of args.payload.customTunings) {
    const hash = archived.contentHash ?? buildGridLibraryContentHash(archived);
    const existingMatch = knownByHash.get(hash);
    if (existingMatch) {
      importedIdMap.set(archived.archivedId, existingMatch.id);
      continue;
    }
    const nextId = resolveImportedStableId({
      preferredId: archived.archivedId,
      usedIds,
      createId: createImportedGridTuningId,
      isAcceptedId: (id) => id.startsWith('custom:'),
    });
    const nextLabel = ensureUniqueImportedLabel(archived.label, takenLabels, { fallbackLabel: 'Importiertes Raster' });
    const nextEntry = toStoredCustomGridTuning(archived, nextId, nextLabel);
    nextCustomTunings.push(nextEntry);
    knownByHash.set(hash, nextEntry);
    importedIdMap.set(archived.archivedId, nextId);
    importedCount += 1;
    if (!firstImportedTuning) firstImportedTuning = nextId;
  }

  if (args.mode === 'replace') {
    const nextRack = sanitizeActiveGridTuningRack(args.payload.activeRack.map((tuning) => remapImportedTuning(tuning, importedIdMap)).filter((value): value is GridTuning => !!value));
    const replacedState = replaceGridLibraryMemorySnapshot({ activeRack: nextRack, customTunings: nextCustomTunings });
    const nextSelectedTuning = remapImportedTuning(args.payload.selectedTuning, importedIdMap) ?? nextRack[0] ?? args.fallbackCurrentTuning;
    return {
      mode: 'replace' as const,
      importedCount,
      persistedCustomTunings: replacedState.persistedCustomTunings,
      nextRack: replacedState.nextRack,
      nextSelectedTuning,
      statusMessage: `Raster-Gedächtnis als Arbeitskopie geladen: ${args.payload.customTunings.length} Custom-Raster · ${nextRack.length} Rack-Slots.`,
    };
  }

  const mergedState = replaceGridLibraryMemorySnapshot({ activeRack: currentMemory.activeRack, customTunings: nextCustomTunings });

  return {
    mode: (args.mode === 'differential' ? 'differential' : 'merge') as 'merge' | 'differential',
    importedCount,
    persistedCustomTunings: mergedState.persistedCustomTunings,
    nextSelectedTuning: firstImportedTuning,
    statusMessage: args.mode === 'differential'
      ? `Raster-Gedächtnis differenziell kombiniert: ${importedCount} Custom-Raster importiert.`
      : `Raster-Gedächtnis ergänzt: ${importedCount} Custom-Raster importiert.`,
  };
}

export async function importGridLibraryArchiveAction(args: {
  file: File;
  mode: WorkspacePackageImportMode;
  fallbackCurrentTuning: GridTuning;
}) {
  const archive = parseGridLibraryArchive(await args.file.text());
  const result = applyGridLibraryArchivePayload({
    payload: {
      selectedTuning: archive.selectedTuning,
      activeRack: archive.activeRack,
      customTunings: archive.customTunings,
    },
    mode: args.mode,
    fallbackCurrentTuning: args.fallbackCurrentTuning,
  });
  return {
    archive,
    ...result,
  };
}
