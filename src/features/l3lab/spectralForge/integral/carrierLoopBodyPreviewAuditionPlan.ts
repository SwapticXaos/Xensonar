import type { BranchCCarrierLoopBodyPitchRole } from './buildCarrierLoopBodyCurvesFromBranchC';
import {
  CARRIER_LOOP_BODY_PREVIEW_CANDIDATE_VERSION,
  type CarrierLoopBodyPreviewReferenceKind,
  type CarrierLoopBodyPreviewSampleBuffer,
} from './carrierLoopBodyPreviewBuffer';
import type { CarrierLoopBodyCurveSet } from './carrierLoopBodyCurveTypes';
import {
  isCarrierLoopBodyPreviewAuditionHookEnabled,
  type CarrierLoopBodyPreviewAuditionHookRequest,
} from './carrierLoopBodyPreviewAuditionRequest';

export const CARRIER_LOOP_BODY_PREVIEW_AUDITION_HOOK_VERSION =
  'clb-aud-hook-7.7.23';

export const CARRIER_LOOP_BODY_PREVIEW_AUDITION_PLAN_BOUNDARY_VERSION =
  'clb-aud-plan-7.7.23';

export type CarrierLoopBodyPreviewAuditionHookStatus =
  | 'disabled'
  | 'unsupported-machine'
  | 'missing-curve-body'
  | 'candidate-ready';

export type CarrierLoopBodyPreviewAuditionHookPlan = {
  version: typeof CARRIER_LOOP_BODY_PREVIEW_AUDITION_HOOK_VERSION;
  previewCandidateVersion: typeof CARRIER_LOOP_BODY_PREVIEW_CANDIDATE_VERSION;
  status: CarrierLoopBodyPreviewAuditionHookStatus;
  reason: string;
  lifecycleMode: string;
  sourceIdentity: string | null;
  sourceKind: CarrierLoopBodyCurveSet['sourceKind'] | null;
  controlSampleRate: number | null;
  pitchRole: BranchCCarrierLoopBodyPitchRole;
  sampleRate: number | null;
  gain: number | null;
  harmonicGain: number | null;
  roughnessGain: number | null;
  loopEdgeFadeMs: number | null;
  referenceKind: CarrierLoopBodyPreviewReferenceKind;
};

export type CarrierLoopBodyPreviewAuditionHookPlaybackReport = CarrierLoopBodyPreviewAuditionHookPlan & {
  status: 'candidate-ready';
  rendered: CarrierLoopBodyPreviewSampleBuffer;
  cacheHit: boolean;
};

export function buildCarrierLoopBodyPreviewAuditionLifecycleMode(args: {
  cacheHit: boolean;
  sourceKind: CarrierLoopBodyCurveSet['sourceKind'];
}): string {
  return args.cacheHit
    ? `clb-cached-${args.sourceKind}`
    : `clb-rendered-${args.sourceKind}`;
}

export function buildCarrierLoopBodyPreviewAuditionCacheToken(args: {
  curveBody: CarrierLoopBodyCurveSet | null;
  request: CarrierLoopBodyPreviewAuditionHookRequest | null | undefined;
}): string {
  const request = args.request ?? {};
  const curveBody = args.curveBody;
  return [
    CARRIER_LOOP_BODY_PREVIEW_AUDITION_HOOK_VERSION,
    CARRIER_LOOP_BODY_PREVIEW_CANDIDATE_VERSION,
    curveBody?.sourceIdentity ?? 'missing-curve-body',
    curveBody?.sourceKind ?? 'unknown-source-kind',
    `sample:${Math.round(request.sampleRate ?? 0)}`,
    `control:${Math.round(request.controlSampleRate ?? curveBody?.controlSampleRate ?? 0)}`,
    `pitch:${request.pitchRole ?? 'body'}`,
    `gain:${Math.round((request.gain ?? -1) * 10000)}`,
    `harmonic:${Math.round((request.harmonicGain ?? -1) * 10000)}`,
    `rough:${Math.round((request.roughnessGain ?? -1) * 10000)}`,
    `edge:${Math.round(request.loopEdgeFadeMs ?? -1)}`,
    `ref:${request.referenceKind ?? 'body-sonar-reference'}`,
    `render:${Math.round((request.renderDurationSec ?? 0) * 1000)}`,
  ].join('|');
}

