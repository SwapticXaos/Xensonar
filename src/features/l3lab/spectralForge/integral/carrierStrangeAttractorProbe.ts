// Xensonar 3.2.91.7.5.98
// Browser-readable passive probe for Strange Attractor · Schwarmkörper.
//
// This boundary stores/readouts plan diagnostics only. It must not be used as a
// renderer authority and intentionally does not touch AudioContext, Materialschmiede,
// Synthetic Forge, Melodic Loop, or game iframe capture.

import type { SpectralData } from '../audio/SpectralData';
import {
  buildStrangeAttractorCarrierFixturePlan,
  buildStrangeAttractorCarrierPlanFromSpectralData,
} from './carrierStrangeAttractorPlan';
import type { StrangeAttractorCarrierPlan } from './carrierStrangeAttractorTypes';

export const CARRIER_STRANGE_ATTRACTOR_PROBE_VERSION =
  'carrier-strange-attractor-schwarmkoerper-probe-3.2.91.7.5.98' as const;

const MAX_PLAN_HISTORY = 6;

type StrangeAttractorProbeSource =
  | 'carrier-integral-transfer-execution-context'
  | 'fixture';

export type CarrierStrangeAttractorProbeSummary = {
  readonly machineId: StrangeAttractorCarrierPlan['machineId'];
  readonly durationSec: number;
  readonly rootHz: number;
  readonly tuning: StrangeAttractorCarrierPlan['tuning'];
  readonly attractorCount: number;
  readonly swarmEventCount: number;
  readonly meanDensity: number;
  readonly energyMean: number;
  readonly energyPeak: number;
  readonly driftBias: number;
  readonly orbitBias: number;
  readonly sprayBias: number;
  readonly clusterBias: number;
  readonly seed: number;
  readonly sourceWindowCount: number;
  readonly rejectedEventCount: number;
};

export type CarrierStrangeAttractorProbeRecord = {
  readonly version: typeof CARRIER_STRANGE_ATTRACTOR_PROBE_VERSION;
  readonly reportKind: 'xensonar-carrier-strange-attractor-schwarmkoerper-probe';
  readonly generatedAtIso: string;
  readonly source: StrangeAttractorProbeSource;
  readonly projectName?: string;
  readonly sourceCarrierId?: string;
  readonly summary: CarrierStrangeAttractorProbeSummary;
  readonly guardrails: readonly string[];
};

export type CarrierStrangeAttractorProbeReadout = {
  readonly version: typeof CARRIER_STRANGE_ATTRACTOR_PROBE_VERSION;
  readonly lastPlanAvailable: boolean;
  readonly reason?: string;
  readonly lastRecord: CarrierStrangeAttractorProbeRecord | null;
  readonly history: readonly CarrierStrangeAttractorProbeRecord[];
};

declare global {
  interface Window {
    __xensonarReadCarrierStrangeAttractorProbe?: () => CarrierStrangeAttractorProbeReadout;
    __xensonarBuildCarrierStrangeAttractorFixturePlan?: () => CarrierStrangeAttractorProbeRecord;
  }
}

let lastRecord: CarrierStrangeAttractorProbeRecord | null = null;
const history: CarrierStrangeAttractorProbeRecord[] = [];
let lastError: string | null = null;

export function recordCarrierStrangeAttractorProbeFromSpectralData(args: {
  readonly spectralData: SpectralData;
  readonly projectName?: string;
  readonly sourceCarrierId?: string;
  readonly durationSec?: number;
  readonly rootHz?: number;
}): CarrierStrangeAttractorProbeRecord | null {
  try {
    const plan = buildStrangeAttractorCarrierPlanFromSpectralData(args.spectralData, {
      sourceCarrierId: args.sourceCarrierId ?? args.projectName,
      durationSec: args.durationSec,
      rootHz: args.rootHz,
      seed: `${args.projectName ?? 'carrier'}:${args.spectralData.width}x${args.spectralData.height}`,
      tuning: 'free',
    });
    return recordCarrierStrangeAttractorProbe({
      plan,
      source: 'carrier-integral-transfer-execution-context',
      projectName: args.projectName,
      sourceCarrierId: args.sourceCarrierId,
    });
  } catch (error) {
    lastError = error instanceof Error ? error.message : String(error);
    installCarrierStrangeAttractorProbeReaders();
    return null;
  }
}

