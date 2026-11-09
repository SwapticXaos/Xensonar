import {
  buildBurstDiagnosticsPanelProps,
  type BurstDiagnosticsPanelProps,
} from '../rooms/buildBurstDiagnosticsPanelProps';
import { buildAppBurstDiagnosticsPanelBoundary } from '../diagnostics/buildAppBurstDiagnosticsPanelBoundary';
import {
  buildMaterialTrackPanelProps,
  type MaterialTrackPanelProps,
} from '../rooms/buildMaterialTrackPanelProps';
import { buildAppMaterialTrackPanelBoundary } from '../groove/buildAppMaterialTrackPanelBoundary';
import {
  buildParticleSystemProps,
  type ParticleSystemRuntimeProps,
} from '../rooms/buildParticleSystemProps';
import { buildAppParticleSystemPanelBoundary } from '../rooms/buildAppParticleSystemPanelBoundary';
import { buildResonanceControlProps } from '../rooms/buildResonanceControlProps';
import type { ResonanceControlRuntimeProps } from '../rooms/resonanceControlRuntimeTypes';
import { buildAppResonanceControlPanelBoundary } from '../rooms/buildAppResonanceControlPanelBoundary';
import { buildPerformanceCrisisPanelProps } from '../performanceCrisis/performanceCrisisPanelProps';
import {
  buildAppPerformanceCrisisPanelBoundary,
  type AppPerformanceCrisisPanelBoundaryInput,
} from '../performanceCrisis/buildAppPerformanceCrisisPanelBoundary';
import type { AppResonancePanelBoundaryKey } from './appResonancePanelBoundaryTypes';
import type {
  AppResonancePanelPropsBoundary,
  AppResonancePanelPropsBoundaryContractEntry,
  AppResonancePanelPropsBurstDiagnosticsInput,
  AppResonancePanelPropsCallsiteCleanupProbe,
  AppResonancePanelPropsMaterialTrackInput,
  AppResonancePanelPropsParticleSystemInput,
  AppResonancePanelPropsPerformanceCrisisInput,
  AppResonancePanelPropsResonanceControlInput,
  UseAppResonancePanelPropsBoundaryArgs,
} from './useAppResonancePanelPropsBoundaryTypes';

export type {
  AppResonancePanelPropsBoundary,
  AppResonancePanelPropsBoundaryContractEntry,
  AppResonancePanelPropsBoundaryOutputContractMap,
  AppResonancePanelPropsBurstDiagnosticsInput,
  AppResonancePanelPropsCallsiteCleanupProbe,
  AppResonancePanelPropsMaterialTrackInput,
  AppResonancePanelPropsParticleSystemInput,
  AppResonancePanelPropsPerformanceCrisisInput,
  AppResonancePanelPropsResonanceControlInput,
  UseAppResonancePanelPropsBoundaryArgs,
} from './useAppResonancePanelPropsBoundaryTypes';

export const APP_RESONANCE_PANEL_PROPS_BOUNDARY_BUILD_ORDER = [
  'materialTrack',
  'burstDiagnostics',
  'performanceCrisis',
  'resonanceControl',
  'particleSystem',
] as const satisfies readonly AppResonancePanelBoundaryKey[];

export const APP_RESONANCE_PANEL_PROPS_BOUNDARY_CONTRACT = {
  materialTrack: {
    sourceBoundary: 'materialTrack',
    sourceOutputContract: 'MaterialTrackPanelProps',
    panelPropKey: 'materialTrackPanelProps',
    panelPropBuilder: 'buildMaterialTrackPanelProps',
    bridgeOwnsRuntime: false,
    bridgeMutatesAudio: false,
  },
  burstDiagnostics: {
    sourceBoundary: 'burstDiagnostics',
    sourceOutputContract: 'BurstDiagnosticsPanelProps',
    panelPropKey: 'burstDiagnosticsPanelProps',
    panelPropBuilder: 'buildBurstDiagnosticsPanelProps',
    bridgeOwnsRuntime: false,
    bridgeMutatesAudio: false,
  },
  performanceCrisis: {
    sourceBoundary: 'performanceCrisis',
    sourceOutputContract: 'AppPerformanceCrisisPanelBoundaryInput',
    panelPropKey: 'performanceCrisisPanelProps',
    panelPropBuilder: 'buildPerformanceCrisisPanelProps',
    bridgeOwnsRuntime: false,
    bridgeMutatesAudio: false,
  },
  resonanceControl: {
    sourceBoundary: 'resonanceControl',
    sourceOutputContract: 'ResonanceControlRuntimeProps',
    panelPropKey: 'resonanceControlRuntimeProps',
    panelPropBuilder: 'buildResonanceControlProps',
    bridgeOwnsRuntime: false,
    bridgeMutatesAudio: false,
  },
  particleSystem: {
    sourceBoundary: 'particleSystem',
    sourceOutputContract: 'ParticleSystemRuntimeProps',
    panelPropKey: 'particleSystemRuntimeProps',
    panelPropBuilder: 'buildParticleSystemProps',
    bridgeOwnsRuntime: false,
    bridgeMutatesAudio: false,
  },
} as const satisfies Record<
  AppResonancePanelBoundaryKey,
  AppResonancePanelPropsBoundaryContractEntry
