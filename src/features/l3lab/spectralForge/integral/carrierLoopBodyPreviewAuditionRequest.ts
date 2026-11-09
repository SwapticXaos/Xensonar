import type { BranchCCarrierLoopBodyPitchRole } from './buildCarrierLoopBodyCurvesFromBranchC';
import type { CarrierLoopBodyPreviewBufferOptions } from './carrierLoopBodyPreviewBuffer';

export const CARRIER_LOOP_BODY_PREVIEW_AUDITION_REQUEST_BOUNDARY_VERSION =
  'carrier-loop-body-preview-audition-request-boundary-3.2.91.6.9.171';

export type CarrierLoopBodyPreviewAuditionHookRequest = CarrierLoopBodyPreviewBufferOptions & {
  enabled?: boolean;
  controlSampleRate?: number;
  pitchRole?: BranchCCarrierLoopBodyPitchRole;
  sourceIdentity?: string;
};

export const CECILIA_CARRIER_LOOP_BODY_PREVIEW_DEFAULT_REQUEST: CarrierLoopBodyPreviewAuditionHookRequest = {
  enabled: true,
  pitchRole: 'body',
  referenceKind: 'cecilia-spectral-weave',
};

export function isCarrierLoopBodyPreviewAuditionHookEnabled(
  request: CarrierLoopBodyPreviewAuditionHookRequest | null | undefined,
): boolean {
  return request?.enabled === true;
}

export function resolveCarrierLoopBodyPreviewAuditionRequestForMachine(args: {
  machineId: string;
  request?: CarrierLoopBodyPreviewAuditionHookRequest | null;
}): CarrierLoopBodyPreviewAuditionHookRequest | null {
  if (args.request?.enabled === true) {
    return args.request;
  }
  if (args.machineId === 'branch-c-interval-body') {
    return {
      ...CECILIA_CARRIER_LOOP_BODY_PREVIEW_DEFAULT_REQUEST,
      sourceIdentity: args.request?.sourceIdentity,
      controlSampleRate: args.request?.controlSampleRate,
      sampleRate: args.request?.sampleRate,
      gain: args.request?.gain,
      harmonicGain: args.request?.harmonicGain,
      roughnessGain: args.request?.roughnessGain,
      loopEdgeFadeMs: args.request?.loopEdgeFadeMs,
      renderDurationSec: args.request?.renderDurationSec,
    };
  }
  return null;
}

export function buildCarrierLoopBodyPreviewAuditionOptions(
  request: CarrierLoopBodyPreviewAuditionHookRequest | null | undefined,
): CarrierLoopBodyPreviewBufferOptions {
  return {
    sampleRate: request?.sampleRate,
    gain: request?.gain,
    harmonicGain: request?.harmonicGain,
    roughnessGain: request?.roughnessGain,
    loopEdgeFadeMs: request?.loopEdgeFadeMs,
    referenceKind: request?.referenceKind ?? 'body-sonar-reference',
    renderDurationSec: request?.renderDurationSec,
  };
}
