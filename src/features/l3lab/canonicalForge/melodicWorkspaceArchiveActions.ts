import {
  cloneLoopComposerState,
  type LoopComposerState,
} from "./loopDrumDomain";
import {
  cloneMelodicPatternLinkMap,
  cloneMelodicPatternVariantMap,
  type MelodicPatternLinkMap,
  type MelodicPatternVariantMap,
  type SavedMelodicProject,
} from "./melodicProjectLibrary";
import {
  buildMelodicWorkspaceArchive,
  downloadMelodicWorkspaceArchiveFromArchive,
  prepareMelodicWorkspaceArchiveDownloadFromArchive,
  parseMelodicWorkspaceArchive,
  remapArchiveProjectSampleReferences,
  type MelodicWorkspaceArchiveProject,
  type MelodicWorkspaceArchiveSample,
} from "./melodicWorkspacePackage";
import { normalizeWorkspacePackageTitle } from "./melodicWorkspaceArchiveManifest";
import {
  deleteSavedMelodicSample,
  getSavedMelodicSampleBlob,
  listSavedMelodicSamples,
  saveImportedMelodicSampleBlob,
  type SavedMelodicSampleMeta,
} from "./melodicSampleLibrary";
import {
  arrayBufferToBase64,
  base64ToBlob,
  buildJsonPackageId,
  hashStableString,
  type WorkspacePackageImportMode,
} from "../../../core/systemMemory/packageCore";
import { ensureUniqueImportedLabel } from "../../../core/systemMemory/importMergeUtils";
import {
  createWorkspacePackageImportLedger,
  formatWorkspacePackageImportLedgerSummary,
  recordWorkspacePackageImportLedger,
} from "../../../core/systemMemory/packageImportLedger";
import { applyGridLibraryArchivePayload } from "../../xensonar/domain/gridLibraryArchiveActions";
import { readGridLibraryMemorySnapshot } from "../../xensonar/domain/gridLibraryMemory";
import { applyWorkspaceBrowserStorageArchivePayload } from "./melodicWorkspaceBrowserStoragePackage";
import { type GridTuning } from "../../xensonar/domain/instrumentData";
import { getMaterialLibraryState } from "../materialLibrary";
import {
  applyMaterialLibraryArchivePayload,
  exportMaterialLibraryArchivePayload,
} from "../materialLibraryArchiveActions";
import {
  combineRootFollowBankArchivePayload,
  exportRootFollowBankArchivePayload,
  remapRootFollowBankArchivePayload,
} from "../../xensonar/material/rootFollowBankPackage";
import {
  createPersistedRootFollowBankPatch,
  readPersistedRootFollowBank,
  writePersistedRootFollowBank,
} from "../../xensonar/material/rootFollowBankStorage";
import {
  applyBassClipLibraryArchivePayload,
  exportBassClipLibraryArchivePayload,
} from "../../xensonar/groove/bassClipLibraryPackage";
import {
  applyDrumConfigLibraryArchivePayload,
  exportDrumConfigLibraryArchivePayload,
} from "../../xensonar/drumConfigLibrary";
import {
  applyForgeProjectLibraryArchivePayload,
  exportForgeProjectLibraryArchivePayload,
} from "../spectralForge/projectLibrary";
import {
  applyCustomStampLibraryArchivePayload,
  exportCustomStampLibraryArchivePayload,
} from "../spectralForge/customStampLibrary";
import {
  applyResidentConstellationArchivePayload,
  exportResidentConstellationArchivePayload,
} from "../../topology/residentConstellations";
import {
  applySyntheticForgeProjectRecordsFromPackage,
  listSyntheticForgeProjectRecords,
} from "./projectLibrary";
import { getSyntheticForgeSession, setSyntheticForgeSession } from "./session";
import {
  SYNTHETIC_FORGE_PACKAGE_WORKSPACE_RESTORED_EVENT,
  decodeSyntheticForgeCurrentWorkspaceFromPackage,
  decodeSyntheticForgeSavedWorkspaceProject,
  encodeSyntheticForgeCurrentWorkspaceForPackage,
  encodeSyntheticForgeSavedWorkspaceProject,
  type SyntheticForgeSavedWorkspaceArchiveRecordV1,
} from "./syntheticForgeWorkspacePackage";

