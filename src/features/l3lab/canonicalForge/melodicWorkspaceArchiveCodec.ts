import {
  downloadJsonPackage,
  isRecord,
  parseJsonPackageMeta,
  prepareJsonPackageDownload,
  prepareJsonPackageDownloadFromBlobParts,
  revokePreparedJsonPackageDownload,
  serializeJsonPackage,
  type PreparedJsonPackageDownload,
} from "../../../core/systemMemory/packageCore";
import {
  MELODIC_WORKSPACE_ARCHIVE_FORMAT,
  MELODIC_WORKSPACE_ARCHIVE_VERSION,
  WORKSPACE_ARCHIVE_SECTION_ALIASES,
  WORKSPACE_ARCHIVE_SECTION_KINDS,
  WORKSPACE_ARCHIVE_TOP_LEVEL_ALIASES,
  createArchiveSection,
  isCompactWorkspaceArchiveSectionKind,
  readFirstWorkspaceArchiveSectionPayload,
  readFirstWorkspaceArchiveTopLevelPayload,
} from "./melodicWorkspaceArchiveManifest";
import { parseGridLibraryArchivePayload } from "../../xensonar/domain/gridLibraryPackage";
import { parseMaterialLibraryArchivePayload } from "../materialLibraryPackage";
import { parseRootFollowBankArchivePayload } from "../../xensonar/material/rootFollowBankPackage";
import { parseBassClipLibraryArchivePayload } from "../../xensonar/groove/bassClipLibraryPackage";
import { parseDrumConfigLibraryArchivePayload } from "../../xensonar/drumConfigLibrary";
import { parseForgeProjectLibraryArchivePayload } from "../spectralForge/projectLibrary";
import { parseCustomStampLibraryArchivePayload } from "../spectralForge/customStampLibrary";
import { parseWorkspaceBrowserStorageArchivePayload } from "./melodicWorkspaceBrowserStoragePackage";
import { parseResidentConstellationArchivePayload } from "../../topology/residentConstellations";
import { parseSyntheticForgeCurrentWorkspaceArchivePayload, parseSyntheticForgeSavedWorkspaceLibraryArchivePayload } from "./syntheticForgeWorkspacePackage";
import type {
  MelodicWorkspaceArchive,
  MelodicWorkspaceArchiveProject,
  MelodicWorkspaceArchiveSample,
  MelodicWorkspaceArchiveSection,
} from "./melodicWorkspaceArchiveTypes";

export type MelodicWorkspaceArchiveCodecHosts = {
  buildWorkspaceArchivePackageId: () => string;
  cloneArchiveProject: (project: MelodicWorkspaceArchiveProject) => MelodicWorkspaceArchiveProject;
};

export function serializeMelodicWorkspaceArchive(
  archive: MelodicWorkspaceArchive,
) {
  return serializeJsonPackage(archive);
}

const MAX_ARCHIVE_NUMBER_ARRAY_LENGTH = 16_384;
const MAX_TYPED_ARRAY_PREVIEW_LENGTH = 1_024;

type TypedArrayLikeForPackage = ArrayBufferView & {
  length?: number;
  byteLength: number;
  constructor: { name?: string };
  slice?: (start?: number, end?: number) => ArrayLike<number>;
};

function isTypedArrayLikeForPackage(value: unknown): value is TypedArrayLikeForPackage {
  return ArrayBuffer.isView(value) && !(value instanceof DataView);
}

function finiteNumberArrayPreview(value: ArrayLike<number>, limit: number) {
  const count = Math.min(Math.max(0, value.length), limit);
  const out: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const next = Number(value[index]);
    out.push(Number.isFinite(next) ? next : 0);
  }
  return out;
}

