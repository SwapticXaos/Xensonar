import { KAMMERTON_KEYS } from '../domain/instrumentData';
import { buildAppResonanceDisplayCoordinator } from './appResonanceDisplayCoordinator';

type DisplayCoordinatorArgs = Parameters<typeof buildAppResonanceDisplayCoordinator>[0];

type BuildAppResonanceDisplayBindingsArgs = {
  activeMetaPresetId: DisplayCoordinatorArgs['metaPresetDisplay']['activeMetaPresetId'];
  roulettePreviewPresetId: DisplayCoordinatorArgs['metaPresetDisplay']['roulettePreviewPresetId'];
  sessionMetaOverrides: DisplayCoordinatorArgs['metaPresetDisplay']['sessionMetaOverrides'];
  mandalaPresetColorOverrides: DisplayCoordinatorArgs['metaPresetDisplay']['mandalaPresetColorOverrides'];
  particleSystem: DisplayCoordinatorArgs['resonanceStatus']['particleSystem'];
  churchMode: DisplayCoordinatorArgs['resonanceStatus']['churchMode'];
  gridTuning: DisplayCoordinatorArgs['resonanceStatus']['gridTuning'];
  gridMode: DisplayCoordinatorArgs['resonanceStatus']['gridMode'];
  manualGridMutedSteps: DisplayCoordinatorArgs['resonanceStatus']['manualGridMutedSteps'];
  manualGridStepOffsets: DisplayCoordinatorArgs['resonanceStatus']['manualGridStepOffsets'];
  activeParticleNodeCount: DisplayCoordinatorArgs['resonanceStatus']['activeParticleNodeCount'];
  agentEnabled: DisplayCoordinatorArgs['resonanceStatus']['agentEnabled'];
  bassRootMode: DisplayCoordinatorArgs['topologyResident']['bassRootMode'];
  bassRootHz: DisplayCoordinatorArgs['topologyResident']['bassRootHz'];
  getInterpreterMyzelBaseHz: DisplayCoordinatorArgs['topologyResident']['getInterpreterMyzelBaseHz'];
  residentSystem: DisplayCoordinatorArgs['topologyResident']['residentSystem'];
  selectedResidentId: DisplayCoordinatorArgs['topologyResident']['selectedResidentId'];
  topologyNodes: DisplayCoordinatorArgs['topologyResident']['topologyNodes'];
  residentAddFrequencySlider: DisplayCoordinatorArgs['topologyResident']['residentAddFrequencySlider'];
  gridBase: DisplayCoordinatorArgs['keyboardWindow']['gridBase'];
  keyboardWindowOffset: DisplayCoordinatorArgs['keyboardWindow']['keyboardWindowOffset'];
};

export function buildAppResonanceDisplayBindings(
  args: BuildAppResonanceDisplayBindingsArgs,
): DisplayCoordinatorArgs {
  return {
    metaPresetDisplay: {
      activeMetaPresetId: args.activeMetaPresetId,
      roulettePreviewPresetId: args.roulettePreviewPresetId,
      sessionMetaOverrides: args.sessionMetaOverrides,
      mandalaPresetColorOverrides: args.mandalaPresetColorOverrides,
    },
    resonanceStatus: {
      particleSystem: args.particleSystem,
      churchMode: args.churchMode,
      gridTuning: args.gridTuning,
      gridMode: args.gridMode,
      manualGridMutedSteps: args.manualGridMutedSteps,
      manualGridStepOffsets: args.manualGridStepOffsets,
      activeParticleNodeCount: args.activeParticleNodeCount,
      agentEnabled: args.agentEnabled,
    },
    topologyResident: {
      bassRootMode: args.bassRootMode,
      bassRootHz: args.bassRootHz,
      getInterpreterMyzelBaseHz: args.getInterpreterMyzelBaseHz,
      residentSystem: args.residentSystem,
      selectedResidentId: args.selectedResidentId,
      topologyNodes: args.topologyNodes,
      residentAddFrequencySlider: args.residentAddFrequencySlider,
    },
    keyboardWindow: {
      gridBase: args.gridBase,
      gridTuning: args.gridTuning,
      manualGridMutedSteps: args.manualGridMutedSteps,
      manualGridStepOffsets: args.manualGridStepOffsets,
      keyboardWindowOffset: args.keyboardWindowOffset,
      windowSize: KAMMERTON_KEYS.length,
    },
  };
}
