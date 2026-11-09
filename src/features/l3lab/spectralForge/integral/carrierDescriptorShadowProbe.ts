// Xensonar 3.2.91.7.5.86
// Carrier Descriptor Shadow Probe — real Carrier input adapter + passive report.
//
// This module measures SpectralForge Carrier energy into the type-only
// CarrierDescriptor contract. It does not choose renderers, does not change any
// audio path, and does not write UI-facing labels. The report is diagnostic only.

import type { SpectralData } from '../audio/SpectralData';
import type { CarrierIntegralMachineId } from './carrierIntegralContracts';
import type { CarrierIntegralTransferExecutorTargetId } from './carrierLoopBodyTransferExecutionPlan';
import type {
  CarrierColumnMeasure,
  CarrierDescriptor,
  CarrierDescriptorHints,
  CarrierEnergyField,
  CarrierMeasureSeries,
  CarrierSeamMeasure,
} from './carrierDescriptorContract';

export const CARRIER_DESCRIPTOR_SHADOW_PROBE_VERSION =
  'carrier-descriptor-shadow-probe-3.2.91.7.5.86' as const;

const CONTRACT_VERSION = 1 as const;
const EPSILON = 1e-9;
export type CarrierDescriptorShadowProbeSource =
  | 'carrier-integral-transfer-execution-context';

export type CarrierDescriptorShadowReportColumnSample = Pick<
  CarrierColumnMeasure,
  | 'timeRatio'
  | 'centroid'
  | 'spread'
  | 'meanEnergy'
  | 'peakEnergy'
  | 'lowBandEnergy'
  | 'midBandEnergy'
  | 'highBandEnergy'
> & {
  readonly index: number;
};

export type CarrierDescriptorShadowReport = {
  readonly version: typeof CARRIER_DESCRIPTOR_SHADOW_PROBE_VERSION;
  readonly reportKind: 'xensonar-carrier-descriptor-shadow-report';
  readonly generatedAtIso: string;
  readonly source: CarrierDescriptorShadowProbeSource;
  readonly projectName: string;
  readonly machineId: CarrierIntegralMachineId;
  readonly targetId: CarrierIntegralTransferExecutorTargetId;
  readonly targetLabel: string;
  readonly renderSource: string;
  readonly melodicHandoffKind: string;
  readonly dimensions: {
    readonly columnCount: number;
    readonly rowCount: number;
  };
  readonly globalEnergyMax: number;
  readonly seamMeasure: CarrierSeamMeasure;
  readonly hints: CarrierDescriptorHints | null;
  readonly emptyColumnCount: number;
  readonly nonEmptyColumnCount: number;
  /** Sampled measure columns only; the full column series stays internal. */
  readonly columnSamples: readonly CarrierDescriptorShadowReportColumnSample[];
  readonly guardrails: readonly string[];
};

export type CarrierDescriptorExtractionOptions = {
  readonly includeHints?: boolean;
};

export type CarrierIntegralDescriptorShadowReportArgs = {
  readonly spectralData: SpectralData;
  readonly projectName: string;
  readonly machineId: CarrierIntegralMachineId;
  readonly targetId: CarrierIntegralTransferExecutorTargetId;
  readonly targetLabel: string;
  readonly renderSource: string;
  readonly melodicHandoffKind: string;
  readonly source?: CarrierDescriptorShadowProbeSource;
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function normalizeDimension(value: number, fallback: number): number {
  const rounded = Math.round(Number.isFinite(value) ? value : fallback);
  return Math.max(0, rounded);
}

function validateCarrierEnergyField(field: CarrierEnergyField): void {
  const columnCount = normalizeDimension(field.columnCount, field.energy.length);
  const rowCount = normalizeDimension(field.rowCount, field.energy[0]?.length ?? 0);
  if (columnCount !== field.energy.length) {
    throw new Error(
      `CarrierEnergyField columnCount mismatch: expected ${columnCount}, got ${field.energy.length}`,
    );
  }
  for (let colIndex = 0; colIndex < field.energy.length; colIndex += 1) {
    const column = field.energy[colIndex];
    if (column.length !== rowCount) {
      throw new Error(
        `CarrierEnergyField rowCount mismatch at column ${colIndex}: expected ${rowCount}, got ${column.length}`,
      );
    }
    for (let rowIndex = 0; rowIndex < column.length; rowIndex += 1) {
      const value = column[rowIndex];
      if (!Number.isFinite(value) || value < 0) {
        throw new Error(
          `CarrierEnergyField invalid energy at ${colIndex}/${rowIndex}: ${value}`,
        );
      }
    }
  }
}

export function buildCarrierEnergyFieldFromSpectralData(
  spectralData: SpectralData,
): CarrierEnergyField {
  const columnCount = normalizeDimension(spectralData.width, 0);
  const rowCount = normalizeDimension(spectralData.height, 0);
  const energy: number[][] = [];

  for (let colIndex = 0; colIndex < columnCount; colIndex += 1) {
    const column: number[] = [];
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const value = spectralData.get(colIndex, rowIndex);
      if (!Number.isFinite(value) || value < 0) {
        throw new Error(
          `SpectralData invalid carrier energy at ${colIndex}/${rowIndex}: ${value}`,
        );
      }
      column.push(value);
    }
    energy.push(column);
  }

  return { energy, columnCount, rowCount };
}

