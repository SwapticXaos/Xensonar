import { resolveDrumConfigModeFallback } from '../drumConfigUiHelpers';
import type { DrumConfigPatch } from '../drumConfigUiHelpersTypes';
import type { DrumConfigEntry } from '../drumConfigLibraryTypes';

type UpdateNParams = (patch: DrumConfigPatch) => void;

export function applyDrumConfigModeFallback(args: {
  drumConfigMode: 'preset' | 'exported';
  drumConfigId: string;
  selectedExportedDrumConfig: DrumConfigEntry | null;
  exportedDrumConfigs: DrumConfigEntry[];
  updateNParams: UpdateNParams;
}) {
  const fallbackPatch = resolveDrumConfigModeFallback({
    drumConfigMode: args.drumConfigMode,
    drumConfigId: args.drumConfigId,
    selectedExportedDrumConfig: args.selectedExportedDrumConfig,
    exportedDrumConfigs: args.exportedDrumConfigs,
  });
  if (fallbackPatch) args.updateNParams(fallbackPatch);
}
