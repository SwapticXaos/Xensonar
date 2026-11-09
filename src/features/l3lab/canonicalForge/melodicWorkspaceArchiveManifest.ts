import {
  readJsonPackageSectionPayload,
  type JsonPackageSection,
} from "../../../core/systemMemory/packageCore";
import {
  WORKSPACE_PACKAGE_DEFAULT_TITLE,
  normalizeWorkspacePackageTitle,
} from "../../../core/systemMemory/workspacePackageTitle";

export const MELODIC_WORKSPACE_ARCHIVE_FORMAT = "xensonar-melodic-workspace" as const;
export const MELODIC_WORKSPACE_ARCHIVE_VERSION = 1 as const;

export { WORKSPACE_PACKAGE_DEFAULT_TITLE, normalizeWorkspacePackageTitle };

export const WORKSPACE_ARCHIVE_SECTION_KINDS = {
  workspace: "melodic-workspace",
  savedProjects: "saved-projects",
  sampleLibrary: "sample-library",
  gridLibrary: "grid-library",
  customRasterPresetLibrary: "custom-raster-preset-library",
  customRasterPresets: "custom-raster-presets",
  materialLibrary: "material-library",
  rootFollowBank: "root-follow-bank",
  bassClipLibrary: "bass-clip-library",
  bassPatternLibrary: "bass-pattern-library",
  bassPatterns: "bass-patterns",
  drumConfigLibrary: "drum-config-library",
  spectralForgeProjectLibrary: "spectral-forge-project-library",
  spectralForgeCustomStampLibrary: "spectral-forge-custom-stamp-library",
  syntheticForgeSavedWorkspaceLibrary: "synthetic-forge-workspace-project-library",
  syntheticForgeCurrentWorkspace: "synthetic-forge-current-workspace",
  // 322 wire aliases: these mislabeled SyntheticForge state as SpectralForge. Read-only compatibility.
  spectralForgeSavedWorkspaceLibraryLegacy: "spectral-forge-workspace-project-library",
  spectralForgeCurrentWorkspaceLegacy: "spectral-forge-current-workspace",
  residentConstellationLibrary: "resident-constellation-library",
  browserLocalStorage: "browser-local-storage",
} as const;

export type WorkspaceArchiveSectionKind =
  (typeof WORKSPACE_ARCHIVE_SECTION_KINDS)[keyof typeof WORKSPACE_ARCHIVE_SECTION_KINDS];

export const WORKSPACE_ARCHIVE_SECTION_ALIASES = {
  gridLibrary: [
    WORKSPACE_ARCHIVE_SECTION_KINDS.gridLibrary,
    WORKSPACE_ARCHIVE_SECTION_KINDS.customRasterPresetLibrary,
    WORKSPACE_ARCHIVE_SECTION_KINDS.customRasterPresets,
  ],
  bassClipLibrary: [
    WORKSPACE_ARCHIVE_SECTION_KINDS.bassClipLibrary,
    WORKSPACE_ARCHIVE_SECTION_KINDS.bassPatternLibrary,
    WORKSPACE_ARCHIVE_SECTION_KINDS.bassPatterns,
  ],
  syntheticForgeSavedWorkspaces: [
    WORKSPACE_ARCHIVE_SECTION_KINDS.syntheticForgeSavedWorkspaceLibrary,
    WORKSPACE_ARCHIVE_SECTION_KINDS.spectralForgeSavedWorkspaceLibraryLegacy,
  ],
  syntheticForgeCurrentWorkspace: [
    WORKSPACE_ARCHIVE_SECTION_KINDS.syntheticForgeCurrentWorkspace,
    WORKSPACE_ARCHIVE_SECTION_KINDS.spectralForgeCurrentWorkspaceLegacy,
  ],
  residentConstellations: [
    WORKSPACE_ARCHIVE_SECTION_KINDS.residentConstellationLibrary,
  ],
} as const;

export const WORKSPACE_ARCHIVE_TOP_LEVEL_ALIASES = {
  customRasterPresetLibrary: [
    "gridLibrary",
    "customRasterPresets",
    "customRasterPresetLibrary",
    "customRasterPresetLibraryV1",
  ],
  bassClipLibrary: [
    "bassClipLibrary",
    "bassPatternLibrary",
    "bassPatterns",
    "bassPatternLibraryV1",
  ],
  residentConstellations: [
    "residentConstellations",
    "room3ResidentConstellations",
  ],
} as const;

export const WORKSPACE_ARCHIVE_COMPACT_SECTION_PAYLOAD_KINDS = new Set<string>([
  WORKSPACE_ARCHIVE_SECTION_KINDS.gridLibrary,
  WORKSPACE_ARCHIVE_SECTION_KINDS.customRasterPresetLibrary,
  WORKSPACE_ARCHIVE_SECTION_KINDS.customRasterPresets,
  WORKSPACE_ARCHIVE_SECTION_KINDS.materialLibrary,
  WORKSPACE_ARCHIVE_SECTION_KINDS.rootFollowBank,
  WORKSPACE_ARCHIVE_SECTION_KINDS.bassClipLibrary,
  WORKSPACE_ARCHIVE_SECTION_KINDS.bassPatternLibrary,
  WORKSPACE_ARCHIVE_SECTION_KINDS.bassPatterns,
  WORKSPACE_ARCHIVE_SECTION_KINDS.drumConfigLibrary,
  WORKSPACE_ARCHIVE_SECTION_KINDS.spectralForgeProjectLibrary,
  WORKSPACE_ARCHIVE_SECTION_KINDS.spectralForgeCustomStampLibrary,
  WORKSPACE_ARCHIVE_SECTION_KINDS.residentConstellationLibrary,
  WORKSPACE_ARCHIVE_SECTION_KINDS.browserLocalStorage,
]);

export function isCompactWorkspaceArchiveSectionKind(kind: string) {
  return WORKSPACE_ARCHIVE_COMPACT_SECTION_PAYLOAD_KINDS.has(kind);
}

export function readFirstWorkspaceArchiveSectionPayload(
  parsed: unknown,
  kinds: readonly string[],
): unknown {
  for (const kind of kinds) {
    const payload = readJsonPackageSectionPayload(parsed, kind);
    if (payload != null) return payload;
  }
  return null;
}

export function readFirstWorkspaceArchiveTopLevelPayload(
  parsed: unknown,
  propertyNames: readonly string[],
): unknown {
  if (typeof parsed !== "object" || parsed === null) return null;
  const record = parsed as Record<string, unknown>;
  for (const propertyName of propertyNames) {
    if (record[propertyName] != null) return record[propertyName];
  }
  return null;
}

export function createArchiveSection<Kind extends WorkspaceArchiveSectionKind, Payload>(
  kind: Kind,
  payload: Payload,
  summary: string | undefined,
): JsonPackageSection<Kind, Payload> {
  return {
    kind,
    payload,
    summary,
  };
}
