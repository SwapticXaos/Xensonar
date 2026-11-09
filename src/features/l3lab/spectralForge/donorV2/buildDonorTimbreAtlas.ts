import type {
  AnchorRelativeTimbreTensor,
  CarrierAnchorRegime,
  DonorAnchorPhase,
  DonorRegisterLabel,
  DonorTimbreAtlas,
  DonorTimbreAtom,
  DonorTimbreCell,
  LeakAuditCellModel,
  LeakAuditFrameModel,
  OrderedCellModel,
  OrderedFrameModel,
  ResidualCellModel,
  ResidualFrameModel,
  ResonanceCellModel,
  ResonanceFrameModel,
  TransientCellModel,
  TransientFrameModel,
} from '../types/carrierDonorV2Types';

export type BuildDonorTimbreAtlasOptions = {
  minMembersPerCell?: number;
  maxPitchLeakRisk?: number;
  maxSequenceRecoverability?: number;
  maxProsodicTrace?: number;
  trimRatio?: number;
};

const DEFAULT_OPTIONS: Required<BuildDonorTimbreAtlasOptions> = {
  minMembersPerCell: 3,
  maxPitchLeakRisk: 0.92,
  maxSequenceRecoverability: 0.9,
  maxProsodicTrace: 0.88,
  trimRatio: 0.18,
};

type CellKey = `${DonorRegisterLabel}:${DonorAnchorPhase}:${CarrierAnchorRegime}`;

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function normalize(values: Float32Array): Float32Array {
  let max = 0;
  for (let i = 0; i < values.length; i += 1) max = Math.max(max, values[i] ?? 0);
  if (max <= 1e-6) return values.slice();
  const out = values.slice();
  for (let i = 0; i < out.length; i += 1) out[i] /= max;
  return out;
}

function smoothVector(values: Float32Array, radius: number): Float32Array {
  if (radius <= 0) return values.slice();
  const out = new Float32Array(values.length);
  for (let i = 0; i < values.length; i += 1) {
    let weighted = 0;
    let weightSum = 0;
    for (let di = -radius; di <= radius; di += 1) {
      const ii = i + di;
      if (ii < 0 || ii >= values.length) continue;
      const weight = radius + 1 - Math.abs(di);
      weighted += (values[ii] ?? 0) * weight;
      weightSum += weight;
    }
    out[i] = weightSum > 0 ? weighted / weightSum : values[i] ?? 0;
  }
  return out;
}

function averageFloat32Array(values: Float32Array): number {
  if (!values.length) return 0;
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) sum += values[i] ?? 0;
  return sum / values.length;
}

function robustMeanVectors(vectors: Float32Array[], trimRatio: number): Float32Array {
  if (!vectors.length) return new Float32Array(0);
  const length = vectors[0].length;
  const out = new Float32Array(length);
  const trimCount = Math.max(0, Math.floor(vectors.length * trimRatio));
  for (let i = 0; i < length; i += 1) {
    const values = vectors.map((vec) => vec[i] ?? 0).sort((a, b) => a - b);
    const start = Math.min(trimCount, Math.max(0, values.length - 1));
    const end = Math.max(start + 1, values.length - trimCount);
    let sum = 0;
    let count = 0;
    for (let index = start; index < end; index += 1) {
      sum += values[index] ?? 0;
      count += 1;
    }
    out[i] = count > 0 ? sum / count : values[Math.floor(values.length * 0.5)] ?? 0;
  }
  return out;
}


