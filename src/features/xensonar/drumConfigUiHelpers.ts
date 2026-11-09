import type { DrumConfigEntry } from './drumConfigLibraryTypes';
import { buildDrumSoundPalette } from './groove/drumKitRouting';

import type { DrumConfigMode, DrumConfigPatch } from './drumConfigUiHelpersTypes';

export type { DrumConfigMode, DrumConfigPatch } from './drumConfigUiHelpersTypes';

export function buildDrumConfigSelectionPatch(entry: DrumConfigEntry): DrumConfigPatch {
  return {
    drumConfigMode: 'exported',
    drumConfigId: entry.id,
    ...buildDrumSoundPalette({ drumKit: entry.drumKit, laneKitOverrides: entry.laneKitOverrides }),
  };
}

export function resolveSelectedExportedDrumConfig(entries: DrumConfigEntry[], drumConfigId: string) {
  return entries.find((entry) => entry.id === drumConfigId) ?? null;
}

export function resolveDrumConfigModeFallback(args: {
  drumConfigMode: DrumConfigMode;
  drumConfigId: string;
  selectedExportedDrumConfig: DrumConfigEntry | null;
  exportedDrumConfigs: DrumConfigEntry[];
}): DrumConfigPatch | null {
  const { drumConfigMode, drumConfigId, selectedExportedDrumConfig, exportedDrumConfigs } = args;
  if (drumConfigMode !== 'exported' || selectedExportedDrumConfig) return null;
  if (exportedDrumConfigs.length > 0) {
    const fallbackId = exportedDrumConfigs[0]?.id ?? '';
    const fallbackEntry = exportedDrumConfigs.find((entry) => entry.id === fallbackId) ?? null;
    return fallbackEntry && fallbackId !== drumConfigId ? buildDrumConfigSelectionPatch(fallbackEntry) : null;
  }
  return { drumConfigMode: 'preset', drumConfigId: '' };
}

export function resolveDeletedDrumConfigFallback(args: {
  deletedId: string;
  currentDrumConfigId: string;
  entries: DrumConfigEntry[];
}): DrumConfigPatch | null {
  const { deletedId, currentDrumConfigId, entries } = args;
  if (deletedId !== currentDrumConfigId) return null;
  const fallbackId = entries.find((entry) => entry.id !== deletedId)?.id ?? '';
  const fallbackEntry = entries.find((entry) => entry.id === fallbackId) ?? null;
  return fallbackEntry
    ? buildDrumConfigSelectionPatch(fallbackEntry)
    : { drumConfigId: '', drumConfigMode: 'preset' };
}
