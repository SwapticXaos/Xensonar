import type { LoopComposerState } from "./loopDrumDomain";
import type {
  MelodicPatternLinkMap,
  MelodicPatternVariantMap,
  SavedMelodicProject,
} from "./melodicProjectLibrary";
import type { SavedMelodicSampleMeta } from "./melodicSampleLibrary";
import type { LocalFieldModuleState } from "./localField";
import type { JsonPackageMeta, JsonPackageSection } from "../../../core/systemMemory/packageCore";
import { MELODIC_WORKSPACE_ARCHIVE_FORMAT, MELODIC_WORKSPACE_ARCHIVE_VERSION } from "./melodicWorkspaceArchiveManifest";
import type { GridLibraryArchivePayload } from "../../xensonar/domain/gridLibraryPackageTypes";
import type { MaterialLibraryArchivePayload } from "../materialLibraryPackage";
import type { RootFollowBankArchivePayload } from "../../xensonar/material/rootFollowBankPackage";
import type { BassClipLibraryArchivePayload } from "../../xensonar/groove/bassClipLibraryPackage";
import type { DrumConfigLibraryArchivePayload } from "../../xensonar/drumConfigLibraryTypes";
import type { ForgeProjectLibraryArchivePayload } from "../spectralForge/projectLibrary";
import type { CustomStampLibraryArchivePayload } from "../spectralForge/customStampLibrary";
import type { WorkspaceBrowserStorageArchivePayload } from "./melodicWorkspaceBrowserStoragePackage";
import type { ResidentConstellationArchivePayload } from "../../topology/residentConstellations";
import type { SyntheticForgeCurrentWorkspaceArchivePayload, SyntheticForgeSavedWorkspaceLibraryArchivePayload } from "./syntheticForgeWorkspacePackage";

export type MelodicWorkspaceArchiveSample = {
  archivedId: string;
  name: string;
  mimeType: string;
  dataBase64: string;
  createdAt: number;
  sizeBytes: number;
  durationSec: number;
  baseHz: number | null;
  baseHzSource: SavedMelodicSampleMeta["baseHzSource"];
  volumeEnvelope?: LocalFieldModuleState | null;
  pitchEnvelope?: LocalFieldModuleState | null;
  contentHash: string | null;
  origin: SavedMelodicSampleMeta["origin"];
  sourcePackageId: string | null;
  syncState: SavedMelodicSampleMeta["syncState"];
  legacyMeta?: {
    tempoPitchLinked?: boolean;
    playbackDurationSec?: number | null;
  };
};

export type MelodicWorkspaceArchiveProject = {
  id: string;
  name: string;
  composer: LoopComposerState;
  patternVariants: MelodicPatternVariantMap;
  patternLinks: MelodicPatternLinkMap;
  origin?: SavedMelodicProject["origin"];
  sourcePackageId?: string | null;
  syncState?: SavedMelodicProject["syncState"];
  contentHash?: string | null;
};

export type MelodicWorkspaceArchiveSection =
  | JsonPackageSection<"melodic-workspace", MelodicWorkspaceArchiveProject>
  | JsonPackageSection<"saved-projects", MelodicWorkspaceArchiveProject[]>
  | JsonPackageSection<"sample-library", MelodicWorkspaceArchiveSample[]>
  | JsonPackageSection<"grid-library", GridLibraryArchivePayload | null>
  | JsonPackageSection<"custom-raster-preset-library", GridLibraryArchivePayload | null>
  | JsonPackageSection<"custom-raster-presets", GridLibraryArchivePayload | null>
  | JsonPackageSection<"material-library", MaterialLibraryArchivePayload | null>
  | JsonPackageSection<"root-follow-bank", RootFollowBankArchivePayload | null>
  | JsonPackageSection<
      "bass-clip-library",
      BassClipLibraryArchivePayload | null
    >
  | JsonPackageSection<
      "bass-pattern-library",
      BassClipLibraryArchivePayload | null
    >
  | JsonPackageSection<
      "bass-patterns",
      BassClipLibraryArchivePayload | null
    >
  | JsonPackageSection<
      "drum-config-library",
      DrumConfigLibraryArchivePayload | null
    >
  | JsonPackageSection<
      "spectral-forge-project-library",
      ForgeProjectLibraryArchivePayload | null
    >
  | JsonPackageSection<
      "spectral-forge-custom-stamp-library",
      CustomStampLibraryArchivePayload | null
    >
  | JsonPackageSection<
      "synthetic-forge-workspace-project-library",
      SyntheticForgeSavedWorkspaceLibraryArchivePayload | null
    >
  | JsonPackageSection<
      "synthetic-forge-current-workspace",
      SyntheticForgeCurrentWorkspaceArchivePayload | null
    >
  | JsonPackageSection<
      "resident-constellation-library",
      ResidentConstellationArchivePayload | null
    >
  | JsonPackageSection<
      "browser-local-storage",
      WorkspaceBrowserStorageArchivePayload | null
    >;

export type MelodicWorkspaceArchive = JsonPackageMeta<
  typeof MELODIC_WORKSPACE_ARCHIVE_FORMAT,
  typeof MELODIC_WORKSPACE_ARCHIVE_VERSION
> & {
  sections: MelodicWorkspaceArchiveSection[];
  workspace: MelodicWorkspaceArchiveProject;
  projects: MelodicWorkspaceArchiveProject[];
  samples: MelodicWorkspaceArchiveSample[];
  gridLibrary: GridLibraryArchivePayload | null;
  customRasterPresets: GridLibraryArchivePayload | null;
  customRasterPresetLibrary: GridLibraryArchivePayload | null;
  materialLibrary: MaterialLibraryArchivePayload | null;
  rootFollowBank: RootFollowBankArchivePayload | null;
  bassClipLibrary: BassClipLibraryArchivePayload | null;
  bassPatternLibrary: BassClipLibraryArchivePayload | null;
  bassPatterns: BassClipLibraryArchivePayload | null;
  drumConfigLibrary: DrumConfigLibraryArchivePayload | null;
  spectralForgeProjects: ForgeProjectLibraryArchivePayload | null;
  spectralForgeCustomStamps: CustomStampLibraryArchivePayload | null;
  syntheticForgeSavedWorkspaces: SyntheticForgeSavedWorkspaceLibraryArchivePayload | null;
  syntheticForgeCurrentWorkspace: SyntheticForgeCurrentWorkspaceArchivePayload | null;
  residentConstellations: ResidentConstellationArchivePayload | null;
  room3ResidentConstellations: ResidentConstellationArchivePayload | null;
  browserLocalStorage: WorkspaceBrowserStorageArchivePayload | null;
};

