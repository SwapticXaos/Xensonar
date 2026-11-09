import type { BuildResonancePanelRuntimeBindingsArgs } from './resonancePanelRuntimeBindings';

export type ParticleSystemRuntimePropKeys =
  | 'setParticleSystem'
  | 'particlePresets'
  | 'particleGradientPresets'
  | 'activeParticleNodes'
  | 'agentKeys'
  | 'particleVolumeMax'
  | 'previewParticlePresetSelection'
  | 'toggleNexusAgent'
  | 'setNexusAgentVolume';

export type ParticleSystemRuntimeProps = Pick<BuildResonancePanelRuntimeBindingsArgs, ParticleSystemRuntimePropKeys>;

export function buildParticleSystemProps(args: ParticleSystemRuntimeProps): ParticleSystemRuntimeProps {
  return args;
}
