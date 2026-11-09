import {
  applyCarrierIntegralSelectionPatch,
  createDefaultCarrierIntegralSelection,
  type CarrierIntegralSelection,
} from '../integral/carrierIntegralSelection';
import {
  createDefaultCarrierIntegralSynthLabSelection,
  normalizeCarrierIntegralSynthLabSelection,
  type CarrierIntegralSynthLabSelection,
} from '../integral/carrierIntegralSynthLab';
import {
  createDefaultCarrierIntegralHarmonicXploreSelection,
  normalizeCarrierIntegralHarmonicXplorePatch,
  type CarrierIntegralHarmonicXploreSelection,
} from '../integral/carrierIntegralHarmonicXploreRenderConfig';
import type { AppState } from './storeTypes';

type StoreSet = (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>), replace?: boolean) => void;

type CarrierIntegralStoreActionKey =
  | 'setCarrierIntegralSelection'
  | 'resetCarrierIntegralSelection'
  | 'setCarrierIntegralSynthLab'
  | 'resetCarrierIntegralSynthLab'
  | 'setCarrierIntegralHarmonicXplore'
  | 'resetCarrierIntegralHarmonicXplore';

export type CarrierIntegralStoreActions = Pick<AppState, CarrierIntegralStoreActionKey>;

export function createInitialCarrierIntegralSelectionState(): CarrierIntegralSelection {
  return createDefaultCarrierIntegralSelection();
}

export function createInitialCarrierIntegralSynthLabState(): CarrierIntegralSynthLabSelection {
  return createDefaultCarrierIntegralSynthLabSelection();
}

export function createInitialCarrierIntegralHarmonicXploreState(): CarrierIntegralHarmonicXploreSelection {
  return createDefaultCarrierIntegralHarmonicXploreSelection();
}

export function createCarrierIntegralStoreActions(set: StoreSet): CarrierIntegralStoreActions {
  return {
    setCarrierIntegralSelection: (patch) =>
      set((state) => ({
        carrierIntegralSelection: applyCarrierIntegralSelectionPatch(state.carrierIntegralSelection, patch),
      })),
    resetCarrierIntegralSelection: () =>
      set({
        carrierIntegralSelection: createInitialCarrierIntegralSelectionState(),
      }),
    setCarrierIntegralSynthLab: (patch) =>
      set((state) => ({
        carrierIntegralSynthLab: normalizeCarrierIntegralSynthLabSelection({
          ...state.carrierIntegralSynthLab,
          ...patch,
          paramsPatch: patch.paramsPatch !== undefined ? { ...patch.paramsPatch } : { ...state.carrierIntegralSynthLab.paramsPatch },
          updatedAt: Date.now(),
          source: patch.source ?? 'user',
        }, state.carrierIntegralSynthLab),
      })),
    resetCarrierIntegralSynthLab: () =>
      set({
        carrierIntegralSynthLab: createInitialCarrierIntegralSynthLabState(),
      }),
    setCarrierIntegralHarmonicXplore: (patch) =>
      set((state) => ({
        carrierIntegralHarmonicXplore: normalizeCarrierIntegralHarmonicXplorePatch(state.carrierIntegralHarmonicXplore, patch),
      })),
    resetCarrierIntegralHarmonicXplore: () =>
      set({
        carrierIntegralHarmonicXplore: createInitialCarrierIntegralHarmonicXploreState(),
      }),
  };
}