function averageScalar(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function meanFloat32Arrays(vectors: Float32Array[]): Float32Array {
  if (!vectors.length) return new Float32Array(0);
  const length = vectors[0].length;
  const out = new Float32Array(length);
  for (const vec of vectors) {
    for (let i = 0; i < length; i += 1) out[i] += vec[i] ?? 0;
  }
  for (let i = 0; i < length; i += 1) out[i] /= vectors.length;
  return out;
}

function summarizeOrderedCell(
  cellId: string,
  register: DonorRegisterLabel,
  phase: DonorAnchorPhase,
  regime: CarrierAnchorRegime,
  frames: OrderedFrameModel[],
): OrderedCellModel | null {
  if (!frames.length) return null;
  return {
    cellId,
    register,
    phase,
    regime,
    meanOrderedness: averageScalar(frames.map((frame) => frame.orderedness)),
    meanPartialWeights: meanFloat32Arrays(frames.map((frame) => frame.partialWeights)),
    meanSpectralSlope: averageScalar(frames.map((frame) => frame.spectralSlope)),
    meanOddEvenBalance: averageScalar(frames.map((frame) => frame.oddEvenBalance)),
    meanInharmonicSpread: averageScalar(frames.map((frame) => frame.inharmonicSpread)),
  };
}

function summarizeResonanceCell(
  cellId: string,
  register: DonorRegisterLabel,
  phase: DonorAnchorPhase,
  regime: CarrierAnchorRegime,
  frames: ResonanceFrameModel[],
): ResonanceCellModel | null {
  if (!frames.length) return null;
  return {
    cellId,
    register,
    phase,
    regime,
    meanResonanceStrength: averageScalar(frames.map((frame) => frame.resonanceStrength)),
    meanBodyCentroid: averageScalar(frames.map((frame) => frame.bodyCentroid)),
    meanResonanceSharpness: averageScalar(frames.map((frame) => frame.resonanceSharpness)),
    meanResonanceProfile: meanFloat32Arrays(frames.map((frame) => frame.resonanceProfile)),
    meanPeakCenters: meanFloat32Arrays(frames.map((frame) => frame.peakCenters)),
    meanPeakWeights: meanFloat32Arrays(frames.map((frame) => frame.peakWeights)),
    meanPeakWidths: meanFloat32Arrays(frames.map((frame) => frame.peakWidths)),
  };
}

function summarizeResidualCell(
  cellId: string,
  register: DonorRegisterLabel,
  phase: DonorAnchorPhase,
  regime: CarrierAnchorRegime,
  frames: ResidualFrameModel[],
): ResidualCellModel | null {
  if (!frames.length) return null;
  return {
    cellId,
    register,
    phase,
    regime,
    meanResidualStrength: averageScalar(frames.map((frame) => frame.residualStrength)),
    meanNoiseColorCentroid: averageScalar(frames.map((frame) => frame.noiseColorCentroid)),
    meanResidualFlatness: averageScalar(frames.map((frame) => frame.residualFlatness)),
    meanResidualProfile: meanFloat32Arrays(frames.map((frame) => frame.residualProfile)),
  };
}


function summarizeLeakAuditCell(
  cellId: string,
  register: DonorRegisterLabel,
  phase: DonorAnchorPhase,
  regime: CarrierAnchorRegime,
  frames: LeakAuditFrameModel[],
  sequenceRecoverability: number,
  prosodicTrace: number,
  cellEntanglement: number,
): LeakAuditCellModel | null {
  if (!frames.length) return null;
  const meanPitchLeakRisk = averageScalar(frames.map((frame) => frame.pitchLeakRisk));
  const frameProsodicRisk = averageScalar(frames.map((frame) => frame.prosodicLeakRisk));
  const meanResonanceLeakRisk = averageScalar(frames.map((frame) => frame.resonanceLeakRisk));
  const meanArticulationLeakRisk = averageScalar(frames.map((frame) => frame.articulationLeakRisk));
  const meanProsodicLeakRisk = clamp(
    frameProsodicRisk * 0.5 + prosodicTrace * 0.32 + sequenceRecoverability * 0.18,
  );
  const meanOverallLeakRisk = clamp(
    averageScalar(frames.map((frame) => frame.overallLeakRisk)) * 0.52 +
      sequenceRecoverability * 0.18 +
      prosodicTrace * 0.16 +
      cellEntanglement * 0.14,
  );
  const meanRecommendedSuppression = clamp(
    averageScalar(frames.map((frame) => frame.recommendedSuppression)) * 0.55 +
      meanOverallLeakRisk * 0.25 +
      meanProsodicLeakRisk * 0.2,
  );

  return {
    cellId,
    register,
    phase,
    regime,
    meanPitchLeakRisk,
    meanProsodicLeakRisk,
    meanResonanceLeakRisk,
    meanArticulationLeakRisk,
    meanOverallLeakRisk,
    meanRecommendedSuppression,
  };
}

function summarizeTransientCell(
  cellId: string,
  register: DonorRegisterLabel,
  phase: DonorAnchorPhase,
  regime: CarrierAnchorRegime,
  frames: TransientFrameModel[],
): TransientCellModel | null {
  if (!frames.length) return null;
  return {
    cellId,
    register,
    phase,
    regime,
    meanTransientStrength: averageScalar(frames.map((frame) => frame.transientStrength)),
    meanOnsetSharpness: averageScalar(frames.map((frame) => frame.onsetSharpness)),
    meanOnsetSpread: averageScalar(frames.map((frame) => frame.onsetSpread)),
    meanDecayTightness: averageScalar(frames.map((frame) => frame.decayTightness)),
    meanTransientProfile: meanFloat32Arrays(frames.map((frame) => frame.transientProfile)),
  };
}

function varianceAroundMean(vectors: Float32Array[], mean: Float32Array): number {
  if (!vectors.length || !mean.length) return 0;
  let sum = 0;
  let count = 0;
  for (const vec of vectors) {
    for (let i = 0; i < mean.length; i += 1) {
      const diff = (vec[i] ?? 0) - (mean[i] ?? 0);
      sum += diff * diff;
      count += 1;
    }
  }
  return count > 0 ? sum / count : 0;
}

function computeFrameMetrics(atoms: DonorTimbreAtom[], sourceFrameCount: number) {
  const frameCount = Math.max(1, sourceFrameCount);
  const sortedFrames = atoms.map((atom) => atom.frameIndex).sort((a, b) => a - b);
  const uniqueFrames = Array.from(new Set(sortedFrames));
  const frameSpan = uniqueFrames.length > 1
    ? (uniqueFrames[uniqueFrames.length - 1] - uniqueFrames[0]) / Math.max(1, frameCount - 1)
    : 0;
  const coverage = uniqueFrames.length / frameCount;

  let adjacency = 0;
  if (uniqueFrames.length > 1) {
    let sum = 0;
    for (let i = 1; i < uniqueFrames.length; i += 1) {
      const gap = uniqueFrames[i] - uniqueFrames[i - 1];
      sum += clamp(1 - (gap - 1) / 6);
    }
    adjacency = sum / Math.max(1, uniqueFrames.length - 1);
  }

  const spreadScore = clamp(frameSpan * 1.6);
  const coverageScore = clamp(coverage * 8);
  const cellEntanglement = clamp(0.52 * (1 - spreadScore) + 0.28 * (1 - coverageScore) + 0.20 * adjacency);
  const sequenceRecoverability = clamp(0.5 * adjacency + 0.3 * (1 - spreadScore) + 0.2 * (1 - coverageScore));

  return {
    uniqueFrameCount: uniqueFrames.length,
    frameSpan,
    coverage,
    adjacency,
    cellEntanglement,
    sequenceRecoverability,
  };
}

function computeProsodicTrace(atoms: DonorTimbreAtom[]) {
  if (atoms.length < 2) return 0;
  const sorted = atoms.slice().sort((a, b) => a.frameIndex - b.frameIndex);
  const contiguous: number[] = [];
  const signs: number[] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const next = sorted[i];
    const gap = next.frameIndex - prev.frameIndex;
    if (gap <= 0 || gap > 3) continue;
    const delta = Math.log2(Math.max(1e-6, next.centerHz) / Math.max(1e-6, prev.centerHz));
    contiguous.push(delta);
    signs.push(delta === 0 ? 0 : delta > 0 ? 1 : -1);
  }
  if (!contiguous.length) return 0;
  const meanAbs = contiguous.reduce((sum, value) => sum + Math.abs(value), 0) / contiguous.length;
  let slopeVariance = 0;
  if (contiguous.length > 1) {
    for (let i = 1; i < contiguous.length; i += 1) {
      const diff = contiguous[i] - contiguous[i - 1];
      slopeVariance += diff * diff;
    }
    slopeVariance /= contiguous.length - 1;
  }
  const monotonicity = Math.abs(signs.reduce((sum, value) => sum + value, 0)) / contiguous.length;
  const contiguousDensity = contiguous.length / Math.max(1, sorted.length - 1);
  const rangeRestraint = clamp(1 - meanAbs * 10);
  const smoothness = clamp(1 - slopeVariance * 180);
  return clamp(0.34 * contiguousDensity + 0.34 * monotonicity + 0.18 * rangeRestraint + 0.14 * smoothness);
}