export function recordCarrierStrangeAttractorFixtureProbe(): CarrierStrangeAttractorProbeRecord {
  const plan = buildStrangeAttractorCarrierFixturePlan();
  return recordCarrierStrangeAttractorProbe({
    plan,
    source: 'fixture',
    projectName: 'fixture',
    sourceCarrierId: 'fixture-strange-attractor-schwarmkoerper',
  });
}

export function readCarrierStrangeAttractorProbe(): CarrierStrangeAttractorProbeReadout {
  installCarrierStrangeAttractorProbeReaders();
  return {
    version: CARRIER_STRANGE_ATTRACTOR_PROBE_VERSION,
    lastPlanAvailable: lastRecord !== null,
    reason: lastRecord === null ? lastError ?? 'no-carrier-strange-attractor-plan-recorded-yet' : undefined,
    lastRecord,
    history: [...history],
  };
}

function recordCarrierStrangeAttractorProbe(args: {
  readonly plan: StrangeAttractorCarrierPlan;
  readonly source: StrangeAttractorProbeSource;
  readonly projectName?: string;
  readonly sourceCarrierId?: string;
}): CarrierStrangeAttractorProbeRecord {
  const record: CarrierStrangeAttractorProbeRecord = {
    version: CARRIER_STRANGE_ATTRACTOR_PROBE_VERSION,
    reportKind: 'xensonar-carrier-strange-attractor-schwarmkoerper-probe',
    generatedAtIso: new Date().toISOString(),
    source: args.source,
    projectName: args.projectName,
    sourceCarrierId: args.sourceCarrierId ?? args.plan.sourceCarrierId,
    summary: summarizePlan(args.plan),
    guardrails: [
      'probe-only',
      'no-audio-renderer',
      'no-iframe-capture-bridge',
      'no-materialschmiede-import',
      'no-synthetic-forge-or-melodic-loop-export',
      'deterministic-plan-seed',
    ],
  };
  lastError = null;
  lastRecord = record;
  history.push(record);
  while (history.length > MAX_PLAN_HISTORY) history.shift();
  installCarrierStrangeAttractorProbeReaders();
  return record;
}

function summarizePlan(plan: StrangeAttractorCarrierPlan): CarrierStrangeAttractorProbeSummary {
  return {
    machineId: plan.machineId,
    durationSec: plan.durationSec,
    rootHz: plan.rootHz,
    tuning: plan.tuning,
    attractorCount: plan.summary.attractorCount,
    swarmEventCount: plan.summary.swarmEventCount,
    meanDensity: roundProbe(plan.summary.meanDensity),
    energyMean: roundProbe(plan.summary.energyMean),
    energyPeak: roundProbe(plan.summary.energyPeak),
    driftBias: roundProbe(plan.summary.driftBias),
    orbitBias: roundProbe(plan.summary.orbitBias),
    sprayBias: roundProbe(plan.summary.sprayBias),
    clusterBias: roundProbe(plan.summary.clusterBias),
    seed: plan.debug.seed,
    sourceWindowCount: plan.debug.sourceWindowCount,
    rejectedEventCount: plan.debug.rejectedEventCount,
  };
}

function installCarrierStrangeAttractorProbeReaders(): void {
  if (typeof window === 'undefined') return;
  window.__xensonarReadCarrierStrangeAttractorProbe = readCarrierStrangeAttractorProbe;
  window.__xensonarBuildCarrierStrangeAttractorFixturePlan = recordCarrierStrangeAttractorFixtureProbe;
}

function roundProbe(value: number): number {
  return Math.round(value * 10000) / 10000;
}

installCarrierStrangeAttractorProbeReaders();
