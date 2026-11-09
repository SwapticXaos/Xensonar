// Xensonar 3.2.91.7.5.99
// Browser-readable preview probe for Strange Attractor · Schwarmkörper.
//
// This probe is intentionally narrower than a full Carrier machine integration:
// it proves Plan -> Host-audible synthetic preview. It does not export to
// Synthetic Forge/Melodic Loop, does not import into Materialschmiede, and does
// not capture iframe game audio.

import { buildStrangeAttractorCarrierFixturePlan } from './carrierStrangeAttractorPlan';
import type { StrangeAttractorCarrierPlan } from './carrierStrangeAttractorTypes';
import {
  createStrangeAttractorPreviewAudioBufferFromStereoSamples,
  renderStrangeAttractorCarrierPlanToStereoSamples,
  type StrangeAttractorPreviewRenderStats,
} from './carrierStrangeAttractorPreviewRenderer';

export const CARRIER_STRANGE_ATTRACTOR_PREVIEW_PROBE_VERSION =
  'carrier-strange-attractor-schwarmkoerper-preview-probe-3.2.91.7.5.99' as const;

const MAX_PREVIEW_HISTORY = 8;

type StrangeAttractorPreviewProbeSource =
  | 'fixture-global-preview'
  | 'carrier-integral-verwalten-panel';

export type CarrierStrangeAttractorPreviewProbeRecord = {
  readonly version: typeof CARRIER_STRANGE_ATTRACTOR_PREVIEW_PROBE_VERSION;
  readonly reportKind: 'xensonar-carrier-strange-attractor-schwarmkoerper-preview-probe';
  readonly generatedAtIso: string;
  readonly source: StrangeAttractorPreviewProbeSource;
  readonly projectName?: string;
  readonly sourceCarrierId?: string;
  readonly planSummary: {
    readonly durationSec: number;
    readonly rootHz: number;
    readonly tuning: StrangeAttractorCarrierPlan['tuning'];
    readonly attractorCount: number;
    readonly swarmEventCount: number;
    readonly driftBias: number;
    readonly orbitBias: number;
    readonly sprayBias: number;
    readonly clusterBias: number;
  };
  readonly renderStats: StrangeAttractorPreviewRenderStats;
  readonly guardrails: readonly string[];
};

export type CarrierStrangeAttractorPreviewProbeReadout = {
  readonly version: typeof CARRIER_STRANGE_ATTRACTOR_PREVIEW_PROBE_VERSION;
  readonly lastPreviewAvailable: boolean;
  readonly reason?: string;
  readonly lastRecord: CarrierStrangeAttractorPreviewProbeRecord | null;
  readonly history: readonly CarrierStrangeAttractorPreviewProbeRecord[];
};

declare global {
  interface Window {
    __xensonarReadCarrierStrangeAttractorPreviewProbe?: () => CarrierStrangeAttractorPreviewProbeReadout;
    __xensonarPreviewCarrierStrangeAttractorFixture?: () => Promise<CarrierStrangeAttractorPreviewProbeRecord>;
  }
}

let lastRecord: CarrierStrangeAttractorPreviewProbeRecord | null = null;
let lastError: string | null = null;
const history: CarrierStrangeAttractorPreviewProbeRecord[] = [];
let fixturePreviewContext: AudioContext | null = null;
let fixturePreviewSource: AudioBufferSourceNode | null = null;

