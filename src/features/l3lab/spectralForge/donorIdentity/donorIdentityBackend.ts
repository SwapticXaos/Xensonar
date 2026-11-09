import type { MusicalTrajectory } from '../carrierTrajectory/musicalTrajectory';

export type DonorIdentityAnalysisInput = {
  channels: readonly Float32Array[];
  sampleRate: number;
  startSample: number;
  sampleLength: number;
};

export type DonorIdentityRenderOptions = {
  sampleRate: number;
  durationSec: number;
  sourceTimeline?: boolean;
  isCancelled?: () => boolean;
};

export type DonorIdentityBackendCapabilities = {
  execution: 'browser-dsp' | 'browser-neural' | 'remote-neural';
  carrierOwnsPitch: true;
  supportsPolyphony: boolean;
  supportsContinuousPitch: boolean;
};

/**
 * Stable seam between a musical carrier and donor identity extraction/rendering.
 * A later speaker-embedding/SVC backend can implement this contract without
 * changing the canvas/carrier trajectory model.
 */
export interface DonorIdentityBackend<TModel> {
  readonly id: string;
  readonly capabilities: DonorIdentityBackendCapabilities;
  analyze(input: DonorIdentityAnalysisInput): Promise<TModel>;
  canRender(model: TModel | undefined): model is TModel;
  render(
    trajectory: MusicalTrajectory,
    model: TModel,
    options: DonorIdentityRenderOptions,
  ): Promise<Float32Array>;
}
