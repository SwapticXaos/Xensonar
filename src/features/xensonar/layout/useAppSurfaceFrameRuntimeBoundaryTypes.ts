import type { buildAppSurfaceFrameRuntimeEntry } from '../runtimeEntries';
import type { AppRoomSceneRuntimeBoundary } from '../room3/useAppRoomSceneRuntimeBoundary';
import type { AppResonanceScreenRuntimeBoundary } from './useAppResonanceScreenRuntimeBoundary';

type SurfaceFrameRuntimeArgs = Parameters<typeof buildAppSurfaceFrameRuntimeEntry>[0];

export type UseAppSurfaceFrameRuntimeBoundaryArgs = {
  room: SurfaceFrameRuntimeArgs['room'];
  resonanceScreen: AppResonanceScreenRuntimeBoundary;
  roomScenes: AppRoomSceneRuntimeBoundary;
  performanceCrisisPanelProps: SurfaceFrameRuntimeArgs['performanceCrisisPanelProps'];
};

export type AppSurfaceFrameRuntimeBoundary = ReturnType<typeof buildAppSurfaceFrameRuntimeEntry>;