function estimatePitchLeakRisk(
  meanEnvelope: Float32Array,
  envelopeVariance: number,
  sequenceRecoverability: number,
  prosodicTrace: number,
): number {
  if (!meanEnvelope.length) return 1;
  let peak = 0;
  let sum = 0;
  for (let i = 0; i < meanEnvelope.length; i += 1) {
    const value = meanEnvelope[i] ?? 0;
    peak = Math.max(peak, value);
    sum += value;
  }
  const mean = sum / meanEnvelope.length;
  const peakedness = peak - mean;
  const risk =
    0.38 * clamp(peakedness) +
    0.18 * clamp(envelopeVariance * 4) +
    0.24 * sequenceRecoverability +
    0.20 * prosodicTrace;
  return clamp(risk);
}

function deSequenceEnvelope(
  baseEnvelope: Float32Array,
  formantEnvelope: Float32Array,
  sequenceRecoverability: number,
  prosodicTrace: number,
  cellEntanglement: number,
): Float32Array {
  const smoothingRadius = 2 + Math.round(sequenceRecoverability * 3 + prosodicTrace * 2);
  const broad = smoothVector(baseEnvelope, smoothingRadius);
  const broadFormant = smoothVector(formantEnvelope, 2 + Math.round(prosodicTrace * 3));
  const blendToBroad = clamp(0.48 + sequenceRecoverability * 0.22 + prosodicTrace * 0.18 + cellEntanglement * 0.12);
  const flattened = new Float32Array(baseEnvelope.length);
  const globalMean = averageFloat32Array(broad);
  const peakCompression = clamp(0.22 + sequenceRecoverability * 0.28 + prosodicTrace * 0.28 + cellEntanglement * 0.14, 0.18, 0.86);
  for (let i = 0; i < flattened.length; i += 1) {
    const mixed = (baseEnvelope[i] ?? 0) * (1 - blendToBroad) + (broad[i] ?? 0) * blendToBroad;
    const withFormant = mixed * 0.68 + (broadFormant[i] ?? 0) * 0.32;
    flattened[i] = globalMean + (withFormant - globalMean) * (1 - peakCompression);
  }
  return normalize(flattened);
}

