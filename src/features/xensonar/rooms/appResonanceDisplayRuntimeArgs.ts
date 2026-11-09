import type { buildAppResonanceDisplayBindings } from './appResonanceDisplayBindings';

type AppResonanceDisplayRuntimeArgs = Parameters<
  typeof buildAppResonanceDisplayBindings
>[0];

type BuildAppResonanceDisplayRuntimeArgs = {
  metaPreset: Pick<
    AppResonanceDisplayRuntimeArgs,
    | 'activeMetaPresetId'
    | 'roulettePreviewPresetId'
    | 'sessionMetaOverrides'
    | 'mandalaPresetColorOverrides'
  >;
  resonanceStatus: Pick<
    AppResonanceDisplayRuntimeArgs,
    | 'particleSystem'
    | 'churchMode'
    | 'gridTuning'
    | 'gridMode'
    | 'manualGridMutedSteps'
    | 'manualGridStepOffsets'
    | 'activeParticleNodeCount'
    | 'agentEnabled'
    | 'bassRootMode'
    | 'bassRootHz'
  >;
  topologyResident: Pick<
    AppResonanceDisplayRuntimeArgs,
    | 'getInterpreterMyzelBaseHz'
    | 'residentSystem'
    | 'selectedResidentId'
    | 'topologyNodes'
    | 'residentAddFrequencySlider'
  >;
  keyboardWindow: Pick<
    AppResonanceDisplayRuntimeArgs,
    'gridBase' | 'keyboardWindowOffset'
  >;
};

export function buildAppResonanceDisplayRuntimeArgs(
  args: BuildAppResonanceDisplayRuntimeArgs,
): AppResonanceDisplayRuntimeArgs {
  return {
    ...args.metaPreset,
    ...args.resonanceStatus,
    ...args.topologyResident,
    ...args.keyboardWindow,
  };
}
