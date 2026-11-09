import { buildAppParallelEffectsAuxPanelBoundary } from './buildAppParallelEffectsAuxPanelBoundary';
import type { AppParallelEffectsAuxPanelBoundaryInput } from './buildAppParallelEffectsAuxPanelBoundaryTypes';
import { buildAppRecordingTakeAuxPanelBoundary } from './buildAppRecordingTakeAuxPanelBoundary';
import type { AppRecordingTakeAuxPanelBoundaryInput } from './buildAppRecordingTakeAuxPanelBoundaryTypes';
import type {
  AppAuxPanelBoundaryInputContractMap,
  BuildAppResonanceAuxPanelRuntimeArgsInput,
} from './appResonanceAuxPanelRuntimeArgsTypes';

export const APP_RESONANCE_AUX_PANEL_SOURCE_NORMALIZER_EXTRACT = {
  cleanupKind: 'app-resonance-aux-panel-source-normalizer-extract',
  auxRuntimeArgsOwnsSourceNormalization: false,
  auxRuntimeArgsOwnsFlatteningOnly: true,
  sourceNormalizerOwnsParallelEffectsBoundaryBuild: true,
  sourceNormalizerOwnsRecordingTakeBoundaryBuild: true,
  sourceNormalizerOwnsRuntime: false,
  sourceNormalizerMutatesAudio: false,
  sourceNormalizerOwnsRoomLifecycle: false,
  sourceNormalizerOwnsPackagePersistence: false,
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

type AppAuxPanelParallelEffectsInput =
  | AppAuxPanelBoundaryInputContractMap["parallelEffects"]
  | AppParallelEffectsAuxPanelBoundaryInput;

function isParallelEffectsSourceInput(
  input: AppAuxPanelParallelEffectsInput,
): input is AppParallelEffectsAuxPanelBoundaryInput {
  return 'resonanceFxUiState' in input || 'collectiveMemory' in input;
}

function normalizeParallelEffectsAuxPanelSource(
  input: AppAuxPanelParallelEffectsInput,
): AppAuxPanelBoundaryInputContractMap["parallelEffects"] {
  return isParallelEffectsSourceInput(input)
    ? buildAppParallelEffectsAuxPanelBoundary(input)
    : input;
}

export function normalizeAppResonanceAuxPanelSources(
  input: BuildAppResonanceAuxPanelRuntimeArgsInput,
): AppAuxPanelBoundaryInputContractMap {
  return {
    parallelEffects: normalizeParallelEffectsAuxPanelSource(input.parallelEffects),
    grooveBass: input.grooveBass,
    recordingTake: buildAppRecordingTakeAuxPanelBoundary(
      input.recordingTake as AppRecordingTakeAuxPanelBoundaryInput,
    ),
    burstDiagnostics: input.burstDiagnostics,
  };
}
