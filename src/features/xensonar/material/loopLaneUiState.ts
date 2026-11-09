import type { MaterialLoopTimeMode } from './materialLoopMath';
import {
  createRootFollowGranularStartupSettings,
  normalizeRootFollowGranularSettings,
  type RootFollowGranularSettings,
  type RootFollowGranulationMode,
} from '../rootFollow/rootFollowGranularSettings';
import {
  ROOT_FOLLOW_IMPULSE_RASTER_DEFAULT,
  normalizeRootFollowImpulseRasterClockMode,
  normalizeRootFollowImpulseRasterValue,
  normalizeRootFollowImpulseRasterPattern,
  type RootFollowImpulseRasterClockMode,
} from '../rootFollow/rootFollowImpulseRasterPolicy';

export type LoopLaneTimeMode = MaterialLoopTimeMode;

export const LOOP_LANE_TIME_MODES: readonly LoopLaneTimeMode[] = ['normal', 'double', 'half'];

export const isLoopLaneTimeMode = (value: unknown): value is LoopLaneTimeMode =>
  value === 'normal' || value === 'double' || value === 'half';

export const isRootFollowGranulationMode = (value: unknown): value is RootFollowGranulationMode =>
  value === 'flowing' || value === 'grainy';

export const clampLoopLaneVolume = (value: unknown, fallback = 0.22) => {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.min(1, Math.max(0, numeric));
};

export type LoopLaneUiStateBase = {
  active: boolean;
  id: string;
  timeMode: LoopLaneTimeMode;
  volume: number;
};

export type MaterialLoopLaneUiState = LoopLaneUiStateBase & {
  syncToBeat: boolean;
};

export type RootFollowLoopLaneUiState = LoopLaneUiStateBase & {
  granulationMode: RootFollowGranulationMode;
  granularSettings: RootFollowGranularSettings;
  impulsRasterEvery: number;
  impulsRasterCycleDiv: number;
  impulsRasterClockMode: RootFollowImpulseRasterClockMode;
  impulsRasterPattern: number[];
};

export type NexusLoopLaneUiState = {
  materialLoopActive: boolean;
  materialLoopSyncToBeat: boolean;
  materialLoopId: string;
  materialLoopVolume: number;
  materialLoopTimeMode: LoopLaneTimeMode;
  rootFollowLoopActive: boolean;
  rootFollowLoopId: string;
  rootFollowLoopVolume: number;
  rootFollowLoopTimeMode: LoopLaneTimeMode;
  rootFollowLoopGranulationMode: RootFollowGranulationMode;
  rootFollowGranularSettings: RootFollowGranularSettings;
  rootFollowImpulsRasterEvery: number;
  rootFollowImpulsRasterCycleDiv: number;
  rootFollowImpulsRasterClockMode: RootFollowImpulseRasterClockMode;
  rootFollowImpulsRasterPattern: number[];
};

export const createDefaultMaterialLoopLaneUiState = (): MaterialLoopLaneUiState => ({
  active: false,
  id: '',
  syncToBeat: true,
  volume: 0.22,
  timeMode: 'normal',
});

export const createDefaultRootFollowLoopLaneUiState = (): RootFollowLoopLaneUiState => ({
  active: false,
  id: '',
  volume: 0.22,
  timeMode: 'normal',
  granulationMode: 'flowing',
  granularSettings: createRootFollowGranularStartupSettings('flowing'),
  impulsRasterEvery: ROOT_FOLLOW_IMPULSE_RASTER_DEFAULT.every,
  impulsRasterCycleDiv: ROOT_FOLLOW_IMPULSE_RASTER_DEFAULT.cycleDiv,
  impulsRasterClockMode: ROOT_FOLLOW_IMPULSE_RASTER_DEFAULT.clockMode,
  impulsRasterPattern: [...ROOT_FOLLOW_IMPULSE_RASTER_DEFAULT.pattern],
});

export const createInitialNexusLoopLaneUiState = (): NexusLoopLaneUiState => {
  const material = createDefaultMaterialLoopLaneUiState();
  const rootFollow = createDefaultRootFollowLoopLaneUiState();
  return {
    materialLoopActive: material.active,
    materialLoopSyncToBeat: material.syncToBeat,
    materialLoopId: material.id,
    materialLoopVolume: material.volume,
    materialLoopTimeMode: material.timeMode,
    rootFollowLoopActive: rootFollow.active,
    rootFollowLoopId: rootFollow.id,
    rootFollowLoopVolume: rootFollow.volume,
    rootFollowLoopTimeMode: rootFollow.timeMode,
    rootFollowLoopGranulationMode: rootFollow.granulationMode,
    rootFollowGranularSettings: rootFollow.granularSettings,
    rootFollowImpulsRasterEvery: rootFollow.impulsRasterEvery,
    rootFollowImpulsRasterCycleDiv: rootFollow.impulsRasterCycleDiv,
    rootFollowImpulsRasterClockMode: rootFollow.impulsRasterClockMode,
    rootFollowImpulsRasterPattern: rootFollow.impulsRasterPattern,
  };
};

