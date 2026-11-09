import { buildInstallationFieldActions } from './installationFieldActions';
import { buildTopologyCanvasHandlers } from './topologyCanvasHandlers';
import { buildTopologyResidentActions } from './topologyResidentActions';

type BuildTopologyRoomSupportArgs = {
  canvasHandlers: Parameters<typeof buildTopologyCanvasHandlers>[0];
  residentActions: Parameters<typeof buildTopologyResidentActions>[0];
  installationFieldActions: Parameters<typeof buildInstallationFieldActions>[0];
};

export function buildTopologyRoomSupport(args: BuildTopologyRoomSupportArgs) {
  return {
    ...buildTopologyCanvasHandlers(args.canvasHandlers),
    ...buildTopologyResidentActions(args.residentActions),
    ...buildInstallationFieldActions(args.installationFieldActions),
  };
}
