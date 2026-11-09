import type { UseAppSurfaceFrameRuntimeBoundaryArgs } from './useAppSurfaceFrameRuntimeBoundaryTypes';

export type AppSurfaceFrameRoomGateSourceArgs = Pick<UseAppSurfaceFrameRuntimeBoundaryArgs, 'room'>;
export type AppSurfaceFrameResonanceScreenMountSourceArgs = Pick<UseAppSurfaceFrameRuntimeBoundaryArgs, 'resonanceScreen'>;
export type AppSurfaceFrameRoomSceneMountSourceArgs = Pick<UseAppSurfaceFrameRuntimeBoundaryArgs, 'roomScenes'>;
export type AppSurfaceFramePerformanceCrisisPanelMountSourceArgs = Pick<UseAppSurfaceFrameRuntimeBoundaryArgs, 'performanceCrisisPanelProps'>;

export type BuildAppSurfaceFrameMountSourceInput = {
  readonly roomGate: AppSurfaceFrameRoomGateSourceArgs;
  readonly resonanceScreenMount: AppSurfaceFrameResonanceScreenMountSourceArgs;
  readonly roomSceneMount: AppSurfaceFrameRoomSceneMountSourceArgs;
  readonly performanceCrisisPanelMount: AppSurfaceFramePerformanceCrisisPanelMountSourceArgs;
};
