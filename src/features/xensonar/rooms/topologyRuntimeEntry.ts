import {
  buildInstallationSharedFieldRuntimeCoordinator,
  buildTopologyResidentConfigRuntimeCoordinator,
  buildTopologyRoomSupportRuntimeEntry,
} from './topologyRoomRuntimeCoordinator';

type BuildTopologyResidentConfigRuntimeCoordinatorArgs = Parameters<
  typeof buildTopologyResidentConfigRuntimeCoordinator
>[0];

type BuildTopologyRoomSupportRuntimeEntryArgs = Omit<
  Parameters<typeof buildTopologyRoomSupportRuntimeEntry>[0],
  'residentConfigActions'
>;

type BuildInstallationSharedFieldRuntimeCoordinatorArgs = Parameters<
  typeof buildInstallationSharedFieldRuntimeCoordinator
>[0];

type BuildTopologyRuntimeEntryArgs = {
  residentConfig: BuildTopologyResidentConfigRuntimeCoordinatorArgs;
  roomSupport: BuildTopologyRoomSupportRuntimeEntryArgs;
  installationSharedField: BuildInstallationSharedFieldRuntimeCoordinatorArgs;
};

export function buildTopologyRuntimeEntry(args: BuildTopologyRuntimeEntryArgs) {
  const residentConfig = buildTopologyResidentConfigRuntimeCoordinator(
    args.residentConfig,
  );

  const roomSupport = buildTopologyRoomSupportRuntimeEntry({
    ...args.roomSupport,
    residentConfigActions: residentConfig,
  });

  const installationSharedFieldController =
    buildInstallationSharedFieldRuntimeCoordinator(args.installationSharedField);

  return {
    ...residentConfig,
    ...roomSupport,
    installationSharedFieldController,
  };
}