export function extractCarrierDescriptorFromSpectralData(
  spectralData: SpectralData,
  options: CarrierDescriptorExtractionOptions = {},
): CarrierDescriptor {
  return extractCarrierDescriptorFromEnergyField(
    buildCarrierEnergyFieldFromSpectralData(spectralData),
    options,
  );
}

export function extractCarrierDescriptorFromEnergyField(
  field: CarrierEnergyField,
  options: CarrierDescriptorExtractionOptions = {},
): CarrierDescriptor {
  validateCarrierEnergyField(field);
  const { energy, columnCount, rowCount } = field;
  const globalEnergyMax = computeGlobalEnergyMax(energy);
  const columns = energy.map((column, index) =>
    measureCarrierColumn({
      column,
      columnIndex: index,
      columnCount,
      rowCount,
      globalEnergyMax,
    }),
  );
  const measure: CarrierMeasureSeries = {
    columns,
    globalEnergyMax,
    seamMeasure: computeCarrierSeamMeasure(columns),
  };

  return {
    contractVersion: CONTRACT_VERSION,
    measure,
    hints: options.includeHints === false ? null : computeCarrierDescriptorHints(columns),
  };
}

function computeGlobalEnergyMax(energy: readonly (readonly number[])[]): number {
  let max = 0;
  for (const column of energy) {
    for (const value of column) {
      if (value > max) max = value;
    }
  }
  return max;
}

function measureCarrierColumn(args: {
  readonly column: readonly number[];
  readonly columnIndex: number;
  readonly columnCount: number;
  readonly rowCount: number;
  readonly globalEnergyMax: number;
}): CarrierColumnMeasure {
  const { column, columnCount, columnIndex, globalEnergyMax, rowCount } = args;
  const timeRatio = columnCount <= 1 ? 0 : clamp01(columnIndex / Math.max(1, columnCount - 1));
  if (rowCount <= 0 || globalEnergyMax <= EPSILON) {
    return {
      timeRatio,
      centroid: null,
      spread: null,
      meanEnergy: 0,
      peakEnergy: 0,
      lowBandEnergy: 0,
      midBandEnergy: 0,
      highBandEnergy: 0,
    };
  }

  let rawSum = 0;
  let rawPeak = 0;
  let weightedRowSum = 0;
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const value = column[rowIndex] ?? 0;
    rawSum += value;
    weightedRowSum += value * rowIndex;
    if (value > rawPeak) rawPeak = value;
  }

  const meanEnergy = clamp01(rawSum / Math.max(1, rowCount) / globalEnergyMax);
  const peakEnergy = clamp01(rawPeak / globalEnergyMax);
  const centroid = rawSum > EPSILON
    ? clamp01(weightedRowSum / rawSum / Math.max(1, rowCount - 1))
    : null;

  let spread: number | null = null;
  if (centroid !== null) {
    const centroidRow = centroid * Math.max(1, rowCount - 1);
    let variance = 0;
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const value = column[rowIndex] ?? 0;
      const rowRatio = rowCount <= 1 ? 0 : rowIndex / Math.max(1, rowCount - 1);
      const centroidRatio = rowCount <= 1 ? 0 : centroidRow / Math.max(1, rowCount - 1);
      const diff = rowRatio - centroidRatio;
      variance += value * diff * diff;
    }
    // Weighted standard deviation in ratio space has a practical maximum of 0.5.
    spread = clamp01(Math.sqrt(variance / Math.max(EPSILON, rawSum)) / 0.5);
  }

  return {
    timeRatio,
    centroid,
    spread,
    meanEnergy,
    peakEnergy,
    lowBandEnergy: computeBandMeanEnergy(column, 0, 0.25, globalEnergyMax),
    midBandEnergy: computeBandMeanEnergy(column, 0.25, 0.75, globalEnergyMax),
    highBandEnergy: computeBandMeanEnergy(column, 0.75, 1, globalEnergyMax),
  };
}

function computeBandMeanEnergy(
  column: readonly number[],
  fromRatio: number,
  toRatio: number,
  globalEnergyMax: number,
): number {
  if (column.length === 0 || globalEnergyMax <= EPSILON) return 0;
  const start = Math.max(0, Math.min(column.length, Math.floor(column.length * fromRatio)));
  const end = Math.max(start + 1, Math.min(column.length, Math.ceil(column.length * toRatio)));
  let sum = 0;
  for (let rowIndex = start; rowIndex < end; rowIndex += 1) {
    sum += column[rowIndex] ?? 0;
  }
  return clamp01(sum / Math.max(1, end - start) / globalEnergyMax);
}

function absNullableDelta(a: number | null, b: number | null): number | null {
  if (a === null || b === null) return null;
  return clamp01(Math.abs(a - b));
}

