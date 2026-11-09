import type { Dispatch, SetStateAction } from 'react';
import type { MyzelPostFxGroupId } from '../architecture/machineRoomTypes';
import { useMaterialLoopPlayback } from './useMaterialLoopPlayback';
import { useResonanceMaterialLoopBridge } from './useResonanceMaterialLoopBridge';
import type { MaterialLoopRuntimeBoundaryRefs } from './materialLoopRuntimeBoundary';
import type { MaterialEntry } from '../../l3lab/materialLibrary';
import type { MaterialLoopLaneUiState, RootFollowLoopLaneUiState } from './loopLaneUiState';
import type { DrumPattern } from '../domain/instrumentData';

export type MaterialLoopRuntimeUiState = {
  materialLoopActive: MaterialLoopLaneUiState['active'];
  materialLoopId: MaterialLoopLaneUiState['id'];
  materialLoopSyncToBeat: MaterialLoopLaneUiState['syncToBeat'];
  materialLoopTimeMode: MaterialLoopLaneUiState['timeMode'];
  materialLoopVolume: MaterialLoopLaneUiState['volume'];
  rootFollowLoopActive: RootFollowLoopLaneUiState['active'];
  rootFollowLoopId: RootFollowLoopLaneUiState['id'];
  rootFollowLoopTimeMode: RootFollowLoopLaneUiState['timeMode'];
  rootFollowLoopVolume: RootFollowLoopLaneUiState['volume'];
  rootFollowLoopGranulationMode: RootFollowLoopLaneUiState['granulationMode'];
  rootFollowGranularSettings: RootFollowLoopLaneUiState['granularSettings'];
  rootFollowImpulsRasterEvery: RootFollowLoopLaneUiState['impulsRasterEvery'];
  rootFollowImpulsRasterCycleDiv: RootFollowLoopLaneUiState['impulsRasterCycleDiv'];
  rootFollowImpulsRasterClockMode: RootFollowLoopLaneUiState['impulsRasterClockMode'];
  rootFollowImpulsRasterPattern: RootFollowLoopLaneUiState['impulsRasterPattern'];
  resonanceHotkeyMode: 'material' | 'root-follow' | 'particle-classic';
  quantizeBpm: number;
  drumActive: boolean;
  drumPattern: DrumPattern;
  drumConfigMode: 'preset' | 'exported';
  drumConfigId: string;
  drumVolume: number;
};

type ValidMyzelGroup = {
  id: MyzelPostFxGroupId;
  label: string;
};

type UseMaterialLoopBridgeRuntimeBoundaryArgs = {
  nParamsUI: MaterialLoopRuntimeUiState;
  getCurrentMaterialLoopId: () => string;
  getCurrentMaterialLoopActive: () => boolean;
  updateNParams: (patch: Partial<MaterialLoopRuntimeUiState>) => void;
  clampIndex: (value: number, min: number, max: number) => number;
  hotkeyCount: number;
  validGroups: readonly ValidMyzelGroup[];
  myzelFollowForgeHandoff: boolean;
  setMyzelPostFxGroup: Dispatch<SetStateAction<MyzelPostFxGroupId>>;
  hotkeyLabels: readonly string[];
  getCurrentRootFollowAnchorHz: () => number;
  getDefaultRootFollowAnchorHz: () => number;
  setRootFollowAuditionPitchHz: (hz: number) => void;
};

type UseMaterialLoopPlaybackRuntimeBoundaryArgs = {
  audioCtx: AudioContext | null;
  nexusActive: boolean;
  materialLoopActive: boolean;
  selectedLoopMaterial: MaterialEntry | null;
  quantizeBpm: number;
  materialLoopTimeMode: MaterialLoopLaneUiState['timeMode'];
  materialLoopVolume: number;
  materialLoopSyncToBeat: boolean;
  refs: MaterialLoopRuntimeBoundaryRefs;
  getRhythmBus: (ctx: AudioContext) => AudioNode;
  ensureMyzelPostFxRouter: (ctx: AudioContext) => void;
  getForgeSend: () => GainNode | null;
};

export function useMaterialLoopBridgeRuntimeBoundary(args: UseMaterialLoopBridgeRuntimeBoundaryArgs) {
  return useResonanceMaterialLoopBridge(args);
}

export function useMaterialLoopPlaybackRuntimeBoundary(args: UseMaterialLoopPlaybackRuntimeBoundaryArgs) {
  useMaterialLoopPlayback(args);
}
