import type { AppBurstDiagnosticsPanelBoundaryArgs } from '../diagnostics/buildAppBurstDiagnosticsPanelBoundary';
import type { AppMaterialTrackPanelBoundaryArgs } from '../groove/buildAppMaterialTrackPanelBoundaryTypes';
import type {
  AppPerformanceCrisisPanelBoundaryArgs,
  AppPerformanceCrisisPanelBoundaryInput,
} from '../performanceCrisis/buildAppPerformanceCrisisPanelBoundary';
import type { PerformanceCrisisPanelProps } from '../performanceCrisis/performanceCrisisPanelProps';
import type { AppParticleSystemPanelBoundaryArgs } from '../rooms/buildAppParticleSystemPanelBoundaryTypes';
import type { AppResonanceControlPanelBoundaryArgs } from '../rooms/appResonanceControlPanelBoundaryTypes';
import type { BurstDiagnosticsPanelProps } from '../rooms/buildBurstDiagnosticsPanelProps';
import type { MaterialTrackPanelProps } from '../rooms/buildMaterialTrackPanelProps';
import type { ParticleSystemRuntimeProps } from '../rooms/buildParticleSystemProps';
import type {
  ResonanceControlRuntimeProps,
  ResonanceControlRuntimeSpreadProps,
} from '../rooms/resonanceControlRuntimeTypes';
import type {
  AppResonancePanelBoundaryKey,
  AppResonancePanelBoundaryOutputContractMap,
  AppResonancePanelBoundaryOutputContractName,
} from './appResonancePanelBoundaryTypes';

export type AppResonancePanelPropsMaterialTrackInput =
  | MaterialTrackPanelProps
  | AppMaterialTrackPanelBoundaryArgs;

export type AppResonancePanelPropsBurstDiagnosticsInput =
  | BurstDiagnosticsPanelProps
  | AppBurstDiagnosticsPanelBoundaryArgs;

export type AppResonancePanelPropsPerformanceCrisisInput =
  | AppPerformanceCrisisPanelBoundaryInput
  | AppPerformanceCrisisPanelBoundaryArgs;

export type AppResonancePanelPropsParticleSystemInput =
  | ParticleSystemRuntimeProps
  | AppParticleSystemPanelBoundaryArgs;

export type AppResonancePanelPropsResonanceControlInput =
  | ResonanceControlRuntimeProps
  | AppResonanceControlPanelBoundaryArgs;

export type UseAppResonancePanelPropsBoundaryArgs =
  Omit<
    AppResonancePanelBoundaryOutputContractMap,
    'materialTrack' | 'burstDiagnostics' | 'performanceCrisis' | 'resonanceControl' | 'particleSystem'
  > & {
    readonly materialTrack: AppResonancePanelPropsMaterialTrackInput;
    readonly burstDiagnostics: AppResonancePanelPropsBurstDiagnosticsInput;
    readonly performanceCrisis: AppResonancePanelPropsPerformanceCrisisInput;
    readonly resonanceControl: AppResonancePanelPropsResonanceControlInput;
    readonly particleSystem: AppResonancePanelPropsParticleSystemInput;
  };

export type AppResonancePanelPropsBoundaryOutputContractMap = {
  readonly materialTrackPanelProps: MaterialTrackPanelProps;
  readonly burstDiagnosticsPanelProps: BurstDiagnosticsPanelProps;
  readonly performanceCrisisPanelProps: PerformanceCrisisPanelProps;
  readonly resonanceControlRuntimeProps: ResonanceControlRuntimeSpreadProps;
  readonly particleSystemRuntimeProps: ParticleSystemRuntimeProps;
};

export type AppResonancePanelPropsBoundary =
  AppResonancePanelPropsBoundaryOutputContractMap;

export type AppResonancePanelPropsBoundaryContractEntry = {
  readonly sourceBoundary: AppResonancePanelBoundaryKey;
  readonly sourceOutputContract: AppResonancePanelBoundaryOutputContractName;
  readonly panelPropKey: keyof AppResonancePanelPropsBoundary;
  readonly panelPropBuilder: string;
  readonly bridgeOwnsRuntime: false;
  readonly bridgeMutatesAudio: false;
};

export type AppResonancePanelPropsCallsiteCleanupProbe = {
  readonly currentAppCallsiteShape: 'app-owned-sub-boundary-input-assembly';
  readonly intendedNextCleanupShape: 'boundary-owned-sub-boundary-input-assembly-after-probe';
  readonly canCollapseAllPanelInputsAtOnce: false;
  readonly recommendedFirstCleanupCandidate: 'materialTrack';
  readonly canCollapseMaterialTrackFirst: true;
  readonly canCollapseBurstDiagnosticsAfterMaterialTrack: 'normalization-completed-operational-recorder-source-stays-explicit';
  readonly burstDiagnosticsProbeCompletedIn: '3.2.91.6.9.140';
  readonly performanceCrisisProbeCompletedIn: '3.2.91.6.9.141';
  readonly performanceCrisisCleanupCompletedIn: '3.2.91.6.9.142';
  readonly canCollapsePerformanceCrisisAfterDiagnostics: 'cleanup-completed-boundary-owned-root-follow-granulation-source';
  readonly canCollapseParticleSystemAfterDiagnostics: 'probe-required-due-to-agent-actions';
  readonly canCollapseResonanceControlLast: 'completed-as-source-normalization-with-grid-quantize-traffic-and-myzel-groups-still-visible';
  readonly appKeepsGridQuantizeTrafficOwnership: true;
  readonly appKeepsRootFollowRecoveryOwnership: true;
  readonly appKeepsParticleRuntimeOwnership: true;
  readonly appKeepsMaterialImportExportOwnership: true;
  readonly bridgeOwnsRuntime: false;
  readonly bridgeMutatesAudio: false;
  readonly bridgeOwnsSchedulingPolicy: false;
  readonly bridgeOwnsPackagePersistence: false;
  readonly bridgeOwnsRootFollowRuntime: false;
  readonly bridgeOwnsParticleRuntime: false;
  readonly nextPatchConstraint: 'panel-source-boundary-normalization-completed-resonance-control-source-can-be-normalized-only-with-groups-visible';
  readonly resonanceControlSourceNormalizationCompletedIn: '3.2.91.6.9.159';
  readonly materialTrackCleanupCompletedIn: '3.2.91.6.9.139';
  readonly panelSourceBoundaryNormalizationCompletedIn: '3.2.91.6.9.156';
  readonly burstDiagnosticsSourceNormalizationCompletedIn: '3.2.91.6.9.158';
};
