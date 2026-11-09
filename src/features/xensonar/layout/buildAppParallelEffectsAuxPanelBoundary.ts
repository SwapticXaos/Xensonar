import type {
  AppParallelEffectsAuxPanelBoundary,
  AppParallelEffectsAuxPanelBoundaryInput,
  AppParallelEffectsAuxPanelCompactBoundaryInput,
  AppParallelEffectsAuxPanelGroupedBoundaryInput,
} from './buildAppParallelEffectsAuxPanelBoundaryTypes';

export type * from './buildAppParallelEffectsAuxPanelBoundaryTypes';

export const APP_PARALLEL_EFFECTS_AUX_PANEL_BOUNDARY_CONTRACT = {
  currentRole: 'app-aux-panel-input-montage',
  runtimeOwned: false,
  audioMutating: false,
  bridgeOwnsPanelPropBuild: false,
  groups: [
    'collectiveMemory',
    'sharedFormatters',
    'psychedelicSpiral',
    'enterHoldPsyFx',
    'schwarm',
    'runtimeMonitors',
    'liveMastering',
  ],
  explicitlyNotMoved: [
    'collectiveMemory runtime/effect behavior',
    'psychedelic spiral device behavior',
    'enter-hold PsyFX behavior',
    'schwarm source update behavior',
    'live mastering DSP behavior',
    'runtime monitor ownership',
  ],
} as const;


export type AppParallelEffectsAuxPanelCallsiteCleanupProbe = {
  readonly currentRole: 'cleanup-probe-for-app-parallel-effects-aux-panel-callsite';
  readonly candidateBoundaryName: 'buildAppParallelEffectsAuxPanelBoundary';
  readonly previousAppCallsiteShape: 'grouped-app-owned-input-montage';
  readonly currentAppCallsiteShape: 'compact-boundary-owned-input-group-assembly';
  readonly canCollapseAppOwnedGroupAssembly: true;
  readonly requiresEffectDeviceOwnershipToStayOutsideBoundary: true;
  readonly pureInputMontageGroups: readonly AppParallelEffectsAuxPanelBoundaryInputGroupName[];
  readonly allowedValueCallbacks: readonly [
    'updateCollectiveMemoryUi',
    'updatePsychedelicSpiralSource',
    'updateSchwarmSource',
  ];
  readonly explicitlyNotMoved: typeof APP_PARALLEL_EFFECTS_AUX_PANEL_BOUNDARY_CONTRACT.explicitlyNotMoved;
  readonly runtimeOwned: false;
  readonly audioMutating: false;
  readonly dspMutating: false;
  readonly monitorRuntimeOwned: false;
  readonly visibleUiChangedByProbe: false;
};

export type AppParallelEffectsAuxPanelBoundaryInputGroupName =
  (typeof APP_PARALLEL_EFFECTS_AUX_PANEL_BOUNDARY_CONTRACT.groups)[number];

export const APP_PARALLEL_EFFECTS_AUX_PANEL_CALLSITE_CLEANUP_PROBE = {
  currentRole: 'cleanup-probe-for-app-parallel-effects-aux-panel-callsite',
  candidateBoundaryName: 'buildAppParallelEffectsAuxPanelBoundary',
  previousAppCallsiteShape: 'grouped-app-owned-input-montage',
  currentAppCallsiteShape: 'compact-boundary-owned-input-group-assembly',
  canCollapseAppOwnedGroupAssembly: true,
  requiresEffectDeviceOwnershipToStayOutsideBoundary: true,
  pureInputMontageGroups: APP_PARALLEL_EFFECTS_AUX_PANEL_BOUNDARY_CONTRACT.groups,
  allowedValueCallbacks: [
    'updateCollectiveMemoryUi',
    'updatePsychedelicSpiralSource',
    'updateSchwarmSource',
  ],
  explicitlyNotMoved: APP_PARALLEL_EFFECTS_AUX_PANEL_BOUNDARY_CONTRACT.explicitlyNotMoved,
  runtimeOwned: false,
  audioMutating: false,
  dspMutating: false,
  monitorRuntimeOwned: false,
  visibleUiChangedByProbe: false,
} as const satisfies AppParallelEffectsAuxPanelCallsiteCleanupProbe;

