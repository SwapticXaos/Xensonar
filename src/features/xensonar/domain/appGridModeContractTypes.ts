import type { getParticleNodes, ChurchMode, GridTuning, ParticleSystem } from './instrumentData';
import type { MetaPresetDefinition } from './metaPresetTypes';

export type NexusSelectionContractState = {
  gridTuning: GridTuning;
  gridMode: ChurchMode;
  particleSystem: ParticleSystem;
  churchMode: ChurchMode;
};

export type ParticleSystemContractPatch = {
  particleSystem: ParticleSystem;
  churchMode: ChurchMode;
  agentEnabled: boolean[];
  agentVolumes: number[];
};

export type ParticleSystemContractResult = {
  nodes: ReturnType<typeof getParticleNodes>;
  resolvedMode: ChurchMode;
  nextEnabled: boolean[];
  nextVolumes: number[];
  nexusPatch: ParticleSystemContractPatch;
};

export type ChurchModeContractPatch = {
  churchMode: ChurchMode;
  agentEnabled: boolean[];
};

export type ChurchModeContractResult = {
  resolvedMode: ChurchMode;
  nextEnabled: boolean[];
  nexusPatch: ChurchModeContractPatch;
};

export type GridModeContractPatch = {
  gridMode: ChurchMode;
  manualGridMutedSteps: number[];
};

export type GridModeContractResult = {
  resolvedMode: ChurchMode;
  nextMutes: number[];
  nexusPatch: GridModeContractPatch;
};

export type ResolvedMetaPresetSelections = NexusSelectionContractState;

export type NexusSelectionPatch = Partial<
  Pick<
    NonNullable<MetaPresetDefinition['nexusPatch']>,
    'gridTuning' | 'gridMode' | 'particleSystem' | 'churchMode'
  >
>;

export type MetaPresetNexusContractInput = Pick<
  MetaPresetDefinition,
  'nexusPatch' | 'gridAllowedSteps' | 'gridOffsets' | 'agentEnabledSteps' | 'agentVolumes'
>;

export type MetaPresetNexusContractResult = {
  resolvedSelections: ResolvedMetaPresetSelections;
  normalizedNexusPatch: NexusSelectionPatch;
  nextGridMutes: number[];
  nextGridOffsets: number[];
  nextAgentEnabled: boolean[];
  nextAgentVolumes: number[];
};
