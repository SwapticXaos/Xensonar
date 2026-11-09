import { SpectralData } from '../audio/SpectralData';
import { createInitialCarrierDonorV2State } from './storeCarrierDonorV2Boundary';
import {
  createInitialCarrierIntegralSelectionState,
  createInitialCarrierIntegralSynthLabState,
  createInitialCarrierIntegralHarmonicXploreState,
} from './storeCarrierIntegralActions';
import {
  createInitialEmbodimentLayerVisibility,
  createInitialEmbodimentPipelineState,
} from './storeEmbodimentActions';
import { buildDefaultGuideMarkers } from './storeMaterialExport';
import { createInitialSourcePreviewCommitState } from './storeSourcePreviewCommitActions';
import { createInitialForge3MinorState } from './storeForge3MinorActions';
import {
  createDefaultToolProfiles,
  createDefaultToolSettings,
} from './storeToolProfiles';
import type { AppState } from './storeTypes';

import { SPECTRAL_WIDTH, SPECTRAL_HEIGHT } from '../spectralConstants';
export { SPECTRAL_WIDTH, SPECTRAL_HEIGHT, SAMPLE_RATE, DURATION } from '../spectralConstants';

type NonFunctionStoreKey = {
  [Key in keyof AppState]: AppState[Key] extends (...args: any[]) => any ? never : Key;
}[keyof AppState];

export type SpectralForgeStoreInitialState = Pick<AppState, NonFunctionStoreKey>;

export function createInitialSpectralForgeStoreState(): SpectralForgeStoreInitialState {
  return {
    // Spectral data
    spectralData: new SpectralData(SPECTRAL_WIDTH, SPECTRAL_HEIGHT),

    // SpectralForge body + V2 embodiment state
    activeMediatedBody: null,
    spectralEmbodimentSourceAsset: null,
    carrierDonorV2: createInitialCarrierDonorV2State(),
    carrierIntegralSelection: createInitialCarrierIntegralSelectionState(),
    carrierIntegralSynthLab: createInitialCarrierIntegralSynthLabState(),
    carrierIntegralHarmonicXplore: createInitialCarrierIntegralHarmonicXploreState(),
    embodimentField: null,
    embodimentStatus: 'missing',
    embodimentMessage: 'Noch kein Verkörperungsraum aufgebaut.',
    embodimentLayersVisibility: createInitialEmbodimentLayerVisibility(),
    embodimentPipelineState: createInitialEmbodimentPipelineState(),

    // Undo
    undoStack: [],
    redoStack: [],

    // Tool
    activeTool: 'brush',
    toolProfiles: createDefaultToolProfiles(),
    toolSettings: createDefaultToolSettings('brush'),

    // Viewport / playback / render / minor canvas state
    ...createInitialForge3MinorState(),
    basisHearingTransportBridge: {
      requestKey: null,
      optionId: null,
      machineId: null,
      phase: 'idle',
      progress: 0,
      loopPreview: true,
      updatedAt: 0,
    },

    // Material export / musical structure
    materialExport: {
      name: 'spectral-material',
      role: 'loop',
      bpm: 108,
      bars: 4,
      guideSegments: 4,
      guideMarkers: buildDefaultGuideMarkers(4),
      beatGuideAudible: false,
      beatGuideVolume: 0.35,
      loopPreview: true,
    },

    // Source-aware preview / commit context
    ...createInitialSourcePreviewCommitState(),

    // Stamp tool
    stampData: null,
    stampScaleX: 1,
    stampScaleY: 1,
    stampRotation: 0,
    stampFlipX: false,
    stampFlipY: false,
    stampPhase: 'idle',
    stampSelStart: null,
  };
}
