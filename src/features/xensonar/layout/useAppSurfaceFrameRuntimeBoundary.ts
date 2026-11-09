import { buildAppSurfaceFrameRuntimeEntry } from "../runtimeEntries";
import type { AppSurfaceFrameRuntimeBoundary, UseAppSurfaceFrameRuntimeBoundaryArgs } from './useAppSurfaceFrameRuntimeBoundaryTypes';

export type { AppSurfaceFrameRuntimeBoundary, UseAppSurfaceFrameRuntimeBoundaryArgs } from './useAppSurfaceFrameRuntimeBoundaryTypes';

export function useAppSurfaceFrameRuntimeBoundary({
  room,
  resonanceScreen,
  roomScenes,
  performanceCrisisPanelProps,
}: UseAppSurfaceFrameRuntimeBoundaryArgs): AppSurfaceFrameRuntimeBoundary {
  return buildAppSurfaceFrameRuntimeEntry({
    ...resonanceScreen,
    room,
    ...roomScenes,
    performanceCrisisPanelProps,
  });
}