export function recordCarrierStrangeAttractorPreviewProbe(args: {
  readonly plan: StrangeAttractorCarrierPlan;
  readonly renderStats: StrangeAttractorPreviewRenderStats;
  readonly source: StrangeAttractorPreviewProbeSource;
  readonly projectName?: string;
  readonly sourceCarrierId?: string;
}): CarrierStrangeAttractorPreviewProbeRecord {
  const record: CarrierStrangeAttractorPreviewProbeRecord = {
    version: CARRIER_STRANGE_ATTRACTOR_PREVIEW_PROBE_VERSION,
    reportKind: 'xensonar-carrier-strange-attractor-schwarmkoerper-preview-probe',
    generatedAtIso: new Date().toISOString(),
    source: args.source,
    projectName: args.projectName,
    sourceCarrierId: args.sourceCarrierId ?? args.plan.sourceCarrierId,
    planSummary: {
      durationSec: roundProbe(args.plan.durationSec),
      rootHz: roundProbe(args.plan.rootHz),
      tuning: args.plan.tuning,
      attractorCount: args.plan.summary.attractorCount,
      swarmEventCount: args.plan.summary.swarmEventCount,
      driftBias: roundProbe(args.plan.summary.driftBias),
      orbitBias: roundProbe(args.plan.summary.orbitBias),
      sprayBias: roundProbe(args.plan.summary.sprayBias),
      clusterBias: roundProbe(args.plan.summary.clusterBias),
    },
    renderStats: args.renderStats,
    guardrails: [
      'preview-only',
      'host-audio-buffer-render',
      'no-materialschmiede-import',
      'no-synthetic-forge-or-melodic-loop-export',
      'no-iframe-capture-bridge',
      'carrier-menu-machine-registered',
    ],
  };
  lastError = null;
  lastRecord = record;
  history.push(record);
  while (history.length > MAX_PREVIEW_HISTORY) history.shift();
  installCarrierStrangeAttractorPreviewProbeReaders();
  return record;
}

export function readCarrierStrangeAttractorPreviewProbe(): CarrierStrangeAttractorPreviewProbeReadout {
  installCarrierStrangeAttractorPreviewProbeReaders();
  return {
    version: CARRIER_STRANGE_ATTRACTOR_PREVIEW_PROBE_VERSION,
    lastPreviewAvailable: lastRecord !== null,
    reason: lastRecord === null ? lastError ?? 'no-carrier-strange-attractor-preview-rendered-yet' : undefined,
    lastRecord,
    history: [...history],
  };
}

export async function previewCarrierStrangeAttractorFixture(): Promise<CarrierStrangeAttractorPreviewProbeRecord> {
  if (typeof window === 'undefined') throw new Error('browser-window-required');
  const AudioCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) throw new Error('audio-context-unavailable');
  try {
    const plan = buildStrangeAttractorCarrierFixturePlan({ maxSwarmEvents: 180 });
    const rendered = renderStrangeAttractorCarrierPlanToStereoSamples(plan, {
      previewGain: 0.68,
      maxPreviewSec: 8,
    });
    const buffer = createStrangeAttractorPreviewAudioBufferFromStereoSamples(rendered);
    if (!fixturePreviewContext) fixturePreviewContext = new AudioCtor({ sampleRate: rendered.sampleRate });
    if (fixturePreviewContext.state === 'suspended') await fixturePreviewContext.resume();
    fixturePreviewSource?.stop();
    const source = fixturePreviewContext.createBufferSource();
    const gain = fixturePreviewContext.createGain();
    gain.gain.value = 0.82;
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(fixturePreviewContext.destination);
    source.start();
    fixturePreviewSource = source;
    const record = recordCarrierStrangeAttractorPreviewProbe({
      plan,
      renderStats: rendered.stats,
      source: 'fixture-global-preview',
      projectName: 'fixture',
      sourceCarrierId: 'fixture-strange-attractor-schwarmkoerper',
    });
    source.onended = () => {
      if (fixturePreviewSource === source) fixturePreviewSource = null;
      gain.disconnect();
    };
    return record;
  } catch (error) {
    lastError = error instanceof Error ? error.message : String(error);
    installCarrierStrangeAttractorPreviewProbeReaders();
    throw error;
  }
}

function installCarrierStrangeAttractorPreviewProbeReaders(): void {
  if (typeof window === 'undefined') return;
  window.__xensonarReadCarrierStrangeAttractorPreviewProbe = readCarrierStrangeAttractorPreviewProbe;
  window.__xensonarPreviewCarrierStrangeAttractorFixture = previewCarrierStrangeAttractorFixture;
}

function roundProbe(value: number): number {
  return Math.round(value * 10000) / 10000;
}

installCarrierStrangeAttractorPreviewProbeReaders();
