import { normalizeCarrierIntegralSelection } from '../integral/carrierIntegralSelection';
import { normalizeCarrierIntegralSynthLabSelection } from '../integral/carrierIntegralSynthLab';
import {
  normalizeCarrierIntegralHarmonicXploreSelection,
  migrateLegacySynthLabPresetToHarmonicXploreSelection,
} from '../integral/carrierIntegralHarmonicXploreRenderConfig';
import type { AppState, ForgeProjectSnapshot, ToolSettings, ToolType } from './storeTypes';
import {
  buildDefaultGuideMarkers,
  clampBars,
  clampGuideSegments,
  sanitizeGuideMarkers,
} from './storeMaterialExport';
import {
  cloneToolProfiles,
  hydrateToolProfiles,
  mergeToolSettings,
} from './storeToolProfiles';

type StoreSet = (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>), replace?: boolean) => void;
type StoreGet = () => AppState;

type SpectralForgeProjectSnapshotStoreActionKey =
  | 'createProjectSnapshot'
  | 'loadProjectSnapshot';

export type SpectralForgeProjectSnapshotStoreActions = Pick<AppState, SpectralForgeProjectSnapshotStoreActionKey>;

function createSpectralForgeProjectSnapshot(state: AppState): ForgeProjectSnapshot {
  return {
    version: 'spectral-forge-project-v1',
    activeTool: state.activeTool,
    toolProfiles: cloneToolProfiles(state.toolProfiles),
    spectralSnapshot: state.spectralData.cloneData(),
    materialExport: { ...state.materialExport, guideMarkers: [...state.materialExport.guideMarkers] },
    viewPort: { ...state.viewPort },
    synthMode: state.synthMode,
    waveformMix: { ...state.waveformMix },
    colorMapName: state.colorMapName,
    showGrainLayer: state.showGrainLayer,
    logScale: state.logScale,
    stampTransform: {
      scaleX: state.stampScaleX,
      scaleY: state.stampScaleY,
      rotation: state.stampRotation,
      flipX: state.stampFlipX,
      flipY: state.stampFlipY,
    },
    sourceMeta: state.sourceAsset ? {
      kind: 'audio',
      fileName: state.sourceAsset.fileName,
      originalDuration: state.sourceAsset.originalDuration,
      sampleRate: state.sourceAsset.sampleRate,
      importStartSec: state.sourceAsset.importStartSec,
      importDurationSec: state.sourceAsset.importDurationSec,
    } : null,
    carrierIntegralSelection: normalizeCarrierIntegralSelection(state.carrierIntegralSelection),
    carrierIntegralSynthLab: normalizeCarrierIntegralSynthLabSelection(state.carrierIntegralSynthLab),
    carrierIntegralHarmonicXplore: normalizeCarrierIntegralHarmonicXploreSelection(state.carrierIntegralHarmonicXplore),
  };
}

function hydrateSpectralForgeProjectSnapshot(set: StoreSet, get: StoreGet, snapshot: ForgeProjectSnapshot): void {
  const state = get();
  state.spectralData.restoreData(snapshot.spectralSnapshot);
  const toolProfiles = hydrateToolProfiles(snapshot.toolProfiles as Partial<Record<ToolType, Partial<ToolSettings>>> | null);
  const activeTool = snapshot.activeTool in toolProfiles ? snapshot.activeTool : 'brush';
  set((s) => ({
    activeTool,
    toolProfiles,
    toolSettings: mergeToolSettings(activeTool, toolProfiles[activeTool]),
    materialExport: {
      ...snapshot.materialExport,
      bars: clampBars(snapshot.materialExport.bars),
      guideSegments: clampGuideSegments(snapshot.materialExport.guideSegments),
      guideMarkers: sanitizeGuideMarkers(snapshot.materialExport.guideMarkers ?? buildDefaultGuideMarkers(snapshot.materialExport.guideSegments), snapshot.materialExport.guideSegments),
      beatGuideVolume: Math.max(0, Math.min(1, snapshot.materialExport.beatGuideVolume ?? 0.35)),
    },
    viewPort: { ...snapshot.viewPort },
    synthMode: snapshot.synthMode,
    waveformMix: { ...snapshot.waveformMix },
    colorMapName: snapshot.colorMapName,
    showGrainLayer: snapshot.showGrainLayer,
    logScale: snapshot.logScale,
    stampScaleX: snapshot.stampTransform?.scaleX ?? 1,
    stampScaleY: snapshot.stampTransform?.scaleY ?? 1,
    stampRotation: snapshot.stampTransform?.rotation ?? 0,
    stampFlipX: snapshot.stampTransform?.flipX ?? false,
    stampFlipY: snapshot.stampTransform?.flipY ?? false,
    sourceAsset: null,
    sourceAssetContext: 'none',
    sourcePreviewMode: 'forge',
    lastCommitDomain: 'none',
    activeMediatedBody: null,
    forge3EditTarget: 'linked_body',
    renderVersion: s.renderVersion + 1,
    audioBufferDirty: true,
    carrierIntegralSelection: normalizeCarrierIntegralSelection(snapshot.carrierIntegralSelection ?? null, s.carrierIntegralSelection),
    carrierIntegralSynthLab: normalizeCarrierIntegralSynthLabSelection(snapshot.carrierIntegralSynthLab ?? null, s.carrierIntegralSynthLab),
    carrierIntegralHarmonicXplore: snapshot.carrierIntegralHarmonicXplore
      ? normalizeCarrierIntegralHarmonicXploreSelection(snapshot.carrierIntegralHarmonicXplore, s.carrierIntegralHarmonicXplore)
      : migrateLegacySynthLabPresetToHarmonicXploreSelection(snapshot.carrierIntegralSynthLab ?? null, s.carrierIntegralHarmonicXplore),
  }));
}

export function createSpectralForgeProjectSnapshotStoreActions(
  set: StoreSet,
  get: StoreGet
): SpectralForgeProjectSnapshotStoreActions {
  return {
    createProjectSnapshot: () => createSpectralForgeProjectSnapshot(get()),
    loadProjectSnapshot: (snapshot) => hydrateSpectralForgeProjectSnapshot(set, get, snapshot),
  };
}
