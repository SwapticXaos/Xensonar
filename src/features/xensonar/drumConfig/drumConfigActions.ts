import { deleteDrumConfigEntry, updateDrumConfigEntry } from '../drumConfigLibrary';
import type { DrumConfigEntry } from '../drumConfigLibraryTypes';
import type { DrumConfigPatch } from '../drumConfigUiHelpersTypes';

type UpdateNParams = (patch: DrumConfigPatch) => void;

export async function renameSelectedDrumConfigAction(args: {
  selectedExportedDrumConfig: DrumConfigEntry | null;
}) {
  const { selectedExportedDrumConfig } = args;
  if (!selectedExportedDrumConfig) return false;
  const next = window.prompt('Drum-Konfiguration umbenennen', selectedExportedDrumConfig.name);
  if (next == null) return false;
  await updateDrumConfigEntry(selectedExportedDrumConfig.id, { name: next });
  return true;
}

export async function removeSelectedDrumConfigAction(args: {
  selectedExportedDrumConfig: DrumConfigEntry | null;
  currentDrumConfigId: () => string;
  updateNParams: UpdateNParams;
}) {
  const { selectedExportedDrumConfig, currentDrumConfigId, updateNParams } = args;
  if (!selectedExportedDrumConfig) return false;
  await deleteDrumConfigEntry(selectedExportedDrumConfig.id);
  if (currentDrumConfigId() === selectedExportedDrumConfig.id) {
    updateNParams({ drumConfigMode: 'preset', drumConfigId: '' });
  }
  return true;
}