function expandCompactParallelEffectsInput({
  resonanceFxUiState,
  sharedFormatters,
  schwarmMaterialOptions,
  liveMastering,
}: AppParallelEffectsAuxPanelCompactBoundaryInput): AppParallelEffectsAuxPanelGroupedBoundaryInput {
  return {
    collectiveMemory: {
      collectiveMemoryEnabled: resonanceFxUiState.collectiveMemoryEnabled,
      setCollectiveMemoryEnabled: resonanceFxUiState.setCollectiveMemoryEnabled,
      collectiveMemoryWindow: resonanceFxUiState.collectiveMemoryWindow,
      setCollectiveMemoryWindow: resonanceFxUiState.setCollectiveMemoryWindow,
      collectiveMemoryUi: resonanceFxUiState.collectiveMemoryUi,
      updateCollectiveMemoryUi: resonanceFxUiState.updateCollectiveMemoryUi,
      collectiveMemoryMonitor: resonanceFxUiState.collectiveMemoryMonitor,
    },
    sharedFormatters,
    psychedelicSpiral: {
      psychedelicSpiralEnabled: resonanceFxUiState.psychedelicSpiralEnabled,
      setPsychedelicSpiralEnabled: resonanceFxUiState.setPsychedelicSpiralEnabled,
      psychedelicSpiralUi: resonanceFxUiState.psychedelicSpiralUi,
      setPsychedelicSpiralUi: resonanceFxUiState.setPsychedelicSpiralUi,
      psychedelicSpiralFollow: resonanceFxUiState.psychedelicSpiralFollow,
      setPsychedelicSpiralFollow: resonanceFxUiState.setPsychedelicSpiralFollow,
      updatePsychedelicSpiralSource: resonanceFxUiState.updatePsychedelicSpiralSource,
      psychedelicSpiralMonitor: resonanceFxUiState.psychedelicSpiralMonitor,
    },
    enterHoldPsyFx: {
      enterHoldPsyFxEnabled: resonanceFxUiState.enterHoldPsyFxEnabled,
      setEnterHoldPsyFxEnabled: resonanceFxUiState.setEnterHoldPsyFxEnabled,
      enterHoldPsyFxUi: resonanceFxUiState.enterHoldPsyFxUi,
      setEnterHoldPsyFxUi: resonanceFxUiState.setEnterHoldPsyFxUi,
    },
    schwarm: {
      schwarmEnabled: resonanceFxUiState.schwarmEnabled,
      setSchwarmEnabled: resonanceFxUiState.setSchwarmEnabled,
      schwarmUi: resonanceFxUiState.schwarmUi,
      setSchwarmUi: resonanceFxUiState.setSchwarmUi,
      schwarmMaterialOptions,
      updateSchwarmSource: resonanceFxUiState.updateSchwarmSource,
      schwarmMonitor: resonanceFxUiState.schwarmMonitor,
    },
    runtimeMonitors: {
      controlPerfMonitor: resonanceFxUiState.controlPerfMonitor,
      transientRuntimeMonitor: resonanceFxUiState.transientRuntimeMonitor,
    },
    liveMastering,
  };
}

function normalizeParallelEffectsInput(
  input: AppParallelEffectsAuxPanelBoundaryInput,
): AppParallelEffectsAuxPanelGroupedBoundaryInput {
  if ('resonanceFxUiState' in input) {
    return expandCompactParallelEffectsInput(input);
  }
  return input;
}

export function buildAppParallelEffectsAuxPanelBoundary(
  input: AppParallelEffectsAuxPanelBoundaryInput,
): AppParallelEffectsAuxPanelBoundary {
  const {
    collectiveMemory,
    sharedFormatters,
    psychedelicSpiral,
    enterHoldPsyFx,
    schwarm,
    runtimeMonitors,
    liveMastering,
  } = normalizeParallelEffectsInput(input);
  return {
    ...collectiveMemory,
    ...sharedFormatters,
    ...psychedelicSpiral,
    ...enterHoldPsyFx,
    ...schwarm,
    ...runtimeMonitors,
    ...liveMastering,
  };
}
