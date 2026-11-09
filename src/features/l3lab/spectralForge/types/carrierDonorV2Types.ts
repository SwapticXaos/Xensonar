export type CarrierAnchorRegime = 'tonal' | 'cluster' | 'noise' | 'transient';

export type CarrierAnchor = {
  id: string;
  timeIndex: number;
  centerBin: number;
  centerHz: number;
  bandwidthBins: number;
  bandwidthHz: number;
  energy: number;
  ridgeness: number;
  continuity: number;
  regime: CarrierAnchorRegime;
  clusterId: string | null;
};

export type CarrierSpectralSkeleton = {
  width: number;
  height: number;
  durationSec: number;
  anchorsByTime: CarrierAnchor[][];
};

export type CarrierAnchorLink = {
  fromAnchorId: string;
  toAnchorId: string;
  continuityScore: number;
  deltaBins: number;
};

export type CarrierAnchorContinuityGraph = {
  links: CarrierAnchorLink[];
};

export type CarrierSpectralSkeletonSummary = {
  anchorCount: number;
  peakPolyphony: number;
  meanAnchorsPerFrame: number;
  meanAnchorEnergy: number;
  strongestAnchorHz: number | null;
  regimeCounts: Record<CarrierAnchorRegime, number>;
};

export type CarrierAnchorContinuitySummary = {
  linkCount: number;
  meanContinuityScore: number;
  meanDeltaBins: number;
  strongestContinuityScore: number;
};

export type DonorAnchorPhase = 'attack' | 'sustain' | 'release';
export type DonorRegisterLabel = 'low' | 'mid' | 'high';

export type DonorAnchor = {
  id: string;
  frameIndex: number;
  centerBin: number;
  centerHz: number;
  bandwidthBins: number;
  bandwidthHz: number;
  energy: number;
  regime: CarrierAnchorRegime;
  phase: DonorAnchorPhase;
  register: DonorRegisterLabel;
};

export type DonorTimbreAtom = {
  id: string;
  anchorId: string;
  frameIndex: number;
  centerHz: number;
  transientValue: number;
  register: DonorRegisterLabel;
  phase: DonorAnchorPhase;
  regime: CarrierAnchorRegime;
  relativeSpectralEnvelope: Float32Array;
  residualBands: Float32Array;
  formantEnvelope: Float32Array;
  modulationProfile: Float32Array;
  quality: number;
};

export type OrderedFrameModel = {
  atomId: string;
  anchorId: string;
  register: DonorRegisterLabel;
  phase: DonorAnchorPhase;
  regime: CarrierAnchorRegime;

  orderedness: number;
  partialBins: Float32Array;
  partialWeights: Float32Array;
  spectralSlope: number;
  oddEvenBalance: number;
  inharmonicSpread: number;
};

export type OrderedCellModel = {
  cellId: string;
  register: DonorRegisterLabel;
  phase: DonorAnchorPhase;
  regime: CarrierAnchorRegime;

  meanOrderedness: number;
  meanPartialWeights: Float32Array;
  meanSpectralSlope: number;
  meanOddEvenBalance: number;
  meanInharmonicSpread: number;
};

export type OrderedModelSummary = {
  frameCount: number;
  cellCount: number;
  meanOrderedness: number;
  strongOrderedRatio: number;
  meanInharmonicSpread: number;
};

export type ResonanceFrameModel = {
  atomId: string;
  anchorId: string;
  register: DonorRegisterLabel;
  phase: DonorAnchorPhase;
  regime: CarrierAnchorRegime;

  resonanceStrength: number;
  bodyCentroid: number;
  resonanceSharpness: number;
  resonanceProfile: Float32Array;
  peakCenters: Float32Array;
  peakWeights: Float32Array;
  peakWidths: Float32Array;
};

export type ResonanceCellModel = {
  cellId: string;
  register: DonorRegisterLabel;
  phase: DonorAnchorPhase;
  regime: CarrierAnchorRegime;

  meanResonanceStrength: number;
  meanBodyCentroid: number;
  meanResonanceSharpness: number;
  meanResonanceProfile: Float32Array;
  meanPeakCenters: Float32Array;
  meanPeakWeights: Float32Array;
  meanPeakWidths: Float32Array;
};

