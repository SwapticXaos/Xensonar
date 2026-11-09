import type {
  CarrierLoopBodyCurveSet,
  CarrierLoopBodyCurveSourceKind,
  CarrierLoopBodyCurveWarning,
} from './carrierLoopBodyCurveTypes';
import { safeFloat32ArrayStats } from './carrierLoopBodyCurveMath';

export const CARRIER_LOOP_BODY_ROOT_FOLLOW_MODULATION_PLAN_VERSION =
  'carrier-loop-body-root-follow-modulation-plan-3.2.91.6.9.166';

export type CarrierLoopBodyRootFollowAnchorPolicy =
  | 'live-root-frequency-anchor'
  | 'source-base-frequency-reference';

export type CarrierLoopBodyRootFollowPitchApplication =
  | 'detune-cents-over-live-root'
  | 'detune-cents-over-source-base';

export type CarrierLoopBodyRootFollowGainApplication =
  | 'dynamic-fade-over-carrier-loop'
  | 'preview-only-amplitude-envelope';

export type CarrierLoopBodyRootFollowDensityApplication =
  | 'density-hint-only'
  | 'future-event-density-modulator';

export type CarrierLoopBodyRootFollowPhasePolicy =
  | 'loop-normalized-phase'
  | 'root-follow-entry-phase';

export type CarrierLoopBodyRootFollowModulationReadiness =
  | 'ready-for-shadow-root-follow-modulation'
  | 'curve-body-unsafe'
  | 'empty-or-invalid-curve-body';

export type CarrierLoopBodyRootFollowModulationAxis = {
  id: 'pitch-detune-cents' | 'gain' | 'density' | 'roughness' | 'presence';
  sourceCurve: keyof Pick<CarrierLoopBodyCurveSet,
    | 'pitchDetuneCents'
    | 'gainCurve'
    | 'densityCurve'
    | 'roughnessCurve'
    | 'presenceCurve'
  >;
  target: string;
  application: string;
  mutableByLiveRootFollow: boolean;
};

export type CarrierLoopBodyRootFollowModulationPlan = {
  version: typeof CARRIER_LOOP_BODY_ROOT_FOLLOW_MODULATION_PLAN_VERSION;
  sourceIdentity: string;
  sourceKind: CarrierLoopBodyCurveSourceKind;
  durationSec: number;
  controlSampleRate: number;
  baseHz: number;
  curveLength: number;
  anchorPolicy: CarrierLoopBodyRootFollowAnchorPolicy;
  pitchApplication: CarrierLoopBodyRootFollowPitchApplication;
  gainApplication: CarrierLoopBodyRootFollowGainApplication;
  densityApplication: CarrierLoopBodyRootFollowDensityApplication;
  phasePolicy: CarrierLoopBodyRootFollowPhasePolicy;
  rootFollowPitchMode: 'relative-detune-over-live-anchor';
  preservesPaintedCarrierPitchContour: boolean;
  preservesPaintedCarrierEnergyContour: boolean;
  keepsPitchUnquantized: boolean;
  allowsLiveRootFollowBaseModulation: boolean;
  renderReady: false;
  runtimeAttached: false;
  readiness: CarrierLoopBodyRootFollowModulationReadiness;
  warnings: CarrierLoopBodyCurveWarning[];
  axes: CarrierLoopBodyRootFollowModulationAxis[];
  diagnostics: {
    pitchRangeCents: number;
    gainRange: number;
    densityRange: number;
    roughnessRange: number;
    presenceRange: number;
    loopSafe: boolean;
    modulationSafe: boolean;
  };
};

function curveRange(curve: Float32Array): number {
  const stats = safeFloat32ArrayStats(curve);
  return Number.isFinite(stats.max - stats.min) ? stats.max - stats.min : 0;
}

