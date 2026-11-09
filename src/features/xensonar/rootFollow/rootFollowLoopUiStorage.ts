import { normalizeRootFollowGranularSettings, type RootFollowGranularSettings } from './rootFollowGranularSettings';
import { normalizeRootFollowImpulseRasterClockMode, normalizeRootFollowImpulseRasterPattern, normalizeRootFollowImpulseRasterValue } from './rootFollowImpulseRasterPolicy';
import type { AppNexusParams, NexusUiPatch } from '../rooms/nexusParamsInitialState';
import {
  clampLoopLaneVolume,
  extractRootFollowLoopLaneUiState,
  isLoopLaneTimeMode,
  isRootFollowGranulationMode,
  rootFollowLoopLaneToNexusPatch,
  type LoopLaneTimeMode,
  type RootFollowLoopLaneUiState,
} from '../material/loopLaneUiState';

export const ROOT_FOLLOW_LOOP_UI_STORAGE_KEY = 'xensonar-root-follow-loop-ui-v1';

type StoredRootFollowLoopUiState = Partial<{
  rootFollowLoopActive: boolean;
  rootFollowLoopId: string;
  rootFollowLoopTimeMode: LoopLaneTimeMode;
  rootFollowLoopVolume: number;
  rootFollowLoopGranulationMode: RootFollowLoopLaneUiState['granulationMode'];
  rootFollowGranularSettings: Partial<RootFollowGranularSettings>;
  rootFollowImpulsRasterEvery: number;
  rootFollowImpulsRasterCycleDiv: number;
  rootFollowImpulsRasterClockMode: RootFollowLoopLaneUiState['impulsRasterClockMode'];
  rootFollowImpulsRasterPattern: number[];
}>;

const getStorage = (storage?: Storage): Storage | null => {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

export const readRootFollowLoopUiPatchFromStorage = (storage?: Storage): NexusUiPatch => {
  const targetStorage = getStorage(storage);
  if (!targetStorage) return {};
  try {
    const raw = targetStorage.getItem(ROOT_FOLLOW_LOOP_UI_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredRootFollowLoopUiState;
    const lane: RootFollowLoopLaneUiState = {
      active: typeof parsed.rootFollowLoopActive === 'boolean' ? parsed.rootFollowLoopActive : false,
      id: typeof parsed.rootFollowLoopId === 'string' ? parsed.rootFollowLoopId : '',
      timeMode: isLoopLaneTimeMode(parsed.rootFollowLoopTimeMode) ? parsed.rootFollowLoopTimeMode : 'normal',
      volume: clampLoopLaneVolume(parsed.rootFollowLoopVolume),
      granulationMode: isRootFollowGranulationMode(parsed.rootFollowLoopGranulationMode)
        ? parsed.rootFollowLoopGranulationMode
        : 'flowing',
      granularSettings: normalizeRootFollowGranularSettings(
        parsed.rootFollowGranularSettings,
        isRootFollowGranulationMode(parsed.rootFollowLoopGranulationMode) ? parsed.rootFollowLoopGranulationMode : 'flowing',
      ),
      impulsRasterEvery: normalizeRootFollowImpulseRasterValue(parsed.rootFollowImpulsRasterEvery),
      impulsRasterCycleDiv: normalizeRootFollowImpulseRasterValue(parsed.rootFollowImpulsRasterCycleDiv),
      impulsRasterClockMode: normalizeRootFollowImpulseRasterClockMode(parsed.rootFollowImpulsRasterClockMode),
      impulsRasterPattern: normalizeRootFollowImpulseRasterPattern(
        parsed.rootFollowImpulsRasterPattern,
        {
          counterDiv: parsed.rootFollowImpulsRasterEvery,
          everyFallback: parsed.rootFollowImpulsRasterEvery,
        },
      ),
    };
    const patch: NexusUiPatch = {};
    if (typeof parsed.rootFollowLoopActive === 'boolean') patch.rootFollowLoopActive = lane.active;
    if (typeof parsed.rootFollowLoopId === 'string') patch.rootFollowLoopId = lane.id;
    if (isLoopLaneTimeMode(parsed.rootFollowLoopTimeMode)) patch.rootFollowLoopTimeMode = lane.timeMode;
    if (typeof parsed.rootFollowLoopVolume === 'number' && Number.isFinite(parsed.rootFollowLoopVolume)) {
      patch.rootFollowLoopVolume = lane.volume;
    }
    if (isRootFollowGranulationMode(parsed.rootFollowLoopGranulationMode)) {
      patch.rootFollowLoopGranulationMode = lane.granulationMode;
    }
    if (parsed.rootFollowGranularSettings && typeof parsed.rootFollowGranularSettings === 'object') {
      patch.rootFollowGranularSettings = lane.granularSettings;
    }
    if (typeof parsed.rootFollowImpulsRasterEvery === 'number' && Number.isFinite(parsed.rootFollowImpulsRasterEvery)) {
      patch.rootFollowImpulsRasterEvery = lane.impulsRasterEvery;
    }
    if (typeof parsed.rootFollowImpulsRasterCycleDiv === 'number' && Number.isFinite(parsed.rootFollowImpulsRasterCycleDiv)) {
      patch.rootFollowImpulsRasterCycleDiv = lane.impulsRasterCycleDiv;
    }
    if (parsed.rootFollowImpulsRasterClockMode === 'fragment-compress' || parsed.rootFollowImpulsRasterClockMode === 'mute-pattern') {
      patch.rootFollowImpulsRasterClockMode = lane.impulsRasterClockMode;
    }
    if (Array.isArray(parsed.rootFollowImpulsRasterPattern)) {
      patch.rootFollowImpulsRasterPattern = lane.impulsRasterPattern;
    }
    return patch;
  } catch {
    return {};
  }
};

export const createRootFollowLoopUiStorageSnapshot = (params: Pick<
  AppNexusParams,
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
>) => rootFollowLoopLaneToNexusPatch(extractRootFollowLoopLaneUiState(params));

export const writeRootFollowLoopUiStateToStorage = (params: AppNexusParams, storage?: Storage) => {
  const targetStorage = getStorage(storage);
  if (!targetStorage) return;
  try {
    targetStorage.setItem(ROOT_FOLLOW_LOOP_UI_STORAGE_KEY, JSON.stringify(createRootFollowLoopUiStorageSnapshot(params)));
  } catch {}
};