function computeCarrierSeamMeasure(
  columns: readonly CarrierColumnMeasure[],
): CarrierSeamMeasure {
  if (columns.length === 0) {
    return {
      centroidDelta: null,
      meanEnergyDelta: 0,
      spreadDelta: null,
      centroidSlopeMismatch: null,
    };
  }
  const first = columns[0];
  const last = columns[columns.length - 1];
  const startSlope = computeCentroidSlope(columns[0], columns[1]);
  const endSlope = computeCentroidSlope(columns[columns.length - 2], columns[columns.length - 1]);
  return {
    centroidDelta: absNullableDelta(first.centroid, last.centroid),
    meanEnergyDelta: clamp01(Math.abs(first.meanEnergy - last.meanEnergy)),
    spreadDelta: absNullableDelta(first.spread, last.spread),
    centroidSlopeMismatch: startSlope === null || endSlope === null
      ? null
      : clamp01(Math.abs(startSlope - endSlope)),
  };
}

function computeCentroidSlope(
  previous: CarrierColumnMeasure | undefined,
  next: CarrierColumnMeasure | undefined,
): number | null {
  if (!previous || !next) return null;
  if (previous.centroid === null || next.centroid === null) return null;
  return next.centroid - previous.centroid;
}

function computeCarrierDescriptorHints(
  columns: readonly CarrierColumnMeasure[],
): CarrierDescriptorHints {
  if (columns.length === 0) {
    return {
      centroidPathLengthNorm: 0,
      spreadVariance: 0,
      emptinessRatio: 0,
    };
  }

  let emptyCount = 0;
  let centroidPathLength = 0;
  let validCentroidPairCount = 0;
  let spreadSum = 0;
  let spreadCount = 0;
  for (let index = 0; index < columns.length; index += 1) {
    const column = columns[index];
    if (column.centroid === null) emptyCount += 1;
    if (column.spread !== null) {
      spreadSum += column.spread;
      spreadCount += 1;
    }
    if (index > 0) {
      const previous = columns[index - 1];
      if (previous.centroid !== null && column.centroid !== null) {
        centroidPathLength += Math.abs(column.centroid - previous.centroid);
        validCentroidPairCount += 1;
      }
    }
  }

  const meanSpread = spreadCount > 0 ? spreadSum / spreadCount : 0;
  let spreadVariance = 0;
  if (spreadCount > 0) {
    for (const column of columns) {
      if (column.spread !== null) {
        const diff = column.spread - meanSpread;
        spreadVariance += diff * diff;
      }
    }
    spreadVariance /= spreadCount;
  }

  return {
    centroidPathLengthNorm: clamp01(
      centroidPathLength / Math.max(1, validCentroidPairCount),
    ),
    // Spread is in [0,1], therefore variance is also bounded; keep it clamped.
    spreadVariance: clamp01(spreadVariance),
    emptinessRatio: clamp01(emptyCount / Math.max(1, columns.length)),
  };
}

function sampleDescriptorColumns(
  columns: readonly CarrierColumnMeasure[],
): readonly CarrierDescriptorShadowReportColumnSample[] {
  if (columns.length === 0) return [];
  const indices = new Set<number>([
    0,
    Math.floor((columns.length - 1) / 2),
    columns.length - 1,
  ]);
  return [...indices]
    .sort((a, b) => a - b)
    .map((index) => ({ index, ...columns[index] }));
}

export function buildCarrierDescriptorShadowReport(
  args: CarrierIntegralDescriptorShadowReportArgs,
): CarrierDescriptorShadowReport {
  const descriptor = extractCarrierDescriptorFromSpectralData(args.spectralData, {
    includeHints: true,
  });
  const emptyColumnCount = descriptor.measure.columns.filter(
    (column) => column.centroid === null,
  ).length;

  return {
    version: CARRIER_DESCRIPTOR_SHADOW_PROBE_VERSION,
    reportKind: 'xensonar-carrier-descriptor-shadow-report',
    generatedAtIso: new Date().toISOString(),
    source: args.source ?? 'carrier-integral-transfer-execution-context',
    projectName: args.projectName,
    machineId: args.machineId,
    targetId: args.targetId,
    targetLabel: args.targetLabel,
    renderSource: args.renderSource,
    melodicHandoffKind: args.melodicHandoffKind,
    dimensions: {
      columnCount: descriptor.measure.columns.length,
      rowCount: args.spectralData.height,
    },
    globalEnergyMax: descriptor.measure.globalEnergyMax,
    seamMeasure: descriptor.measure.seamMeasure,
    hints: descriptor.hints,
    emptyColumnCount,
    nonEmptyColumnCount: descriptor.measure.columns.length - emptyColumnCount,
    columnSamples: sampleDescriptorColumns(descriptor.measure.columns),
    guardrails: [
      'shadow-report-only',
      'descriptor-does-not-select-renderer',
      'descriptor-does-not-change-root-follow',
      'descriptor-does-not-change-melodic-loop',
      'descriptor-does-not-change-pinkspur-granular-contract',
    ],
  };
}
