import type { AudioSourceAsset } from '../audio/AudioImporter';
import type { MediatedAudioBody } from '../body/mediatedAudioBodyTypes';
import type { EmbodimentField, EmbodimentLayerVisibility, EmbodimentStatus } from '../types/embodimentFieldTypes';
import { DEFAULT_EMBODIMENT_LAYER_VISIBILITY } from '../types/embodimentFieldTypes';
import type { EmbodimentPipelineState } from '../types/embodimentStateTypes';
import type { AppState } from './storeTypes';

export function createInitialEmbodimentLayerVisibility(): EmbodimentLayerVisibility {
  return { ...DEFAULT_EMBODIMENT_LAYER_VISIBILITY };
}

export function createInitialEmbodimentPipelineState(
  message = 'Noch kein Timbre für den Verkörperungsraum extrahiert.'
): EmbodimentPipelineState {
  return {
    stage: 'donor_missing',
    freshness: 'clean',
    message,
    lastUpdatedAt: null,
  };
}

type StoreSet = (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>), replace?: boolean) => void;

type SpectralForgeEmbodimentStoreActionKey =
  | 'setActiveMediatedBody'
  | 'setSpectralEmbodimentSourceAsset'
  | 'setEmbodimentField'
  | 'setEmbodimentStatus'
  | 'setEmbodimentLayersVisibility'
  | 'setEmbodimentPipelineState'
  | 'clearEmbodimentField'
  | 'resetEmbodimentPipeline';

export type SpectralForgeEmbodimentStoreActions = Pick<AppState, SpectralForgeEmbodimentStoreActionKey>;

export function createSpectralForgeEmbodimentStoreActions(set: StoreSet): SpectralForgeEmbodimentStoreActions {
  return {
    setActiveMediatedBody: (body: MediatedAudioBody | null) => set({ activeMediatedBody: body }),
    setSpectralEmbodimentSourceAsset: (source: AudioSourceAsset | null) =>
      set({ spectralEmbodimentSourceAsset: source }),
    setEmbodimentField: (field: EmbodimentField | null, status: EmbodimentStatus = field ? 'ready' : 'missing', message?: string) =>
      set((state) => ({
        embodimentField: field,
        embodimentStatus: status,
        embodimentMessage: message ?? (field ? 'Verkörperungsraum bereit.' : 'Noch kein Verkörperungsraum aufgebaut.'),
        embodimentPipelineState:
          status === 'error'
            ? {
                ...state.embodimentPipelineState,
                stage: 'error',
                freshness: 'stale',
                message: message ?? 'Verkörperungsraum konnte nicht aufgebaut werden.',
                lastUpdatedAt: Date.now(),
              }
            : state.embodimentPipelineState,
      })),
    setEmbodimentStatus: (status: EmbodimentStatus, message?: string) =>
      set((state) => ({
        embodimentStatus: status,
        embodimentMessage: message ?? state.embodimentMessage,
        embodimentPipelineState:
          status === 'error'
            ? {
                ...state.embodimentPipelineState,
                stage: 'error',
                freshness: 'stale',
                message: message ?? state.embodimentPipelineState.message,
                lastUpdatedAt: Date.now(),
              }
            : state.embodimentPipelineState,
      })),
    setEmbodimentLayersVisibility: (patch: Partial<EmbodimentLayerVisibility>) =>
      set((state) => ({
        embodimentLayersVisibility: {
          ...state.embodimentLayersVisibility,
          ...patch,
        },
      })),
    setEmbodimentPipelineState: (
      patch:
        | Partial<EmbodimentPipelineState>
        | ((state: EmbodimentPipelineState) => Partial<EmbodimentPipelineState>)
    ) =>
      set((state) => ({
        embodimentPipelineState: {
          ...state.embodimentPipelineState,
          ...(typeof patch === 'function' ? patch(state.embodimentPipelineState) : patch),
        },
      })),
    clearEmbodimentField: () =>
      set({
        embodimentField: null,
        embodimentStatus: 'missing',
        embodimentMessage: 'Noch kein Verkörperungsraum aufgebaut.',
        embodimentLayersVisibility: createInitialEmbodimentLayerVisibility(),
        embodimentPipelineState: createInitialEmbodimentPipelineState('Noch kein Verkörperungsraum aufgebaut.'),
      }),
    resetEmbodimentPipeline: () =>
      set({
        embodimentField: null,
        embodimentStatus: 'missing',
        embodimentMessage: 'Noch kein Verkörperungsraum aufgebaut.',
        embodimentLayersVisibility: createInitialEmbodimentLayerVisibility(),
        embodimentPipelineState: createInitialEmbodimentPipelineState(),
      }),
  };
}
