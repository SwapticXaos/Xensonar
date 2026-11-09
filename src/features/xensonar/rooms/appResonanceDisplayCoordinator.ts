import { buildKeyboardWindowStatus } from './appKeyboardWindowStatus';
import { buildMetaPresetDisplayModel } from './metaPresetDisplayModel';
import { buildResonanceStatusModel } from './resonanceStatusModel';
import { buildTopologyResidentModel } from './topologyResidentModel';

type BuildAppResonanceDisplayCoordinatorArgs = {
  metaPresetDisplay: Parameters<typeof buildMetaPresetDisplayModel>[0];
  resonanceStatus: Parameters<typeof buildResonanceStatusModel>[0];
  topologyResident: Parameters<typeof buildTopologyResidentModel>[0];
  keyboardWindow: Parameters<typeof buildKeyboardWindowStatus>[0];
};

export function buildAppResonanceDisplayCoordinator(args: BuildAppResonanceDisplayCoordinatorArgs) {
  return {
    ...buildMetaPresetDisplayModel(args.metaPresetDisplay),
    ...buildResonanceStatusModel(args.resonanceStatus),
    ...buildTopologyResidentModel(args.topologyResident),
    ...buildKeyboardWindowStatus(args.keyboardWindow),
  };
}
