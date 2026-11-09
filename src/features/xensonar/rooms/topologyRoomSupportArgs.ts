import { GAME_HEIGHT, GAME_WIDTH, TOPO_HEIGHT, TOPO_WIDTH } from '../domain/instrumentData';
import { buildInstallationSharedFieldBindings } from './installationSharedFieldBindings';
import { buildTopologyRoomSupportBindings } from './topologyRoomSupportBindings';

type TopologyRoomSupportArgs = Parameters<typeof buildTopologyRoomSupportBindings>[0];
type InstallationSharedFieldArgs = Parameters<typeof buildInstallationSharedFieldBindings>[0];

type BuildTopologyRoomSupportArgsInput = Omit<TopologyRoomSupportArgs, 'topologyWidth' | 'topologyHeight'>;
type BuildInstallationSharedFieldControllerArgsInput = Omit<InstallationSharedFieldArgs, 'sourceWidth' | 'sourceHeight' | 'targetWidth' | 'targetHeight'>;

export function buildTopologyRoomSupportArgs(
  args: BuildTopologyRoomSupportArgsInput,
): TopologyRoomSupportArgs {
  return {
    ...args,
    topologyWidth: TOPO_WIDTH,
    topologyHeight: TOPO_HEIGHT,
  };
}

export function buildInstallationSharedFieldControllerArgs(
  args: BuildInstallationSharedFieldControllerArgsInput,
): InstallationSharedFieldArgs {
  return {
    ...args,
    sourceWidth: TOPO_WIDTH,
    sourceHeight: TOPO_HEIGHT,
    targetWidth: GAME_WIDTH,
    targetHeight: GAME_HEIGHT,
  };
}
