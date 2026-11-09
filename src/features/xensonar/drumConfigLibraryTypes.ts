import type { DrumLaneId } from './drumPatternMachineTypes';
import type { DrumKit } from './domain/instrumentData';
import type { DrumLaneKitOverrides } from './groove/drumKitRoutingTypes';
import type { DrumLaneSettingsMap } from './groove/drumLaneSettings';
import type { DrumStepProgramMap } from '../l3lab/canonicalForge/drumProgram';
import type { DrumPlaylistState } from './drumPatternPlaylistTypes';

export interface DrumConfigEntry {
  id: string;
  name: string;
  presetSource: string;
  drumKit: DrumKit;
  bars: number;
  segmentsPerBar: number;
  segmentMarkers: number[];
  stepCount: number;
  laneOrder: DrumLaneId[];
  laneSteps: Record<DrumLaneId, number[]>;
  laneKitOverrides?: DrumLaneKitOverrides;
  laneSettings?: DrumLaneSettingsMap;
  stepPrograms?: DrumStepProgramMap;
  createdAt: number;
  updatedAt: number;
  sourceWorkspace?: string;
}

export type DrumConfigLibraryArchivePayload = {
  entries: DrumConfigEntry[];
  playlist: DrumPlaylistState | null;
};

export type DrumConfigLibraryArchiveImportResult = {
  importedCount: number;
  skippedCount: number;
  replacedCount: number;
  dedupedCount: number;
  playlistImported: boolean;
};
