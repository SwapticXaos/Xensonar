import { buildAppSurfaceFrameMountSource } from './appSurfaceFrameMountSourceBuilder';
import { useAppSurfaceFrameRuntimeBoundary, } from './useAppSurfaceFrameRuntimeBoundary';
import type { AppSurfaceFrameRuntimeBoundary, UseAppSurfaceFrameRuntimeBoundaryArgs } from './useAppSurfaceFrameRuntimeBoundaryTypes';

export type UseAppSurfaceFrameShellBoundaryArgs = UseAppSurfaceFrameRuntimeBoundaryArgs;

export function useAppSurfaceFrameShellBoundary({
  room,
  resonanceScreen,
  roomScenes,
  performanceCrisisPanelProps,
}: UseAppSurfaceFrameShellBoundaryArgs): AppSurfaceFrameRuntimeBoundary {
  const appSurfaceFrameMountSource = buildAppSurfaceFrameMountSource({
    roomGate: { room },
    resonanceScreenMount: { resonanceScreen },
    roomSceneMount: { roomScenes },
    performanceCrisisPanelMount: { performanceCrisisPanelProps },
  });

  return useAppSurfaceFrameRuntimeBoundary(appSurfaceFrameMountSource);
}
