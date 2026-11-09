import { buildAppShellFrameProps } from './appShellFrameProps';
import { buildAppChromeRuntimeBindings } from './appChromeRuntimeBindings';
import { buildAppResonanceScreenProps } from './appResonanceScreenCoordinator';
import { buildAppRoomSceneProps } from '../rooms/appRoomSceneCoordinator';
import { buildAppRoomSceneBindings } from '../rooms/appRoomSceneBindings';
import { buildAppRoomSceneRuntimeBindings } from '../rooms/appRoomSceneRuntimeBindings';
import { buildResonancePanelRuntimeBindings } from '../rooms/resonancePanelRuntimeBindings';

import type { BuildAppResonanceScreenRuntimePropsArgs, BuildAppRoomSceneRuntimePropsArgs, BuildAppSurfaceRuntimePropsArgs } from './appSurfaceRuntimeCoordinatorTypes';

export type { BuildAppResonanceScreenRuntimePropsArgs, BuildAppRoomSceneRuntimePropsArgs, BuildAppSurfaceRuntimePropsArgs } from './appSurfaceRuntimeCoordinatorTypes';

export function buildAppResonanceScreenRuntimeProps(
  args: BuildAppResonanceScreenRuntimePropsArgs,
): ReturnType<typeof buildAppResonanceScreenProps> {
  return buildAppResonanceScreenProps({
    chrome: buildAppChromeRuntimeBindings(args.chrome),
    resonancePanels: buildResonancePanelRuntimeBindings(args.resonancePanels),
  });
}

export function buildAppRoomSceneRuntimeProps(
  args: BuildAppRoomSceneRuntimePropsArgs,
): ReturnType<typeof buildAppRoomSceneProps> {
  return buildAppRoomSceneProps(
    buildAppRoomSceneBindings(buildAppRoomSceneRuntimeBindings(args)),
  );
}

export function buildAppSurfaceRuntimeProps(
  args: BuildAppSurfaceRuntimePropsArgs,
): ReturnType<typeof buildAppShellFrameProps> {
  return buildAppShellFrameProps(args);
}