>;


export type AppResonancePanelBridgeReadiness = {
  readonly bridgeCandidate: true;
  readonly candidateBoundaryName: 'useAppResonancePanelPropsBoundary';
  readonly currentBoundaryKind: 'app-resonance-panel-props-composition-bridge';
  readonly avoidsAdditionalPassThroughBridgeFile: true;
  readonly appOwnsPanelInputComposition: true;
  readonly bridgeOwnsPanelPropBuild: true;
  readonly bridgeOwnsRuntime: false;
  readonly bridgeMutatesAudio: false;
  readonly bridgeOwnsSchedulingPolicy: false;
  readonly bridgeOwnsPackagePersistence: false;
  readonly bridgeOwnsRootFollowRuntime: false;
  readonly bridgeOwnsParticleRuntime: false;
  readonly buildOrder: typeof APP_RESONANCE_PANEL_PROPS_BOUNDARY_BUILD_ORDER;
  readonly contract: typeof APP_RESONANCE_PANEL_PROPS_BOUNDARY_CONTRACT;
  readonly readinessQuestion: 'existing-boundary-can-be-renamed-or-left-merge-friendly-before-adding-a-new-bridge-layer';
};

export const APP_RESONANCE_PANEL_BRIDGE_READINESS = {
  bridgeCandidate: true,
  candidateBoundaryName: 'useAppResonancePanelPropsBoundary',
  currentBoundaryKind: 'app-resonance-panel-props-composition-bridge',
  avoidsAdditionalPassThroughBridgeFile: true,
  appOwnsPanelInputComposition: true,
  bridgeOwnsPanelPropBuild: true,
  bridgeOwnsRuntime: false,
  bridgeMutatesAudio: false,
  bridgeOwnsSchedulingPolicy: false,
  bridgeOwnsPackagePersistence: false,
  bridgeOwnsRootFollowRuntime: false,
  bridgeOwnsParticleRuntime: false,
  buildOrder: APP_RESONANCE_PANEL_PROPS_BOUNDARY_BUILD_ORDER,
  contract: APP_RESONANCE_PANEL_PROPS_BOUNDARY_CONTRACT,
  readinessQuestion: 'existing-boundary-can-be-renamed-or-left-merge-friendly-before-adding-a-new-bridge-layer',
} as const satisfies AppResonancePanelBridgeReadiness;



export const APP_RESONANCE_PANEL_PROPS_CALLSITE_CLEANUP_PROBE = {
  currentAppCallsiteShape: 'app-owned-sub-boundary-input-assembly',
  intendedNextCleanupShape: 'boundary-owned-sub-boundary-input-assembly-after-probe',
  canCollapseAllPanelInputsAtOnce: false,
  recommendedFirstCleanupCandidate: 'materialTrack',
  canCollapseMaterialTrackFirst: true,
  canCollapseBurstDiagnosticsAfterMaterialTrack: 'normalization-completed-operational-recorder-source-stays-explicit',
  burstDiagnosticsProbeCompletedIn: '3.2.91.6.9.140',
  performanceCrisisProbeCompletedIn: '3.2.91.6.9.141',
  performanceCrisisCleanupCompletedIn: '3.2.91.6.9.142',
  canCollapsePerformanceCrisisAfterDiagnostics: 'cleanup-completed-boundary-owned-root-follow-granulation-source',
  canCollapseParticleSystemAfterDiagnostics: 'probe-required-due-to-agent-actions',
  canCollapseResonanceControlLast: 'completed-as-source-normalization-with-grid-quantize-traffic-and-myzel-groups-still-visible',
  appKeepsGridQuantizeTrafficOwnership: true,
  appKeepsRootFollowRecoveryOwnership: true,
  appKeepsParticleRuntimeOwnership: true,
  appKeepsMaterialImportExportOwnership: true,
  bridgeOwnsRuntime: false,
  bridgeMutatesAudio: false,
  bridgeOwnsSchedulingPolicy: false,
  bridgeOwnsPackagePersistence: false,
  bridgeOwnsRootFollowRuntime: false,
  bridgeOwnsParticleRuntime: false,
  nextPatchConstraint: 'panel-source-boundary-normalization-completed-resonance-control-source-can-be-normalized-only-with-groups-visible',
  resonanceControlSourceNormalizationCompletedIn: '3.2.91.6.9.159',
  materialTrackCleanupCompletedIn: '3.2.91.6.9.139',
  panelSourceBoundaryNormalizationCompletedIn: '3.2.91.6.9.156',
  burstDiagnosticsSourceNormalizationCompletedIn: '3.2.91.6.9.158',
} as const satisfies AppResonancePanelPropsCallsiteCleanupProbe;


