import type { MaterialEntry } from '../../l3lab/materialLibrary';
import type { MaterialLoopTimeMode } from '../material/materialLoopMath';
import type { RootFollowBankEntryConfig } from './rootFollowTypes';
import type { RootFollowLifecycleContractSummary } from './rootFollowLifecycleContractProbe';
import type { RootFollowGranularSettings } from './rootFollowGranularSettings';
import type { RootFollowRuntimePolicy } from '../performanceCrisis/performanceCrisisRuntimePolicies';
import type { RootFollowImpulseRasterRenderWindow } from './rootFollowImpulseRasterPolicy';

export type RootFollowActiveSynthVoice = {
  id: string;
  endTime: number;
  baseTargetValue: number;
  frequencyTargets: AudioParam[];
  localPitchCurve?: Float32Array | null;
  noteStart?: number;
  noteEnd?: number;
  lastAppliedRatio?: number | null;
};

export type RootFollowPlaybackRefs = {
  cacheRef: { current: Map<string, AudioBuffer> };
  gainRef: { current: GainNode | null };
  tokenRef: { current: number };
  timerRef: { current: number | null };
  activeNodesRef: { current: Set<AudioNode> };
  activeSynthVoicesRef: { current: Map<string, RootFollowActiveSynthVoice> };
  trafficRef?: { current: any };
  lifecycleProbeRef?: { current: RootFollowLifecycleContractSummary | null };
};

export type RootFollowDynamicRefs = {
  volumeRef: { current: number };
  getRhythmBusRef: { current: (ctx: AudioContext) => AudioNode };
  ensureMyzelPostFxRouterRef: { current: (ctx: AudioContext) => void };
  getForgeSendRef: { current: () => GainNode | null };
  getCurrentRootHzRef: { current: () => number };
  granulationModeRef: { current: 'flowing' | 'grainy' };
  granularSettingsRef: { current: RootFollowGranularSettings };
};

export type RootFollowMaterialRenderArgs = {
  ctx: AudioContext;
  entry: MaterialEntry;
  quantizeBpm: number;
  rootFollowLoopTimeMode: MaterialLoopTimeMode;
  refs: RootFollowPlaybackRefs;
  dynamicRefs: RootFollowDynamicRefs;
  transportAnchor: number;
  nextSliceStart: number;
  sessionAnchorHz: number | null;
  materialSmoothedRootHz?: number | null;
  rootFollowPolicy?: RootFollowRuntimePolicy | null;
  audioPressureBias?: number;
  impulseRasterWindow?: RootFollowImpulseRasterRenderWindow | null;
};

export type RootFollowMaterialRenderResult = {
  nextSliceStart: number;
  sessionAnchorHz: number | null;
  materialSmoothedRootHz: number | null;
  delayMs: number;
};

export type RootFollowSynthRenderArgs = {
  rootFollowLoopTimeMode?: MaterialLoopTimeMode;
  ctx: AudioContext;
  entry: MaterialEntry;
  entryConfig: RootFollowBankEntryConfig;
  quantizeBpm: number;
  refs: RootFollowPlaybackRefs;
  dynamicRefs: RootFollowDynamicRefs;
  transportAnchor: number;
  nextSliceStart: number;
  sessionAnchorHz: number | null;
  rootFollowPolicy?: RootFollowRuntimePolicy | null;
  audioPressureBias?: number;
};

export type RootFollowSynthRenderResult = {
  nextSliceStart: number;
  sessionAnchorHz: number | null;
  delayMs: number;
};

export type RootFollowFormantRenderArgs = {
  ctx: AudioContext;
  entry: MaterialEntry;
  entryConfig: RootFollowBankEntryConfig;
  quantizeBpm: number;
  refs: RootFollowPlaybackRefs;
  dynamicRefs: RootFollowDynamicRefs;
  transportAnchor: number;
  nextSliceStart: number;
  sessionAnchorHz: number | null;
};

export type RootFollowFormantRenderResult = {
  nextSliceStart: number;
  sessionAnchorHz: number | null;
  delayMs: number;
};
