import { localFieldPitchSemitoneOffset } from '../../canonicalForge/localField';
import type {
  SpectralForgeV2IntervalWindow,
  SpectralForgeV2WindowVoiceRole,
} from '../rootFollow/buildV2IntervalWindowBodyPlan';
import {
  clamp01,
  clampRange,
  hzToCents,
} from './carrierLoopBodyCurveMath';

export const BRANCH_C_CARRIER_LOOP_BODY_RESONANCE_MAPPING_VERSION =
  'branch-c-carrier-loop-body-resonance-mapping-3.2.91.6.9.168';

export type BranchCCarrierLoopBodyPitchRole = SpectralForgeV2WindowVoiceRole;

export type BranchCCarrierLoopBodyPitchContourMode =
  | 'painted-window-contour'
  | 'static-window-centroid';

export function branchCCarrierLoopBodyRolePitchScale(
  role: BranchCCarrierLoopBodyPitchRole,
): number {
  switch (role) {
    case 'surface': return 0.18;
    case 'skin': return 0.08;
    case 'articulation': return 0.04;
    case 'body':
    default: return 0.11;
  }
}

export function branchCCarrierLoopBodyRoleSpreadPitchScale(
  role: BranchCCarrierLoopBodyPitchRole,
): number {
  return role === 'surface' ? 0.035 : 0.012;
}

export function branchCWindowLocalPitchFieldValue(args: {
  centroid: number;
  spread: number;
  role?: BranchCCarrierLoopBodyPitchRole;
}): number {
  const role = args.role ?? 'body';
  return clampRange(
    args.centroid * branchCCarrierLoopBodyRolePitchScale(role)
      + args.spread * branchCCarrierLoopBodyRoleSpreadPitchScale(role),
    -0.22,
    0.22,
  );
}

export function branchCWindowLocalPitchCents(args: {
  centroid: number;
  spread: number;
  role?: BranchCCarrierLoopBodyPitchRole;
}): number {
  return localFieldPitchSemitoneOffset(branchCWindowLocalPitchFieldValue(args)) * 100;
}

function lerp(left: number, right: number, ratio: number): number {
  return left + (right - left) * clamp01(ratio);
}

export function branchCWindowPaintedBaselineCents(args: {
  intervalWindow: SpectralForgeV2IntervalWindow;
  baseHz: number;
  ratio: number;
  contourMode?: BranchCCarrierLoopBodyPitchContourMode;
}): number {
  const centroidCents = hzToCents(args.intervalWindow.frequencyCentroidHz, args.baseHz);
  if ((args.contourMode ?? 'painted-window-contour') === 'static-window-centroid') {
    return centroidCents;
  }

  const startCents = hzToCents(args.intervalWindow.frequencyStartHz, args.baseHz);
  const endCents = hzToCents(args.intervalWindow.frequencyEndHz, args.baseHz);
  const safeRatio = clamp01(args.ratio);
  const linear = lerp(startCents, endCents, safeRatio);
  const midpointLinear = lerp(startCents, endCents, 0.5);
  // Preserve the drawn start→centroid→end motion without flattening Cecilia back into a static window average.
  const centroidCorrection = (centroidCents - midpointLinear) * 4 * safeRatio * (1 - safeRatio);
  return linear + centroidCorrection;
}

export function branchCSampleGraphLinear(graph: number[], ratio: number, fallback = 0): number {
  if (!graph.length) return fallback;
  const safeRatio = clamp01(ratio);
  const position = safeRatio * Math.max(0, graph.length - 1);
  const left = Math.floor(position);
  const right = Math.min(graph.length - 1, left + 1);
  const mix = position - left;
  const leftValue = Number.isFinite(graph[left]) ? Number(graph[left]) : fallback;
  const rightValue = Number.isFinite(graph[right]) ? Number(graph[right]) : leftValue;
  return leftValue + (rightValue - leftValue) * mix;
}

export function branchCRoughnessValue(
  intervalWindow: SpectralForgeV2IntervalWindow,
  spread: number,
): number {
  const spread01 = clamp01((spread + 1) * 0.5);
  const residualTint = clamp01(intervalWindow.donorPigment?.residualTint ?? 0);
  const noiseColor = clamp01(intervalWindow.donorPigment?.noiseColor ?? 0);
  return clamp01(
    spread01 * 0.42
      + clamp01(intervalWindow.roughness) * 0.42
      + residualTint * 0.08
      + noiseColor * 0.08,
  );
}

export function branchCPresenceValue(args: {
  intervalWindow: SpectralForgeV2IntervalWindow;
  energy: number;
  density: number;
}): number {
  const resonanceTint = clamp01(args.intervalWindow.donorPigment?.resonanceTint ?? 0);
  return clamp01(
    clamp01(args.energy) * 0.48
      + clamp01(args.density) * 0.22
      + clamp01(args.intervalWindow.continuity) * 0.18
      + clamp01(args.intervalWindow.transientness) * 0.06
      + resonanceTint * 0.04
      - clamp01(args.intervalWindow.roughness) * 0.12,
  );
}
