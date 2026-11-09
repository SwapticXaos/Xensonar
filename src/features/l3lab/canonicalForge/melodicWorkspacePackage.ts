import { cloneLoopComposerState } from "./loopDrumDomain";
import {
  cloneMelodicPatternLinkMap,
  cloneMelodicPatternVariantMap,
  type SavedMelodicProject,
} from "./melodicProjectLibrary";
import {
  buildJsonPackageId,
  hashStableString,
} from "../../../core/systemMemory/packageCore";
import {
  MELODIC_WORKSPACE_ARCHIVE_FORMAT,
  MELODIC_WORKSPACE_ARCHIVE_VERSION,
  WORKSPACE_ARCHIVE_SECTION_KINDS,
  createArchiveSection,
} from "./melodicWorkspaceArchiveManifest";
import { buildGridLibraryArchivePayload } from "../../xensonar/domain/gridLibraryPackage";
import type { GridTuning, StoredCustomGridTuning } from "../../xensonar/domain/instrumentData";
import type { MaterialLibraryArchivePayload } from "../materialLibraryPackage";
import type { RootFollowBankArchivePayload } from "../../xensonar/material/rootFollowBankPackage";
import type { BassClipLibraryArchivePayload } from "../../xensonar/groove/bassClipLibraryPackage";
import type { DrumConfigLibraryArchivePayload } from "../../xensonar/drumConfigLibraryTypes";
import type { ForgeProjectLibraryArchivePayload } from "../spectralForge/projectLibrary";
import type { CustomStampLibraryArchivePayload } from "../spectralForge/customStampLibrary";
import type { SyntheticForgeCurrentWorkspaceArchivePayload, SyntheticForgeSavedWorkspaceLibraryArchivePayload } from "./syntheticForgeWorkspacePackage";
import {
  exportWorkspaceBrowserStorageArchivePayload,
  type WorkspaceBrowserStorageArchivePayload,
} from "./melodicWorkspaceBrowserStoragePackage";
import {
  exportResidentConstellationArchivePayload,
  type ResidentConstellationArchivePayload,
} from "../../topology/residentConstellations";
import { parseMelodicWorkspaceArchiveWithHosts } from "./melodicWorkspaceArchiveCodec";
import type {
  MelodicWorkspaceArchive,
  MelodicWorkspaceArchiveProject,
  MelodicWorkspaceArchiveSample,
  MelodicWorkspaceArchiveSection,
} from "./melodicWorkspaceArchiveTypes";

export {
  buildMelodicWorkspaceArchiveBlobParts,
  downloadMelodicWorkspaceArchive,
  downloadMelodicWorkspaceArchiveFromArchive,
  prepareMelodicWorkspaceArchiveDownload,
  prepareMelodicWorkspaceArchiveDownloadFromArchive,
  serializeMelodicWorkspaceArchive,
} from "./melodicWorkspaceArchiveCodec";

export type {
  MelodicWorkspaceArchive,
  MelodicWorkspaceArchiveProject,
  MelodicWorkspaceArchiveSample,
  MelodicWorkspaceArchiveSection,
} from "./melodicWorkspaceArchiveTypes";

export function buildWorkspaceArchivePackageId() {
  return buildJsonPackageId("pkg");
}

export function cloneArchiveProject(
  project: MelodicWorkspaceArchiveProject,
): MelodicWorkspaceArchiveProject {
  return {
    ...project,
    composer: cloneLoopComposerState(project.composer),
    patternVariants: cloneMelodicPatternVariantMap(project.patternVariants),
    patternLinks: cloneMelodicPatternLinkMap(project.patternLinks),
  };
}

