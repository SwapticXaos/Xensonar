import type { AppState, MaterialExportConfig } from './storeTypes';
import {
  buildDefaultGuideMarkers,
  clampBars,
  clampGuideSegments,
  sanitizeGuideMarkers,
} from './storeMaterialExport';

type StoreSet = (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>), replace?: boolean) => void;

type MaterialExportStoreActionKey =
  | 'updateMaterialExport'
  | 'setGuideMarker';

export type MaterialExportStoreActions = Pick<AppState, MaterialExportStoreActionKey>;

export function updateMaterialExportConfig(
  current: MaterialExportConfig,
  patch: Partial<MaterialExportConfig>
): MaterialExportConfig {
  const nextBars = patch.bars !== undefined ? clampBars(patch.bars) : current.bars;
  const nextSegments = patch.guideSegments !== undefined ? clampGuideSegments(patch.guideSegments) : current.guideSegments;
  const shouldResetMarkers = patch.guideSegments !== undefined && nextSegments !== current.guideSegments && patch.guideMarkers === undefined;
  const nextMarkersSource = patch.guideMarkers !== undefined
    ? patch.guideMarkers
    : shouldResetMarkers
      ? buildDefaultGuideMarkers(nextSegments)
      : current.guideMarkers;
  const nextBeatGuideVolume = patch.beatGuideVolume !== undefined
    ? Math.max(0, Math.min(1, patch.beatGuideVolume))
    : current.beatGuideVolume;

  return {
    ...current,
    ...patch,
    bars: nextBars,
    guideSegments: nextSegments,
    guideMarkers: sanitizeGuideMarkers(nextMarkersSource, nextSegments),
    beatGuideVolume: nextBeatGuideVolume,
  };
}

export function setMaterialExportGuideMarker(
  current: MaterialExportConfig,
  index: number,
  value: number
): MaterialExportConfig {
  const nextMarkers = current.guideMarkers.slice();
  nextMarkers[index] = value;
  return {
    ...current,
    guideMarkers: sanitizeGuideMarkers(nextMarkers, current.guideSegments),
  };
}

export function createMaterialExportStoreActions(set: StoreSet): MaterialExportStoreActions {
  return {
    updateMaterialExport: (patch) =>
      set((state) => ({
        materialExport: updateMaterialExportConfig(state.materialExport, patch),
      })),
    setGuideMarker: (index, value) =>
      set((state) => ({
        materialExport: setMaterialExportGuideMarker(state.materialExport, index, value),
      })),
  };
}
