import { buildInstallationSharedFieldController } from '../../topology/topologyInteractionHelpers';
import { buildInstallationSharedFieldBindings } from './installationSharedFieldBindings';
import { buildInstallationSharedFieldControllerArgs, buildTopologyRoomSupportArgs } from './topologyRoomSupportArgs';
import {
  buildInstallationSharedFieldRuntimeArgs,
  buildTopologyRoomSupportRuntimeArgs,
} from './topologyRuntimeArgs';
import { buildTopologyRoomSupportBindings } from './topologyRoomSupportBindings';
import { buildInstallationSharedFieldRuntimeBindings, buildTopologyResidentConfigBindings, buildTopologyRoomSupportRuntimeBindings } from './topologyRuntimeBindings';
import { buildTopologyResidentConfigActions } from './topologyResidentConfigActions';

type BuildTopologyResidentConfigRuntimeActionsArgs = Parameters<
  typeof buildTopologyResidentConfigBindings
>[0];

type BuildTopologyResidentConfigRuntimeCoordinatorArgs = Parameters<
  typeof buildTopologyResidentConfigBindings
>[0];

type BuildTopologyRoomSupportRuntimeCoordinatorArgs = Parameters<
  typeof buildTopologyRoomSupportRuntimeBindings
>[0];

type BuildTopologyRoomSupportRuntimeEntryArgs = Parameters<
  typeof buildTopologyRoomSupportRuntimeArgs
>[0];

type BuildInstallationSharedFieldRuntimeControllerArgs = Parameters<
  typeof buildInstallationSharedFieldRuntimeBindings
>[0];

type BuildInstallationSharedFieldRuntimeCoordinatorArgs = Parameters<
  typeof buildInstallationSharedFieldRuntimeArgs
>[0];

export function buildTopologyResidentConfigRuntimeActions(
  args: BuildTopologyResidentConfigRuntimeActionsArgs,
) {
  return buildTopologyResidentConfigActions(buildTopologyResidentConfigBindings(args));
}

export function buildTopologyResidentConfigRuntimeCoordinator(
  args: BuildTopologyResidentConfigRuntimeCoordinatorArgs,
) {
  return buildTopologyResidentConfigRuntimeActions(args);
}

export function buildTopologyRoomSupportRuntimeCoordinator(
  args: BuildTopologyRoomSupportRuntimeCoordinatorArgs,
) {
  return buildTopologyRoomSupportBindings(
    buildTopologyRoomSupportArgs(buildTopologyRoomSupportRuntimeBindings(args)),
  );
}

export function buildTopologyRoomSupportRuntimeEntry(
  args: BuildTopologyRoomSupportRuntimeEntryArgs,
) {
  return buildTopologyRoomSupportRuntimeCoordinator(
    buildTopologyRoomSupportRuntimeArgs(args),
  );
}

export function buildInstallationSharedFieldRuntimeController(
  args: BuildInstallationSharedFieldRuntimeControllerArgs,
) {
  return buildInstallationSharedFieldController(
    buildInstallationSharedFieldBindings(
      buildInstallationSharedFieldControllerArgs(
        buildInstallationSharedFieldRuntimeBindings(args),
      ),
    ),
  );
}

export function buildInstallationSharedFieldRuntimeCoordinator(
  args: BuildInstallationSharedFieldRuntimeCoordinatorArgs,
) {
  return buildInstallationSharedFieldRuntimeController(
    buildInstallationSharedFieldRuntimeArgs(args),
  );
}