function packageSafeJsonReplacer(_key: string, value: unknown) {
  if (value instanceof ArrayBuffer) {
    return {
      xensonarArchiveOmittedBinary: true,
      format: 'arraybuffer-metadata',
      byteLength: value.byteLength,
    };
  }
  if (value instanceof DataView) {
    return {
      xensonarArchiveOmittedBinary: true,
      format: 'dataview-metadata',
      byteLength: value.byteLength,
    };
  }
  if (isTypedArrayLikeForPackage(value)) {
    const length = typeof value.length === 'number' ? value.length : Math.floor(value.byteLength / 4);
    const previewLength = Math.min(MAX_TYPED_ARRAY_PREVIEW_LENGTH, length);
    return {
      xensonarArchiveOmittedTypedArray: true,
      format: 'typed-array-metadata',
      type: value.constructor?.name ?? 'TypedArray',
      length,
      byteLength: value.byteLength,
      preview: finiteNumberArrayPreview(value as unknown as ArrayLike<number>, previewLength),
    };
  }
  if (Array.isArray(value) && value.length > MAX_ARCHIVE_NUMBER_ARRAY_LENGTH) {
    let numeric = true;
    for (let index = 0; index < Math.min(value.length, MAX_ARCHIVE_NUMBER_ARRAY_LENGTH + 1); index += 1) {
      if (typeof value[index] !== 'number') {
        numeric = false;
        break;
      }
    }
    if (numeric) {
      return {
        xensonarArchiveTruncatedNumberArray: true,
        originalLength: value.length,
        values: (value as number[]).slice(0, MAX_ARCHIVE_NUMBER_ARRAY_LENGTH),
      };
    }
  }
  return value;
}

function stringifyWorkspaceArchivePart(value: unknown) {
  return JSON.stringify(value, packageSafeJsonReplacer);
}

type WorkspaceArchiveJsonPart = BlobPart;

function pushJsonArray<T>(parts: WorkspaceArchiveJsonPart[], values: T[]) {
  parts.push("[");
  values.forEach((value, index) => {
    if (index > 0) parts.push(",");
    parts.push(stringifyWorkspaceArchivePart(value));
  });
  parts.push("]");
}

function pushJsonValue(parts: WorkspaceArchiveJsonPart[], value: unknown) {
  parts.push(stringifyWorkspaceArchivePart(value));
}

function pushPropertyPrefix(parts: WorkspaceArchiveJsonPart[], propertyName: string, first: { value: boolean }) {
  if (first.value) first.value = false;
  else parts.push(",");
  parts.push(JSON.stringify(propertyName), ":");
}



function buildManifestSections(archive: MelodicWorkspaceArchive) {
  return archive.sections.map((section) => {
    const manifest: {
      kind: string;
      summary?: string;
      warnings?: string[];
      payload?: unknown;
    } = {
      kind: section.kind,
      summary: section.summary,
      warnings: section.warnings,
    };
    if (isCompactWorkspaceArchiveSectionKind(section.kind)) {
      manifest.payload = section.payload;
    }
    return manifest;
  });
}