export function buildCarrierLoopBodyPreviewAuditionHookPlan(args: {
  request: CarrierLoopBodyPreviewAuditionHookRequest | null | undefined;
  curveBody: CarrierLoopBodyCurveSet | null;
  supportedMachine: boolean;
}): CarrierLoopBodyPreviewAuditionHookPlan {
  const request = args.request ?? null;
  const pitchRole = request?.pitchRole ?? 'body';
  const referenceKind = request?.referenceKind ?? 'body-sonar-reference';
  if (!isCarrierLoopBodyPreviewAuditionHookEnabled(request)) {
    return {
      version: CARRIER_LOOP_BODY_PREVIEW_AUDITION_HOOK_VERSION,
      previewCandidateVersion: CARRIER_LOOP_BODY_PREVIEW_CANDIDATE_VERSION,
      status: 'disabled',
      reason: 'CarrierLoopBody preview audition hook was not requested.',
      lifecycleMode: 'clb-disabled',
      sourceIdentity: null,
      sourceKind: null,
      controlSampleRate: null,
      pitchRole,
      sampleRate: null,
      gain: null,
      harmonicGain: null,
      roughnessGain: null,
      loopEdgeFadeMs: null,
      referenceKind,
    };
  }
  const enabledRequest = request as CarrierLoopBodyPreviewAuditionHookRequest;
  if (!args.supportedMachine) {
    return {
      version: CARRIER_LOOP_BODY_PREVIEW_AUDITION_HOOK_VERSION,
      previewCandidateVersion: CARRIER_LOOP_BODY_PREVIEW_CANDIDATE_VERSION,
      status: 'unsupported-machine',
      reason: 'CarrierLoopBody preview candidate hook is limited to the implemented Cecilia and Bert carrier-body readers.',
      lifecycleMode: 'clb-unsupported',
      sourceIdentity: null,
      sourceKind: null,
      controlSampleRate: enabledRequest.controlSampleRate ?? null,
      pitchRole,
      sampleRate: enabledRequest.sampleRate ?? null,
      gain: enabledRequest.gain ?? null,
      harmonicGain: enabledRequest.harmonicGain ?? null,
      roughnessGain: enabledRequest.roughnessGain ?? null,
      loopEdgeFadeMs: enabledRequest.loopEdgeFadeMs ?? null,
      referenceKind,
    };
  }
  if (!args.curveBody) {
    return {
      version: CARRIER_LOOP_BODY_PREVIEW_AUDITION_HOOK_VERSION,
      previewCandidateVersion: CARRIER_LOOP_BODY_PREVIEW_CANDIDATE_VERSION,
      status: 'missing-curve-body',
      reason: 'Selected carrier-body build did not provide a CarrierLoopBody curve body for preview audition.',
      lifecycleMode: 'clb-missing-body',
      sourceIdentity: null,
      sourceKind: null,
      controlSampleRate: enabledRequest.controlSampleRate ?? null,
      pitchRole,
      sampleRate: enabledRequest.sampleRate ?? null,
      gain: enabledRequest.gain ?? null,
      harmonicGain: enabledRequest.harmonicGain ?? null,
      roughnessGain: enabledRequest.roughnessGain ?? null,
      loopEdgeFadeMs: enabledRequest.loopEdgeFadeMs ?? null,
      referenceKind,
    };
  }
  return {
    version: CARRIER_LOOP_BODY_PREVIEW_AUDITION_HOOK_VERSION,
    previewCandidateVersion: CARRIER_LOOP_BODY_PREVIEW_CANDIDATE_VERSION,
    status: 'candidate-ready',
    reason: 'Carrier-body preview uses the dedicated CurveSet candidate path for this Xensonar version.',
    lifecycleMode: buildCarrierLoopBodyPreviewAuditionLifecycleMode({ cacheHit: false, sourceKind: args.curveBody.sourceKind }),
    sourceIdentity: args.curveBody.sourceIdentity,
    sourceKind: args.curveBody.sourceKind,
    controlSampleRate: args.curveBody.controlSampleRate,
    pitchRole,
    sampleRate: enabledRequest.sampleRate ?? null,
    gain: enabledRequest.gain ?? null,
    harmonicGain: enabledRequest.harmonicGain ?? null,
    roughnessGain: enabledRequest.roughnessGain ?? null,
    loopEdgeFadeMs: enabledRequest.loopEdgeFadeMs ?? null,
    referenceKind,
  };
}
