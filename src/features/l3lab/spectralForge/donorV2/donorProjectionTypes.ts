import type { DonorBodyV3Model } from '../donorV3/donorBodyModel';

export type DonorProjectionModel = {
  version: 'donor-projection-v2';
  partials: number[];
  attackPartials?: number[];
  attackDurationSec?: number;
  attackNoiseAmount?: number;
  modalAmount?: number;
  modalPartials?: { ratio: number; amplitude: number }[];
  noiseAmount: number;
  noiseBrightness: number;
  analyzedFrames: number;
  pitchedFrames: number;
  spectralEnvelope: number[];
  residualBands: number[];
  referenceHz: number;
  envelopeMaxHz: number;
  bodyV3?: DonorBodyV3Model;
};
