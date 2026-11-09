import {
  CARRIER_LOOP_BODY_CURVE_CONTRACT_VERSION,
  type CarrierLoopBodyCurveReport,
  type CarrierLoopBodyCurveSet,
} from './carrierLoopBodyCurveTypes';
import {
  evaluateCarrierLoopBodyCurveSafety,
  safeFloat32ArrayStats,
} from './carrierLoopBodyCurveMath';

export function buildCarrierLoopBodyCurveReport(body: CarrierLoopBodyCurveSet): CarrierLoopBodyCurveReport {
  const safety = evaluateCarrierLoopBodyCurveSafety(body);
  return {
    version: CARRIER_LOOP_BODY_CURVE_CONTRACT_VERSION,
    sourceIdentity: body.sourceIdentity,
    sourceKind: body.sourceKind,
    durationSec: body.durationSec,
    controlSampleRate: body.controlSampleRate,
    baseHz: body.baseHz,
    curveLength: body.pitchDetuneCents.length,
    pitchDetuneCents: safeFloat32ArrayStats(body.pitchDetuneCents),
    gainCurve: safeFloat32ArrayStats(body.gainCurve),
    densityCurve: safeFloat32ArrayStats(body.densityCurve),
    roughnessCurve: safeFloat32ArrayStats(body.roughnessCurve),
    presenceCurve: safeFloat32ArrayStats(body.presenceCurve),
    safety,
  };
}

function rangeLine(label: string, min: number, max: number, suffix = ''): string {
  return `${label}: [${min.toFixed(3)} ... ${max.toFixed(3)}]${suffix}`;
}

export function formatCarrierLoopBodyCurveReport(report: CarrierLoopBodyCurveReport): string {
  return [
    `CarrierLoopBodyCurveReport ${report.version}`,
    `source=${report.sourceIdentity} (${report.sourceKind})`,
    `duration=${report.durationSec.toFixed(3)}s controlRate=${report.controlSampleRate}Hz baseHz=${report.baseHz.toFixed(3)} length=${report.curveLength}`,
    rangeLine('pitchDetuneCents', report.pitchDetuneCents.min, report.pitchDetuneCents.max, ' cents'),
    rangeLine('gainCurve', report.gainCurve.min, report.gainCurve.max),
    rangeLine('densityCurve', report.densityCurve.min, report.densityCurve.max),
    rangeLine('roughnessCurve', report.roughnessCurve.min, report.roughnessCurve.max),
    rangeLine('presenceCurve', report.presenceCurve.min, report.presenceCurve.max),
    `loopSafe=${report.safety.loopSafe} modulationSafe=${report.safety.modulationSafe}`,
    `warnings=${report.safety.warnings.length ? report.safety.warnings.join(',') : 'none'}`,
  ].join('\n');
}