export function buildMelodicWorkspaceArchiveBlobParts(
  archive: MelodicWorkspaceArchive,
): WorkspaceArchiveJsonPart[] {
  const parts: WorkspaceArchiveJsonPart[] = ["{"];
  const first = { value: true };
  const pushValueProp = (name: string, value: unknown) => {
    pushPropertyPrefix(parts, name, first);
    pushJsonValue(parts, value);
  };
  const pushArrayProp = <T,>(name: string, values: T[]) => {
    pushPropertyPrefix(parts, name, first);
    pushJsonArray(parts, values);
  };

  pushValueProp("format", archive.format);
  pushValueProp("version", archive.version);
  pushValueProp("packageId", archive.packageId);
  pushValueProp("exportedAt", archive.exportedAt);
  pushValueProp("label", archive.label);
  pushArrayProp("warnings", archive.warnings);
  pushArrayProp("sections", buildManifestSections(archive));
  pushValueProp("workspace", archive.workspace);
  pushArrayProp("projects", archive.projects);
  pushArrayProp("samples", archive.samples);
  pushValueProp("gridLibrary", archive.gridLibrary);
  pushValueProp("customRasterPresets", archive.customRasterPresets);
  pushValueProp("customRasterPresetLibrary", archive.customRasterPresetLibrary);
  pushValueProp("customRasterPresetLibraryV1", archive.customRasterPresetLibrary);
  pushValueProp("materialLibrary", archive.materialLibrary);
  pushValueProp("rootFollowBank", archive.rootFollowBank);
  pushValueProp("bassClipLibrary", archive.bassClipLibrary);
  pushValueProp("bassPatternLibrary", archive.bassPatternLibrary);
  pushValueProp("bassPatterns", archive.bassPatterns);
  pushValueProp("bassPatternLibraryV1", archive.bassPatterns);
  pushValueProp("drumConfigLibrary", archive.drumConfigLibrary);
  pushPropertyPrefix(parts, "spectralForgeProjects", first);
  if (!archive.spectralForgeProjects) {
    parts.push("null");
  } else {
    parts.push('{"projects":');
    pushJsonArray(parts, archive.spectralForgeProjects.projects);
    parts.push("}");
  }
  pushValueProp("syntheticForgeSavedWorkspaces", archive.syntheticForgeSavedWorkspaces);
  pushValueProp("syntheticForgeCurrentWorkspace", archive.syntheticForgeCurrentWorkspace);
  pushPropertyPrefix(parts, "spectralForgeCustomStamps", first);
  if (!archive.spectralForgeCustomStamps) {
    parts.push("null");
  } else {
    parts.push('{"stamps":');
    pushJsonArray(parts, archive.spectralForgeCustomStamps.stamps);
    parts.push("}");
  }
  pushValueProp("residentConstellations", archive.residentConstellations);
  pushValueProp("room3ResidentConstellations", archive.room3ResidentConstellations);
  pushValueProp("browserLocalStorage", archive.browserLocalStorage);
  parts.push("}");
  return parts;
}

export function prepareMelodicWorkspaceArchiveDownloadFromArchive(
  archive: MelodicWorkspaceArchive,
  label: string,
): PreparedJsonPackageDownload {
  return prepareJsonPackageDownloadFromBlobParts(
    buildMelodicWorkspaceArchiveBlobParts(archive),
    label,
    { prefix: "xensonar" },
  );
}

export function downloadMelodicWorkspaceArchiveFromArchive(
  archive: MelodicWorkspaceArchive,
  label: string,
) {
  const prepared = prepareMelodicWorkspaceArchiveDownloadFromArchive(archive, label);
  const anchor = document.createElement('a');
  anchor.href = prepared.url;
  anchor.download = prepared.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => revokePreparedJsonPackageDownload(prepared), 1200);
}


