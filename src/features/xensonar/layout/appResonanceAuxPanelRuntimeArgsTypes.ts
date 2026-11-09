import type {
  AppAuxPanelBoundaryInputContractMap as AppAuxPanelBoundaryInputContractMapBase,
  AppAuxPanelBoundaryKey as AppAuxPanelBoundaryKeyBase,
} from './appAuxPanelBoundaryBaseTypes';
import type { AppParallelEffectsAuxPanelBoundaryInput } from './buildAppParallelEffectsAuxPanelBoundaryTypes';
import type { AppRecordingTakeAuxPanelBoundaryInput } from './buildAppRecordingTakeAuxPanelBoundaryTypes';

export type AppAuxPanelBoundaryKey = AppAuxPanelBoundaryKeyBase;
export type AppAuxPanelBoundaryInputContractMap = AppAuxPanelBoundaryInputContractMapBase;

export type AppAuxPanelGrooveBassFlattenedContract = Omit<
  AppAuxPanelBoundaryInputContractMap['grooveBass'],
  'nParamsUI' | 'updateNParams'
>;

export type AppAuxPanelBoundaryOutputContractMap = {
  readonly parallelEffects: AppAuxPanelBoundaryInputContractMap['parallelEffects'];
  readonly grooveBass: AppAuxPanelGrooveBassFlattenedContract;
  readonly recordingTake: AppAuxPanelBoundaryInputContractMap['recordingTake'];
  readonly burstDiagnostics: AppAuxPanelBoundaryInputContractMap['burstDiagnostics'];
};

export type AppAuxPanelBoundaryInputGroupName =
  | AppAuxPanelBoundaryKey
  | 'collectiveMemory'
  | 'sharedFormatters'
  | 'psychedelicSpiral'
  | 'enterHoldPsyFx'
  | 'schwarm'
  | 'runtimeMonitors'
  | 'liveMastering'
  | 'panelArgs'
  | 'preview'
  | 'source'
  | 'session'
  | 'exportActions'
  | 'timeline'
  | 'audioTapMonitor'
  | 'audioBurstRecorder'
  | 'audioPairTherapistStatus'
  | 'rootFollowHealth'
  | 'workspacePackageActivationReport'
  | 'audioBurstRuntime'
  | 'exportContext'
  | 'rootFollowRecoveryActions';

export type AppAuxPanelBoundaryOutputContractName =
  | 'AppResonanceAuxPanelRuntimeArgs'
  | 'AppParallelEffectsAuxPanelBoundary'
  | 'AppAuxPanelGrooveBassFlattenedContract'
  | 'AppRecordingTakeAuxPanelBoundary'
  | 'AppBurstDiagnosticsPanelBoundary';

export type AppAuxPanelBoundarySourceContractMap = {
  readonly parallelEffects: AppParallelEffectsAuxPanelBoundaryInput;
  readonly grooveBass: AppAuxPanelBoundaryInputContractMap['grooveBass'];
  readonly recordingTake: AppRecordingTakeAuxPanelBoundaryInput;
  readonly burstDiagnostics: AppAuxPanelBoundaryInputContractMap['burstDiagnostics'];
};

export type BuildAppResonanceAuxPanelRuntimeArgsInput =
  | AppAuxPanelBoundaryInputContractMap
  | AppAuxPanelBoundarySourceContractMap;

export type AppResonanceAuxPanelRuntimeArgs =
  AppAuxPanelBoundaryOutputContractMap['parallelEffects'] &
  AppAuxPanelBoundaryOutputContractMap['grooveBass'] &
  AppAuxPanelBoundaryOutputContractMap['recordingTake'] &
  AppAuxPanelBoundaryOutputContractMap['burstDiagnostics'];
