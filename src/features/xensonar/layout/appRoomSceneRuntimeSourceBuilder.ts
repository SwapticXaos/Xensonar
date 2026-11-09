import type { UseAppRoomSceneRuntimeBoundaryArgs } from '../room3/useAppRoomSceneRuntimeBoundary';
import { APP_ROOM_SCENE_RUNTIME_SOURCE_READINESS_GROUP_KEYS } from './appRoomSceneRuntimeSourceReadinessAudit';
import type { BuildAppRoomSceneRuntimeSourceInput } from './appRoomSceneRuntimeSourceTypes';

export type {
  AppRoomSceneRuntimeContractSourceArgs,
  AppRoomSceneTopologyHandoffSourceArgs,
  AppRoomSceneTopologyRuntimeSourceArgs,
  AppRoomSceneInstallationDeviceSourceArgs,
  AppRoomSceneInstallationResidentSourceArgs,
  AppRoomSceneViewportXenpolarSourceArgs,
  AppRoomSceneViewportGameArenaSourceArgs,
  AppRoomSceneViewportSpectralForgeEntrySourceArgs,
  BuildAppRoomSceneRuntimeSourceInput,
} from './appRoomSceneRuntimeSourceTypes';

export const APP_ROOM_SCENE_RUNTIME_SOURCE_BUILDER_PROBE = {
  cleanupKind: 'app-room-scene-runtime-source-builder-probe',
  readinessGroups: APP_ROOM_SCENE_RUNTIME_SOURCE_READINESS_GROUP_KEYS,
  ownsRuntime: false,
  mutatesAudio: false,
  ownsRoomLifecycle: false,
  ownsPackagePersistence: false,
  onlyFlattensSourceGroups: true,
  explicitlyNotMoved: [
    'Room III topology runtime-entry actions',
    'topology canvas event handlers',
    'installation nodal-device and resident action bodies',
    'Xenpolar/Resonanzwanderer export handlers',
    'SpectralForge entry upload and scroll-intent consumers',
  ],
} as const;

export function buildAppRoomSceneRuntimeSource({
  contracts,
  topology,
  installation,
  viewport,
}: BuildAppRoomSceneRuntimeSourceInput): UseAppRoomSceneRuntimeBoundaryArgs {
  return {
    room3Topology: contracts.room3Topology,
    room3RuntimeEntry: contracts.room3RuntimeEntry,
    topologyScene: {
      ...topology.handoffScene,
      ...topology.runtimeScene,
    },
    installationScene: {
      ...installation.deviceScene,
      ...installation.residentScene,
    },
    viewportScene: {
      ...viewport.xenpolarScene,
      ...viewport.gameArenaScene,
      ...viewport.spectralForgeEntryScene,
    },
  } satisfies UseAppRoomSceneRuntimeBoundaryArgs;
}
