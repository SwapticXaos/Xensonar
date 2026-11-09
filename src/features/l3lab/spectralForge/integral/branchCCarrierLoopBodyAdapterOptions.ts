import type { SpectralForgeV2IntervalWindowBodyPlan } from '../rootFollow/buildV2IntervalWindowBodyPlan';
import { expectedCarrierLoopBodyCurveLength } from './carrierLoopBodyCurveMath';
import type {
  BranchCCarrierLoopBodyPitchContourMode,
  BranchCCarrierLoopBodyPitchRole,
} from './branchCCarrierLoopBodyResonanceMapping';

export const BRANCH_C_CARRIER_LOOP_BODY_ADAPTER_OPTIONS_VERSION =
  'branch-c-carrier-loop-body-adapter-options-3.2.91.6.9.170';

export type BuildCarrierLoopBodyCurvesFromBranchCArgs = {
  plan: SpectralForgeV2IntervalWindowBodyPlan;
  durationSec: number;
  totalBeats: number;
  baseHz: number;
  sourcePresetId: string;
  sourceIdentity?: string;
  controlSampleRate?: number;
  pitchRole?: BranchCCarrierLoopBodyPitchRole;
  /**
   * painted-window-contour preserves the larger drawn start→centroid→end motion of each
   * Cecilia/Branch-C window before adding the existing LocalField-style micro-detune.
   * static-window-centroid keeps the previous 9.160/9.166 body behaviour for audits.
   */
  pitchContourMode?: BranchCCarrierLoopBodyPitchContourMode;
};

export type ResolvedBranchCCarrierLoopBodyCurveAdapterOptions = {
  controlSampleRate: number;
  pitchRole: BranchCCarrierLoopBodyPitchRole;
  pitchContourMode: BranchCCarrierLoopBodyPitchContourMode;
  totalSamples: number;
  sourceIdentity: string;
};

export function buildBranchCCarrierLoopBodySourceIdentity(
  args: BuildCarrierLoopBodyCurvesFromBranchCArgs,
  resolved?: Pick<ResolvedBranchCCarrierLoopBodyCurveAdapterOptions, 'controlSampleRate' | 'pitchRole' | 'pitchContourMode'>,
): string {
  if (args.sourceIdentity) return args.sourceIdentity;
  const controlSampleRate = resolved?.controlSampleRate ?? args.controlSampleRate ?? 1000;
  const pitchRole = resolved?.pitchRole ?? args.pitchRole ?? 'body';
  const pitchContourMode = resolved?.pitchContourMode ?? args.pitchContourMode ?? 'painted-window-contour';
  return [
    'branch-c-interval-window-body-plan',
    args.sourcePresetId,
    `duration:${Number.isFinite(args.durationSec) ? args.durationSec.toFixed(4) : 'invalid'}`,
    `beats:${Number.isFinite(args.totalBeats) ? args.totalBeats.toFixed(4) : 'invalid'}`,
    `base:${Number.isFinite(args.baseHz) ? args.baseHz.toFixed(4) : 'invalid'}`,
    `control-rate:${Number.isFinite(controlSampleRate) ? controlSampleRate.toFixed(4) : 'invalid'}`,
    `pitch-role:${pitchRole}`,
    `painted-contour:${pitchContourMode}`,
    `windows:${args.plan.windows.length}`,
    `voices:${args.plan.voices.length}`,
    BRANCH_C_CARRIER_LOOP_BODY_ADAPTER_OPTIONS_VERSION,
  ].join('|');
}

export function resolveBranchCCarrierLoopBodyCurveAdapterOptions(
  args: BuildCarrierLoopBodyCurvesFromBranchCArgs,
): ResolvedBranchCCarrierLoopBodyCurveAdapterOptions {
  const controlSampleRate = args.controlSampleRate ?? 1000;
  const pitchRole = args.pitchRole ?? 'body';
  const pitchContourMode = args.pitchContourMode ?? 'painted-window-contour';
  return {
    controlSampleRate,
    pitchRole,
    pitchContourMode,
    totalSamples: expectedCarrierLoopBodyCurveLength(args.durationSec, controlSampleRate),
    sourceIdentity: buildBranchCCarrierLoopBodySourceIdentity(args, {
      controlSampleRate,
      pitchRole,
      pitchContourMode,
    }),
  };
}
