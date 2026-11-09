import { buildAppRoomSceneRuntimeProps } from '../layout/appSurfaceRuntimeCoordinator';
import { buildAppRoomSceneRuntimeArgs } from './appRoomSceneRuntimeArgs';

type BuildAppRoomSceneRuntimeEntryArgs = Parameters<
  typeof buildAppRoomSceneRuntimeArgs
>[0];

export function buildAppRoomSceneRuntimeEntry(
  args: BuildAppRoomSceneRuntimeEntryArgs,
) {
  return buildAppRoomSceneRuntimeProps(buildAppRoomSceneRuntimeArgs(args));
}
