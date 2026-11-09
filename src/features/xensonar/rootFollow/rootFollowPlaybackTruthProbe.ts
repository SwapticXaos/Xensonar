// Xensonar 3.2.91.7.5.107
// Low-overhead Root-Follow playback truth probe.
// Records only lifecycle / gate / first-window edges, not continuous grain traffic.

import type { MaterialEntry } from '../../l3lab/materialLibrary';
import type { RootFollowBankEntryConfig } from './rootFollowTypes';

export type RootFollowPlaybackStopReason =
  | 'no-audio-context'
  | 'nexus-inactive'
  | 'root-follow-inactive'
  | 'playback-gate-closed'
  | 'missing-selected-entry'
  | 'impulse-raster-all-muted'
  | 'scheduler-error'
  | 'cleanup-token-replaced'
  | 'manual-stop'
  | 'unknown';

export type RootFollowPlaybackTruthStage =
  | 'playfield-gate-change'
  | 'preview-gate-change'
  | 'gate-open'
  | 'gate-close'
  | 'scheduler-first-tick'
  | 'first-render-window'
  | 'entry-auto-repair'
  | 'impulse-raster-all-muted'
  | 'scheduler-error'
  | 'cleanup';

export type RootFollowPlaybackTruthEvent = {
  readonly stage: RootFollowPlaybackTruthStage;
  readonly perfNowMs: number;
  readonly generatedAtIso: string;
  readonly audioNowSec: number | null;
  readonly token: number | null;
  readonly loopId: string | null;
  readonly loopName: string | null;
  readonly sourceKind: string | null;
  readonly renderMode: string | null;
  readonly rootFollowLoopActive: boolean | null;
  readonly rootFollowPreviewActive: boolean | null;
  readonly rootFollowPlayfieldInside: boolean | null;
  readonly effectivePlaybackGate: boolean | null;
  readonly selectedEntryExists: boolean | null;
  readonly timerActive: boolean | null;
  readonly gainConnected: boolean | null;
  readonly activeNodes: number | null;
  readonly activeSynthVoices: number | null;
  readonly cacheSize: number | null;
  readonly stopReason: RootFollowPlaybackStopReason | null;
  readonly coldStartLeadMs: number | null;
  readonly coldStartRisk: boolean;
  readonly detail?: Record<string, unknown>;
};

export type RootFollowPlaybackTruthProbeReport = {
  readonly version: 1;
  readonly reportKind: 'xensonar-root-follow-playback-truth-probe';
  readonly generatedAtIso: string;
  readonly latest: RootFollowPlaybackTruthEvent | null;
  readonly recent: readonly RootFollowPlaybackTruthEvent[];
  readonly eventCount: number;
  readonly latestGateOpen: RootFollowPlaybackTruthEvent | null;
  readonly latestGateClose: RootFollowPlaybackTruthEvent | null;
  readonly latestStopReason: RootFollowPlaybackStopReason | null;
  readonly latestColdStartRisk: boolean;
  readonly note: string;
};

declare global {
  interface Window {
    __xensonarRootFollowPlaybackTruthProbeReport?: RootFollowPlaybackTruthProbeReport | null;
    __xensonarReadRootFollowPlaybackTruthProbe?: () => RootFollowPlaybackTruthProbeReport;
  }
}

const MAX_RECENT_EVENTS = 32;
const COLD_START_LEAD_RISK_MS = 18;
const recentEvents: RootFollowPlaybackTruthEvent[] = [];
let eventCount = 0;
let latestGateOpen: RootFollowPlaybackTruthEvent | null = null;
let latestGateClose: RootFollowPlaybackTruthEvent | null = null;
let latestStopReason: RootFollowPlaybackStopReason | null = null;
let latestColdStartRisk = false;

function nowPerfMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function toLoopName(entry: MaterialEntry | null | undefined): string | null {
  return entry?.name ?? null;
}

export function resolveRootFollowGateCloseReason(args: {
  readonly audioCtx: AudioContext | null;
  readonly nexusActive: boolean;
  readonly rootFollowLoopActive: boolean;
  readonly effectivePlaybackGate: boolean;
  readonly selectedEntryExists: boolean;
}): RootFollowPlaybackStopReason {
  if (!args.audioCtx) return 'no-audio-context';
  if (!args.nexusActive) return 'nexus-inactive';
  if (!args.rootFollowLoopActive) return 'root-follow-inactive';
  if (!args.effectivePlaybackGate) return 'playback-gate-closed';
  if (!args.selectedEntryExists) return 'missing-selected-entry';
  return 'unknown';
}