export function createImportedProjectId() {
  return `melodic-project-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function hashProjectPayload(
  project: Pick<
    SavedMelodicProject,
    "composer" | "patternVariants" | "patternLinks"
  >,
) {
  const payload = `${JSON.stringify(project.composer)}|${JSON.stringify(project.patternVariants)}|${JSON.stringify(project.patternLinks)}`;
  return hashStableString(payload);
}

export function ensureUniqueImportedProjectName(
  name: string,
  takenNames: Set<string>,
) {
  return ensureUniqueImportedLabel(name, takenNames, {
    fallbackLabel: "Importiertes Projekt",
  });
}

function normalizeSampleIdentityText(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase();
}

function roundedMetaNumber(value: number | null | undefined, digits: number) {
  if (value == null || !Number.isFinite(value)) return "null";
  return value.toFixed(digits);
}

function sampleImportIdentityKey(
  sample: Pick<
    SavedMelodicSampleMeta,
    | "name"
    | "sizeBytes"
    | "durationSec"
    | "baseHz"
    | "baseHzSource"
    | "tempoPitchLinked"
    | "playbackDurationSec"
  >,
) {
  return [
    normalizeSampleIdentityText(sample.name),
    String(sample.sizeBytes ?? 0),
    roundedMetaNumber(sample.durationSec, 4),
    roundedMetaNumber(sample.baseHz, 3),
    sample.baseHzSource ?? "",
    sample.tempoPitchLinked === false ? "tempo-free" : "tempo-linked",
    roundedMetaNumber(sample.playbackDurationSec, 4),
  ].join("|");
}

function sampleContentIdentityKey(
  sample: Pick<
    SavedMelodicSampleMeta,
    "contentHash" | "name" | "sizeBytes" | "durationSec"
  >,
) {
  return sample.contentHash
    ? `hash:${sample.contentHash}`
    : `meta:${normalizeSampleIdentityText(sample.name)}|${sample.sizeBytes ?? 0}|${roundedMetaNumber(sample.durationSec, 4)}`;
}

function archiveSampleIdentityKey(sample: MelodicWorkspaceArchiveSample) {
  return sampleImportIdentityKey({
    name: sample.name,
    sizeBytes: sample.sizeBytes,
    durationSec: sample.durationSec,
    baseHz: sample.baseHz,
    baseHzSource: sample.baseHzSource,
    tempoPitchLinked: sample.legacyMeta?.tempoPitchLinked ?? true,
    playbackDurationSec: sample.legacyMeta?.playbackDurationSec ?? null,
  });
}

function archiveSampleContentIdentityKey(
  sample: MelodicWorkspaceArchiveSample,
) {
  return sample.contentHash
    ? `hash:${sample.contentHash}`
    : `meta:${normalizeSampleIdentityText(sample.name)}|${sample.sizeBytes ?? 0}|${roundedMetaNumber(sample.durationSec, 4)}`;
}

export function toArchiveProject(
  project: SavedMelodicProject,
): MelodicWorkspaceArchiveProject {
  return {
    id: project.id,
    name: project.name,
    composer: cloneLoopComposerState(project.composer),
    patternVariants: cloneMelodicPatternVariantMap(project.patternVariants),
    patternLinks: cloneMelodicPatternLinkMap(project.patternLinks),
    origin: project.origin ?? "browserLocal",
    sourcePackageId: project.sourcePackageId ?? null,
    syncState: project.syncState ?? "localOnly",
    contentHash: project.contentHash ?? hashProjectPayload(project),
  };
}

function projectDifferentialSignature(
  project:
    | Pick<SavedMelodicProject, "name">
    | Pick<MelodicWorkspaceArchiveProject, "name">,
) {
  return normalizeSampleIdentityText(project.name);
}

function buildPreferredRootFollowBankFromMaterialImport(args: {
  archiveMaterialLibrary: ReturnType<
    typeof parseMelodicWorkspaceArchive
  >["materialLibrary"];
  materialIdMap: Map<string, string>;
  validMaterialIds: Set<string>;
}) {
  const preferredIds = Array.from(
    new Set(
      (args.archiveMaterialLibrary?.entries ?? [])
        .filter((entry) => entry.rootFollowPreferred)
        .map(
          (entry) =>
            args.materialIdMap.get(entry.archivedId) ?? entry.archivedId,
        )
        .filter((id) => args.validMaterialIds.has(id)),
    ),
  );
  return preferredIds.length
    ? createPersistedRootFollowBankPatch({
        memberIds: preferredIds,
        orderedIds: preferredIds,
      })
    : null;
}

type MelodicWorkspaceArchiveExportArgs = {
  selectedProjectName: string;
  packageLabel?: string;
  loopComposer: LoopComposerState;
  patternVariants: MelodicPatternVariantMap;
  patternLinks: MelodicPatternLinkMap;
  savedMelodicProjects: SavedMelodicProject[];
  melodicSampleEntries: SavedMelodicSampleMeta[];
};

function buildMelodicWorkspaceArchiveStatus(args: {
  archive: ReturnType<typeof buildMelodicWorkspaceArchive>;
  warnings: string[];
}) {
  const { archive, warnings } = args;
  return `Workspace-Paket vorbereitet: ${archive.samples.length} Samples · ${archive.projects.length} gespeicherte Projekte · ${archive.gridLibrary?.customTunings.length ?? 0} Custom-Raster-Presets · ${archive.materialLibrary?.entries.length ?? 0} Materialspuren · ${archive.rootFollowBank?.memberIds.length ?? 0} Root-Follow-Loop(s) · ${archive.bassClipLibrary?.clips.length ?? 0} Bass-Patterns/Bassläufe · ${archive.drumConfigLibrary?.entries.length ?? 0} Drum-Patterns · ${archive.spectralForgeProjects?.projects.length ?? 0} SpectralForge-Projekte · ${archive.spectralForgeCustomStamps?.stamps.length ?? 0} SpectralForge-Stempel · ${archive.syntheticForgeSavedWorkspaces?.projects.length ?? 0} gespeicherte SyntheticForge-Arbeitsstände · ${archive.syntheticForgeCurrentWorkspace ? 1 : 0} offener SyntheticForge-Arbeitsstand · ${archive.residentConstellations?.entries.length ?? 0} Raum-III-Konstellationen · ${archive.browserLocalStorage?.entries.length ?? 0} Browser-Speicher-Einträge${warnings.length ? ` · ${warnings.length} Hinweise` : ""}.`;
}


export function readMelodicWorkspaceExternalPackageContentSummary() {
  const gridLibrary = readGridLibraryMemorySnapshot();
  const bassClipLibrary = exportBassClipLibraryArchivePayload();
  return {
    customRasterPresetCount: gridLibrary.customTunings.length,
    bassPatternCount: bassClipLibrary.clips.length,
    hasContent: gridLibrary.customTunings.length > 0 || bassClipLibrary.clips.length > 0,
  };
}

export async function buildMelodicWorkspaceArchiveExport(args: MelodicWorkspaceArchiveExportArgs) {
  const {
    selectedProjectName,
    loopComposer,
    patternVariants,
    patternLinks,
    savedMelodicProjects,
    melodicSampleEntries,
  } = args;
  const packageLabel = normalizeWorkspacePackageTitle(args.packageLabel);
  const packageId = buildJsonPackageId("pkg");
  const warnings: string[] = [];
  const archiveSamples: MelodicWorkspaceArchiveSample[] = [];

  for (const sample of melodicSampleEntries) {
    const blob = await getSavedMelodicSampleBlob(sample.id);
    if (!blob) {
      warnings.push(`Sample fehlt im Browser-Gedächtnis: ${sample.name}`);
      continue;
    }
    archiveSamples.push({
      archivedId: sample.id,
      name: sample.name,
      mimeType: blob.type || "audio/wav",
      dataBase64: arrayBufferToBase64(await blob.arrayBuffer()),
      createdAt: sample.createdAt,
      sizeBytes: sample.sizeBytes,
      durationSec: sample.durationSec,
      baseHz: sample.baseHz,
      baseHzSource:
        sample.baseHzSource ?? (sample.baseHz != null ? "estimated" : null),
      volumeEnvelope: sample.volumeEnvelope ?? null,
      pitchEnvelope: sample.pitchEnvelope ?? null,
      contentHash: sample.contentHash ?? null,
      origin: sample.origin ?? "browserLocal",
      sourcePackageId: sample.sourcePackageId ?? null,
      syncState: sample.syncState ?? "localOnly",
      legacyMeta:
        sample.tempoPitchLinked === false || sample.playbackDurationSec != null
          ? {
              tempoPitchLinked: sample.tempoPitchLinked,
              playbackDurationSec: sample.playbackDurationSec ?? null,
            }
          : undefined,
    });
  }

  const workspaceProject: MelodicWorkspaceArchiveProject = {
    id: "workspace-current",
    name: selectedProjectName,
    composer: cloneLoopComposerState(loopComposer),
    patternVariants: cloneMelodicPatternVariantMap(patternVariants),
    patternLinks: cloneMelodicPatternLinkMap(patternLinks),
    origin: "browserLocal",
    sourcePackageId: null,
    syncState: "localOnly",
    contentHash: hashProjectPayload({
      composer: loopComposer,
      patternVariants,
      patternLinks,
    }),
  };

  const materialLibrary = await exportMaterialLibraryArchivePayload();
  const rootFollowBank = exportRootFollowBankArchivePayload();
  const bassClipLibrary = exportBassClipLibraryArchivePayload();
  let drumConfigLibrary: Awaited<
    ReturnType<typeof exportDrumConfigLibraryArchivePayload>
  > | null = null;
  let spectralForgeProjects: Awaited<
    ReturnType<typeof exportForgeProjectLibraryArchivePayload>
  > | null = null;
  let spectralForgeCustomStamps: Awaited<
    ReturnType<typeof exportCustomStampLibraryArchivePayload>
  > | null = null;
  let syntheticForgeSavedWorkspaces: SyntheticForgeSavedWorkspaceArchiveRecordV1[] = [];
  let syntheticForgeCurrentWorkspace = encodeSyntheticForgeCurrentWorkspaceForPackage(getSyntheticForgeSession());

  try {
    drumConfigLibrary = await exportDrumConfigLibraryArchivePayload();
  } catch (error) {
    console.warn(
      "[xensonar][workspace-archive][export][drum-config-library]",
      error,
    );
    warnings.push(
      "Drum-Pattern-Bibliothek konnte nicht vollständig in das Paket geschrieben werden.",
    );
  }

  try {
    spectralForgeProjects = await exportForgeProjectLibraryArchivePayload();
  } catch (error) {
    console.warn(
      "[xensonar][workspace-archive][export][spectral-forge-project-library]",
      error,
    );
    warnings.push(
      "SpectralForge-Projektbibliothek konnte nicht vollständig in das Paket geschrieben werden.",
    );
  }

  try {
    spectralForgeCustomStamps = await exportCustomStampLibraryArchivePayload();
  } catch (error) {
    console.warn(
      "[xensonar][workspace-archive][export][spectral-forge-custom-stamp-library]",
      error,
    );
    warnings.push(
      "SpectralForge-Stempelbibliothek konnte nicht vollständig in das Paket geschrieben werden.",
    );
  }

  try {
    syntheticForgeSavedWorkspaces = (await listSyntheticForgeProjectRecords()).map(encodeSyntheticForgeSavedWorkspaceProject);
  } catch (error) {
    console.warn("[xensonar][workspace-archive][export][spectral-forge-workspaces]", error);
    warnings.push("Gespeicherte SyntheticForge-Arbeitsstände konnten nicht vollständig in das Paket geschrieben werden.");
  }

  const residentConstellations = exportResidentConstellationArchivePayload();

  const archive = buildMelodicWorkspaceArchive({
    packageId,
    label: packageLabel,
    workspace: workspaceProject,
    projects: savedMelodicProjects.map(toArchiveProject),
    samples: archiveSamples,
    gridLibrary: {
      selectedTuning: null,
      ...readGridLibraryMemorySnapshot(),
    },
    materialLibrary,
    rootFollowBank,
    bassClipLibrary,
    drumConfigLibrary,
    spectralForgeProjects,
    spectralForgeCustomStamps,
    syntheticForgeSavedWorkspaces: { schemaVersion: 1, projects: syntheticForgeSavedWorkspaces },
    syntheticForgeCurrentWorkspace,
    residentConstellations,
    warnings,
  });
  return {
    archive,
    statusMessage: buildMelodicWorkspaceArchiveStatus({ archive, warnings }),
  };
}

export async function prepareMelodicWorkspaceArchiveDownloadAction(args: MelodicWorkspaceArchiveExportArgs) {
  const built = await buildMelodicWorkspaceArchiveExport(args);
  return {
    ...built,
    download: prepareMelodicWorkspaceArchiveDownloadFromArchive(
      built.archive,
      built.archive.label,
    ),
  };
}

export async function exportMelodicWorkspaceArchiveAction(args: MelodicWorkspaceArchiveExportArgs) {
  const built = await buildMelodicWorkspaceArchiveExport(args);
  downloadMelodicWorkspaceArchiveFromArchive(built.archive, built.archive.label);
  return {
    archive: built.archive,
    statusMessage: built.statusMessage.replace(
      "Workspace-Paket vorbereitet:",
      "Workspace-Paket exportiert:",
    ),
  };
}

export async function importMelodicWorkspaceArchiveAction(args: {
  file: File;
  mode: WorkspacePackageImportMode;
  savedMelodicProjects: SavedMelodicProject[];
}) {
  const archive = parseMelodicWorkspaceArchive(await args.file.text());
  const ledger = createWorkspacePackageImportLedger({
    mode: args.mode,
    packageId: archive.packageId,
    packageLabel: archive.label,
    warnings: archive.warnings,
  });
  ledger.samples.present = true;
  ledger.samples.incoming = archive.samples.length;
  ledger.projects.present = true;
  ledger.projects.incoming = archive.projects.length;
  ledger.grid.present = !!archive.gridLibrary;
  ledger.grid.incoming = archive.gridLibrary?.customTunings.length ?? 0;
  ledger.grid.rackSlots = archive.gridLibrary?.activeRack.length ?? 0;
  ledger.material.present = !!archive.materialLibrary;
  ledger.material.incoming = archive.materialLibrary?.entries.length ?? 0;
  ledger.rootFollow.present = !!archive.rootFollowBank;
  ledger.rootFollow.incoming = archive.rootFollowBank?.memberIds.length ?? 0;
  ledger.bassClips.present = !!archive.bassClipLibrary;
  ledger.bassClips.incoming = archive.bassClipLibrary?.clips.length ?? 0;
  ledger.drumConfigs.present = !!archive.drumConfigLibrary;
  ledger.drumConfigs.incoming = archive.drumConfigLibrary?.entries.length ?? 0;
  ledger.drumConfigs.playlistImported = !!archive.drumConfigLibrary?.playlist;
  ledger.spectralForgeProjects.present = !!archive.spectralForgeProjects;
  ledger.spectralForgeProjects.incoming =
    archive.spectralForgeProjects?.projects.length ?? 0;
  ledger.spectralForgeCustomStamps.present = !!archive.spectralForgeCustomStamps;
  ledger.spectralForgeCustomStamps.incoming =
    archive.spectralForgeCustomStamps?.stamps.length ?? 0;
  ledger.syntheticForgeSavedWorkspaces.present = !!archive.syntheticForgeSavedWorkspaces;
  ledger.syntheticForgeSavedWorkspaces.incoming = archive.syntheticForgeSavedWorkspaces?.projects.length ?? 0;
  ledger.syntheticForgeCurrentWorkspace.present = !!archive.syntheticForgeCurrentWorkspace;
  ledger.syntheticForgeCurrentWorkspace.incoming = archive.syntheticForgeCurrentWorkspace ? 1 : 0;
  ledger.residentConstellations.present = !!archive.residentConstellations;
  ledger.residentConstellations.incoming =
    archive.residentConstellations?.entries.length ?? 0;
  const browserStorageImportResult = applyWorkspaceBrowserStorageArchivePayload({
    payload: archive.browserLocalStorage,
    mode: args.mode,
  });
  const residentConstellationImportResult = applyResidentConstellationArchivePayload({
    payload: archive.residentConstellations,
    mode: args.mode,
  });
  const decodedSpectralForgeWorkspaceProjects = (archive.syntheticForgeSavedWorkspaces?.projects ?? [])
    .map(decodeSyntheticForgeSavedWorkspaceProject)
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  const spectralForgeWorkspaceProjectImportResult = archive.syntheticForgeSavedWorkspaces
    ? await applySyntheticForgeProjectRecordsFromPackage({ records: decodedSpectralForgeWorkspaceProjects, mode: args.mode })
    : null;
  if (spectralForgeWorkspaceProjectImportResult) {
    ledger.syntheticForgeSavedWorkspaces.imported = spectralForgeWorkspaceProjectImportResult.importedCount;
    ledger.syntheticForgeSavedWorkspaces.reused = spectralForgeWorkspaceProjectImportResult.skippedCount;
    ledger.syntheticForgeSavedWorkspaces.skipped = spectralForgeWorkspaceProjectImportResult.skippedCount;
    ledger.syntheticForgeSavedWorkspaces.replaced = spectralForgeWorkspaceProjectImportResult.replacedCount;
  }
  let syntheticForgeCurrentWorkspaceImported = false;
  if (archive.syntheticForgeCurrentWorkspace && (args.mode !== 'merge' || getSyntheticForgeSession() == null)) {
    const restoredSession = decodeSyntheticForgeCurrentWorkspaceFromPackage(archive.syntheticForgeCurrentWorkspace);
    if (restoredSession) {
      setSyntheticForgeSession(restoredSession);
      syntheticForgeCurrentWorkspaceImported = true;
    }
  }
  if (archive.syntheticForgeCurrentWorkspace) {
    ledger.syntheticForgeCurrentWorkspace.imported = syntheticForgeCurrentWorkspaceImported ? 1 : 0;
    ledger.syntheticForgeCurrentWorkspace.skipped = syntheticForgeCurrentWorkspaceImported ? 0 : 1;
    ledger.syntheticForgeCurrentWorkspace.reused = syntheticForgeCurrentWorkspaceImported ? 0 : 1;
  }
  if (residentConstellationImportResult.present) {
    ledger.residentConstellations.imported = residentConstellationImportResult.importedCount;
    ledger.residentConstellations.skipped = residentConstellationImportResult.skippedCount;
    ledger.residentConstellations.reused = residentConstellationImportResult.skippedCount;
    ledger.residentConstellations.replaced = residentConstellationImportResult.replacedCount;
  }
  const sampleIdMap = new Map<string, string>();
  const existingSamples = await listSavedMelodicSamples();
  let workingSamples = existingSamples;
  if (args.mode === "replace") {
    for (const sample of existingSamples) {
      await deleteSavedMelodicSample(sample.id);
    }
    workingSamples = [];
  }
  const existingByIdentity = new Map<string, SavedMelodicSampleMeta[]>();
  const existingByContent = new Map<string, SavedMelodicSampleMeta>();
  for (const sample of workingSamples) {
    const key = sampleImportIdentityKey(sample);
    const group = existingByIdentity.get(key) ?? [];
    group.push(sample);
    existingByIdentity.set(key, group);
    existingByContent.set(sampleContentIdentityKey(sample), sample);
  }

  let importedSampleCount = 0;
  let replacedSampleCount = 0;
  let skippedSampleCount = 0;
  let dedupedSampleCount = 0;
  for (const archivedSample of archive.samples) {
    const identityKey = archiveSampleIdentityKey(archivedSample);
    const contentKey = archiveSampleContentIdentityKey(archivedSample);
    const exactExisting =
      args.mode === "merge"
        ? (existingByContent.get(contentKey) ?? null)
        : null;
    if (exactExisting) {
      sampleIdMap.set(archivedSample.archivedId, exactExisting.id);
      skippedSampleCount += 1;
      continue;
    }
    const existingMatches =
      args.mode === "differential"
        ? (existingByIdentity.get(identityKey) ?? [])
        : [];
    const replaceSampleId = existingMatches[0]?.id ?? null;
    if (replaceSampleId) replacedSampleCount += 1;
    if (args.mode === "differential" && existingMatches.length > 1) {
      for (const duplicate of existingMatches.slice(1)) {
        await deleteSavedMelodicSample(duplicate.id);
        dedupedSampleCount += 1;
      }
    }
    const blob = base64ToBlob(
      archivedSample.dataBase64,
      archivedSample.mimeType,
    );
    const saved = await saveImportedMelodicSampleBlob(blob, {
      name: archivedSample.name,
      createdAt: archivedSample.createdAt,
      sizeBytes: archivedSample.sizeBytes,
      durationSec: archivedSample.durationSec,
      baseHz: archivedSample.baseHz,
      baseHzSource:
        archivedSample.baseHzSource ??
        (archivedSample.baseHz != null ? "estimated" : null),
      volumeEnvelope: archivedSample.volumeEnvelope ?? null,
      pitchEnvelope: archivedSample.pitchEnvelope ?? null,
      sourcePackageId: archive.packageId,
      contentHash: archivedSample.contentHash ?? null,
      tempoPitchLinked: archivedSample.legacyMeta?.tempoPitchLinked ?? true,
      playbackDurationSec:
        archivedSample.legacyMeta?.playbackDurationSec ?? null,
      replaceSampleId,
    });
    sampleIdMap.set(archivedSample.archivedId, saved.id);
    importedSampleCount += 1;
    existingByIdentity.set(identityKey, [saved]);
    existingByContent.set(contentKey, saved);
  }

  ledger.samples.imported = importedSampleCount;
  ledger.samples.reused = skippedSampleCount;
  ledger.samples.skipped = skippedSampleCount;
  ledger.samples.replaced = replacedSampleCount;
  ledger.samples.deduped = dedupedSampleCount;
  ledger.samples.remapped = sampleIdMap.size;

  const sampleImportStatusSuffix =
    replacedSampleCount || dedupedSampleCount || skippedSampleCount
      ? " · " +
        (replacedSampleCount
          ? replacedSampleCount + " Samples differenziell ersetzt"
          : "") +
        (skippedSampleCount
          ? (replacedSampleCount ? " · " : "") +
            skippedSampleCount +
            " Samples bereits vorhanden"
          : "") +
        (dedupedSampleCount
          ? " · " + dedupedSampleCount + " alte Sample-Kopien entfernt"
          : "")
      : "";
  const refreshedSamples = await listSavedMelodicSamples();
  const takenNames = new Set(
    args.savedMelodicProjects.map((entry) => entry.name),
  );
  const existingProjectByDifferentialSignature = new Map<
    string,
    SavedMelodicProject
  >();
  for (const project of args.savedMelodicProjects) {
    existingProjectByDifferentialSignature.set(
      projectDifferentialSignature(project),
      project,
    );
  }
  let replacedProjectCount = 0;
  const importedProjects = archive.projects.map((project) => {
    const remapped = remapArchiveProjectSampleReferences(project, sampleIdMap, {
      origin: "importedPackage",
      sourcePackageId: archive.packageId,
      syncState: "imported",
    });
    remapped.contentHash = project.contentHash ?? hashProjectPayload(remapped);
    const differentialSignature = projectDifferentialSignature(project);
    const existingDifferentialProject =
      args.mode === "differential"
        ? existingProjectByDifferentialSignature.get(differentialSignature)
        : null;
    if (existingDifferentialProject) replacedProjectCount += 1;
    remapped.id = existingDifferentialProject?.id ?? createImportedProjectId();
    remapped.name =
      existingDifferentialProject?.name ??
      ensureUniqueImportedProjectName(remapped.name, takenNames);
    return remapped;
  });
  ledger.projects.imported = importedProjects.length;
  ledger.projects.replaced = replacedProjectCount;

  const fallbackGridTuning = (readGridLibraryMemorySnapshot().activeRack[0] ??
    "12edo") as GridTuning;
  const gridImportResult = archive.gridLibrary
    ? applyGridLibraryArchivePayload({
        payload: archive.gridLibrary,
        mode: args.mode,
        fallbackCurrentTuning: fallbackGridTuning,
      })
    : null;
  if (gridImportResult) {
    ledger.grid.imported = gridImportResult.importedCount;
    ledger.grid.skipped = Math.max(
      0,
      ledger.grid.incoming - gridImportResult.importedCount,
    );
    ledger.grid.replaced =
      gridImportResult.mode === "replace" ? gridImportResult.importedCount : 0;
    ledger.grid.rackSlots =
      gridImportResult.mode === "replace"
        ? (gridImportResult.nextRack?.length ?? ledger.grid.rackSlots)
        : ledger.grid.rackSlots;
  }
  const gridStatusSuffix = gridImportResult
    ? ` · ${gridImportResult.importedCount} Raster importiert${gridImportResult.mode === "replace" ? ` · ${gridImportResult.nextRack?.length ?? 0} Rack-Slots` : ""}`
    : "";
  const materialImportResult = archive.materialLibrary
    ? await applyMaterialLibraryArchivePayload({
        payload: archive.materialLibrary,
        mode: args.mode,
      })
    : null;
  if (materialImportResult) {
    ledger.material.imported = materialImportResult.importedCount;
    ledger.material.reused = materialImportResult.skippedCount;
    ledger.material.skipped = materialImportResult.skippedCount;
    ledger.material.replaced = materialImportResult.replacedCount;
    ledger.material.deduped = materialImportResult.dedupedCount;
    ledger.material.remapped = materialImportResult.importedIdMap.size;
    ledger.material.touched = materialImportResult.touchedIds.size;
  }
  const materialStatusSuffix = materialImportResult
    ? ` · ${materialImportResult.importedCount} Materialspuren importiert${materialImportResult.skippedCount ? ` · ${materialImportResult.skippedCount} bereits vorhanden` : ""}${materialImportResult.replacedCount ? ` · ${materialImportResult.replacedCount} differenziell ersetzt` : ""}${materialImportResult.dedupedCount ? ` · ${materialImportResult.dedupedCount} Materialspur-Dubletten entfernt` : ""}`
    : "";
  const bassClipImportResult = archive.bassClipLibrary
    ? applyBassClipLibraryArchivePayload({
        payload: archive.bassClipLibrary,
        mode: args.mode,
      })
    : null;
  if (bassClipImportResult) {
    ledger.bassClips.imported = bassClipImportResult.importedCount;
    ledger.bassClips.reused = bassClipImportResult.skippedCount;
    ledger.bassClips.skipped = bassClipImportResult.skippedCount;
    ledger.bassClips.replaced = bassClipImportResult.replacedCount;
    ledger.bassClips.deduped = bassClipImportResult.dedupedCount;
  }
  const bassClipStatusSuffix = bassClipImportResult
    ? ` · ${bassClipImportResult.importedCount} Bass-Patterns/Bassläufe importiert${bassClipImportResult.skippedCount ? ` · ${bassClipImportResult.skippedCount} bereits vorhanden` : ""}${bassClipImportResult.replacedCount ? ` · ${bassClipImportResult.replacedCount} differenziell ersetzt` : ""}`
    : "";
  const drumConfigImportResult = archive.drumConfigLibrary
    ? await applyDrumConfigLibraryArchivePayload({
        payload: archive.drumConfigLibrary,
        mode: args.mode,
      })
    : null;
  if (drumConfigImportResult) {
    ledger.drumConfigs.imported = drumConfigImportResult.importedCount;
    ledger.drumConfigs.reused = drumConfigImportResult.skippedCount;
    ledger.drumConfigs.skipped = drumConfigImportResult.skippedCount;
    ledger.drumConfigs.replaced = drumConfigImportResult.replacedCount;
    ledger.drumConfigs.deduped = drumConfigImportResult.dedupedCount;
    ledger.drumConfigs.playlistImported =
      drumConfigImportResult.playlistImported;
  }
  const drumConfigStatusSuffix = drumConfigImportResult
    ? ` · ${drumConfigImportResult.importedCount} Drum-Pattern(s) importiert${drumConfigImportResult.skippedCount ? ` · ${drumConfigImportResult.skippedCount} bereits vorhanden` : ""}${drumConfigImportResult.replacedCount ? ` · ${drumConfigImportResult.replacedCount} differenziell ersetzt` : ""}${drumConfigImportResult.playlistImported ? " · Drum-Playlist übernommen" : ""}`
    : "";
  const spectralForgeImportResult = archive.spectralForgeProjects
    ? await applyForgeProjectLibraryArchivePayload({
        payload: archive.spectralForgeProjects,
        mode: args.mode,
      })
    : null;
  if (spectralForgeImportResult) {
    ledger.spectralForgeProjects.imported =
      spectralForgeImportResult.importedCount;
    ledger.spectralForgeProjects.reused =
      spectralForgeImportResult.skippedCount;
    ledger.spectralForgeProjects.skipped =
      spectralForgeImportResult.skippedCount;
    ledger.spectralForgeProjects.replaced =
      spectralForgeImportResult.replacedCount;
    ledger.spectralForgeProjects.deduped =
      spectralForgeImportResult.dedupedCount;
  }
  const spectralForgeStatusSuffix = spectralForgeImportResult
    ? ` · ${spectralForgeImportResult.importedCount} SpectralForge-Projekt(e) importiert${spectralForgeImportResult.skippedCount ? ` · ${spectralForgeImportResult.skippedCount} bereits vorhanden` : ""}${spectralForgeImportResult.replacedCount ? ` · ${spectralForgeImportResult.replacedCount} differenziell ersetzt` : ""}`
    : "";
  const spectralForgeCustomStampImportResult = archive.spectralForgeCustomStamps
    ? await applyCustomStampLibraryArchivePayload({
        payload: archive.spectralForgeCustomStamps,
        mode: args.mode,
      })
    : null;
  if (spectralForgeCustomStampImportResult) {
    ledger.spectralForgeCustomStamps.imported =
      spectralForgeCustomStampImportResult.importedCount;
    ledger.spectralForgeCustomStamps.reused =
      spectralForgeCustomStampImportResult.skippedCount;
    ledger.spectralForgeCustomStamps.skipped =
      spectralForgeCustomStampImportResult.skippedCount;
    ledger.spectralForgeCustomStamps.replaced =
      spectralForgeCustomStampImportResult.replacedCount;
    ledger.spectralForgeCustomStamps.deduped =
      spectralForgeCustomStampImportResult.dedupedCount;
  }
  const spectralForgeCustomStampStatusSuffix = spectralForgeCustomStampImportResult
    ? ` · ${spectralForgeCustomStampImportResult.importedCount} SpectralForge-Stempel importiert${spectralForgeCustomStampImportResult.skippedCount ? ` · ${spectralForgeCustomStampImportResult.skippedCount} bereits vorhanden` : ""}${spectralForgeCustomStampImportResult.replacedCount ? ` · ${spectralForgeCustomStampImportResult.replacedCount} differenziell ersetzt` : ""}`
    : "";
  const spectralForgeWorkspaceStatusSuffix = spectralForgeWorkspaceProjectImportResult
    ? ` · ${spectralForgeWorkspaceProjectImportResult.importedCount} gespeicherte SyntheticForge-Arbeitsstände importiert${spectralForgeWorkspaceProjectImportResult.skippedCount ? ` · ${spectralForgeWorkspaceProjectImportResult.skippedCount} vorhanden` : ""}${spectralForgeWorkspaceProjectImportResult.replacedCount ? ` · ${spectralForgeWorkspaceProjectImportResult.replacedCount} ersetzt` : ""}${syntheticForgeCurrentWorkspaceImported ? " · offener Arbeitsstand wiederhergestellt" : ""}`
    : syntheticForgeCurrentWorkspaceImported ? " · offener SyntheticForge-Arbeitsstand wiederhergestellt" : "";
  const browserStorageStatusSuffix = browserStorageImportResult.importedCount
    ? ` · ${browserStorageImportResult.importedCount} lokale Browser-Bibliotheks-Einträge gespiegelt`
    : "";
  const residentConstellationStatusSuffix = residentConstellationImportResult.present
    ? ` · ${residentConstellationImportResult.importedCount} Raum-III-Konstellation(en) importiert${residentConstellationImportResult.skippedCount ? ` · ${residentConstellationImportResult.skippedCount} bereits vorhanden` : ""}${residentConstellationImportResult.replacedCount ? ` · ${residentConstellationImportResult.replacedCount} ersetzt` : ""}`
    : "";
  let rootFollowStatusSuffix = "";
  const materialIdMap =
    materialImportResult?.importedIdMap ?? new Map<string, string>();
  const validMaterialIds = new Set(
    getMaterialLibraryState().entries.map((entry) => entry.id),
  );
  if (archive.rootFollowBank) {
    const remappedRootFollowBank = remapRootFollowBankArchivePayload({
      payload: archive.rootFollowBank,
      idMap: materialIdMap,
      validIds: validMaterialIds.size ? validMaterialIds : undefined,
    });
    const nextRootFollowBank = combineRootFollowBankArchivePayload({
      current: readPersistedRootFollowBank(),
      imported: remappedRootFollowBank,
      mode: args.mode,
    });
    writePersistedRootFollowBank(nextRootFollowBank);
    const unresolvedRootFollowRefs = archive.rootFollowBank.memberIds.filter(
      (id) =>
        !remappedRootFollowBank.memberIds.includes(materialIdMap.get(id) ?? id),
    );
    ledger.rootFollow.imported = remappedRootFollowBank.memberIds.length;
    ledger.rootFollow.importedBankEntries =
      remappedRootFollowBank.memberIds.length;
    ledger.rootFollow.unresolvedMaterialRefs = unresolvedRootFollowRefs;
    ledger.rootFollow.activatedEntryId =
      nextRootFollowBank.orderedIds[0] ??
      nextRootFollowBank.memberIds[0] ??
      null;
    rootFollowStatusSuffix = remappedRootFollowBank.memberIds.length
      ? ` · ${remappedRootFollowBank.memberIds.length} Root-Follow-Loop(s) übernommen`
      : archive.rootFollowBank.memberIds.length
        ? " · Root-Follow-Bank ohne gültige Materialspur"
        : "";
  } else {
    const preferredRootFollowBank =
      buildPreferredRootFollowBankFromMaterialImport({
        archiveMaterialLibrary: archive.materialLibrary,
        materialIdMap,
        validMaterialIds,
      });
    if (preferredRootFollowBank) {
      const nextRootFollowBank = combineRootFollowBankArchivePayload({
        current: readPersistedRootFollowBank(),
        imported: preferredRootFollowBank,
        mode: args.mode,
      });
      writePersistedRootFollowBank(nextRootFollowBank);
      ledger.rootFollow.present = true;
      ledger.rootFollow.imported = preferredRootFollowBank.memberIds.length;
      ledger.rootFollow.reconstructedLegacyEntries =
        preferredRootFollowBank.memberIds.length;
      ledger.rootFollow.activatedEntryId =
        nextRootFollowBank.orderedIds[0] ??
        nextRootFollowBank.memberIds[0] ??
        null;
      rootFollowStatusSuffix = ` · ${preferredRootFollowBank.memberIds.length} Root-Follow-Loop(s) aus älterer Paketmarkierung aktiviert`;
    } else if (args.mode === "replace") {
      writePersistedRootFollowBank(createPersistedRootFollowBankPatch({}));
      ledger.rootFollow.present = true;
      rootFollowStatusSuffix = " · Root-Follow-Bank geleert";
    }
  }

  recordWorkspacePackageImportLedger(ledger);
  const ledgerStatusSuffix = ` · ${formatWorkspacePackageImportLedgerSummary(ledger)}`;
  const scheduleSpectralForgeWorkspaceRemount = () => {
    if (!syntheticForgeCurrentWorkspaceImported || typeof window === 'undefined') return;
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent(SYNTHETIC_FORGE_PACKAGE_WORKSPACE_RESTORED_EVENT));
    }, 0);
  };

  if (args.mode === "replace" || args.mode === "differential") {
    const importedWorkspace = remapArchiveProjectSampleReferences(
      archive.workspace,
      sampleIdMap,
      {
        origin: "importedPackage",
        sourcePackageId: archive.packageId,
        syncState: "imported",
      },
    );
    const workspaceComposer = cloneLoopComposerState(
      importedWorkspace.composer,
    );
    const workspaceVariants = cloneMelodicPatternVariantMap(
      importedWorkspace.patternVariants,
    );
    const workspaceLinks = cloneMelodicPatternLinkMap(
      importedWorkspace.patternLinks,
    );
    scheduleSpectralForgeWorkspaceRemount();
    return {
      mode: args.mode as "replace" | "differential",
      archive,
      refreshedSamples,
      importedProjects,
      workspaceComposer,
      workspaceVariants,
      workspaceLinks,
      ledger,
      statusMessage:
        args.mode === "differential"
          ? `Workspace-Paket differenziell als Arbeitskopie kombiniert: ${archive.samples.length} Samples · ${importedProjects.length} Projekte${sampleImportStatusSuffix}${gridStatusSuffix}${materialStatusSuffix}${bassClipStatusSuffix}${drumConfigStatusSuffix}${spectralForgeStatusSuffix}${spectralForgeCustomStampStatusSuffix}${spectralForgeWorkspaceStatusSuffix}${residentConstellationStatusSuffix}${browserStorageStatusSuffix}${rootFollowStatusSuffix}.${ledgerStatusSuffix}`
          : `Workspace-Paket als lokale Arbeitskopie geladen: ${archive.samples.length} Samples · ${importedProjects.length} Projekte${sampleImportStatusSuffix}${gridStatusSuffix}${materialStatusSuffix}${bassClipStatusSuffix}${drumConfigStatusSuffix}${spectralForgeStatusSuffix}${spectralForgeCustomStampStatusSuffix}${spectralForgeWorkspaceStatusSuffix}${residentConstellationStatusSuffix}${browserStorageStatusSuffix}${rootFollowStatusSuffix}.${ledgerStatusSuffix}`,
    };
  }

  scheduleSpectralForgeWorkspaceRemount();
  return {
    mode: "merge" as const,
    archive,
    refreshedSamples,
    importedProjects,
    ledger,
    statusMessage: `Workspace-Paket additiv ergänzt: ${archive.samples.length} Samples · ${importedProjects.length} Projekte hinzugefügt${sampleImportStatusSuffix}${gridStatusSuffix}${materialStatusSuffix}${bassClipStatusSuffix}${drumConfigStatusSuffix}${spectralForgeStatusSuffix}${spectralForgeCustomStampStatusSuffix}${spectralForgeWorkspaceStatusSuffix}${residentConstellationStatusSuffix}${browserStorageStatusSuffix}${rootFollowStatusSuffix}.${ledgerStatusSuffix}`,
  };
}
