import {
  CARRIER_LOOP_BODY_CURVE_CONTRACT_VERSION,
  type CarrierLoopBodyCurveSet,
} from './carrierLoopBodyCurveTypes';
import { withCarrierLoopBodyCurveSafety } from './carrierLoopBodyCurveMath';
import {
  accumulateBranchCIntervalWindowCurves,
  createBranchCCarrierLoopBodyCurveAccumulator,
  finalizeBranchCCarrierLoopBodyCurveAccumulator,
} from './branchCCarrierLoopBodyCurveAccumulator';
import {
  resolveBranchCCarrierLoopBodyCurveAdapterOptions,
  type BuildCarrierLoopBodyCurvesFromBranchCArgs,
} from './branchCCarrierLoopBodyAdapterOptions';

export {
  branchCCarrierLoopBodyRolePitchScale,
  branchCCarrierLoopBodyRoleSpreadPitchScale,
  branchCWindowLocalPitchFieldValue,
  branchCWindowLocalPitchCents,
  branchCWindowPaintedBaselineCents,
  branchCSampleGraphLinear,
  branchCRoughnessValue,
  branchCPresenceValue,
} from './branchCCarrierLoopBodyResonanceMapping';
export type {
  BranchCCarrierLoopBodyPitchContourMode,
  BranchCCarrierLoopBodyPitchRole,
} from './branchCCarrierLoopBodyResonanceMapping';
export {
  BRANCH_C_CARRIER_LOOP_BODY_CURVE_ACCUMULATOR_VERSION,
  accumulateBranchCIntervalWindowCurves,
  branchCWindowCurveSample,
  branchCWindowSampleRange,
  createBranchCCarrierLoopBodyCurveAccumulator,
  finalizeBranchCCarrierLoopBodyCurveAccumulator,
} from './branchCCarrierLoopBodyCurveAccumulator';
export type {
  BranchCAccumulateIntervalWindowCurvesArgs,
  BranchCCarrierLoopBodyCurveAccumulator,
  BranchCFinalizedCarrierLoopBodyCurves,
  BranchCWindowCurveSample,
  BranchCWindowSampleRange,
} from './branchCCarrierLoopBodyCurveAccumulator';
export {
  BRANCH_C_CARRIER_LOOP_BODY_ADAPTER_OPTIONS_VERSION,
  buildBranchCCarrierLoopBodySourceIdentity,
  resolveBranchCCarrierLoopBodyCurveAdapterOptions,
} from './branchCCarrierLoopBodyAdapterOptions';
export type {
  BuildCarrierLoopBodyCurvesFromBranchCArgs,
  ResolvedBranchCCarrierLoopBodyCurveAdapterOptions,
} from './branchCCarrierLoopBodyAdapterOptions';

export const BRANCH_C_CARRIER_LOOP_BODY_CURVE_ADAPTER_VERSION =
  'branch-c-carrier-loop-body-curve-adapter-3.2.91.6.9.170';

export function buildCarrierLoopBodyCurvesFromBranchC(
  args: BuildCarrierLoopBodyCurvesFromBranchCArgs,
): CarrierLoopBodyCurveSet {
  const resolved = resolveBranchCCarrierLoopBodyCurveAdapterOptions(args);
  const accumulator = createBranchCCarrierLoopBodyCurveAccumulator(resolved.totalSamples);

  for (const intervalWindow of args.plan.windows) {
    accumulateBranchCIntervalWindowCurves({
      accumulator,
      intervalWindow,
      totalBeats: args.totalBeats,
      baseHz: args.baseHz,
      pitchRole: resolved.pitchRole,
      pitchContourMode: resolved.pitchContourMode,
    });
  }

  const curves = finalizeBranchCCarrierLoopBodyCurveAccumulator(accumulator);

  return withCarrierLoopBodyCurveSafety({
    version: CARRIER_LOOP_BODY_CURVE_CONTRACT_VERSION,
    sourceIdentity: resolved.sourceIdentity,
    sourceKind: 'branch-c-interval-window-body-plan',
    durationSec: args.durationSec,
    controlSampleRate: resolved.controlSampleRate,
    baseHz: args.baseHz,
    ...curves,
  });
}