export function parseMelodicWorkspaceArchiveWithHosts(
  hosts: MelodicWorkspaceArchiveCodecHosts,
  json: string,
): MelodicWorkspaceArchive {
  const parsed = JSON.parse(json) as unknown;
  const meta = parseJsonPackageMeta({
    parsed,
    expectedFormat: MELODIC_WORKSPACE_ARCHIVE_FORMAT,
    expectedVersion: MELODIC_WORKSPACE_ARCHIVE_VERSION,
    fallbackLabel: "Xensonar-Melodic-Workspace",
    fallbackPackageId: hosts.buildWorkspaceArchivePackageId(),
  });
  const workspaceSection = readFirstWorkspaceArchiveSectionPayload(parsed, [
    WORKSPACE_ARCHIVE_SECTION_KINDS.workspace,
  ]);
  const projectsSection = readFirstWorkspaceArchiveSectionPayload(parsed, [
    WORKSPACE_ARCHIVE_SECTION_KINDS.savedProjects,
  ]);
  const samplesSection = readFirstWorkspaceArchiveSectionPayload(parsed, [
    WORKSPACE_ARCHIVE_SECTION_KINDS.sampleLibrary,
  ]);
  const gridSection = readFirstWorkspaceArchiveSectionPayload(
    parsed,
    WORKSPACE_ARCHIVE_SECTION_ALIASES.gridLibrary,
  );
  const materialSection = readFirstWorkspaceArchiveSectionPayload(parsed, [
    WORKSPACE_ARCHIVE_SECTION_KINDS.materialLibrary,
  ]);
  const rootFollowSection = readFirstWorkspaceArchiveSectionPayload(parsed, [
    WORKSPACE_ARCHIVE_SECTION_KINDS.rootFollowBank,
  ]);
  const bassSection = readFirstWorkspaceArchiveSectionPayload(
    parsed,
    WORKSPACE_ARCHIVE_SECTION_ALIASES.bassClipLibrary,
  );
  const drumConfigSection = readFirstWorkspaceArchiveSectionPayload(parsed, [
    WORKSPACE_ARCHIVE_SECTION_KINDS.drumConfigLibrary,
  ]);
  const spectralForgeSection = readFirstWorkspaceArchiveSectionPayload(parsed, [
    WORKSPACE_ARCHIVE_SECTION_KINDS.spectralForgeProjectLibrary,
  ]);
  const spectralForgeCustomStampSection = readFirstWorkspaceArchiveSectionPayload(parsed, [
    WORKSPACE_ARCHIVE_SECTION_KINDS.spectralForgeCustomStampLibrary,
  ]);
  const syntheticForgeSavedWorkspaceSection = readFirstWorkspaceArchiveSectionPayload(
    parsed,
    WORKSPACE_ARCHIVE_SECTION_ALIASES.syntheticForgeSavedWorkspaces,
  );
  const syntheticForgeCurrentWorkspaceSection = readFirstWorkspaceArchiveSectionPayload(
    parsed,
    WORKSPACE_ARCHIVE_SECTION_ALIASES.syntheticForgeCurrentWorkspace,
  );
  const residentConstellationSection = readFirstWorkspaceArchiveSectionPayload(
    parsed,
    WORKSPACE_ARCHIVE_SECTION_ALIASES.residentConstellations,
  );
  const browserLocalStorageSection = readFirstWorkspaceArchiveSectionPayload(parsed, [
    WORKSPACE_ARCHIVE_SECTION_KINDS.browserLocalStorage,
  ]);

  const workspace = isRecord(workspaceSection)
    ? workspaceSection
    : isRecord(parsed)
      ? parsed.workspace
      : null;
  if (!isRecord(workspace)) throw new Error("Workspace fehlt im Paket.");

  const projects = Array.isArray(projectsSection)
    ? projectsSection
    : isRecord(parsed) && Array.isArray(parsed.projects)
      ? parsed.projects
      : [];
  const samples = Array.isArray(samplesSection)
    ? samplesSection
    : isRecord(parsed) && Array.isArray(parsed.samples)
      ? parsed.samples
      : [];
  const gridLibrary = parseGridLibraryArchivePayload(
    gridSection ??
      readFirstWorkspaceArchiveTopLevelPayload(
        parsed,
        WORKSPACE_ARCHIVE_TOP_LEVEL_ALIASES.customRasterPresetLibrary,
      ),
  );
  const customRasterPresets = gridLibrary;
  const customRasterPresetLibrary = gridLibrary;
  const materialLibrary = parseMaterialLibraryArchivePayload(
    materialSection ??
      (isRecord(parsed)
        ? (parsed as Record<string, unknown>).materialLibrary
        : null),
  );
  const rootFollowBank = parseRootFollowBankArchivePayload(
    rootFollowSection ??
      (isRecord(parsed)
        ? (parsed as Record<string, unknown>).rootFollowBank
        : null),
  );
  const bassClipLibrary = parseBassClipLibraryArchivePayload(
    bassSection ??
      readFirstWorkspaceArchiveTopLevelPayload(
        parsed,
        WORKSPACE_ARCHIVE_TOP_LEVEL_ALIASES.bassClipLibrary,
      ),
  );
  const bassPatternLibrary = bassClipLibrary;
  const bassPatterns = bassClipLibrary;
  const drumConfigLibrary = parseDrumConfigLibraryArchivePayload(
    drumConfigSection ??
      (isRecord(parsed)
        ? (parsed as Record<string, unknown>).drumConfigLibrary
        : null),
  );
  const spectralForgeProjects = parseForgeProjectLibraryArchivePayload(
    spectralForgeSection ??
      (isRecord(parsed)
        ? (parsed as Record<string, unknown>).spectralForgeProjects
        : null),
  );
  const spectralForgeCustomStamps = parseCustomStampLibraryArchivePayload(
    spectralForgeCustomStampSection ??
      (isRecord(parsed)
        ? (parsed as Record<string, unknown>).spectralForgeCustomStamps
        : null),
  );
  const syntheticForgeSavedWorkspaces = parseSyntheticForgeSavedWorkspaceLibraryArchivePayload(
    syntheticForgeSavedWorkspaceSection ??
      (isRecord(parsed)
        ? ((parsed as Record<string, unknown>).syntheticForgeSavedWorkspaces ?? (parsed as Record<string, unknown>).spectralForgeSavedWorkspaces)
        : null),
  );
  const syntheticForgeCurrentWorkspace = parseSyntheticForgeCurrentWorkspaceArchivePayload(
    syntheticForgeCurrentWorkspaceSection ??
      (isRecord(parsed)
        ? ((parsed as Record<string, unknown>).syntheticForgeCurrentWorkspace ?? (parsed as Record<string, unknown>).spectralForgeCurrentWorkspace)
        : null),
  );
  const residentConstellations = parseResidentConstellationArchivePayload(
    residentConstellationSection ??
      readFirstWorkspaceArchiveTopLevelPayload(
        parsed,
        WORKSPACE_ARCHIVE_TOP_LEVEL_ALIASES.residentConstellations,
      ),
  );
  const room3ResidentConstellations = residentConstellations;
  const browserLocalStorage = parseWorkspaceBrowserStorageArchivePayload(
    browserLocalStorageSection ??
      (isRecord(parsed)
        ? (parsed as Record<string, unknown>).browserLocalStorage
        : null),
  );
  const sectionWorkspace = hosts.cloneArchiveProject(workspace as MelodicWorkspaceArchiveProject);
  const sectionProjects = projects.map((project) =>
    hosts.cloneArchiveProject(project as MelodicWorkspaceArchiveProject),
  );
  const sectionSamples = samples.map((sample) => sample as MelodicWorkspaceArchiveSample);
  const sections: MelodicWorkspaceArchiveSection[] = [
    createArchiveSection(
      WORKSPACE_ARCHIVE_SECTION_KINDS.workspace,
      sectionWorkspace,
      typeof (workspace as Record<string, unknown>).name === "string"
        ? ((workspace as Record<string, unknown>).name as string)
        : undefined,
    ),
    createArchiveSection(
      WORKSPACE_ARCHIVE_SECTION_KINDS.savedProjects,
      sectionProjects,
      `${projects.length} Projekte`,
    ),
    createArchiveSection(
      WORKSPACE_ARCHIVE_SECTION_KINDS.sampleLibrary,
      sectionSamples,
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
    ...meta,
    sections,
    workspace: sectionWorkspace,
    projects: sectionProjects,
    samples: sectionSamples,
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
    warnings: meta.warnings,
  };
}

export function prepareMelodicWorkspaceArchiveDownload(json: string, label: string): PreparedJsonPackageDownload {
  return prepareJsonPackageDownload(json, label, { prefix: "xensonar" });
}

export function downloadMelodicWorkspaceArchive(json: string, label: string) {
  downloadJsonPackage(json, label, { prefix: "xensonar" });
}
