import type { AppBurstDiagnosticsPanelBoundaryArgs } from '../diagnostics/buildAppBurstDiagnosticsPanelBoundary';
import type { AppMaterialTrackPanelBoundaryArgs } from '../groove/buildAppMaterialTrackPanelBoundaryTypes';
import type {
  AppPerformanceCrisisPanelBoundaryArgs,
  AppPerformanceCrisisPanelBoundaryInput,
} from '../performanceCrisis/buildAppPerformanceCrisisPanelBoundary';
import type { AppParticleSystemPanelBoundaryArgs } from '../rooms/buildAppParticleSystemPanelBoundaryTypes';
import type { AppResonanceControlPanelBoundaryArgs } from '../rooms/appResonanceControlPanelBoundaryTypes';
import type { BurstDiagnosticsPanelProps } from '../rooms/buildBurstDiagnosticsPanelProps';
import type { MaterialTrackPanelProps } from '../rooms/buildMaterialTrackPanelProps';
import type { ParticleSystemRuntimeProps } from '../rooms/buildParticleSystemProps';
import type { ResonanceControlRuntimeProps } from '../rooms/resonanceControlRuntimeTypes';

export type AppResonancePanelBoundaryKey =
  | 'performanceCrisis'
  | 'burstDiagnostics'
  | 'materialTrack'
  | 'resonanceControl'
  | 'particleSystem';

export type AppResonancePanelBoundaryInputContractMap = {
  readonly performanceCrisis: AppPerformanceCrisisPanelBoundaryArgs;
  readonly burstDiagnostics: AppBurstDiagnosticsPanelBoundaryArgs;
  readonly materialTrack: AppMaterialTrackPanelBoundaryArgs;
  readonly resonanceControl: AppResonanceControlPanelBoundaryArgs;
  readonly particleSystem: AppParticleSystemPanelBoundaryArgs;
};

export type AppResonancePanelBoundaryOutputContractMap = {
  readonly performanceCrisis: AppPerformanceCrisisPanelBoundaryInput;
  readonly burstDiagnostics: BurstDiagnosticsPanelProps;
  readonly materialTrack: MaterialTrackPanelProps;
  readonly resonanceControl: ResonanceControlRuntimeProps;
  readonly particleSystem: ParticleSystemRuntimeProps;
};

export type AppResonancePanelBoundaryInputGroupName =
  | 'uiPolicyState'
  | 'rootFollowGranulationSource'
  | 'audioBurstRecorder'
  | 'audioTapMonitor'
  | 'audioPairTherapistStatus'
  | 'rootFollowHealth'
  | 'workspacePackageActivationReport'
  | 'audioBurstRuntime'
  | 'exportContext'
  | 'rootFollowRecoveryActions'
  | 'panelArgs'
  | 'preview'
  | 'previewSource'
  | 'state'
  | 'gridAndTuning'
  | 'trafficRefs'
  | 'toneActions'
  | 'myzelInstallation'
  | 'selection'
  | 'presetCatalogSource'
  | 'agentActions';

export type AppResonancePanelBoundaryOutputContractName =
  | 'AppPerformanceCrisisPanelBoundaryInput'
  | 'BurstDiagnosticsPanelProps'
  | 'MaterialTrackPanelProps'
  | 'ResonanceControlRuntimeProps'
  | 'ParticleSystemRuntimeProps';

export type AppResonancePanelBoundaryManifestEntry = {
  readonly layer: 'app-resonance-panel-sub-boundary';
  readonly runtimeOwned: false;
  readonly audioMutating: false;
};

export type AppResonancePanelBoundaryShapeAuditEntry =
  AppResonancePanelBoundaryManifestEntry & {
    readonly builder: string;
    readonly inputGroups: readonly AppResonancePanelBoundaryInputGroupName[];
    readonly outputContract: AppResonancePanelBoundaryOutputContractName;
    readonly currentRole: 'app-panel-input-montage';
    readonly bridgeOwnsPanelPropBuild: false;
    readonly explicitlyNotOwned: readonly string[];
  };