export type ResonanceModelSummary = {
  frameCount: number;
  cellCount: number;
  meanResonanceStrength: number;
  strongResonanceRatio: number;
  meanResonanceSharpness: number;
};

export type ResidualFrameModel = {
  atomId: string;
  anchorId: string;
  register: DonorRegisterLabel;
  phase: DonorAnchorPhase;
  regime: CarrierAnchorRegime;

  residualStrength: number;
  noiseColorCentroid: number;
  residualFlatness: number;
  residualProfile: Float32Array;
};

export type ResidualCellModel = {
  cellId: string;
  register: DonorRegisterLabel;
  phase: DonorAnchorPhase;
  regime: CarrierAnchorRegime;

  meanResidualStrength: number;
  meanNoiseColorCentroid: number;
  meanResidualFlatness: number;
  meanResidualProfile: Float32Array;
};

export type ResidualModelSummary = {
  frameCount: number;
  cellCount: number;
  meanResidualStrength: number;
  strongResidualRatio: number;
  meanResidualFlatness: number;
  meanNoiseColorCentroid: number;
};

export type TransientFrameModel = {
  atomId: string;
  anchorId: string;
  register: DonorRegisterLabel;
  phase: DonorAnchorPhase;
  regime: CarrierAnchorRegime;

  transientStrength: number;
  onsetSharpness: number;
  onsetSpread: number;
  decayTightness: number;
  transientProfile: Float32Array;
};

export type TransientCellModel = {
  cellId: string;
  register: DonorRegisterLabel;
  phase: DonorAnchorPhase;
  regime: CarrierAnchorRegime;

  meanTransientStrength: number;
  meanOnsetSharpness: number;
  meanOnsetSpread: number;
  meanDecayTightness: number;
  meanTransientProfile: Float32Array;
};

export type TransientModelSummary = {
  frameCount: number;
  cellCount: number;
  meanTransientStrength: number;
  strongTransientRatio: number;
  meanOnsetSharpness: number;
  meanOnsetSpread: number;
  meanDecayTightness: number;
};

export type LeakAuditFrameModel = {
  atomId: string;
  anchorId: string;
  register: DonorRegisterLabel;
  phase: DonorAnchorPhase;
  regime: CarrierAnchorRegime;

  pitchLeakRisk: number;
  prosodicLeakRisk: number;
  resonanceLeakRisk: number;
  articulationLeakRisk: number;
  overallLeakRisk: number;
  recommendedSuppression: number;
};

export type LeakAuditCellModel = {
  cellId: string;
  register: DonorRegisterLabel;
  phase: DonorAnchorPhase;
  regime: CarrierAnchorRegime;

  meanPitchLeakRisk: number;
  meanProsodicLeakRisk: number;
  meanResonanceLeakRisk: number;
  meanArticulationLeakRisk: number;
  meanOverallLeakRisk: number;
  meanRecommendedSuppression: number;
};

export type LeakAuditSummary = {
  frameCount: number;
  cellCount: number;
  meanPitchLeakRisk: number;
  meanProsodicLeakRisk: number;
  meanOverallLeakRisk: number;
  highLeakRatio: number;
  meanRecommendedSuppression: number;
};

export type AnchorRelativeTimbreTensor = {
  atoms: DonorTimbreAtom[];
  registerBoundariesHz: number[];
  sourceFrameCount: number;
  orderedFrames?: OrderedFrameModel[];
  orderedSummary?: OrderedModelSummary | null;
  resonanceFrames?: ResonanceFrameModel[];
  resonanceSummary?: ResonanceModelSummary | null;
  residualFrames?: ResidualFrameModel[];
  residualSummary?: ResidualModelSummary | null;
  transientFrames?: TransientFrameModel[];
  transientSummary?: TransientModelSummary | null;
  leakAuditFrames?: LeakAuditFrameModel[];
  leakAuditSummary?: LeakAuditSummary | null;
};