function resolveReadiness(body: CarrierLoopBodyCurveSet): CarrierLoopBodyRootFollowModulationReadiness {
  if (body.durationSec <= 0 || body.controlSampleRate <= 0 || body.pitchDetuneCents.length <= 0) {
    return 'empty-or-invalid-curve-body';
  }
  if (!body.modulationSafe) return 'curve-body-unsafe';
  return 'ready-for-shadow-root-follow-modulation';
}

export function buildCarrierLoopBodyRootFollowModulationPlan(
  body: CarrierLoopBodyCurveSet,
): CarrierLoopBodyRootFollowModulationPlan {
  const readiness = resolveReadiness(body);
  return {
    version: CARRIER_LOOP_BODY_ROOT_FOLLOW_MODULATION_PLAN_VERSION,
    sourceIdentity: body.sourceIdentity,
    sourceKind: body.sourceKind,
    durationSec: body.durationSec,
    controlSampleRate: body.controlSampleRate,
    baseHz: body.baseHz,
    curveLength: body.pitchDetuneCents.length,
    anchorPolicy: 'live-root-frequency-anchor',
    pitchApplication: 'detune-cents-over-live-root',
    gainApplication: 'dynamic-fade-over-carrier-loop',
    densityApplication: 'density-hint-only',
    phasePolicy: 'loop-normalized-phase',
    rootFollowPitchMode: 'relative-detune-over-live-anchor',
    preservesPaintedCarrierPitchContour: body.pitchDetuneCents.length > 0,
    preservesPaintedCarrierEnergyContour: body.gainCurve.length === body.pitchDetuneCents.length,
    keepsPitchUnquantized: true,
    allowsLiveRootFollowBaseModulation: true,
    renderReady: false,
    runtimeAttached: false,
    readiness,
    warnings: [...body.warnings],
    axes: [
      {
        id: 'pitch-detune-cents',
        sourceCurve: 'pitchDetuneCents',
        target: 'RootFollow live anchor detune',
        application: 'Apply the painted Carrier contour as relative cents over the current Root Follow base/root frequency.',
        mutableByLiveRootFollow: true,
      },
      {
        id: 'gain',
        sourceCurve: 'gainCurve',
        target: 'RootFollow dynamic-fade',
        application: 'Apply the painted Carrier energy contour as a loop-synchronous amplitude/dynamic body.',
        mutableByLiveRootFollow: false,
      },
      {
        id: 'density',
        sourceCurve: 'densityCurve',
        target: 'future RootFollow event-density/orchestration hint',
        application: 'Keep density as a non-rendering hint until a safe runtime adapter exists.',
        mutableByLiveRootFollow: false,
      },
      {
        id: 'roughness',
        sourceCurve: 'roughnessCurve',
        target: 'future timbre/roughness modulation hint',
        application: 'Keep roughness as a non-rendering hint until a safe timbre adapter exists.',
        mutableByLiveRootFollow: false,
      },
      {
        id: 'presence',
        sourceCurve: 'presenceCurve',
        target: 'future RootFollow focus/presence modulation hint',
        application: 'Keep presence as a non-rendering focus hint until a safe runtime adapter exists.',
        mutableByLiveRootFollow: false,
      },
    ],
    diagnostics: {
      pitchRangeCents: curveRange(body.pitchDetuneCents),
      gainRange: curveRange(body.gainCurve),
      densityRange: curveRange(body.densityCurve),
      roughnessRange: curveRange(body.roughnessCurve),
      presenceRange: curveRange(body.presenceCurve),
      loopSafe: body.loopSafe,
      modulationSafe: body.modulationSafe,
    },
  };
}

export function isCarrierLoopBodyRootFollowModulationPlanReady(
  plan: CarrierLoopBodyRootFollowModulationPlan | null | undefined,
): boolean {
  return !!plan
    && plan.readiness === 'ready-for-shadow-root-follow-modulation'
    && plan.keepsPitchUnquantized
    && plan.allowsLiveRootFollowBaseModulation
    && !plan.runtimeAttached
    && !plan.renderReady;
}
