import type { MutableRefObject } from 'react';
import type { DrumConfigPatch } from '../drumConfigUiHelpersTypes';
import { useDrumPlaylistRevisionBridge } from '../drumPattern/useDrumPlaylistRevisionBridge';
import { useAppDrumConfigBridge } from './useAppDrumConfigBridge';

type DrumConfigCallsiteState = {
  drumConfigMode: 'preset' | 'exported';
  drumConfigId: string;
};

export type UseAppDrumConfigCallsiteBoundaryArgs = {
  drumConfigId: string;
  drumConfigMode: DrumConfigCallsiteState['drumConfigMode'];
  nexusParamsRef: MutableRefObject<DrumConfigCallsiteState>;
  updateNParams: (patch: DrumConfigPatch & { drumActive?: boolean }) => void;
};

export type AppDrumConfigCallsiteBoundaryContract = {
  readonly patch: '3.2.91.6.9.136_app_drum_config_callsite_boundary';
  readonly scope: 'callsite-boundary-only';
  readonly preservesHookOrder: true;
  readonly wrapsAppDrumConfigBridge: true;
  readonly wrapsDrumPlaylistRevisionBridge: true;
  readonly wrapsDrumPlaybackScheduling: false;
  readonly wrapsPackagePersistence: false;
  readonly wrapsPatternMutation: false;
  readonly runtimeOwned: false;
  readonly audioMutating: false;
  readonly drumSchedulingOwned: false;
  readonly playlistMutationOwned: false;
  readonly packagePersistenceOwned: false;
  readonly visibleUiChangedByBoundary: false;
};

export const APP_DRUM_CONFIG_CALLSITE_BOUNDARY_CONTRACT: AppDrumConfigCallsiteBoundaryContract = {
  patch: '3.2.91.6.9.136_app_drum_config_callsite_boundary',
  scope: 'callsite-boundary-only',
  preservesHookOrder: true,
  wrapsAppDrumConfigBridge: true,
  wrapsDrumPlaylistRevisionBridge: true,
  wrapsDrumPlaybackScheduling: false,
  wrapsPackagePersistence: false,
  wrapsPatternMutation: false,
  runtimeOwned: false,
  audioMutating: false,
  drumSchedulingOwned: false,
  playlistMutationOwned: false,
  packagePersistenceOwned: false,
  visibleUiChangedByBoundary: false,
};

export function useAppDrumConfigCallsiteBoundary(args: UseAppDrumConfigCallsiteBoundaryArgs) {
  const drumConfigBridge = useAppDrumConfigBridge(args);
  useDrumPlaylistRevisionBridge();
  return drumConfigBridge;
}
