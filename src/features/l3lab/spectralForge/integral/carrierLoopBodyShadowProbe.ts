import type { SpectralForgeV2IntervalWindowBodyPlan } from '../rootFollow/buildV2IntervalWindowBodyPlan';
import type { BranchCCarrierLoopBodyPitchRole } from './buildCarrierLoopBodyCurvesFromBranchC';
import { buildCarrierLoopBodyCurvesFromBranchC } from './buildCarrierLoopBodyCurvesFromBranchC';
import {
  buildCarrierLoopBodyCurveReport,
  formatCarrierLoopBodyCurveReport,
} from './carrierLoopBodyCurveReport';
import type { CarrierLoopBodyCurveReport } from './carrierLoopBodyCurveTypes';

export const CARRIER_LOOP_BODY_SHADOW_PROBE_VERSION =
  'carrier-loop-body-shadow-probe-3.2.91.6.9.161';

export type CarrierLoopBodyShadowProbeRequest = {
  enabled?: boolean;
  controlSampleRate?: number;
  pitchRole?: BranchCCarrierLoopBodyPitchRole;
  sourceIdentity?: string;
};

export type CarrierLoopBodyShadowProbeStatus =
  | 'unavailable'
  | 'built';

export type CarrierLoopBodyShadowProbeReport = {
  version: typeof CARRIER_LOOP_BODY_SHADOW_PROBE_VERSION;
  status: CarrierLoopBodyShadowProbeStatus;
  sourceReading: 'branch-c-interval-window-body-plan';
  sourcePresetId: string;
  sourceIdentity: string;
  durationSec: number;
  totalBeats: number;
  baseHz: number;
  controlSampleRate: number;
  pitchRole: BranchCCarrierLoopBodyPitchRole;
  intervalWindowCount: number;
  intervalWindowVoiceCount: number;
  reason: string;
  curveReport: CarrierLoopBodyCurveReport | null;
  formattedCurveReport: string | null;
};

export type BuildCarrierLoopBodyShadowProbeArgs = {
  enabled: boolean;
  plan: SpectralForgeV2IntervalWindowBodyPlan | null;
  durationSec: number;
  totalBeats: number;
  baseHz: number;
  sourcePresetId: string;
  controlSampleRate?: number;
  pitchRole?: BranchCCarrierLoopBodyPitchRole;
  sourceIdentity?: string;
};

function defaultShadowSourceIdentity(args: BuildCarrierLoopBodyShadowProbeArgs): string {
  if (args.sourceIdentity) return args.sourceIdentity;
  return [
    'branch-c-carrier-loop-body-shadow-probe',
    args.sourcePresetId,
    `duration:${Number.isFinite(args.durationSec) ? args.durationSec.toFixed(4) : 'invalid'}`,
    `beats:${Number.isFinite(args.totalBeats) ? args.totalBeats.toFixed(4) : 'invalid'}`,
    `base:${Number.isFinite(args.baseHz) ? args.baseHz.toFixed(4) : 'invalid'}`,
    CARRIER_LOOP_BODY_SHADOW_PROBE_VERSION,
  ].join('|');
}

export function buildCarrierLoopBodyShadowProbe(
  args: BuildCarrierLoopBodyShadowProbeArgs,
): CarrierLoopBodyShadowProbeReport | null {
  if (!args.enabled) return null;

  const controlSampleRate = args.controlSampleRate ?? 1000;
  const pitchRole = args.pitchRole ?? 'body';
  const sourceIdentity = defaultShadowSourceIdentity(args);

  if (!args.plan) {
    return {
      version: CARRIER_LOOP_BODY_SHADOW_PROBE_VERSION,
      status: 'unavailable',
      sourceReading: 'branch-c-interval-window-body-plan',
      sourcePresetId: args.sourcePresetId,
      sourceIdentity,
      durationSec: args.durationSec,
      totalBeats: args.totalBeats,
      baseHz: args.baseHz,
      controlSampleRate,
      pitchRole,
      intervalWindowCount: 0,
      intervalWindowVoiceCount: 0,
      reason: 'Branch C interval-window plan was not available for this root-follow build.',
      curveReport: null,
      formattedCurveReport: null,
    };
  }

  const curveBody = buildCarrierLoopBodyCurvesFromBranchC({
    plan: args.plan,
    durationSec: args.durationSec,
    totalBeats: args.totalBeats,
    baseHz: args.baseHz,
    sourcePresetId: args.sourcePresetId,
    sourceIdentity,
    controlSampleRate,
    pitchRole,
  });
  const curveReport = buildCarrierLoopBodyCurveReport(curveBody);

  return {
    version: CARRIER_LOOP_BODY_SHADOW_PROBE_VERSION,
    status: 'built',
    sourceReading: 'branch-c-interval-window-body-plan',
    sourcePresetId: args.sourcePresetId,
    sourceIdentity: curveBody.sourceIdentity,
    durationSec: args.durationSec,
    totalBeats: args.totalBeats,
    baseHz: args.baseHz,
    controlSampleRate,
    pitchRole,
    intervalWindowCount: args.plan.summary.intervalWindowCount,
    intervalWindowVoiceCount: args.plan.summary.intervalWindowVoiceCount,
    reason: 'Branch C CarrierLoopBody curve body was built as a shadow probe only; no renderer, transfer path or UI consumed it.',
    curveReport,
    formattedCurveReport: formatCarrierLoopBodyCurveReport(curveReport),
  };
}