function isMaterialTrackPanelProps(
  input: AppResonancePanelPropsMaterialTrackInput,
): input is MaterialTrackPanelProps {
  return (
    'drumPatterns' in input &&
    'drumKits' in input &&
    'bassPatterns' in input &&
    'bassPreviewContext' in input
  );
}

function normalizeMaterialTrackPanelInput(
  input: AppResonancePanelPropsMaterialTrackInput,
): MaterialTrackPanelProps {
  return isMaterialTrackPanelProps(input)
    ? input
    : buildAppMaterialTrackPanelBoundary(input);
}

function isBurstDiagnosticsPanelProps(
  input: AppResonancePanelPropsBurstDiagnosticsInput,
): input is BurstDiagnosticsPanelProps {
  return (
    'onStartAudioBurstRecorder' in input &&
    'onStopAudioBurstRecorder' in input &&
    'onExportAudioBurstRecorder' in input
  );
}

function normalizeBurstDiagnosticsPanelInput(
  input: AppResonancePanelPropsBurstDiagnosticsInput,
): BurstDiagnosticsPanelProps {
  return isBurstDiagnosticsPanelProps(input)
    ? input
    : buildAppBurstDiagnosticsPanelBoundary(input);
}

function isPerformanceCrisisBoundaryInput(
  input: AppResonancePanelPropsPerformanceCrisisInput,
): input is AppPerformanceCrisisPanelBoundaryInput {
  return (
    'activePresetId' in input &&
    'currentGranularSettings' in input &&
    'applyGranularRootFollowSettings' in input
  );
}

function normalizePerformanceCrisisPanelInput(
  input: AppResonancePanelPropsPerformanceCrisisInput,
): AppPerformanceCrisisPanelBoundaryInput {
  return isPerformanceCrisisBoundaryInput(input)
    ? input
    : buildAppPerformanceCrisisPanelBoundary(input);
}

function isParticleSystemRuntimeProps(
  input: AppResonancePanelPropsParticleSystemInput,
): input is ParticleSystemRuntimeProps {
  return (
    'particleGradientPresets' in input &&
    'agentKeys' in input &&
    'particleVolumeMax' in input
  );
}

function normalizeParticleSystemPanelInput(
  input: AppResonancePanelPropsParticleSystemInput,
): ParticleSystemRuntimeProps {
  return isParticleSystemRuntimeProps(input)
    ? input
    : buildAppParticleSystemPanelBoundary(input);
}

function isResonanceControlRuntimeProps(
  input: AppResonancePanelPropsResonanceControlInput,
): input is ResonanceControlRuntimeProps {
  return (
    'nParamsUI' in input &&
    'gridTempoBpm' in input &&
    !('trafficRefs' in input) &&
    !('toneActions' in input)
  );
}

function normalizeResonanceControlPanelInput(
  input: AppResonancePanelPropsResonanceControlInput,
): ResonanceControlRuntimeProps {
  return isResonanceControlRuntimeProps(input)
    ? input
    : buildAppResonanceControlPanelBoundary(input);
}

export function useAppResonancePanelPropsBoundary({
  materialTrack,
  burstDiagnostics,
  performanceCrisis,
  resonanceControl,
  particleSystem,
}: UseAppResonancePanelPropsBoundaryArgs): AppResonancePanelPropsBoundary {
  const panelPropsBoundary = {
    materialTrackPanelProps: buildMaterialTrackPanelProps(normalizeMaterialTrackPanelInput(materialTrack)),
    burstDiagnosticsPanelProps: buildBurstDiagnosticsPanelProps(
      normalizeBurstDiagnosticsPanelInput(burstDiagnostics),
    ),
    performanceCrisisPanelProps: buildPerformanceCrisisPanelProps(
      normalizePerformanceCrisisPanelInput(performanceCrisis),
    ),
    resonanceControlRuntimeProps: buildResonanceControlProps(
      normalizeResonanceControlPanelInput(resonanceControl),
    ),
    particleSystemRuntimeProps: buildParticleSystemProps(
      normalizeParticleSystemPanelInput(particleSystem),
    ),
  } satisfies AppResonancePanelPropsBoundary;

  return panelPropsBoundary;
}
