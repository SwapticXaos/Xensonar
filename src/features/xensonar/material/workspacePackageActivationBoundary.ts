import type { MaterialEntry } from '../../l3lab/materialLibrary';
import { buildWorkspacePackageActivationReport } from './workspacePackageActivationReport';
import type { WorkspacePackageActivationReport } from './workspacePackageActivationReportTypes';
import {
  clearRootFollowBrowserStateBoundary,
  reactivateRootFollowFromLoadedPackageBoundary,
  readRootFollowRuntimeHealth,
  type RootFollowRuntimeBoundaryNParamsPatch,
  type RootFollowRuntimeBoundaryRefs,
  type RootFollowRuntimeHealth,
} from '../rootFollow/rootFollowRuntimeBoundary';

export type WorkspacePackageActivationBoundaryRuntime = {
  rootFollowHealth: RootFollowRuntimeHealth;
  activationReport: WorkspacePackageActivationReport;
  clearRootFollowBrowserState: () => void;
  reactivateRootFollowFromLoadedPackage: () => void;
};

export function buildWorkspacePackageActivationBoundary(args: {
  audioContextState: string;
  selectedRootFollowLoop: MaterialEntry | null;
  fallbackSelectedLoopId: string | null;
  rootFollowLoopActive: boolean;
  rootFollowPreviewActive: boolean;
  rootFollowPlayfieldInside: boolean;
  rootFollowEntries: number;
  materialEntries: MaterialEntry[];
  selectedLoopMaterial: MaterialEntry | null;
  rootFollowUiStorageKey: string;
  refs: RootFollowRuntimeBoundaryRefs;
  updateNParams: (patch: RootFollowRuntimeBoundaryNParamsPatch) => void;
  setStatus: (message: string) => void;
}): WorkspacePackageActivationBoundaryRuntime {
  const preferredEntries = args.materialEntries.filter((entry) => entry.rootFollowPreferred);
  const rootFollowHealth = readRootFollowRuntimeHealth({
    audioContextState: args.audioContextState,
    selectedRootFollowLoop: args.selectedRootFollowLoop,
    fallbackSelectedLoopId: args.fallbackSelectedLoopId,
    rootFollowLoopActive: args.rootFollowLoopActive,
    rootFollowPreviewActive: args.rootFollowPreviewActive,
    rootFollowPlayfieldInside: args.rootFollowPlayfieldInside,
    rootFollowEntries: args.rootFollowEntries,
    packagePreferredEntries: preferredEntries.length,
    materialLoopEntries: args.materialEntries.length,
    rootFollowUiStorageKey: args.rootFollowUiStorageKey,
    refs: args.refs,
  });
  const activationReport = buildWorkspacePackageActivationReport({
    materialEntries: args.materialEntries,
    selectedRootFollowLoop: args.selectedRootFollowLoop,
    fallbackSelectedLoopId: args.fallbackSelectedLoopId,
    rootFollowLoopActive: args.rootFollowLoopActive,
    packagePreferredEntries: preferredEntries.length,
  });
  return {
    rootFollowHealth,
    activationReport,
    clearRootFollowBrowserState: () => clearRootFollowBrowserStateBoundary({
      refs: args.refs,
      rootFollowUiStorageKey: args.rootFollowUiStorageKey,
      updateNParams: args.updateNParams,
      setStatus: args.setStatus,
    }),
    reactivateRootFollowFromLoadedPackage: () => reactivateRootFollowFromLoadedPackageBoundary({
      materialEntries: args.materialEntries,
      selectedLoopMaterial: args.selectedLoopMaterial,
      updateNParams: args.updateNParams,
      setStatus: args.setStatus,
    }),
  };
}
