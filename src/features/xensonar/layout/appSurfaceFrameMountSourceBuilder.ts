import type { UseAppSurfaceFrameRuntimeBoundaryArgs } from './useAppSurfaceFrameRuntimeBoundaryTypes';
import type { BuildAppSurfaceFrameMountSourceInput } from './appSurfaceFrameMountSourceTypes';

export type * from './appSurfaceFrameMountSourceTypes';

export const APP_SURFACE_FRAME_MOUNT_SOURCE_BUILDER_PROBE = {
  cleanupKind: 'app-surface-frame-mount-source-builder-probe',
  readinessGroups: [
    'surfaceRoomGate',
    'resonanceScreenMountSource',
    'roomSceneMountSource',
    'performanceCrisisPanelMountSource',
  ] as const,
  ownsRuntime: false,
  ownsAudio: false,
  ownsScheduling: false,
  ownsRoomLifecycle: false,
  ownsPackagePersistence: false,
  ownsViewportSelection: false,
  ownsResonancePanelGate: false,
  onlyGroupsPreparedSurfaceInputs: true,
  explicitlyNotMoved: [
    'AppMainContent mount gates',
    'AppRoomViewport room selection',
    'shouldRenderResonancePanels',
    'COMMONS direct mount',
    'L3LAB / Materialschmiede lazy keepalive mount',
    'Room III topology, installation, resident, Xenpolar, game arena, and SpectralForge-entry behavior',
  ] as const,
} as const;

export function buildAppSurfaceFrameMountSource({
  roomGate,
  resonanceScreenMount,
  roomSceneMount,
  performanceCrisisPanelMount,
}: BuildAppSurfaceFrameMountSourceInput): UseAppSurfaceFrameRuntimeBoundaryArgs {
  return {
    ...roomGate,
    ...resonanceScreenMount,
    ...roomSceneMount,
    ...performanceCrisisPanelMount,
  } satisfies UseAppSurfaceFrameRuntimeBoundaryArgs;
}
