import { AGENT_KEYS, PARTICLE_GRADIENT_PRESETS, PARTICLE_VOLUME_MAX } from '../domain/instrumentData';
import type { ParticleSystemRuntimeProps } from './buildParticleSystemProps';

import type { AppParticleSystemPanelBoundaryArgs } from './buildAppParticleSystemPanelBoundaryTypes';

export type { AppParticleSystemAgentActionBoundary, AppParticleSystemPanelBoundaryArgs, AppParticleSystemPresetCatalogSourceBoundary, AppParticleSystemSelectionBoundary } from './buildAppParticleSystemPanelBoundaryTypes';

export function buildAppParticleSystemPanelBoundary({
  selection,
  presetCatalogSource,
  agentActions,
}: AppParticleSystemPanelBoundaryArgs): ParticleSystemRuntimeProps {
  return {
    ...selection,
    ...presetCatalogSource,
    particleGradientPresets: PARTICLE_GRADIENT_PRESETS,
    agentKeys: AGENT_KEYS,
    particleVolumeMax: PARTICLE_VOLUME_MAX,
    ...agentActions,
  };
}
