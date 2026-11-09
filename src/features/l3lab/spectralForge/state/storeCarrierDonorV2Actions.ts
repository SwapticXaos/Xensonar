import { createInitialCarrierDonorV2State } from './storeCarrierDonorV2Boundary';
import {
  beginBindingBuildState,
  beginCarrierSkeletonBuildState,
  beginDonorAnalysisBuildState,
  beginDonorAtlasBuildState,
  beginGestaltFieldBuildState,
  beginMaterialAllocationBuildState,
  beginMaterialFieldBuildState,
  failBindingBuildState,
  failCarrierSkeletonBuildState,
  failDonorAnalysisBuildState,
  failDonorAtlasBuildState,
  failGestaltFieldBuildState,
  failMaterialAllocationBuildState,
  failMaterialFieldBuildState,
  finishBindingBuildState,
  finishCarrierSkeletonBuildState,
  finishDonorAnalysisBuildState,
  finishDonorAtlasBuildState,
  finishGestaltFieldBuildState,
  finishMaterialAllocationBuildState,
  finishMaterialFieldBuildState,
  markCarrierV2DirtyState,
  markDonorV2DirtyState,
  recomputeCarrierDonorV2EligibilityState,
  setCarrierDonorTransferMacroAxesState,
  setCarrierDonorTransferPresetState,
  setCarrierDonorV2DonorUseModeState,
} from './storeCarrierDonorV2Lifecycle';
import type { AppState } from './storeTypes';
import type { CarrierDonorV2State } from './storeCarrierDonorV2Types';

type StoreSet = (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>), replace?: boolean) => void;

type CarrierDonorV2StoreActionKey =
  | 'setCarrierDonorV2Patch'
  | 'resetCarrierDonorV2State'
  | 'markCarrierV2Dirty'
  | 'markDonorV2Dirty'
  | 'beginCarrierSkeletonBuild'
  | 'finishCarrierSkeletonBuild'
  | 'failCarrierSkeletonBuild'
  | 'beginDonorAnalysisBuild'
  | 'finishDonorAnalysisBuild'
  | 'failDonorAnalysisBuild'
  | 'beginDonorAtlasBuild'
  | 'finishDonorAtlasBuild'
  | 'failDonorAtlasBuild'
  | 'beginGestaltFieldBuild'
  | 'finishGestaltFieldBuild'
  | 'failGestaltFieldBuild'
  | 'beginMaterialFieldBuild'
  | 'finishMaterialFieldBuild'
  | 'failMaterialFieldBuild'
  | 'beginMaterialAllocationBuild'
  | 'finishMaterialAllocationBuild'
  | 'failMaterialAllocationBuild'
  | 'beginBindingBuild'
  | 'finishBindingBuild'
  | 'failBindingBuild'
  | 'recomputeCarrierDonorV2Eligibility'
  | 'setCarrierDonorTransferPreset'
  | 'setCarrierDonorTransferMacroAxes'
  | 'setCarrierDonorV2DonorUseMode';

export type CarrierDonorV2StoreActions = Pick<AppState, CarrierDonorV2StoreActionKey>;

