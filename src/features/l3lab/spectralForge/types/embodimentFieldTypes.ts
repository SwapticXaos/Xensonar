export type EmbodimentStatus = 'missing' | 'building' | 'ready' | 'error';

export type EmbodimentLayerKey = 'carrierTrace' | 'ordered' | 'body' | 'residual' | 'transient' | 'composite';

export type EmbodimentLayerVisibility = Record<EmbodimentLayerKey, boolean>;

export interface EmbodimentField {
  width: number;
  height: number;
  durationSec: number;
  carrierTrace: Float32Array;
  orderedField: Float32Array;
  bodyField: Float32Array;
  residualField: Float32Array;
  transientField: Float32Array;
  compositeField: Float32Array;
  builtFromSignature: string;
}

export const DEFAULT_EMBODIMENT_LAYER_VISIBILITY: EmbodimentLayerVisibility = {
  carrierTrace: true,
  ordered: true,
  body: true,
  residual: true,
  transient: true,
  composite: true,
};
