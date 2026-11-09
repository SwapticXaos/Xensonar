import {
  APP_RESONANCE_AUX_PANEL_SOURCE_NORMALIZER_EXTRACT,
  normalizeAppResonanceAuxPanelSources,
} from './appResonanceAuxPanelSourceNormalizer';
import type {
  AppAuxPanelBoundaryInputContractMap,
  AppAuxPanelBoundaryKey,
  AppAuxPanelBoundaryOutputContractMap,
  AppAuxPanelBoundarySourceContractMap,
  AppResonanceAuxPanelRuntimeArgs,
  BuildAppResonanceAuxPanelRuntimeArgsInput,
} from './appResonanceAuxPanelRuntimeArgsTypes';

export type {
  AppAuxPanelBoundaryInputContractMap,
  AppAuxPanelBoundaryInputGroupName,
  AppAuxPanelBoundaryKey,
  AppAuxPanelBoundaryOutputContractMap,
  AppAuxPanelBoundaryOutputContractName,
  AppAuxPanelBoundarySourceContractMap,
  AppAuxPanelGrooveBassFlattenedContract,
  AppResonanceAuxPanelRuntimeArgs,
  BuildAppResonanceAuxPanelRuntimeArgsInput,
} from './appResonanceAuxPanelRuntimeArgsTypes';

export const APP_AUX_PANEL_BOUNDARY_KEYS = [
  'parallelEffects',
  'grooveBass',
  'recordingTake',
  'burstDiagnostics',
] as const satisfies readonly AppAuxPanelBoundaryKey[];

export const APP_AUX_PANEL_BOUNDARY_CONTRACT_CLEANUP_PROBE = null as unknown as {
  readonly keys: typeof APP_AUX_PANEL_BOUNDARY_KEYS;
  readonly inputs: AppAuxPanelBoundaryInputContractMap;
  readonly sourceInputs: AppAuxPanelBoundarySourceContractMap;
  readonly outputs: AppAuxPanelBoundaryOutputContractMap;
};

export const APP_RESONANCE_SCREEN_AUX_PANEL_SOURCE_CLEANUP = {
  cleanupKind: 'app-resonance-screen-aux-panel-source-cleanup',
  appOwnsAuxPanelBoundaryBuilderCalls: false,
  auxRuntimeArgsOwnsParallelEffectsBoundaryBuild: false,
  auxRuntimeArgsOwnsRecordingTakeBoundaryBuild: false,
  auxRuntimeArgsOwnsGrooveBassFlattening: true,
  auxSourceNormalizerOwnsParallelEffectsBoundaryBuild: true,
  auxSourceNormalizerOwnsRecordingTakeBoundaryBuild: true,
  auxRuntimeArgsOwnsRuntime: false,
  auxRuntimeArgsMutatesAudio: false,
  auxRuntimeArgsOwnsRoomLifecycle: false,
  auxRuntimeArgsOwnsPackagePersistence: false,
  acceptedInputShapes: [
    'prebuilt-aux-panel-boundary-inputs',
    'compact-aux-panel-source-inputs',
  ] as const,
  explicitlyNotMoved: [
    'parallel effects DSP/device runtime',
    'recording session runtime and MediaRecorder lifecycle',
    'Materialspur/GrooveBass panel behavior',
    'burst diagnostics recovery actions',
  ] as const,
} as const;

export { APP_RESONANCE_AUX_PANEL_SOURCE_NORMALIZER_EXTRACT };

export function buildAppResonanceAuxPanelRuntimeArgs(
  input: BuildAppResonanceAuxPanelRuntimeArgsInput,
): AppResonanceAuxPanelRuntimeArgs {
  const normalizedInput = normalizeAppResonanceAuxPanelSources(input);
  const { nParamsUI: _nParamsUI, updateNParams: _updateNParams, ...grooveBass } = normalizedInput.grooveBass;
  void _nParamsUI;
  void _updateNParams;
  return {
    ...normalizedInput.parallelEffects,
    ...grooveBass,
    ...normalizedInput.recordingTake,
    ...normalizedInput.burstDiagnostics,
  };
}
