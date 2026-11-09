import type {
  AnchorRelativeTimbreTensor,
  LeakAuditFrameModel,
  LeakAuditSummary,
  OrderedFrameModel,
  ResonanceFrameModel,
  ResidualFrameModel,
  TransientFrameModel,
} from '../types/carrierDonorV2Types';

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function byAtomId<T extends { atomId: string }>(frames: T[] | undefined): Map<string, T> {
  const map = new Map<string, T>();
  for (const frame of frames ?? []) map.set(frame.atomId, frame);
  return map;
}

function estimatePitchLeakRisk(
  ordered: OrderedFrameModel | undefined,
  resonance: ResonanceFrameModel | undefined,
): number {
  const orderedRisk = ordered
    ? ordered.orderedness * (0.68 + (1 - ordered.inharmonicSpread) * 0.32)
    : 0;
  const resonanceRisk = resonance
    ? resonance.resonanceStrength * (0.3 + resonance.resonanceSharpness * 0.35)
    : 0;
  return clamp01(orderedRisk * 0.74 + resonanceRisk * 0.26);
}

function estimateProsodicLeakRisk(
  transient: TransientFrameModel | undefined,
  ordered: OrderedFrameModel | undefined,
  residual: ResidualFrameModel | undefined,
): number {
  const transientCarry = transient
    ? transient.transientStrength * (0.36 + transient.onsetSharpness * 0.34 + (1 - transient.onsetSpread) * 0.3)
    : 0;
  const orderedCarry = ordered ? ordered.orderedness * 0.32 : 0;
  const airyProtection = residual ? residual.residualFlatness * 0.18 : 0;
  return clamp01(transientCarry * 0.62 + orderedCarry * 0.38 - airyProtection * 0.22);
}

function estimateResonanceLeakRisk(
  resonance: ResonanceFrameModel | undefined,
): number {
  if (!resonance) return 0;
  return clamp01(resonance.resonanceStrength * (0.45 + resonance.resonanceSharpness * 0.55));
}

function estimateArticulationLeakRisk(
  transient: TransientFrameModel | undefined,
  residual: ResidualFrameModel | undefined,
): number {
  const transientRisk = transient
    ? transient.transientStrength * (0.42 + transient.onsetSharpness * 0.28 + transient.decayTightness * 0.3)
    : 0;
  const residualRisk = residual
    ? residual.residualStrength * (0.18 + (1 - residual.residualFlatness) * 0.24)
    : 0;
  return clamp01(transientRisk * 0.78 + residualRisk * 0.22);
}

function estimateOverallLeakRisk(
  pitchLeakRisk: number,
  prosodicLeakRisk: number,
  resonanceLeakRisk: number,
  articulationLeakRisk: number,
): number {
  return clamp01(
    pitchLeakRisk * 0.34 +
    prosodicLeakRisk * 0.3 +
    resonanceLeakRisk * 0.18 +
    articulationLeakRisk * 0.18,
  );
}

function estimateRecommendedSuppression(
  pitchLeakRisk: number,
  prosodicLeakRisk: number,
  overallLeakRisk: number,
): number {
  return clamp01(overallLeakRisk * 0.55 + prosodicLeakRisk * 0.3 + pitchLeakRisk * 0.15);
}

export function buildLeakAuditFrames(
  tensor: AnchorRelativeTimbreTensor,
): LeakAuditFrameModel[] {
  const orderedByAtom = byAtomId(tensor.orderedFrames);
  const resonanceByAtom = byAtomId(tensor.resonanceFrames);
  const residualByAtom = byAtomId(tensor.residualFrames);
  const transientByAtom = byAtomId(tensor.transientFrames);

  return tensor.atoms.map((atom) => {
    const ordered = orderedByAtom.get(atom.id);
    const resonance = resonanceByAtom.get(atom.id);
    const residual = residualByAtom.get(atom.id);
    const transient = transientByAtom.get(atom.id);

    const pitchLeakRisk = estimatePitchLeakRisk(ordered, resonance);
    const prosodicLeakRisk = estimateProsodicLeakRisk(transient, ordered, residual);
    const resonanceLeakRisk = estimateResonanceLeakRisk(resonance);
    const articulationLeakRisk = estimateArticulationLeakRisk(transient, residual);
    const overallLeakRisk = estimateOverallLeakRisk(
      pitchLeakRisk,
      prosodicLeakRisk,
      resonanceLeakRisk,
      articulationLeakRisk,
    );
    const recommendedSuppression = estimateRecommendedSuppression(
      pitchLeakRisk,
      prosodicLeakRisk,
      overallLeakRisk,
    );

    return {
      atomId: atom.id,
      anchorId: atom.anchorId,
      register: atom.register,
      phase: atom.phase,
      regime: atom.regime,
      pitchLeakRisk,
      prosodicLeakRisk,
      resonanceLeakRisk,
      articulationLeakRisk,
      overallLeakRisk,
      recommendedSuppression,
    };
  });
}

export function summarizeLeakAuditFrames(frames: LeakAuditFrameModel[]): LeakAuditSummary {
  if (!frames.length) {
    return {
      frameCount: 0,
      cellCount: 0,
      meanPitchLeakRisk: 0,
      meanProsodicLeakRisk: 0,
      meanOverallLeakRisk: 0,
      highLeakRatio: 0,
      meanRecommendedSuppression: 0,
    };
  }

  const frameCount = frames.length;
  const meanPitchLeakRisk =
    frames.reduce((sum, frame) => sum + frame.pitchLeakRisk, 0) / frameCount;
  const meanProsodicLeakRisk =
    frames.reduce((sum, frame) => sum + frame.prosodicLeakRisk, 0) / frameCount;
  const meanOverallLeakRisk =
    frames.reduce((sum, frame) => sum + frame.overallLeakRisk, 0) / frameCount;
  const highLeakRatio =
    frames.filter((frame) => frame.overallLeakRisk > 0.58).length / frameCount;
  const meanRecommendedSuppression =
    frames.reduce((sum, frame) => sum + frame.recommendedSuppression, 0) / frameCount;

  return {
    frameCount,
    cellCount: 0,
    meanPitchLeakRisk,
    meanProsodicLeakRisk,
    meanOverallLeakRisk,
    highLeakRatio,
    meanRecommendedSuppression,
  };
}
