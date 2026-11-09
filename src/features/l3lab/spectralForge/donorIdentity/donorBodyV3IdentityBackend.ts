import { analyzeDonorBodyV3, type DonorBodyV3Model } from '../donorV3/donorBodyModel';
import { donorBodyV3CanRender, renderDonorBodyV3 } from '../donorV3/renderDonorBodyV3';
import { musicalTrajectoryToProjectionCarrierPlan } from '../carrierTrajectory/musicalTrajectory';
import type { DonorIdentityBackend } from './donorIdentityBackend';

/** Current realtime-safe identity backend: deterministic browser DSP, no neural model. */
export const donorBodyV3IdentityBackend: DonorIdentityBackend<DonorBodyV3Model> = {
  id: 'donor-body-v3-dsp',
  capabilities: {
    execution: 'browser-dsp',
    carrierOwnsPitch: true,
    supportsPolyphony: true,
    supportsContinuousPitch: true,
  },
  analyze(input) {
    return analyzeDonorBodyV3(
      input.channels,
      input.sampleRate,
      input.startSample,
      input.sampleLength,
    );
  },
  canRender(model): model is DonorBodyV3Model {
    return donorBodyV3CanRender(model);
  },
  render(trajectory, model, options) {
    return renderDonorBodyV3(
      musicalTrajectoryToProjectionCarrierPlan(trajectory),
      model,
      options.sampleRate,
      options.durationSec,
      {
        sourceTimeline: options.sourceTimeline,
        isCancelled: options.isCancelled,
      },
    );
  },
};