function deSequenceFormants(
  baseFormants: Float32Array,
  sequenceRecoverability: number,
  prosodicTrace: number,
): Float32Array {
  const smooth = smoothVector(baseFormants, 2 + Math.round(prosodicTrace * 2 + sequenceRecoverability * 1.5));
  return normalize(smooth);
}

function deSequenceModulation(
  baseModulation: Float32Array,
  sequenceRecoverability: number,
  prosodicTrace: number,
  cellEntanglement: number,
): Float32Array {
  const out = baseModulation.slice();
  const damping = clamp(0.35 * sequenceRecoverability + 0.45 * prosodicTrace + 0.2 * cellEntanglement);
  if (out.length > 0) out[0] *= 1 - damping * 0.75;
  if (out.length > 1) out[1] *= 1 - damping * 0.62;
  if (out.length > 2) out[2] *= 0.92 + (1 - damping) * 0.08;
  if (out.length > 3) out[3] = clamp(out[3] * 0.55 + (1 - cellEntanglement) * 0.45);
  return out;
}

function estimateStability(envelopeVariance: number, modulationVariance: number, memberCount: number, cellEntanglement: number): number {
  const cohesion = 1 - clamp(envelopeVariance * 4 + modulationVariance * 3);
  const memberBoost = clamp((memberCount - 1) / 6);
  return clamp(cohesion * 0.56 + memberBoost * 0.26 + (1 - cellEntanglement) * 0.18);
}

