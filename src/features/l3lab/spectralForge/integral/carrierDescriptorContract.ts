// Xensonar 3.2.91.7.5.85
// Carrier Descriptor Contract — type-only measurement boundary.
//
// This file intentionally contains no extractor, no UI copy, no audio behavior,
// and no transfer wiring. It defines the smallest shared vocabulary for future
// shadow probes that measure a Carrier energy field without choosing how any
// musical machine should read or render it.

/**
 * Raw, non-negative Carrier energy input.
 *
 * `energy[columnIndex][rowIndex]`, with row 0 representing the lower frequency
 * edge. Values are not normalized here. A future adapter must validate that all
 * values are finite and non-negative before deriving measures.
 */
export type CarrierEnergyField = {
  readonly energy: readonly (readonly number[])[];
  readonly columnCount: number;
  readonly rowCount: number;
};

/** Separate, diagnostic seam measures. No single authority score is exposed. */
export type CarrierSeamMeasure = {
  /** Absolute centroid difference at the loop seam, or null when either side is empty. */
  readonly centroidDelta: number | null;
  /** Absolute globally-normalized mean energy difference at the loop seam. */
  readonly meanEnergyDelta: number;
  /** Absolute spread difference at the loop seam, or null when either side is empty. */
  readonly spreadDelta: number | null;
  /**
   * Difference between the incoming and outgoing centroid slopes at the seam,
   * or null when the slope cannot be computed from valid neighboring columns.
   */
  readonly centroidSlopeMismatch: number | null;
};

/**
 * Deterministic, globally normalized measurements for one Carrier time column.
 *
 * `centroid` and `spread` are null for empty columns. This is intentional:
 * silence has no center and must not be represented as a false 0.5 midpoint.
 */
export type CarrierColumnMeasure = {
  /** Normalized time position [0, 1]. */
  readonly timeRatio: number;
  /** Energy centroid [0, 1], or null when the column carries no energy. */
  readonly centroid: number | null;
  /** Spread around the centroid [0, 1], or null when the column carries no energy. */
  readonly spread: number | null;
  /** Mean energy [0, 1], normalized against the global maximum of the whole field. */
  readonly meanEnergy: number;
  /** Peak energy [0, 1], normalized against the global maximum of the whole field. */
  readonly peakEnergy: number;
  /** Energy in the lower quarter of rows [0, 1], measured only as a band sum. */
  readonly lowBandEnergy: number;
  /** Energy in the middle half of rows [0, 1], measured only as a band sum. */
  readonly midBandEnergy: number;
  /** Energy in the upper quarter of rows [0, 1], measured only as a band sum. */
  readonly highBandEnergy: number;
};

/** Complete, mandatory Carrier measurement series. */
export type CarrierMeasureSeries = {
  readonly columns: readonly CarrierColumnMeasure[];
  /** Raw maximum before normalization; needed to audit later measurement derivations. */
  readonly globalEnergyMax: number;
  /** Separate seam diagnostics rather than one merged quality score. */
  readonly seamMeasure: CarrierSeamMeasure;
};

/**
 * Optional diagnostic hints for shadow reports.
 *
 * These values are deliberately named as numeric movement/statistics. They are
 * not authority fields and are not sufficient to choose behavior by themselves.
 */
export type CarrierDescriptorHints = {
  /** Normalized accumulated centroid path length across valid neighboring columns. */
  readonly centroidPathLengthNorm: number;
  /** Variance of valid column spreads across the measured series [0, 1]. */
  readonly spreadVariance: number;
  /** Ratio of empty columns to all columns [0, 1]. */
  readonly emptinessRatio: number;
};

/**
 * Versioned Carrier descriptor contract.
 *
 * `measure` is mandatory and non-interpretive. `hints` are optional and intended
 * for future shadow diagnostics only; null is a valid first-stage result.
 */
export type CarrierDescriptor = {
  readonly contractVersion: 1;
  readonly measure: CarrierMeasureSeries;
  readonly hints: CarrierDescriptorHints | null;
};
