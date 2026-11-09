// Xensonar 3.2.91.7.5.87
// Carrier Integral Transfer Debug Boundary — passive report storage + browser reader.
//
// This boundary owns debug/readout side effects for Carrier Integral transfer
// diagnostics. The descriptor probe stays pure/report-building; transfer execution
// only records a report through this module. No renderer, UI, Root-Follow or
// Melodic-Loop behavior may read this boundary as authority.

import {
  CARRIER_DESCRIPTOR_SHADOW_PROBE_VERSION,
  buildCarrierDescriptorShadowReport,
  type CarrierDescriptorShadowReport,
  type CarrierIntegralDescriptorShadowReportArgs,
} from './carrierDescriptorShadowProbe';

declare const __XENSONAR_CORE_TEST_BUILD__: boolean;

const MAX_REPORT_HISTORY = 8;

export type CarrierDescriptorShadowProbeReadout = {
  readonly version: typeof CARRIER_DESCRIPTOR_SHADOW_PROBE_VERSION;
  readonly lastReport: CarrierDescriptorShadowReport | null;
  readonly history: readonly CarrierDescriptorShadowReport[];
};

declare global {
  interface Window {
    __xensonarReadCarrierDescriptorShadowReport?: () => CarrierDescriptorShadowProbeReadout;
  }
}

let lastCarrierDescriptorShadowReport: CarrierDescriptorShadowReport | null = null;
const carrierDescriptorShadowReportHistory: CarrierDescriptorShadowReport[] = [];

function normalizeDimension(value: number, fallback: number): number {
  const rounded = Math.round(Number.isFinite(value) ? value : fallback);
  return Math.max(0, rounded);
}

export function recordCarrierDescriptorShadowReport(
  report: CarrierDescriptorShadowReport,
): CarrierDescriptorShadowReport {
  lastCarrierDescriptorShadowReport = report;
  carrierDescriptorShadowReportHistory.push(report);
  while (carrierDescriptorShadowReportHistory.length > MAX_REPORT_HISTORY) {
    carrierDescriptorShadowReportHistory.shift();
  }
  installCarrierDescriptorShadowReportReader();
  return report;
}

export function recordCarrierIntegralTransferDescriptorShadowReport(
  args: CarrierIntegralDescriptorShadowReportArgs,
): CarrierDescriptorShadowReport | null {
  try {
    const report = recordCarrierDescriptorShadowReport(buildCarrierDescriptorShadowReport(args));
    recordArchivedStrangeAttractorTransferProbe({
      spectralData: args.spectralData,
      projectName: args.projectName,
      sourceCarrierId: `${args.projectName}:${args.machineId}:${args.targetId}`,
    });
    return report;
  } catch (error) {
    return recordCarrierDescriptorShadowReport({
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
        columnCount: normalizeDimension(args.spectralData.width, 0),
        rowCount: normalizeDimension(args.spectralData.height, 0),
      },
      globalEnergyMax: 0,
      seamMeasure: {
        centroidDelta: null,
        meanEnergyDelta: 0,
        spreadDelta: null,
        centroidSlopeMismatch: null,
      },
      hints: null,
      emptyColumnCount: 0,
      nonEmptyColumnCount: 0,
      columnSamples: [],
      guardrails: [
        'shadow-report-only',
        'descriptor-extraction-failed-without-audio-side-effect',
        error instanceof Error ? error.message : String(error),
      ],
    });
  }
}

function recordArchivedStrangeAttractorTransferProbe(args: {
  readonly spectralData: CarrierIntegralDescriptorShadowReportArgs['spectralData'];
  readonly projectName: string;
  readonly sourceCarrierId: string;
}): void {
  if (__XENSONAR_CORE_TEST_BUILD__) return;
  void import('./carrierStrangeAttractorProbe')
    .then(({ recordCarrierStrangeAttractorProbeFromSpectralData }) => {
      recordCarrierStrangeAttractorProbeFromSpectralData(args);
    })
    .catch(() => {
      // Archived probe is diagnostic-only; transfer execution must stay independent.
    });
}

export function readCarrierDescriptorShadowReport(): CarrierDescriptorShadowProbeReadout {
  return {
    version: CARRIER_DESCRIPTOR_SHADOW_PROBE_VERSION,
    lastReport: lastCarrierDescriptorShadowReport,
    history: [...carrierDescriptorShadowReportHistory],
  };
}

function installCarrierDescriptorShadowReportReader(): void {
  if (typeof window === 'undefined') return;
  window.__xensonarReadCarrierDescriptorShadowReport = readCarrierDescriptorShadowReport;
}