export function buildMelodicWorkspaceArchive(args: {
  packageId?: string;
  label: string;
  workspace: MelodicWorkspaceArchiveProject;
  projects: MelodicWorkspaceArchiveProject[];
  samples: MelodicWorkspaceArchiveSample[];
  gridLibrary?: {
    selectedTuning: GridTuning | null;
    activeRack: GridTuning[];
    customTunings: StoredCustomGridTuning[];
  } | null;
  materialLibrary?: MaterialLibraryArchivePayload | null;
  rootFollowBank?: RootFollowBankArchivePayload | null;
  bassClipLibrary?: BassClipLibraryArchivePayload | null;
  drumConfigLibrary?: DrumConfigLibraryArchivePayload | null;
  spectralForgeProjects?: ForgeProjectLibraryArchivePayload | null;
  spectralForgeCustomStamps?: CustomStampLibraryArchivePayload | null;
  syntheticForgeSavedWorkspaces?: SyntheticForgeSavedWorkspaceLibraryArchivePayload | null;
  syntheticForgeCurrentWorkspace?: SyntheticForgeCurrentWorkspaceArchivePayload | null;
  residentConstellations?: ResidentConstellationArchivePayload | null;
  browserLocalStorage?: WorkspaceBrowserStorageArchivePayload | null;
  warnings?: string[];
}): MelodicWorkspaceArchive {
  const packageId = args.packageId ?? buildWorkspaceArchivePackageId();
  const workspace = cloneArchiveProject({
    ...args.workspace,
    origin: args.workspace.origin ?? "browserLocal",
    sourcePackageId: args.workspace.sourcePackageId ?? null,
    syncState: args.workspace.syncState ?? "localOnly",
    contentHash:
      args.workspace.contentHash ??
      hashStableString(
        JSON.stringify(args.workspace.composer) +
          JSON.stringify(args.workspace.patternVariants),
      ),
  });
  const projects = args.projects.map((project) =>
    cloneArchiveProject({
      ...project,
      origin: project.origin ?? "browserLocal",
      sourcePackageId: project.sourcePackageId ?? null,
      syncState: project.syncState ?? "localOnly",
      contentHash:
        project.contentHash ??
        hashStableString(
          JSON.stringify(project.composer) +
            JSON.stringify(project.patternVariants),
        ),
    }),
  );
  const samples = args.samples.map((sample) => ({
    ...sample,
    contentHash:
      sample.contentHash ??
      hashStableString(
        `${sample.name}|${sample.sizeBytes}|${sample.durationSec}|${sample.dataBase64.length}`,
      ),
    origin: sample.origin ?? "browserLocal",
    sourcePackageId: sample.sourcePackageId ?? null,
    syncState: sample.syncState ?? "localOnly",
  }));
  const gridLibrary = args.gridLibrary
    ? buildGridLibraryArchivePayload(args.gridLibrary)
    : null;
  const customRasterPresets = gridLibrary;
  const customRasterPresetLibrary = gridLibrary;
  const materialLibrary = args.materialLibrary ?? null;
  const rootFollowBank = args.rootFollowBank ?? null;
  const bassClipLibrary = args.bassClipLibrary ?? null;
  const bassPatternLibrary = bassClipLibrary;
  const bassPatterns = bassClipLibrary;
  const drumConfigLibrary = args.drumConfigLibrary ?? null;
  const spectralForgeProjects = args.spectralForgeProjects ?? null;
  const spectralForgeCustomStamps = args.spectralForgeCustomStamps ?? null;
  const syntheticForgeSavedWorkspaces = args.syntheticForgeSavedWorkspaces ?? null;
  const syntheticForgeCurrentWorkspace = args.syntheticForgeCurrentWorkspace ?? null;
  const residentConstellations = args.residentConstellations ?? exportResidentConstellationArchivePayload();
  const room3ResidentConstellations = residentConstellations;
  const browserLocalStorage = args.browserLocalStorage ?? exportWorkspaceBrowserStorageArchivePayload();
  const sections: MelodicWorkspaceArchiveSection[] = [
    createArchiveSection(
      WORKSPACE_ARCHIVE_SECTION_KINDS.workspace,
      workspace,
      workspace.name,
    ),
    createArchiveSection(
      WORKSPACE_ARCHIVE_SECTION_KINDS.savedProjects,
      projects,
      `${projects.length} Projekte`,
    ),
    createArchiveSection(
      WORKSPACE_ARCHIVE_SECTION_KINDS.sampleLibrary,
      samples,
      `${samples.length} Samples`,
    ),
    createArchiveSection(
      WORKSPACE_ARCHIVE_SECTION_KINDS.gridLibrary,
      gridLibrary,
      gridLibrary ? `${gridLibrary.customTunings.length} Custom-Raster` : "keine Raster",
    ),
    createArchiveSection(
      WORKSPACE_ARCHIVE_SECTION_KINDS.customRasterPresetLibrary,
      customRasterPresets,
      customRasterPresets
        ? `${customRasterPresets.customTunings.length} Custom-Raster-Preset(s)`
        : "keine Custom-Raster-Presets",
    ),
    createArchiveSection(
      WORKSPACE_ARCHIVE_SECTION_KINDS.customRasterPresets,
      customRasterPresetLibrary,
      customRasterPresetLibrary
        ? `${customRasterPresetLibrary.customTunings.length} Custom-Raster-Preset(s)`
        : "keine Custom-Raster-Presets",
    ),
    createArchiveSection(
      WORKSPACE_ARCHIVE_SECTION_KINDS.materialLibrary,
      materialLibrary,
      materialLibrary ? `${materialLibrary.entries.length} Materialspuren` : "keine Materialien",
    ),
    createArchiveSection(
      WORKSPACE_ARCHIVE_SECTION_KINDS.rootFollowBank,
      rootFollowBank,
      rootFollowBank
        ? `${rootFollowBank.memberIds.length} Root-Follow-Loop(s)`
        : "keine Root-Follow-Bank",
    ),
    createArchiveSection(
      WORKSPACE_ARCHIVE_SECTION_KINDS.bassClipLibrary,
      bassClipLibrary,
      bassClipLibrary
        ? `${bassClipLibrary.clips.length} Basslauf-Arbeitskopie(n)`
        : "keine Bassläufe",
    ),
    createArchiveSection(
      WORKSPACE_ARCHIVE_SECTION_KINDS.bassPatternLibrary,
      bassPatternLibrary,
      bassPatternLibrary
        ? `${bassPatternLibrary.clips.length} Bass-Pattern(s)`
        : "keine Bass-Patterns",
    ),
    createArchiveSection(
      WORKSPACE_ARCHIVE_SECTION_KINDS.bassPatterns,
      bassPatterns,
      bassPatterns ? `${bassPatterns.clips.length} Bass-Pattern(s)` : "keine Bass-Patterns",
    ),
    createArchiveSection(
      WORKSPACE_ARCHIVE_SECTION_KINDS.drumConfigLibrary,
      drumConfigLibrary,
      drumConfigLibrary
        ? `${drumConfigLibrary.entries.length} Drum-Pattern(s)${drumConfigLibrary.playlist ? " · Playlist" : ""}`
        : "keine Drum-Patterns",
    ),
    createArchiveSection(
      WORKSPACE_ARCHIVE_SECTION_KINDS.spectralForgeProjectLibrary,
      spectralForgeProjects,
      spectralForgeProjects
        ? `${spectralForgeProjects.projects.length} SpectralForge-Projekt(e)`
        : "keine SpectralForge-Projekte",
    ),
    createArchiveSection(
      WORKSPACE_ARCHIVE_SECTION_KINDS.spectralForgeCustomStampLibrary,
      spectralForgeCustomStamps,
      spectralForgeCustomStamps
        ? `${spectralForgeCustomStamps.stamps.length} SpectralForge-Stempel`
        : "keine SpectralForge-Stempel",
    ),
    createArchiveSection(
      WORKSPACE_ARCHIVE_SECTION_KINDS.syntheticForgeSavedWorkspaceLibrary,
      syntheticForgeSavedWorkspaces,
      syntheticForgeSavedWorkspaces
        ? `${syntheticForgeSavedWorkspaces.projects.length} gespeicherte SyntheticForge-Arbeitsstände`
        : "keine gespeicherten SyntheticForge-Arbeitsstände",
    ),
    createArchiveSection(
      WORKSPACE_ARCHIVE_SECTION_KINDS.syntheticForgeCurrentWorkspace,
      syntheticForgeCurrentWorkspace,
      syntheticForgeCurrentWorkspace ? "aktueller SyntheticForge-Arbeitsstand" : "kein offener SyntheticForge-Arbeitsstand",
    ),
    createArchiveSection(
      WORKSPACE_ARCHIVE_SECTION_KINDS.residentConstellationLibrary,
      residentConstellations,
      residentConstellations
        ? `${residentConstellations.entries.length} Resident-Konstellation(en)`
        : "keine Resident-Konstellationen",
    ),
    createArchiveSection(
      WORKSPACE_ARCHIVE_SECTION_KINDS.browserLocalStorage,
      browserLocalStorage,
      browserLocalStorage
        ? `${browserLocalStorage.entries.length} Browser-Speicher-Einträge`
        : "kein Browser-Speicher-Spiegel",
    ),
  ];
  return {
    format: MELODIC_WORKSPACE_ARCHIVE_FORMAT,
    version: MELODIC_WORKSPACE_ARCHIVE_VERSION,
    packageId,
    exportedAt: Date.now(),
    label: args.label,
    sections,
    workspace,
    projects,
    samples,
    gridLibrary,
    customRasterPresets,
    customRasterPresetLibrary,
    materialLibrary,
    rootFollowBank,
    bassClipLibrary,
    bassPatternLibrary,
    bassPatterns,
    drumConfigLibrary,
    spectralForgeProjects,
    spectralForgeCustomStamps,
    syntheticForgeSavedWorkspaces,
    syntheticForgeCurrentWorkspace,
    residentConstellations,
    room3ResidentConstellations,
    browserLocalStorage,
    warnings: args.warnings ?? [],
  };
}



