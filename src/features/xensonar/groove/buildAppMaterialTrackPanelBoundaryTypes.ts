import type { MyceliumSnapshot } from '../../topology/myceliumSnapshot';
import type { MaterialTrackPanelProps } from '../rooms/buildMaterialTrackPanelProps';

export type AppMaterialTrackPreviewBoundaryArgs = {
  myceliumSnapshot: MyceliumSnapshot;
  currentTimeSec: number;
  nextAbsoluteStep: number | null | undefined;
  rhythmForgeSeed: number;
};

export type AppMaterialTrackPreviewSourceBoundaryArgs = {
  myceliumSnapshotRef: { current: MyceliumSnapshot };
  audioCtx: Pick<AudioContext, 'currentTime'> | null | undefined;
  nexusRefs: { current: { nextAbsoluteStep?: number | null } };
  rhythmForgeSeedRef: { current: number };
};

export type AppMaterialTrackPanelBaseBoundaryArgs = Omit<
  MaterialTrackPanelProps,
  'drumPatterns' | 'drumKits' | 'bassPatterns' | 'bassPreviewContext'
>;

export type AppMaterialTrackPanelGroupedBoundaryArgs = AppMaterialTrackPanelBaseBoundaryArgs & {
  preview: AppMaterialTrackPreviewBoundaryArgs;
};

export type AppMaterialTrackPanelCompactBoundaryArgs = AppMaterialTrackPanelBaseBoundaryArgs & {
  previewSource: AppMaterialTrackPreviewSourceBoundaryArgs;
};

export type AppMaterialTrackPanelBoundaryArgs =
  | AppMaterialTrackPanelGroupedBoundaryArgs
  | AppMaterialTrackPanelCompactBoundaryArgs;
