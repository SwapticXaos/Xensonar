import type { ParticleSystemRuntimeProps } from './buildParticleSystemProps';

export type AppParticleSystemSelectionBoundary = Pick<
  ParticleSystemRuntimeProps,
  | 'setParticleSystem'
  | 'activeParticleNodes'
>;

export type AppParticleSystemPresetCatalogSourceBoundary = Pick<
  ParticleSystemRuntimeProps,
  | 'particlePresets'
>;

export type AppParticleSystemAgentActionBoundary = Pick<
  ParticleSystemRuntimeProps,
  | 'previewParticlePresetSelection'
  | 'toggleNexusAgent'
  | 'setNexusAgentVolume'
>;

export type AppParticleSystemPanelBoundaryArgs = {
  selection: AppParticleSystemSelectionBoundary;
  presetCatalogSource: AppParticleSystemPresetCatalogSourceBoundary;
  agentActions: AppParticleSystemAgentActionBoundary;
};