export const extractMaterialLoopLaneUiState = (params: Pick<
  NexusLoopLaneUiState,
  'materialLoopActive' | 'materialLoopId' | 'materialLoopSyncToBeat' | 'materialLoopTimeMode' | 'materialLoopVolume'
>): MaterialLoopLaneUiState => ({
  active: !!params.materialLoopActive,
  id: params.materialLoopId ?? '',
  syncToBeat: !!params.materialLoopSyncToBeat,
  timeMode: isLoopLaneTimeMode(params.materialLoopTimeMode) ? params.materialLoopTimeMode : 'normal',
  volume: clampLoopLaneVolume(params.materialLoopVolume),
});

export const extractRootFollowLoopLaneUiState = (params: Pick<
  NexusLoopLaneUiState,
  | 'rootFollowLoopActive'
  | 'rootFollowLoopId'
  | 'rootFollowLoopTimeMode'
  | 'rootFollowLoopVolume'
  | 'rootFollowLoopGranulationMode'
  | 'rootFollowGranularSettings'
  | 'rootFollowImpulsRasterEvery'
  | 'rootFollowImpulsRasterCycleDiv'
  | 'rootFollowImpulsRasterClockMode'
  | 'rootFollowImpulsRasterPattern'
>): RootFollowLoopLaneUiState => {
  const granulationMode = isRootFollowGranulationMode(params.rootFollowLoopGranulationMode)
    ? params.rootFollowLoopGranulationMode
    : 'flowing';
  return {
    active: !!params.rootFollowLoopActive,
    id: params.rootFollowLoopId ?? '',
    timeMode: isLoopLaneTimeMode(params.rootFollowLoopTimeMode) ? params.rootFollowLoopTimeMode : 'normal',
    volume: clampLoopLaneVolume(params.rootFollowLoopVolume),
    granulationMode,
    granularSettings: normalizeRootFollowGranularSettings(params.rootFollowGranularSettings, granulationMode),
    impulsRasterEvery: normalizeRootFollowImpulseRasterValue(params.rootFollowImpulsRasterEvery),
    impulsRasterCycleDiv: normalizeRootFollowImpulseRasterValue(params.rootFollowImpulsRasterCycleDiv),
    impulsRasterClockMode: normalizeRootFollowImpulseRasterClockMode(params.rootFollowImpulsRasterClockMode),
    impulsRasterPattern: normalizeRootFollowImpulseRasterPattern(
      params.rootFollowImpulsRasterPattern,
      {
        // counterDiv = pattern length = number of Root-Follow slots per takt ratio.
        // everyFallback = stride for a generated fallback pattern when no pattern exists.
        // The current storage model intentionally uses the same value for both, but
        // the named form keeps future divergence from becoming a silent double-arg bug.
        counterDiv: params.rootFollowImpulsRasterEvery,
        everyFallback: params.rootFollowImpulsRasterEvery,
      },
    ),
  };
};

export const rootFollowLoopLaneToNexusPatch = (lane: RootFollowLoopLaneUiState) => ({
  rootFollowLoopActive: lane.active,
  rootFollowLoopId: lane.id,
  rootFollowLoopTimeMode: lane.timeMode,
  rootFollowLoopVolume: lane.volume,
  rootFollowLoopGranulationMode: lane.granulationMode,
  rootFollowGranularSettings: lane.granularSettings,
  rootFollowImpulsRasterEvery: lane.impulsRasterEvery,
  rootFollowImpulsRasterCycleDiv: lane.impulsRasterCycleDiv,
  rootFollowImpulsRasterClockMode: lane.impulsRasterClockMode,
  rootFollowImpulsRasterPattern: lane.impulsRasterPattern,
});

export const materialLoopLaneToNexusPatch = (lane: MaterialLoopLaneUiState) => ({
  materialLoopActive: lane.active,
  materialLoopId: lane.id,
  materialLoopSyncToBeat: lane.syncToBeat,
  materialLoopTimeMode: lane.timeMode,
  materialLoopVolume: lane.volume,
});