export function parseMelodicWorkspaceArchive(
  json: string,
): MelodicWorkspaceArchive {
  return parseMelodicWorkspaceArchiveWithHosts(
    { buildWorkspaceArchivePackageId, cloneArchiveProject },
    json,
  );
}

export function remapArchiveProjectSampleReferences(
  project: MelodicWorkspaceArchiveProject,
  sampleIdMap: Map<string, string>,
  options?: {
    origin?: SavedMelodicProject["origin"];
    sourcePackageId?: string | null;
    syncState?: SavedMelodicProject["syncState"];
  },
): SavedMelodicProject {
  const composer = cloneLoopComposerState(project.composer);
  composer.tracks = composer.tracks.map((track) => {
    const presetId = track.instrumentPreset;
    if (!presetId?.startsWith("sample:")) return { ...track };
    const archivedId = presetId.slice("sample:".length);
    const nextSampleId = sampleIdMap.get(archivedId);
    return {
      ...track,
      instrumentPreset: nextSampleId
        ? `sample:${nextSampleId}`
        : track.instrumentPreset,
    };
  });
  return {
    id: project.id,
    name: project.name,
    composer,
    patternVariants: cloneMelodicPatternVariantMap(project.patternVariants),
    patternLinks: cloneMelodicPatternLinkMap(project.patternLinks),
    origin: options?.origin ?? project.origin ?? "importedPackage",
    sourcePackageId:
      options?.sourcePackageId ?? project.sourcePackageId ?? null,
    syncState: options?.syncState ?? project.syncState ?? "imported",
    contentHash: project.contentHash ?? null,
  };
}