export function createCarrierDonorV2StoreActions(set: StoreSet): CarrierDonorV2StoreActions {
  const updateCarrierDonorV2 = (transition: (current: CarrierDonorV2State) => CarrierDonorV2State) => {
    set((state) => ({
      carrierDonorV2: transition(state.carrierDonorV2),
    }));
  };

  return {
    setCarrierDonorV2Patch: (patch) =>
      updateCarrierDonorV2((current) => ({
        ...current,
        ...(typeof patch === 'function' ? patch(current) : patch),
      })),
    resetCarrierDonorV2State: () =>
      set({
        carrierDonorV2: createInitialCarrierDonorV2State(),
      }),
    markCarrierV2Dirty: (fingerprint, reason = 'Werkbank wurde verändert.') =>
      updateCarrierDonorV2((current) => markCarrierV2DirtyState(current, fingerprint, reason)),
    markDonorV2Dirty: (fingerprint, reason = 'Donorquelle wurde verändert.') =>
      updateCarrierDonorV2((current) => markDonorV2DirtyState(current, fingerprint, reason)),
    beginCarrierSkeletonBuild: (fingerprint) =>
      updateCarrierDonorV2((current) => beginCarrierSkeletonBuildState(current, fingerprint)),
    finishCarrierSkeletonBuild: (fingerprint, skeleton, summary, continuityGraph, continuitySummary) =>
      updateCarrierDonorV2((current) =>
        finishCarrierSkeletonBuildState(
          current,
          fingerprint,
          skeleton,
          summary,
          continuityGraph,
          continuitySummary
        )
      ),
    failCarrierSkeletonBuild: (message) =>
      updateCarrierDonorV2((current) => failCarrierSkeletonBuildState(current, message)),
    beginDonorAnalysisBuild: (fingerprint) =>
      updateCarrierDonorV2((current) => beginDonorAnalysisBuildState(current, fingerprint)),
    finishDonorAnalysisBuild: (fingerprint, donorAnchors, donorTensor, donorSummary) =>
      updateCarrierDonorV2((current) =>
        finishDonorAnalysisBuildState(current, fingerprint, donorAnchors, donorTensor, donorSummary)
      ),
    failDonorAnalysisBuild: (message) =>
      updateCarrierDonorV2((current) => failDonorAnalysisBuildState(current, message)),
    beginDonorAtlasBuild: () =>
      updateCarrierDonorV2((current) => beginDonorAtlasBuildState(current)),
    finishDonorAtlasBuild: (donorAtlas, donorAtlasSummary) =>
      updateCarrierDonorV2((current) => finishDonorAtlasBuildState(current, donorAtlas, donorAtlasSummary)),
    failDonorAtlasBuild: (message) =>
      updateCarrierDonorV2((current) => failDonorAtlasBuildState(current, message)),
    beginGestaltFieldBuild: () =>
      updateCarrierDonorV2((current) => beginGestaltFieldBuildState(current)),
    finishGestaltFieldBuild: (gestaltField, gestaltFieldSummary) =>
      updateCarrierDonorV2((current) => finishGestaltFieldBuildState(current, gestaltField, gestaltFieldSummary)),
    failGestaltFieldBuild: (message) =>
      updateCarrierDonorV2((current) => failGestaltFieldBuildState(current, message)),
    beginMaterialFieldBuild: () =>
      updateCarrierDonorV2((current) => beginMaterialFieldBuildState(current)),
    finishMaterialFieldBuild: (materialField, materialFieldSummary) =>
      updateCarrierDonorV2((current) => finishMaterialFieldBuildState(current, materialField, materialFieldSummary)),
    failMaterialFieldBuild: (message) =>
      updateCarrierDonorV2((current) => failMaterialFieldBuildState(current, message)),
    beginMaterialAllocationBuild: () =>
      updateCarrierDonorV2((current) => beginMaterialAllocationBuildState(current)),
    finishMaterialAllocationBuild: (materialAllocationPreview, materialAllocationSummary) =>
      updateCarrierDonorV2((current) =>
        finishMaterialAllocationBuildState(current, materialAllocationPreview, materialAllocationSummary)
      ),
    failMaterialAllocationBuild: (message) =>
      updateCarrierDonorV2((current) => failMaterialAllocationBuildState(current, message)),
    beginBindingBuild: () =>
      updateCarrierDonorV2((current) => beginBindingBuildState(current)),
    finishBindingBuild: (bindingPreview, bindingSummary) =>
      updateCarrierDonorV2((current) => finishBindingBuildState(current, bindingPreview, bindingSummary)),
    failBindingBuild: (message) =>
      updateCarrierDonorV2((current) => failBindingBuildState(current, message)),
    recomputeCarrierDonorV2Eligibility: () =>
      updateCarrierDonorV2((current) => recomputeCarrierDonorV2EligibilityState(current)),
    setCarrierDonorTransferPreset: (presetId) =>
      updateCarrierDonorV2((current) => setCarrierDonorTransferPresetState(current, presetId)),
    setCarrierDonorTransferMacroAxes: (patch) =>
      updateCarrierDonorV2((current) => setCarrierDonorTransferMacroAxesState(current, patch)),
    setCarrierDonorV2DonorUseMode: (mode) =>
      updateCarrierDonorV2((current) => setCarrierDonorV2DonorUseModeState(current, mode)),
  };
}
