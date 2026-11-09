import type { RootFollowGranularSettings, RootFollowGranulationMode } from '../rootFollow/rootFollowGranularSettings';
import { normalizeRootFollowGranularSettings } from '../rootFollow/rootFollowGranularSettings';
import type { buildPerformanceCrisisPanelProps } from './performanceCrisisPanelProps';
import type { usePerformanceCrisisUiPolicyState } from './usePerformanceCrisisUiPolicyState';

type PerformanceCrisisUiPolicyState = ReturnType<typeof usePerformanceCrisisUiPolicyState>;

export type AppPerformanceCrisisRootFollowGranulationSource = {
  readonly nParamsUI: {
    readonly rootFollowLoopGranulationMode: RootFollowGranulationMode;
    readonly rootFollowGranularSettings:
      | Partial<RootFollowGranularSettings>
      | null
      | undefined;
  };
  readonly updateNParams: (partial: {
    readonly rootFollowGranularSettings: RootFollowGranularSettings;
    readonly rootFollowLoopGranulationMode: RootFollowGranulationMode;
  }) => void;
};

export type AppPerformanceCrisisPanelBoundaryArgs = {
  readonly uiPolicyState: PerformanceCrisisUiPolicyState;
  readonly rootFollowGranulationSource: AppPerformanceCrisisRootFollowGranulationSource;
  readonly audioBurstRecorder: unknown;
};

export type AppPerformanceCrisisPanelBoundaryInput = Parameters<
  typeof buildPerformanceCrisisPanelProps
>[0];


export type AppPerformanceCrisisPanelCallsiteCleanup = {
  readonly currentAppCallsiteShape: 'boundary-owned-root-follow-granulation-source-assembly';
  readonly previousAppCallsiteShape: 'app-owned-performance-crisis-panel-boundary-args-assembly';
  readonly cleanupCompletedIn: '3.2.91.6.9.142';
  readonly directLineReductionExpected: 'medium';
  readonly movedIntoBoundary: 'root-follow-granulation-value-and-update-callback-shaping';
  readonly keepsUiPolicyStateAppOwned: true;
  readonly keepsAudioBurstRecorderOwnershipOutsideBoundary: true;
  readonly keepsRootFollowGranulationRuntimeOutsideBoundary: true;
  readonly keepsUpdateNParamsOwnershipOutsideBoundary: true;
  readonly runtimeOwned: false;
  readonly audioMutating: false;
  readonly packagePersistenceOwned: false;
  readonly rootFollowRuntimeOwned: false;
  readonly performanceCrisisPolicyOwned: false;
};

export const APP_PERFORMANCE_CRISIS_PANEL_CALLSITE_CLEANUP = {
  currentAppCallsiteShape: 'boundary-owned-root-follow-granulation-source-assembly',
  previousAppCallsiteShape: 'app-owned-performance-crisis-panel-boundary-args-assembly',
  cleanupCompletedIn: '3.2.91.6.9.142',
  directLineReductionExpected: 'medium',
  movedIntoBoundary: 'root-follow-granulation-value-and-update-callback-shaping',
  keepsUiPolicyStateAppOwned: true,
  keepsAudioBurstRecorderOwnershipOutsideBoundary: true,
  keepsRootFollowGranulationRuntimeOutsideBoundary: true,
  keepsUpdateNParamsOwnershipOutsideBoundary: true,
  runtimeOwned: false,
  audioMutating: false,
  packagePersistenceOwned: false,
  rootFollowRuntimeOwned: false,
  performanceCrisisPolicyOwned: false,
} as const satisfies AppPerformanceCrisisPanelCallsiteCleanup;

function resolveRootFollowGranulationSource({
  nParamsUI,
  updateNParams,
}: AppPerformanceCrisisRootFollowGranulationSource) {
  return {
    rootFollowGranulation: {
      mode: nParamsUI.rootFollowLoopGranulationMode,
      settings: nParamsUI.rootFollowGranularSettings,
    },
    updateRootFollowGranularSettings: (
      rootFollowGranularSettings: RootFollowGranularSettings,
      rootFollowLoopGranulationMode: RootFollowGranulationMode,
    ) => updateNParams({ rootFollowGranularSettings, rootFollowLoopGranulationMode }),
  };
}

export function buildAppPerformanceCrisisPanelBoundary({
  uiPolicyState,
  rootFollowGranulationSource,
  audioBurstRecorder,
}: AppPerformanceCrisisPanelBoundaryArgs): AppPerformanceCrisisPanelBoundaryInput {
  const { rootFollowGranulation, updateRootFollowGranularSettings } =
    resolveRootFollowGranulationSource(rootFollowGranulationSource);

  return {
    activePresetId: uiPolicyState.performanceCrisisPresetId,
    particlePresetId: uiPolicyState.particleCrisisPresetId,
    waveStarterPresetId: uiPolicyState.waveStarterCrisisPresetId,
    particleCrisisMode: uiPolicyState.particleCrisisMode,
    particleAmbientMotionMode: uiPolicyState.particleAmbientMotionMode,
    particleLoadReductionMode: uiPolicyState.particleLoadReductionMode,
    rootFollowQuantizationMode: uiPolicyState.rootFollowQuantizationMode,
    rootFollowQuantizationGrid: uiPolicyState.rootFollowQuantizationGrid,
    rootFollowQuantizationCustomSegments:
      uiPolicyState.rootFollowQuantizationCustomSegments,
    rootFollowVoiceEngineMode: uiPolicyState.rootFollowVoiceEngineMode,
    particleQuantizationMode: uiPolicyState.particleQuantizationMode,
    particleQuantizationGrid: uiPolicyState.particleQuantizationGrid,
    particleQuantizationCustomSegments:
      uiPolicyState.particleQuantizationCustomSegments,
    currentGranularMode: rootFollowGranulation.mode,
    currentGranularSettings: normalizeRootFollowGranularSettings(
      rootFollowGranulation.settings,
      rootFollowGranulation.mode,
    ),
    audioBurstRecorder,
    setActivePresetId: uiPolicyState.setPerformanceCrisisPresetId,
    setParticlePresetId: uiPolicyState.setParticleCrisisPresetId,
    setWaveStarterPresetId: uiPolicyState.setWaveStarterCrisisPresetId,
    setParticleCrisisMode: uiPolicyState.setParticleCrisisMode,
    setParticleAmbientMotionMode: uiPolicyState.setParticleAmbientMotionMode,
    setParticleLoadReductionMode: uiPolicyState.setParticleLoadReductionMode,
    setRootFollowQuantizationMode: uiPolicyState.setRootFollowQuantizationMode,
    setRootFollowQuantizationGrid: uiPolicyState.setRootFollowQuantizationGrid,
    setRootFollowQuantizationCustomSegments:
      uiPolicyState.setRootFollowQuantizationCustomSegments,
    setRootFollowVoiceEngineMode: uiPolicyState.setRootFollowVoiceEngineMode,
    setParticleQuantizationMode: uiPolicyState.setParticleQuantizationMode,
    setParticleQuantizationGrid: uiPolicyState.setParticleQuantizationGrid,
    setParticleQuantizationCustomSegments:
      uiPolicyState.setParticleQuantizationCustomSegments,
    applyGranularRootFollowSettings: updateRootFollowGranularSettings,
  };
}
