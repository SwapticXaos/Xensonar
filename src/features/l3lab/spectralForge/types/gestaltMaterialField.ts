export type GestaltRegime = 'tonal' | 'cluster' | 'noise' | 'transient';

export type MaterialCellKind =
  | 'ordered'
  | 'resonant'
  | 'residual'
  | 'transient'
  | 'mixed';

export type MaterialRegister = 'low' | 'mid' | 'high';

export type GestaltAnchor = {
  id: string;
  timeIndex: number;
  centerBin: number;
  centerHz: number;
  energy: number;
  bandwidthBins: number;
  regime: GestaltRegime;
  clusterId: string | null;
};

export type GestaltSlot = {
  timeIndex: number;
  anchors: GestaltAnchor[];
  density: number;
  totalEnergy: number;
  continuityStrength: number;
};

export type GestaltField = {
  width: number;
  height: number;
  durationSec: number;
  slots: GestaltSlot[];
};

export type MaterialCell = {
  id: string;
  register: MaterialRegister;
  regime: GestaltRegime;
  kind: MaterialCellKind;

  relativeEnvelope: Float32Array;
  residualProfile: Float32Array;
  resonanceProfile: Float32Array;
  transientProfile: Float32Array;

  sequenceRecoverability: number;
  prosodicTrace: number;
  cellEntanglement: number;
  orderedStrength?: number;
  orderedInharmonicSpread?: number;
  orderedPartialWeights?: Float32Array;
  orderedSpectralSlope?: number;
  orderedOddEvenBalance?: number;
  resonanceStrength?: number;
  resonanceSharpness?: number;
  resonancePeakCenters?: Float32Array;
  resonancePeakWeights?: Float32Array;
  resonancePeakWidths?: Float32Array;
  resonanceBodyCentroid?: number;
  residualStrength?: number;
  residualFlatness?: number;
  noiseColorCentroid?: number;
  transientStrength?: number;
  onsetSharpness?: number;
  onsetSpread?: number;
  decayTightness?: number;
  overallLeakRisk?: number;
  recommendedSuppression?: number;
};

export type MaterialField = {
  cells: MaterialCell[];
};

export type MaterialAllocation = {
  timeIndex: number;
  anchorIds: string[];
  cellIds: string[];
  weights: Float32Array;
  confidence: number;
  leakRisk: number;
};

export type MaterialAllocationPreview = {
  allocations: MaterialAllocation[];
};

export type GestaltFieldSummary = {
  slotCount: number;
  peakPolyphony: number;
  meanAnchorsPerSlot: number;
  meanDensity: number;
  sparseSlotRatio: number;
  denseSlotRatio: number;
};

export type MaterialFieldSummary = {
  cellCount: number;
  kindCounts: Record<MaterialCellKind, number>;
  meanSequenceRecoverability: number;
  meanProsodicTrace: number;
  meanCellEntanglement: number;
  meanOrderedStrength: number;
  strongOrderedRatio: number;
  meanResonanceStrength: number;
  strongResonantRatio: number;
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
  meanOverallLeakRisk: number;
  highLeakRatio: number;
  meanRecommendedSuppression: number;
};

export type MaterialAllocationSummary = {
  allocationCount: number;
  meanConfidence: number;
  meanLeakRisk: number;
  meanCellsPerAllocation: number;
};
