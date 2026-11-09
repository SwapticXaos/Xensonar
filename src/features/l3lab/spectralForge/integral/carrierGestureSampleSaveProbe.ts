// Xensonar 3.2.91.7.5.101
// Browser-readable proof for Carrier gesture sample rendering/saving.
// This probe distinguishes the actual render machine from the old raw/Pure-Dieter fallback.

import type { CarrierIntegralMachineId } from './carrierIntegralContracts';

export type CarrierGestureSampleSaveProbeReport = {
  readonly version: 1;
  readonly reportKind: 'xensonar-carrier-gesture-sample-save-probe';
  readonly generatedAtIso: string;
  readonly source: 'carrier-integral-verwalten-panel';
  readonly projectId: string;
  readonly projectName: string;
  readonly sampleId: string;
  readonly sampleName: string;
  readonly sampleDurationSec: number;
  readonly sampleSizeBytes: number;
  readonly renderMachineId: CarrierIntegralMachineId | 'spectral-raw-fallback';
  readonly renderMachineLabel: string;
  readonly renderPath: 'strange-attractor-schwarmkoerper' | 'spectral-raw-fallback';
  readonly dbVerified: boolean;
  readonly libraryEntryCount: number;
};

declare global {
  interface Window {
    __xensonarCarrierGestureSampleSaveProbeReport?: CarrierGestureSampleSaveProbeReport | null;
    __xensonarReadCarrierGestureSampleSaveProbe?: () => CarrierGestureSampleSaveProbeReport | null;
  }
}

export function recordCarrierGestureSampleSaveProbe(
  report: Omit<CarrierGestureSampleSaveProbeReport, 'version' | 'reportKind' | 'generatedAtIso'>,
): CarrierGestureSampleSaveProbeReport {
  const next: CarrierGestureSampleSaveProbeReport = {
    version: 1,
    reportKind: 'xensonar-carrier-gesture-sample-save-probe',
    generatedAtIso: new Date().toISOString(),
    ...report,
  };
  if (typeof window !== 'undefined') {
    window.__xensonarCarrierGestureSampleSaveProbeReport = next;
    window.__xensonarReadCarrierGestureSampleSaveProbe = () => window.__xensonarCarrierGestureSampleSaveProbeReport ?? null;
  }
  return next;
}

export function installCarrierGestureSampleSaveProbeReader(): void {
  if (typeof window === 'undefined') return;
  if (!window.__xensonarReadCarrierGestureSampleSaveProbe) {
    window.__xensonarReadCarrierGestureSampleSaveProbe = () => window.__xensonarCarrierGestureSampleSaveProbeReport ?? null;
  }
}
