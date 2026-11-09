export type AudioImportReadMode = 'legacy' | 'transient' | 'hybrid';

export interface AudioProjectionOptions {
  readMode?: AudioImportReadMode;
}

export interface AudioSourceAnalysisCache {
  width: number;
  height: number;
  data: Float32Array;
  transientEnvelope: Float32Array;
}

export interface AudioSourceAsset {
  kind: 'audio';
  fileName: string;
  projectionReadMode?: AudioImportReadMode;
  monoSamples: Float32Array;
  leftSamples: Float32Array;
  rightSamples: Float32Array;
  midSamples: Float32Array;
  sideSamples: Float32Array;
  sampleRate: number;
  originalDuration: number;
  channelCount: number;
  importStartSec: number;
  importDurationSec: number;
  waveformPreview: Float32Array;
  stereoWidthPreview: Float32Array;
  analysisCache?: AudioSourceAnalysisCache;
}
