import { getDrumConfigLibraryState } from '../drumConfigLibrary';
import { buildDrumConfigSelectionPatch, resolveDeletedDrumConfigFallback } from '../drumConfigUiHelpers';
import type { DrumConfigPatch } from '../drumConfigUiHelpersTypes';
import type { DrumConfigDeletedDetail, DrumConfigRegisteredDetail } from './drumConfigLibraryEventContract';

type UpdateNParams = (patch: DrumConfigPatch & { drumActive?: boolean }) => void;

export function createDrumConfigRegisteredHandler(args: {
  currentDrumConfigMode: () => 'preset' | 'exported';
  currentDrumConfigId: () => string;
  updateNParams: UpdateNParams;
}) {
  return (event: Event) => {
    const detail = (event as CustomEvent<DrumConfigRegisteredDetail>).detail;
    if (!detail?.id) return;
    if (args.currentDrumConfigMode() === 'exported' && !args.currentDrumConfigId()) {
      const entry = getDrumConfigLibraryState().entries.find((candidate) => candidate.id === detail.id);
      args.updateNParams(entry ? buildDrumConfigSelectionPatch(entry) : { drumConfigId: detail.id });
    }
  };
}

export function createDrumConfigDeletedHandler(args: {
  currentDrumConfigId: () => string;
  updateNParams: UpdateNParams;
}) {
  return (event: Event) => {
    const detail = (event as CustomEvent<DrumConfigDeletedDetail>).detail;
    if (!detail?.id) return;
    const fallbackPatch = resolveDeletedDrumConfigFallback({
      deletedId: detail.id,
      currentDrumConfigId: args.currentDrumConfigId(),
      entries: getDrumConfigLibraryState().entries,
    });
    if (fallbackPatch) args.updateNParams(fallbackPatch);
  };
}

export function createDrumConfigSendRequestHandler(args: {
  updateNParams: UpdateNParams;
}) {
  return (event: Event) => {
    const detail = (event as CustomEvent<{ id?: string }>).detail;
    if (!detail?.id) return;
    const entry = getDrumConfigLibraryState().entries.find((candidate) => candidate.id === detail.id);
    args.updateNParams({ ...(entry ? buildDrumConfigSelectionPatch(entry) : { drumConfigMode: 'exported', drumConfigId: detail.id }), drumActive: true });
  };
}
