import { runAudioPairTherapistRuntimeReset } from '../diagnostics/audioPairTherapistActions';
import { stopMaterialLoopRuntimeBoundary, type MaterialLoopRuntimeBoundaryRefs } from './materialLoopRuntimeBoundary';
import { buildWorkspacePackageActivationBoundary, type WorkspacePackageActivationBoundaryRuntime } from './workspacePackageActivationBoundary';
import { stopRootFollowRuntimeBoundary } from '../rootFollow/rootFollowRuntimeBoundary';

type WorkspaceActivationInput = Parameters<typeof buildWorkspacePackageActivationBoundary>[0];
type AudioPairTherapistResetInput = Parameters<typeof runAudioPairTherapistRuntimeReset>[0];

export type AppMaterialRootFollowWorkspacePorts = {
  readonly stopRootFollowRuntimeOnly: () => void;
  readonly stopMaterialLoopRuntimeOnly: () => void;
  readonly resetAudioPairTherapistRuntime: () => void;
  readonly rootFollowHealth: WorkspacePackageActivationBoundaryRuntime['rootFollowHealth'];
  readonly workspacePackageActivationReport: WorkspacePackageActivationBoundaryRuntime['activationReport'];
  readonly clearRootFollowBrowserState: () => void;
  readonly reactivateRootFollowFromLoadedPackage: () => void;
};

export type BuildAppMaterialRootFollowWorkspacePortsInput = {
  readonly audioContextState: WorkspaceActivationInput['audioContextState'];
  readonly selectedRootFollowLoop: WorkspaceActivationInput['selectedRootFollowLoop'];
  readonly fallbackSelectedLoopId: WorkspaceActivationInput['fallbackSelectedLoopId'];
  readonly rootFollowLoopActive: WorkspaceActivationInput['rootFollowLoopActive'];
  readonly rootFollowPreviewActive: WorkspaceActivationInput['rootFollowPreviewActive'];
  readonly rootFollowPlayfieldInside: WorkspaceActivationInput['rootFollowPlayfieldInside'];
  readonly rootFollowEntries: WorkspaceActivationInput['rootFollowEntries'];
  readonly materialEntries: WorkspaceActivationInput['materialEntries'];
  readonly selectedLoopMaterial: WorkspaceActivationInput['selectedLoopMaterial'];
  readonly rootFollowUiStorageKey: WorkspaceActivationInput['rootFollowUiStorageKey'];
  readonly rootFollowRuntimeRefs: WorkspaceActivationInput['refs'];
  readonly materialLoopRuntimeRefs: MaterialLoopRuntimeBoundaryRefs;
  readonly updateNParams: WorkspaceActivationInput['updateNParams'] & AudioPairTherapistResetInput['updateNParams'];
  readonly setAudioPairTherapistStatus: WorkspaceActivationInput['setStatus'] & AudioPairTherapistResetInput['setStatus'];
  readonly resetResonanceTransientState: AudioPairTherapistResetInput['resetResonanceTransientState'];
  readonly audioTrafficForensicsRef: AudioPairTherapistResetInput['trafficRef'];
  readonly ensureAudioReady: AudioPairTherapistResetInput['ensureAudioReady'];
  readonly prewarmAudioRuntime: AudioPairTherapistResetInput['prewarmAudioRuntime'];
};

export const APP_MATERIAL_ROOTFOLLOW_WORKSPACE_PORTS_PROBE = {
  cleanupKind: 'app-material-root-follow-workspace-ports',
  ownsRuntime: false,
  ownsEffects: false,
  ownsAudioGraph: false,
  ownsWorkspaceSerialization: false,
  ownsRootFollowAnchorPolicy: false,
  onlyMovesExistingMaterialRootFollowWorkspaceCallsiteWiring: true,
  movedFromAppCallsite: [
    'stopRootFollowRuntimeOnly wrapper',
    'stopMaterialLoopRuntimeOnly wrapper',
    'resetAudioPairTherapistRuntime callsite',
    'workspacePackageActivation assembly/destructure',
  ] as const,
  explicitlyNotMoved: [
    'MaterialLoop bridge runtime hook',
    'Root-Follow playback runtime hook',
    'Root-Follow anchor/input readers',
    'workspace package serialization',
    'AudioPairTherapist reset semantics',
  ] as const,
} as const;

export function buildAppMaterialRootFollowWorkspacePorts({
  audioContextState,
  selectedRootFollowLoop,
  fallbackSelectedLoopId,
  rootFollowLoopActive,
  rootFollowPreviewActive,
  rootFollowPlayfieldInside,
  rootFollowEntries,
  materialEntries,
  selectedLoopMaterial,
  rootFollowUiStorageKey,
  rootFollowRuntimeRefs,
  materialLoopRuntimeRefs,
  updateNParams,
  setAudioPairTherapistStatus,
  resetResonanceTransientState,
  audioTrafficForensicsRef,
  ensureAudioReady,
  prewarmAudioRuntime,
}: BuildAppMaterialRootFollowWorkspacePortsInput): AppMaterialRootFollowWorkspacePorts {
  const stopRootFollowRuntimeOnly = () => {
    stopRootFollowRuntimeBoundary(rootFollowRuntimeRefs);
  };

  const stopMaterialLoopRuntimeOnly = () => {
    stopMaterialLoopRuntimeBoundary(materialLoopRuntimeRefs);
  };

  const resetAudioPairTherapistRuntime = () => {
    runAudioPairTherapistRuntimeReset({
      stopRootFollowRuntimeOnly,
      stopMaterialLoopRuntimeOnly,
      resetResonanceTransientState,
      trafficRef: audioTrafficForensicsRef,
      updateNParams,
      setStatus: setAudioPairTherapistStatus,
      ensureAudioReady,
      prewarmAudioRuntime,
    });
  };

  const workspacePackageActivation = buildWorkspacePackageActivationBoundary({
    audioContextState,
    selectedRootFollowLoop,
    fallbackSelectedLoopId,
    rootFollowLoopActive,
    rootFollowPreviewActive,
    rootFollowPlayfieldInside,
    rootFollowEntries,
    materialEntries,
    selectedLoopMaterial,
    rootFollowUiStorageKey,
    refs: rootFollowRuntimeRefs,
    updateNParams,
    setStatus: setAudioPairTherapistStatus,
  });

  return {
    stopRootFollowRuntimeOnly,
    stopMaterialLoopRuntimeOnly,
    resetAudioPairTherapistRuntime,
    rootFollowHealth: workspacePackageActivation.rootFollowHealth,
    workspacePackageActivationReport: workspacePackageActivation.activationReport,
    clearRootFollowBrowserState: workspacePackageActivation.clearRootFollowBrowserState,
    reactivateRootFollowFromLoadedPackage: workspacePackageActivation.reactivateRootFollowFromLoadedPackage,
  };
}
