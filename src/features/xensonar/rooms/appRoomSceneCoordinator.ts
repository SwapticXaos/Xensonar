import { buildAppViewportRoomProps } from './appViewportRoomProps';
import { buildCoordinatedTopologyPanelProps } from './topologyPanelCoordinator';

type BuildAppRoomScenePropsArgs = {
  topology: Parameters<typeof buildCoordinatedTopologyPanelProps>[0];
  viewport: Parameters<typeof buildAppViewportRoomProps>[0];
};

export function buildAppRoomSceneProps(args: BuildAppRoomScenePropsArgs) {
  const topologyPanelProps = buildCoordinatedTopologyPanelProps(args.topology);
  const viewportRoomProps = buildAppViewportRoomProps(args.viewport);

  return {
    topologyPanelProps,
    ...viewportRoomProps,
  };
}