export function recordRootFollowPlaybackTruthEvent(args: {
  readonly stage: RootFollowPlaybackTruthStage;
  readonly audioNowSec?: number | null;
  readonly token?: number | null;
  readonly entry?: MaterialEntry | null;
  readonly entryConfig?: RootFollowBankEntryConfig | null;
  readonly rootFollowLoopActive?: boolean | null;
  readonly rootFollowPreviewActive?: boolean | null;
  readonly rootFollowPlayfieldInside?: boolean | null;
  readonly effectivePlaybackGate?: boolean | null;
  readonly selectedEntryExists?: boolean | null;
  readonly timerActive?: boolean | null;
  readonly gainConnected?: boolean | null;
  readonly activeNodes?: number | null;
  readonly activeSynthVoices?: number | null;
  readonly cacheSize?: number | null;
  readonly stopReason?: RootFollowPlaybackStopReason | null;
  readonly coldStartLeadMs?: number | null;
  readonly detail?: Record<string, unknown>;
}): RootFollowPlaybackTruthEvent {
  const coldStartLeadMs = typeof args.coldStartLeadMs === 'number' && Number.isFinite(args.coldStartLeadMs)
    ? args.coldStartLeadMs
    : null;
  const coldStartRisk = coldStartLeadMs !== null && coldStartLeadMs < COLD_START_LEAD_RISK_MS;
  const event: RootFollowPlaybackTruthEvent = {
    stage: args.stage,
    perfNowMs: nowPerfMs(),
    generatedAtIso: new Date().toISOString(),
    audioNowSec: args.audioNowSec ?? null,
    token: args.token ?? null,
    loopId: args.entry?.id ?? null,
    loopName: toLoopName(args.entry),
    sourceKind: args.entryConfig?.sourceKind ?? null,
    renderMode: args.entryConfig?.renderMode ?? null,
    rootFollowLoopActive: args.rootFollowLoopActive ?? null,
    rootFollowPreviewActive: args.rootFollowPreviewActive ?? null,
    rootFollowPlayfieldInside: args.rootFollowPlayfieldInside ?? null,
    effectivePlaybackGate: args.effectivePlaybackGate ?? null,
    selectedEntryExists: args.selectedEntryExists ?? null,
    timerActive: args.timerActive ?? null,
    gainConnected: args.gainConnected ?? null,
    activeNodes: args.activeNodes ?? null,
    activeSynthVoices: args.activeSynthVoices ?? null,
    cacheSize: args.cacheSize ?? null,
    stopReason: args.stopReason ?? null,
    coldStartLeadMs,
    coldStartRisk,
    ...(args.detail ? { detail: args.detail } : null),
  };

  eventCount += 1;
  recentEvents.push(event);
  if (recentEvents.length > MAX_RECENT_EVENTS) recentEvents.shift();
  if (event.stage === 'gate-open') latestGateOpen = event;
  if (event.stage === 'gate-close') latestGateClose = event;
  if (event.stopReason) latestStopReason = event.stopReason;
  if (event.coldStartRisk) latestColdStartRisk = true;
  const report = readRootFollowPlaybackTruthProbe();
  if (typeof window !== 'undefined') {
    window.__xensonarRootFollowPlaybackTruthProbeReport = report;
    installRootFollowPlaybackTruthProbeReader();
  }
  return event;
}

export function readRootFollowPlaybackTruthProbe(): RootFollowPlaybackTruthProbeReport {
  return {
    version: 1,
    reportKind: 'xensonar-root-follow-playback-truth-probe',
    generatedAtIso: new Date().toISOString(),
    latest: recentEvents[recentEvents.length - 1] ?? null,
    recent: [...recentEvents],
    eventCount,
    latestGateOpen,
    latestGateClose,
    latestStopReason,
    latestColdStartRisk,
    note: 'Low-overhead probe: records Root-Follow lifecycle/gate/restart edges only, not per-grain or per-window continuous telemetry.',
  };
}

export function installRootFollowPlaybackTruthProbeReader(): void {
  if (typeof window === 'undefined') return;
  window.__xensonarReadRootFollowPlaybackTruthProbe = readRootFollowPlaybackTruthProbe;
}