function estimateQuality(
  atoms: DonorTimbreAtom[],
  stability: number,
  pitchLeakRisk: number,
  sequenceRecoverability: number,
  prosodicTrace: number,
  cellEntanglement: number,
): number {
  const meanAtomQuality = atoms.length > 0
    ? atoms.reduce((sum, atom) => sum + atom.quality, 0) / atoms.length
    : 0;
  const donorPurity = 1 - (pitchLeakRisk * 0.4 + sequenceRecoverability * 0.3 + prosodicTrace * 0.2 + cellEntanglement * 0.1);
  return clamp(meanAtomQuality * 0.58 + stability * 0.27 + donorPurity * 0.15);
}

export function buildDonorTimbreAtlas(
  tensor: AnchorRelativeTimbreTensor,
  options?: BuildDonorTimbreAtlasOptions,
): DonorTimbreAtlas {
  const cfg = { ...DEFAULT_OPTIONS, ...(options ?? {}) };
  const grouped = new Map<CellKey, DonorTimbreAtom[]>();
  const orderedFramesByKey = new Map<CellKey, OrderedFrameModel[]>();
  const resonanceFramesByKey = new Map<CellKey, ResonanceFrameModel[]>();
  const residualFramesByKey = new Map<CellKey, ResidualFrameModel[]>();
  const transientFramesByKey = new Map<CellKey, TransientFrameModel[]>();
  const leakAuditFramesByKey = new Map<CellKey, LeakAuditFrameModel[]>();

  for (const atom of tensor.atoms) {
    const key: CellKey = `${atom.register}:${atom.phase}:${atom.regime}`;
    const bucket = grouped.get(key);
    if (bucket) bucket.push(atom);
    else grouped.set(key, [atom]);
  }

  for (const frame of tensor.orderedFrames ?? []) {
    const key: CellKey = `${frame.register}:${frame.phase}:${frame.regime}`;
    const bucket = orderedFramesByKey.get(key);
    if (bucket) bucket.push(frame);
    else orderedFramesByKey.set(key, [frame]);
  }

  for (const frame of tensor.resonanceFrames ?? []) {
    const key: CellKey = `${frame.register}:${frame.phase}:${frame.regime}`;
    const bucket = resonanceFramesByKey.get(key);
    if (bucket) bucket.push(frame);
    else resonanceFramesByKey.set(key, [frame]);
  }

  for (const frame of tensor.residualFrames ?? []) {
    const key: CellKey = `${frame.register}:${frame.phase}:${frame.regime}`;
    const bucket = residualFramesByKey.get(key);
    if (bucket) bucket.push(frame);
    else residualFramesByKey.set(key, [frame]);
  }

  for (const frame of tensor.transientFrames ?? []) {
    const key: CellKey = `${frame.register}:${frame.phase}:${frame.regime}`;
    const bucket = transientFramesByKey.get(key);
    if (bucket) bucket.push(frame);
    else transientFramesByKey.set(key, [frame]);
  }

  for (const frame of tensor.leakAuditFrames ?? []) {
    const key: CellKey = `${frame.register}:${frame.phase}:${frame.regime}`;
    const bucket = leakAuditFramesByKey.get(key);
    if (bucket) bucket.push(frame);
    else leakAuditFramesByKey.set(key, [frame]);
  }

  const cells: DonorTimbreCell[] = [];

  for (const [key, atoms] of grouped.entries()) {
    if (atoms.length < cfg.minMembersPerCell) continue;
    const [register, phase, regime] = key.split(':') as [DonorRegisterLabel, DonorAnchorPhase, CarrierAnchorRegime];
    const frameMetrics = computeFrameMetrics(atoms, tensor.sourceFrameCount);
    const prosodicTrace = computeProsodicTrace(atoms);

    const rawEnvelope = normalize(robustMeanVectors(atoms.map((atom) => atom.relativeSpectralEnvelope), cfg.trimRatio));
    const rawFormants = normalize(robustMeanVectors(atoms.map((atom) => atom.formantEnvelope), cfg.trimRatio));
    const meanRelativeSpectralEnvelope = deSequenceEnvelope(
      rawEnvelope,
      rawFormants,
      frameMetrics.sequenceRecoverability,
      prosodicTrace,
      frameMetrics.cellEntanglement,
    );
    const meanFormantEnvelope = deSequenceFormants(rawFormants, frameMetrics.sequenceRecoverability, prosodicTrace);
    const meanResidualBands = normalize(robustMeanVectors(atoms.map((atom) => atom.residualBands), cfg.trimRatio));
    const rawModulationProfile = robustMeanVectors(atoms.map((atom) => atom.modulationProfile), cfg.trimRatio);
    const meanModulationProfile = deSequenceModulation(
      rawModulationProfile,
      frameMetrics.sequenceRecoverability,
      prosodicTrace,
      frameMetrics.cellEntanglement,
    );

    const envelopeVariance = varianceAroundMean(atoms.map((atom) => atom.relativeSpectralEnvelope), meanRelativeSpectralEnvelope);
    const modulationVariance = varianceAroundMean(atoms.map((atom) => atom.modulationProfile), meanModulationProfile);
    const pitchLeakRisk = estimatePitchLeakRisk(
      meanRelativeSpectralEnvelope,
      envelopeVariance,
      frameMetrics.sequenceRecoverability,
      prosodicTrace,
    );

    if (pitchLeakRisk > cfg.maxPitchLeakRisk) continue;
    if (frameMetrics.sequenceRecoverability > cfg.maxSequenceRecoverability) continue;
    if (prosodicTrace > cfg.maxProsodicTrace) continue;

    const stability = estimateStability(envelopeVariance, modulationVariance, atoms.length, frameMetrics.cellEntanglement);
    const quality = estimateQuality(
      atoms,
      stability,
      pitchLeakRisk,
      frameMetrics.sequenceRecoverability,
      prosodicTrace,
      frameMetrics.cellEntanglement,
    );

    const orderedModel = summarizeOrderedCell(
      `atlas-${register}-${phase}-${regime}`,
      register,
      phase,
      regime,
      orderedFramesByKey.get(key) ?? [],
    );
    const resonanceModel = summarizeResonanceCell(
      `atlas-${register}-${phase}-${regime}`,
      register,
      phase,
      regime,
      resonanceFramesByKey.get(key) ?? [],
    );
    const residualModel = summarizeResidualCell(
      `atlas-${register}-${phase}-${regime}`,
      register,
      phase,
      regime,
      residualFramesByKey.get(key) ?? [],
    );
    const transientModel = summarizeTransientCell(
      `atlas-${register}-${phase}-${regime}`,
      register,
      phase,
      regime,
      transientFramesByKey.get(key) ?? [],
    );
    const leakAuditModel = summarizeLeakAuditCell(
      `atlas-${register}-${phase}-${regime}`,
      register,
      phase,
      regime,
      leakAuditFramesByKey.get(key) ?? [],
      frameMetrics.sequenceRecoverability,
      prosodicTrace,
      frameMetrics.cellEntanglement,
    );

    cells.push({
      id: `atlas-${register}-${phase}-${regime}`,
      register,
      phase,
      regime,
      meanRelativeSpectralEnvelope,
      meanResidualBands,
      meanFormantEnvelope,
      meanModulationProfile,
      memberAtomIds: atoms.map((atom) => atom.id),
      memberCount: atoms.length,
      stability,
      pitchLeakRisk,
      sequenceRecoverability: frameMetrics.sequenceRecoverability,
      prosodicTrace,
      cellEntanglement: frameMetrics.cellEntanglement,
      quality,
      orderedModel,
      resonanceModel,
      residualModel,
      transientModel,
      leakAuditModel,
    });
  }

  cells.sort((a, b) => (b.quality * b.stability) - (a.quality * a.stability));

  return {
    cells,
    registerBoundariesHz: tensor.registerBoundariesHz.slice(),
  };
}