export type DonorTimbreCell = {
  id: string;
  register: DonorRegisterLabel;
  phase: DonorAnchorPhase;
  regime: CarrierAnchorRegime;
  meanRelativeSpectralEnvelope: Float32Array;
  meanResidualBands: Float32Array;
  meanFormantEnvelope: Float32Array;
  meanModulationProfile: Float32Array;
  memberAtomIds: string[];
  memberCount: number;
  stability: number;
  pitchLeakRisk: number;
  sequenceRecoverability: number;
  prosodicTrace: number;
  cellEntanglement: number;
  quality: number;
  orderedModel?: OrderedCellModel | null;
  resonanceModel?: ResonanceCellModel | null;
  residualModel?: ResidualCellModel | null;
  transientModel?: TransientCellModel | null;
  leakAuditModel?: LeakAuditCellModel | null;
};

export type DonorTimbreAtlas = {
  cells: DonorTimbreCell[];
  registerBoundariesHz: number[];
};

export type DonorTimbreAnalysisSummary = {
  anchorCount: number;
  atomCount: number;
  peakPolyphony: number;
  meanQuality: number;
  strongestAnchorHz: number | null;
  meanOrderedness: number;
  strongOrderedRatio: number;
  meanOrderedInharmonicSpread: number;
  meanResonanceStrength: number;
  strongResonanceRatio: number;
  meanResonanceSharpness: number;
  meanResidualStrength: number;
  strongResidualRatio: number;
  meanResidualFlatness: number;
  meanNoiseColorCentroid: number;
  meanTransientStrength: number;
  strongTransientRatio: number;
  meanOnsetSharpness: number;
  meanOnsetSpread: number;
  meanDecayTightness: number;
  meanLeakAuditRisk: number;
  highLeakAuditRatio: number;
  meanRecommendedSuppression: number;
  registerCounts: Record<DonorRegisterLabel, number>;
  phaseCounts: Record<DonorAnchorPhase, number>;
  regimeCounts: Record<CarrierAnchorRegime, number>;
};

export type DonorTimbreAtlasSummary = {
  cellCount: number;
  meanStability: number;
  meanPitchLeakRisk: number;
  meanSequenceRecoverability: number;
  meanProsodicTrace: number;
  meanCellEntanglement: number;
  strongestCellQuality: number;
  meanOrderedness: number;
  strongOrderedRatio: number;
  meanOrderedInharmonicSpread: number;
  meanResonanceStrength: number;
  strongResonanceRatio: number;
  meanResonanceSharpness: number;
  meanResidualStrength: number;
  strongResidualRatio: number;
  meanResidualFlatness: number;
  meanNoiseColorCentroid: number;
  meanTransientStrength: number;
  strongTransientRatio: number;
  meanOnsetSharpness: number;
  meanOnsetSpread: number;
  meanDecayTightness: number;
  meanLeakAuditRisk: number;
  highLeakAuditRatio: number;
  meanRecommendedSuppression: number;
  registerCounts: Record<DonorRegisterLabel, number>;
  phaseCounts: Record<DonorAnchorPhase, number>;
  regimeCounts: Record<CarrierAnchorRegime, number>;
};

export type AnchorBindingPreview = {
  carrierAnchorId: string;
  donorCellIds: string[];
  weights: Float32Array;
  confidence: number;
  dominantRegister: DonorRegisterLabel;
  dominantPhase: DonorAnchorPhase;
  dominantRegime: CarrierAnchorRegime;
};

export type AnchorBindingPreviewSummary = {
  bindingCount: number;
  meanConfidence: number;
  meanCellsPerBinding: number;
  strongestCarrierHz: number | null;
  dominantRegisterCounts: Record<DonorRegisterLabel, number>;
  dominantPhaseCounts: Record<DonorAnchorPhase, number>;
  dominantRegimeCounts: Record<CarrierAnchorRegime, number>;
};
