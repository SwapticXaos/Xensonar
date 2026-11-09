import { create } from './miniStore';
import { createCarrierDonorV2StoreActions } from './storeCarrierDonorV2Actions';
import { createSpectralForgeEmbodimentStoreActions } from './storeEmbodimentActions';
import { createCarrierIntegralStoreActions } from './storeCarrierIntegralActions';
import { createSpectralForgeProjectSnapshotStoreActions } from './storeProjectSnapshotActions';
import { createSpectralOperationStoreActions } from './storeSpectralOperations';
import { createForge3MainPathStoreActions } from './storeForge3MainPathActions';
import { createForge3MainSnapshotStoreActions } from './storeForge3MainSnapshotActions';
import { createMaterialExportStoreActions } from './storeMaterialExportActions';
import { createStampToolStoreActions } from './storeStampToolActions';
import { createToolSettingsStoreActions } from './storeToolSettingsActions';
import { createSourcePreviewCommitStoreActions } from './storeSourcePreviewCommitActions';
import { createForge3MinorStoreActions } from './storeForge3MinorActions';
import { createInitialSpectralForgeStoreState } from './storeInitialState';
import type { AppState } from './storeTypes';

export { buildCarrierInputFingerprint, buildDonorInputFingerprint } from './storeCarrierDonorV2Boundary';
export {
  buildDefaultGuideMarkers,
  clampBars,
  clampGuideSegments,
  computeLoopDurationSec,
  sanitizeGuideMarkers,
} from './storeMaterialExport';
export {
  createDefaultToolProfiles,
  createDefaultToolSettings,
  hydrateToolProfiles,
  mergeToolSettings,
} from './storeToolProfiles';
export type { HarmonizerType } from './storeSpectralOperations';
export {
  DURATION,
  SAMPLE_RATE,
  SPECTRAL_HEIGHT,
  SPECTRAL_WIDTH,
  createInitialSpectralForgeStoreState,
} from './storeInitialState';

export type {
  AppState,
  Forge3EditTarget,
  Forge3MainSnapshot,
  ForgeProjectSnapshot,
  FormantVowel,
  MaterialExportConfig,
  MaterialRole,
  SourcePreviewMode,
  SynthMode,
  ToolProfiles,
  ToolSettings,
  ToolType,
  ViewPort,
  WaveformMix,
} from './storeTypes';

export type {
  CarrierDonorV2FreshnessState,
  CarrierDonorV2State,
  V2Fingerprint,
  V2StageMeta,
  V2StageStatus,
} from './storeCarrierDonorV2Types';

export const useStore = create<AppState>((set, get) => ({
  ...createInitialSpectralForgeStoreState(),
  ...createCarrierIntegralStoreActions(set),
  ...createSpectralForgeEmbodimentStoreActions(set),
  ...createCarrierDonorV2StoreActions(set),
  ...createForge3MainSnapshotStoreActions(set, get),
  ...createToolSettingsStoreActions(set),
  ...createSpectralForgeProjectSnapshotStoreActions(set, get),
  ...createForge3MinorStoreActions(set),
  ...createMaterialExportStoreActions(set),
  ...createSourcePreviewCommitStoreActions(set),
  ...createForge3MainPathStoreActions(set, get),
  ...createStampToolStoreActions(set),
  ...createSpectralOperationStoreActions(set, get),
  setBasisHearingTransportBridge: (patch) =>
    set((state) => ({
      basisHearingTransportBridge: {
        ...state.basisHearingTransportBridge,
        ...(typeof patch === 'function'
          ? patch(state.basisHearingTransportBridge)
          : patch),
      },
    })),
}));
