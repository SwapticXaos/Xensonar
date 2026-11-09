import type { AudioStressComparisonSnapshot } from '../audioTraffic/audioTrafficForensics';
import type { RootFollowVoiceEngineMode } from '../performanceCrisis/performanceCrisisTypes';
import type { StableLaneAudioContextUserGestureProbeSnapshot } from '../rootFollow/rootFollowAudioContextUserGestureProbe';
import type { RootFollowStableLaneSyntheticSilentProbeResult } from '../rootFollow/rootFollowWorkletShadowBridge';

export type StableLaneStressHarnessScenarioId = 'root-material-controlled-lane-pressure';

export type StableLaneStressHarnessVariantId = 'legacy-shadow-baseline' | 'worklet-stable-lane-pilot';

export type StableLaneStressHarnessDecision =
  | 'candidate-not-ready'
  | 'needs-legacy-ab-run'
  | 'needs-worklet-frame-proof'
  | 'needs-relief-events'
  | 'candidate-observed';

export type StableLaneStressHarnessVariantSnapshot = {
  id: StableLaneStressHarnessVariantId;
  label: string;
  voiceEngineMode: RootFollowVoiceEngineMode | 'shadow-plan';
  observed: boolean;
  expectedRole: string;
  legacyReliefGate: string;
  burstRiskScore: number | null;
  robustnessScore: number | null;
  rootFollowEvents16: number | null;
  stableLaneReliefEvents: number;
  stableLaneBlendEvents: number;
  stableLaneFrameDelta: number;
  stableLaneFrameFresh: boolean;
  stableLaneQuanta: number;
  planTransportPostedCount: number;
  planTransportPendingCount: number;
  planTransportDroppedSupersededCount: number;
};

export type StableLaneABReport = {
  version: 1;
  reportKind: 'stable-lane-legacy-vs-worklet-ab';
  generatedAtIso: string;
  currentVoiceEngineMode: RootFollowVoiceEngineMode;
  scenarioId: StableLaneStressHarnessScenarioId;
  scenarioLabel: string;
  sampleWindowMs: number;
  legacy: StableLaneStressHarnessVariantSnapshot;
  worklet: StableLaneStressHarnessVariantSnapshot;
  deltas: {
    burstRiskScore: number | null;
    robustnessScore: number | null;
    rootFollowEvents16: number | null;
    relievedLegacySliceEvents: number;
    stableLaneFrameDelta: number;
    stableLaneQuanta: number;
    planTransportCoalesced: number;
  };
  decision: StableLaneStressHarnessDecision;
  blockers: string[];
  note: string;
};

export type StableLaneStressScenarioHarnessReport = {
  version: 1;
  reportKind: 'stable-lane-controlled-stress-scenario';
  generatedAtIso: string;
  scenarioId: StableLaneStressHarnessScenarioId;
  scenarioLabel: string;
  intent: string;
  currentVoiceEngineMode: RootFollowVoiceEngineMode;
  sampleWindowMs: number;
  phases: readonly string[];
  observedSignals: {
    audioProbeBlocker: string;
    audioContextState: string;
    userActivationState: string;
    syntheticSilentProbeStatus: string;
    syntheticSilentProbeBlocker: string | null;
    syntheticSilentProbeFrameDelta: number;
    syntheticSilentProbeLaneQuantaDelta: number;
    stableLaneFrameDelta: number;
    stableLaneFrameFresh: boolean;
    stableLaneQuanta: number;
    stableLaneReliefEvents: number;
    stableLaneBlendEvents: number;
    planTransportPostedCount: number;
    planTransportPendingCount: number;
    planTransportDroppedSupersededCount: number;
  };
  readiness: 'blocked' | 'armed' | 'observed';
  blockers: string[];
  abReport: StableLaneABReport;
};

type ResponsibilityLike = {
  rootFollowVoiceEngineMode: RootFollowVoiceEngineMode;
  legacyReliefGate: string;
  frameDelta: number;
  frameAdvanceFresh: boolean;
  laneQuanta: number;
  planTransportPostedCount: number;
  planTransportPendingCount: number;
  planTransportDroppedSupersededCount: number;
};

function nullSafeNumber(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function diffNullable(after: number | null, before: number | null): number | null {
  if (after === null || before === null) return null;
  return after - before;
}

function buildLegacyVariant(stressComparison: AudioStressComparisonSnapshot | null): StableLaneStressHarnessVariantSnapshot {
  const observed = stressComparison?.rootFollowVoiceEngineMode === 'shadow-plan'
    || stressComparison?.rootFollowVoiceEngineMode === 'legacy'
    || stressComparison?.rootFollowVoiceEngineMode === 'main-thread-pool';
  return {
    id: 'legacy-shadow-baseline',
    label: 'Legacy / Shadow Baseline',
    voiceEngineMode: (stressComparison?.rootFollowVoiceEngineMode as RootFollowVoiceEngineMode | undefined) ?? 'shadow-plan',
    observed,
    expectedRole: 'volle Legacy-Root/Material-Micro-Slices als hörbare Referenz und Fallback',
    legacyReliefGate: observed ? stressComparison?.legacyReliefGate ?? 'no-relief' : 'no-relief',
    burstRiskScore: observed ? nullSafeNumber(stressComparison?.burstRiskScore) : null,
    robustnessScore: observed ? nullSafeNumber(stressComparison?.robustnessScore) : null,
    rootFollowEvents16: observed ? nullSafeNumber(stressComparison?.maxRootFollowEventsPer16Ms) : null,
    stableLaneReliefEvents: observed ? stressComparison?.stableLaneReliefEvents ?? 0 : 0,
    stableLaneBlendEvents: observed ? stressComparison?.stableLaneBlendEvents ?? 0 : 0,
    stableLaneFrameDelta: observed ? stressComparison?.workletStableLaneRenderedFrameDelta ?? 0 : 0,
    stableLaneFrameFresh: observed ? Boolean(stressComparison?.workletStableLaneFrameAdvanceFresh) : false,
    stableLaneQuanta: observed ? stressComparison?.workletStableLaneActiveRenderQuantumCount ?? 0 : 0,
    planTransportPostedCount: observed ? stressComparison?.workletStableLanePlanTransportPostedCount ?? 0 : 0,
    planTransportPendingCount: observed ? stressComparison?.workletStableLanePlanTransportPendingCount ?? 0 : 0,
    planTransportDroppedSupersededCount: observed ? stressComparison?.workletStableLanePlanTransportDroppedSupersededCount ?? 0 : 0,
  };
}

function buildWorkletVariant(args: {
  stressComparison: AudioStressComparisonSnapshot | null;
  responsibility: ResponsibilityLike;
}): StableLaneStressHarnessVariantSnapshot {
  const observed = args.responsibility.rootFollowVoiceEngineMode === 'worklet-stable-lane-pilot';
  return {
    id: 'worklet-stable-lane-pilot',
    label: 'Worklet Stable-Lane Pilot',
    voiceEngineMode: 'worklet-stable-lane-pilot',
    observed,
    expectedRole: 'Stable Lane trägt Root/Material additiv und darf Legacy erst bei fresh sustained proof entlasten',
    legacyReliefGate: args.responsibility.legacyReliefGate,
    burstRiskScore: observed ? nullSafeNumber(args.stressComparison?.burstRiskScore) : null,
    robustnessScore: observed ? nullSafeNumber(args.stressComparison?.robustnessScore) : null,
    rootFollowEvents16: observed ? nullSafeNumber(args.stressComparison?.maxRootFollowEventsPer16Ms) : null,
    stableLaneReliefEvents: observed ? args.stressComparison?.stableLaneReliefEvents ?? 0 : 0,
    stableLaneBlendEvents: observed ? args.stressComparison?.stableLaneBlendEvents ?? 0 : 0,
    stableLaneFrameDelta: observed ? args.responsibility.frameDelta : 0,
    stableLaneFrameFresh: observed ? args.responsibility.frameAdvanceFresh : false,
    stableLaneQuanta: observed ? args.responsibility.laneQuanta : 0,
    planTransportPostedCount: observed ? args.responsibility.planTransportPostedCount : 0,
    planTransportPendingCount: observed ? args.responsibility.planTransportPendingCount : 0,
    planTransportDroppedSupersededCount: observed ? args.responsibility.planTransportDroppedSupersededCount : 0,
  };
}

function resolveDecision(args: {
  currentVoiceEngineMode: RootFollowVoiceEngineMode;
  audioProbe: StableLaneAudioContextUserGestureProbeSnapshot;
  syntheticSilentProbe: RootFollowStableLaneSyntheticSilentProbeResult | null;
  worklet: StableLaneStressHarnessVariantSnapshot;
  legacy: StableLaneStressHarnessVariantSnapshot;
  blockers: string[];
}): StableLaneStressHarnessDecision {
  if (args.currentVoiceEngineMode !== 'worklet-stable-lane-pilot') return 'candidate-not-ready';
  if (args.audioProbe.blockerReason !== 'proof-ready' && args.audioProbe.blockerReason !== 'worklet-frame-advance-missing' && args.audioProbe.blockerReason !== 'stable-lane-plan-not-published') {
    return 'candidate-not-ready';
  }
  if ((args.syntheticSilentProbe?.renderedFrameDelta ?? 0) <= 0 && args.worklet.stableLaneFrameDelta <= 0) return 'needs-worklet-frame-proof';
  if (args.worklet.stableLaneReliefEvents <= 0 && args.worklet.legacyReliefGate !== 'stable-lane-sustained-relief') return 'needs-relief-events';
  if (!args.legacy.observed) return 'needs-legacy-ab-run';
  if (args.blockers.length > 0) return 'candidate-not-ready';
  return 'candidate-observed';
}

export function buildStableLaneStressScenarioHarnessReport(args: {
  currentVoiceEngineMode: RootFollowVoiceEngineMode;
  stressComparison: AudioStressComparisonSnapshot | null;
  responsibility: ResponsibilityLike;
  audioProbe: StableLaneAudioContextUserGestureProbeSnapshot;
  syntheticSilentProbe: RootFollowStableLaneSyntheticSilentProbeResult | null;
}): StableLaneStressScenarioHarnessReport {
  const legacy = buildLegacyVariant(args.stressComparison);
  const worklet = buildWorkletVariant({
    stressComparison: args.stressComparison,
    responsibility: args.responsibility,
  });
  const blockers: string[] = [];
  if (args.currentVoiceEngineMode !== 'worklet-stable-lane-pilot') blockers.push('not-worklet-stable-lane-pilot');
  if (args.audioProbe.audioContextState !== 'running') blockers.push(`audio-context-${args.audioProbe.audioContextState}`);
  if (args.audioProbe.userActivationState.includes('never-active')) blockers.push('user-activation-missing');
  if ((args.syntheticSilentProbe?.renderedFrameDelta ?? 0) <= 0 && (args.syntheticSilentProbe?.laneQuantaDelta ?? 0) <= 0 && worklet.stableLaneFrameDelta <= 0) blockers.push(args.syntheticSilentProbe?.blockerReason ?? 'synthetic-silent-plan-no-frame-advance');
  if (worklet.planTransportPostedCount <= 0) blockers.push('stable-lane-plan-transport-not-posted');
  if (!worklet.stableLaneFrameFresh && worklet.stableLaneFrameDelta > 0) blockers.push('stable-lane-frame-delta-stale');

  const decision = resolveDecision({
    currentVoiceEngineMode: args.currentVoiceEngineMode,
    audioProbe: args.audioProbe,
    syntheticSilentProbe: args.syntheticSilentProbe,
    worklet,
    legacy,
    blockers,
  });

  const abReport: StableLaneABReport = {
    version: 1,
    reportKind: 'stable-lane-legacy-vs-worklet-ab',
    generatedAtIso: new Date().toISOString(),
    currentVoiceEngineMode: args.currentVoiceEngineMode,
    scenarioId: 'root-material-controlled-lane-pressure',
    scenarioLabel: 'Root/Material kontrollierter Lane-Druck',
    sampleWindowMs: args.stressComparison?.sampleWindowMs ?? 0,
    legacy,
    worklet,
    deltas: {
      burstRiskScore: diffNullable(worklet.burstRiskScore, legacy.burstRiskScore),
      robustnessScore: diffNullable(worklet.robustnessScore, legacy.robustnessScore),
      rootFollowEvents16: diffNullable(worklet.rootFollowEvents16, legacy.rootFollowEvents16),
      relievedLegacySliceEvents: worklet.stableLaneReliefEvents - legacy.stableLaneReliefEvents,
      stableLaneFrameDelta: worklet.stableLaneFrameDelta - legacy.stableLaneFrameDelta,
      stableLaneQuanta: worklet.stableLaneQuanta - legacy.stableLaneQuanta,
      planTransportCoalesced: worklet.planTransportDroppedSupersededCount - legacy.planTransportDroppedSupersededCount,
    },
    decision,
    blockers,
    note: 'A/B-Report ist erst entscheidungsfähig, wenn Legacy/Shadow und Worklet Stable-Lane im selben Browserprofil als getrennte Läufe beobachtet wurden. Bis dahin ist er ein Guard gegen Schein-Default-Reife.',
  };

  const readiness: StableLaneStressScenarioHarnessReport['readiness'] = blockers.length > 0
    ? 'blocked'
    : decision === 'candidate-observed'
      ? 'observed'
      : 'armed';

  return {
    version: 1,
    reportKind: 'stable-lane-controlled-stress-scenario',
    generatedAtIso: new Date().toISOString(),
    scenarioId: 'root-material-controlled-lane-pressure',
    scenarioLabel: 'Root/Material kontrollierter Lane-Druck',
    intent: 'Erster automatischer Stress-Harness: nicht musikalisch feuern, sondern prüfen, ob Stable Lane unter kontrolliertem Root/Material-Druck messbar trägt und Legacy-Relief objektiv beweisbar wird.',
    currentVoiceEngineMode: args.currentVoiceEngineMode,
    sampleWindowMs: args.stressComparison?.sampleWindowMs ?? 0,
    phases: [
      'AudioContext/User-Gesture-Probe auswerten',
      'Synthetic Silent Plan Probe auswerten',
      'Stable-Lane Frame-Delta und Lane-Quanten lesen',
      'Plan-Transport Posted/Pending/Superseded lesen',
      'Legacy-vs-Worklet A/B-Entscheidungsstatus erzeugen',
    ],
    observedSignals: {
      audioProbeBlocker: args.audioProbe.blockerReason,
      audioContextState: args.audioProbe.audioContextState,
      userActivationState: args.audioProbe.userActivationState,
      syntheticSilentProbeStatus: args.syntheticSilentProbe?.status ?? 'not-run',
      syntheticSilentProbeBlocker: args.syntheticSilentProbe?.blockerReason ?? null,
      syntheticSilentProbeFrameDelta: args.syntheticSilentProbe?.renderedFrameDelta ?? 0,
      syntheticSilentProbeLaneQuantaDelta: args.syntheticSilentProbe?.laneQuantaDelta ?? 0,
      stableLaneFrameDelta: worklet.stableLaneFrameDelta,
      stableLaneFrameFresh: worklet.stableLaneFrameFresh,
      stableLaneQuanta: worklet.stableLaneQuanta,
      stableLaneReliefEvents: worklet.stableLaneReliefEvents,
      stableLaneBlendEvents: worklet.stableLaneBlendEvents,
      planTransportPostedCount: worklet.planTransportPostedCount,
      planTransportPendingCount: worklet.planTransportPendingCount,
      planTransportDroppedSupersededCount: worklet.planTransportDroppedSupersededCount,
    },
    readiness,
    blockers,
    abReport,
  };
}

export function formatStableLaneStressHarnessUiValue(report: StableLaneStressScenarioHarnessReport): string {
  return `${report.readiness} · ${report.abReport.decision} · Δ ${report.observedSignals.stableLaneFrameDelta} · Q ${report.observedSignals.stableLaneQuanta}`;
}

export function formatStableLaneABReportUiValue(report: StableLaneABReport): string {
  const risk = report.deltas.burstRiskScore === null ? '—' : `${report.deltas.burstRiskScore}`;
  const robust = report.deltas.robustnessScore === null ? '—' : `${report.deltas.robustnessScore}`;
  return `${report.decision} · risk Δ ${risk} · robust Δ ${robust} · relief ${report.deltas.relievedLegacySliceEvents}`;
}

export type StableLaneClickBurstProxyVerdict =
  | 'not-enough-data'
  | 'calm'
  | 'watch'
  | 'critical';

export type StableLaneClickBurstProxyReport = {
  version: 1;
  reportKind: 'stable-lane-click-burst-proxy';
  generatedAtIso: string;
  currentVoiceEngineMode: RootFollowVoiceEngineMode;
  sampleWindowMs: number;
  metrics: {
    burstRiskScore: number;
    robustnessScore: number;
    musicalPreservationScore: number;
    restrictionCostScore: number;
    clickBurstProxyScore: number;
    rootMaterialMicroSlicePressure: number;
    stableLaneReliefEvents: number;
    stableLaneBlendEvents: number;
    stableLaneFrameDelta: number;
    stableLaneFrameFresh: boolean;
    stableLaneQuanta: number;
    syntheticSilentProbeFrameDelta: number;
    workletProcessorErrorCount: number;
    workletPlanRejectCount: number;
    forcedPlanPosts: number;
    stalePlanDrops: number;
    planTransportCoalesced: number;
    maxEventsPer16Ms: number;
    maxRootFollowEventsPer16Ms: number;
    maxWaveStarterEventsPer16Ms: number;
    maxParticleEventsPer16Ms: number;
  };
  verdict: StableLaneClickBurstProxyVerdict;
  blockers: string[];
  note: string;
};

export type StableLaneRootMaterialReliefProofDecision =
  | 'proof-ready'
  | 'candidate-not-ready'
  | 'needs-audio-context'
  | 'needs-plan-transport'
  | 'needs-frame-proof'
  | 'needs-fresh-frame-window'
  | 'needs-relief-event'
  | 'processor-errors'
  | 'plan-rejected';

export type StableLaneRootMaterialReliefProofReport = {
  version: 1;
  reportKind: 'stable-lane-root-material-relief-proof';
  generatedAtIso: string;
  currentVoiceEngineMode: RootFollowVoiceEngineMode;
  decision: StableLaneRootMaterialReliefProofDecision;
  defaultCandidateReady: boolean;
  proof: {
    audioContextRunning: boolean;
    planTransportPosted: boolean;
    planAcked: boolean;
    frameAdvanceFresh: boolean;
    frameDelta: number;
    laneQuanta: number;
    reliefObserved: boolean;
    reliefGate: string;
    processorErrorCount: number;
    planRejectCount: number;
    bufferRejectCount: number;
    stalePlanDrops: number;
    forcedPlanPosts: number;
  };
  blockers: string[];
  note: string;
};

function clampScore(value: number, min = 0, max = 999): number {
  return Math.max(min, Math.min(max, Math.round(Number.isFinite(value) ? value : 0)));
}

function resolveClickBurstProxyVerdict(args: {
  stressComparison: AudioStressComparisonSnapshot | null;
  score: number;
  blockers: readonly string[];
}): StableLaneClickBurstProxyVerdict {
  if (!args.stressComparison) return 'not-enough-data';
  if (args.score >= 96 || args.blockers.includes('worklet-processor-errors')) return 'critical';
  if (args.score >= 48 || args.blockers.length > 0) return 'watch';
  return 'calm';
}

export function buildStableLaneClickBurstProxyReport(args: {
  currentVoiceEngineMode: RootFollowVoiceEngineMode;
  stressComparison: AudioStressComparisonSnapshot | null;
  responsibility: ResponsibilityLike;
  syntheticSilentProbe: RootFollowStableLaneSyntheticSilentProbeResult | null;
}): StableLaneClickBurstProxyReport {
  const stress = args.stressComparison;
  const rootMaterialMicroSlicePressure = (stress?.maxRootFollowEventsPer16Ms ?? 0)
    + (stress?.stableLaneBlendEvents ?? 0)
    + (stress?.primaryCandidateMuteEvents ?? 0);
  const staleTransportPressure = (stress?.workletStableLanePlanTransportForcedPostCount ?? 0) * 6
    + (stress?.workletStableLanePlanTransportDroppedStaleCount ?? 0) * 10
    + (stress?.workletStableLanePlanRejectCount ?? 0) * 16;
  const stableLaneCredit = args.responsibility.frameAdvanceFresh
    ? Math.min(28, Math.floor(args.responsibility.frameDelta / 512) + args.responsibility.laneQuanta)
    : 0;
  const reliefCredit = Math.min(36, (stress?.stableLaneReliefEvents ?? 0) * 8);
  const processorPenalty = (stress?.workletProcessorErrorCount ?? 0) * 40;
  const clickBurstProxyScore = clampScore(
    (stress?.burstRiskScore ?? 0)
    + rootMaterialMicroSlicePressure * 3
    + staleTransportPressure
    + processorPenalty
    - stableLaneCredit
    - reliefCredit,
  );
  const blockers: string[] = [];
  if (!stress) blockers.push('no-stress-comparison-window');
  if (args.currentVoiceEngineMode !== 'worklet-stable-lane-pilot') blockers.push('not-worklet-stable-lane-pilot');
  if ((stress?.workletProcessorErrorCount ?? 0) > 0) blockers.push('worklet-processor-errors');
  if ((stress?.workletStableLanePlanRejectCount ?? 0) > 0) blockers.push('stable-lane-plan-rejections');
  if ((stress?.workletStableLanePlanTransportForcedPostCount ?? 0) > 0) blockers.push('plan-transport-forced-posts');
  if (!args.responsibility.frameAdvanceFresh && args.responsibility.frameDelta > 0) blockers.push('frame-advance-stale');
  if (args.responsibility.frameDelta <= 0 && (args.syntheticSilentProbe?.renderedFrameDelta ?? 0) <= 0) blockers.push('no-worklet-frame-advance');

  return {
    version: 1,
    reportKind: 'stable-lane-click-burst-proxy',
    generatedAtIso: new Date().toISOString(),
    currentVoiceEngineMode: args.currentVoiceEngineMode,
    sampleWindowMs: stress?.sampleWindowMs ?? 0,
    metrics: {
      burstRiskScore: stress?.burstRiskScore ?? 0,
      robustnessScore: stress?.robustnessScore ?? 0,
      musicalPreservationScore: stress?.musicalPreservationScore ?? 0,
      restrictionCostScore: stress?.restrictionCostScore ?? 0,
      clickBurstProxyScore,
      rootMaterialMicroSlicePressure,
      stableLaneReliefEvents: stress?.stableLaneReliefEvents ?? 0,
      stableLaneBlendEvents: stress?.stableLaneBlendEvents ?? 0,
      stableLaneFrameDelta: args.responsibility.frameDelta,
      stableLaneFrameFresh: args.responsibility.frameAdvanceFresh,
      stableLaneQuanta: args.responsibility.laneQuanta,
      syntheticSilentProbeFrameDelta: args.syntheticSilentProbe?.renderedFrameDelta ?? 0,
      workletProcessorErrorCount: stress?.workletProcessorErrorCount ?? 0,
      workletPlanRejectCount: stress?.workletStableLanePlanRejectCount ?? 0,
      forcedPlanPosts: stress?.workletStableLanePlanTransportForcedPostCount ?? 0,
      stalePlanDrops: stress?.workletStableLanePlanTransportDroppedStaleCount ?? 0,
      planTransportCoalesced: stress?.workletStableLanePlanTransportDroppedSupersededCount ?? 0,
      maxEventsPer16Ms: stress?.maxEventsPer16Ms ?? 0,
      maxRootFollowEventsPer16Ms: stress?.maxRootFollowEventsPer16Ms ?? 0,
      maxWaveStarterEventsPer16Ms: stress?.maxWaveStarterEventsPer16Ms ?? 0,
      maxParticleEventsPer16Ms: stress?.maxParticleEventsPer16Ms ?? 0,
    },
    verdict: resolveClickBurstProxyVerdict({ stressComparison: stress, score: clickBurstProxyScore, blockers }),
    blockers,
    note: 'Click/Burst-Proxy ist ein Default-Reife-Indikator, kein akustischer Click-Detektor: bewertet Ereignisdichte, Root/Material-Micro-Slice-Druck, Worklet-Errors, stale/forced Plantransport und Stable-Lane-Relief-Credits.',
  };
}

function resolveReliefProofDecision(args: {
  currentVoiceEngineMode: RootFollowVoiceEngineMode;
  audioProbe: StableLaneAudioContextUserGestureProbeSnapshot;
  proof: StableLaneRootMaterialReliefProofReport['proof'];
}): StableLaneRootMaterialReliefProofDecision {
  if (args.currentVoiceEngineMode !== 'worklet-stable-lane-pilot') return 'candidate-not-ready';
  if (!args.proof.audioContextRunning) return 'needs-audio-context';
  if (args.proof.processorErrorCount > 0) return 'processor-errors';
  if (args.proof.planRejectCount > 0 || args.proof.bufferRejectCount > 0) return 'plan-rejected';
  if (!args.proof.planTransportPosted) return 'needs-plan-transport';
  if (args.proof.frameDelta <= 0 || args.proof.laneQuanta <= 0) return 'needs-frame-proof';
  if (!args.proof.frameAdvanceFresh) return 'needs-fresh-frame-window';
  if (!args.proof.reliefObserved) return 'needs-relief-event';
  return 'proof-ready';
}

export function buildStableLaneRootMaterialReliefProofReport(args: {
  currentVoiceEngineMode: RootFollowVoiceEngineMode;
  stressComparison: AudioStressComparisonSnapshot | null;
  responsibility: ResponsibilityLike;
  audioProbe: StableLaneAudioContextUserGestureProbeSnapshot;
}): StableLaneRootMaterialReliefProofReport {
  const stress = args.stressComparison;
  const reliefObserved = args.responsibility.legacyReliefGate === 'stable-lane-sustained-relief'
    || (stress?.stableLaneReliefEvents ?? 0) > 0;
  const proof: StableLaneRootMaterialReliefProofReport['proof'] = {
    audioContextRunning: args.audioProbe.audioContextState === 'running',
    planTransportPosted: args.responsibility.planTransportPostedCount > 0 || (stress?.workletStableLanePlanTransportPostedCount ?? 0) > 0,
    planAcked: Boolean(stress?.workletStableLanePlanAcked) || (stress?.workletStableLanePlanAckCount ?? 0) > 0,
    frameAdvanceFresh: args.responsibility.frameAdvanceFresh,
    frameDelta: args.responsibility.frameDelta,
    laneQuanta: args.responsibility.laneQuanta,
    reliefObserved,
    reliefGate: args.responsibility.legacyReliefGate,
    processorErrorCount: stress?.workletProcessorErrorCount ?? 0,
    planRejectCount: stress?.workletStableLanePlanRejectCount ?? 0,
    bufferRejectCount: stress?.workletStableLaneBufferRejectCount ?? 0,
    stalePlanDrops: stress?.workletStableLanePlanTransportDroppedStaleCount ?? 0,
    forcedPlanPosts: stress?.workletStableLanePlanTransportForcedPostCount ?? 0,
  };
  const decision = resolveReliefProofDecision({
    currentVoiceEngineMode: args.currentVoiceEngineMode,
    audioProbe: args.audioProbe,
    proof,
  });
  const blockers: string[] = [];
  if (args.currentVoiceEngineMode !== 'worklet-stable-lane-pilot') blockers.push('not-worklet-stable-lane-pilot');
  if (!proof.audioContextRunning) blockers.push(`audio-context-${args.audioProbe.audioContextState}`);
  if (!proof.planTransportPosted) blockers.push('stable-lane-plan-transport-not-posted');
  if (!proof.planAcked) blockers.push('stable-lane-plan-not-acked');
  if (proof.frameDelta <= 0 || proof.laneQuanta <= 0) blockers.push('stable-lane-frame-proof-missing');
  if (!proof.frameAdvanceFresh && proof.frameDelta > 0) blockers.push('stable-lane-frame-window-stale');
  if (!proof.reliefObserved) blockers.push('stable-lane-relief-not-observed');
  if (proof.processorErrorCount > 0) blockers.push('worklet-processor-errors');
  if (proof.planRejectCount > 0 || proof.bufferRejectCount > 0) blockers.push('stable-lane-plan-or-buffer-rejected');
  if (proof.stalePlanDrops > 0) blockers.push('stable-lane-stale-plan-drops');
  if (proof.forcedPlanPosts > 0) blockers.push('stable-lane-forced-plan-posts');

  return {
    version: 1,
    reportKind: 'stable-lane-root-material-relief-proof',
    generatedAtIso: new Date().toISOString(),
    currentVoiceEngineMode: args.currentVoiceEngineMode,
    decision,
    defaultCandidateReady: decision === 'proof-ready' && blockers.length === 0,
    proof,
    blockers,
    note: 'Root/Material-Relief-Proof ist der erste harte Default-Reife-Guard: Stable Lane muss im laufenden Browser frische Frames liefern, Plantransport/Ack zeigen, Legacy-Relief beobachten und ohne Processor-/Plan-Errors bleiben.',
  };
}

export function formatStableLaneClickBurstProxyUiValue(report: StableLaneClickBurstProxyReport): string {
  return `${report.verdict} · score ${report.metrics.clickBurstProxyScore} · RM ${report.metrics.rootMaterialMicroSlicePressure} · relief ${report.metrics.stableLaneReliefEvents}`;
}

export function formatStableLaneRootMaterialReliefProofUiValue(report: StableLaneRootMaterialReliefProofReport): string {
  return `${report.decision} · Δ ${report.proof.frameDelta} · Q ${report.proof.laneQuanta} · ${report.proof.reliefGate}`;
}

export type StableLaneExpressivePressureAddOnId =
  | 'keyboard-glissando-root-follow-pressure'
  | 'wave-starter-microburst-root-follow-pressure';

export type StableLaneExpressivePressureVerdict =
  | 'not-enough-data'
  | 'blocked-before-audio'
  | 'quiet'
  | 'watch'
  | 'critical';

export type StableLaneExpressivePressureAddOnSnapshot = {
  id: StableLaneExpressivePressureAddOnId;
  label: string;
  intent: string;
  observedProxy: number;
  pressureScore: number;
  verdict: StableLaneExpressivePressureVerdict;
  rootFollowEvents16: number;
  quantizedEvents16: number;
  waveStarterEvents16: number;
  particleEvents16: number;
  stableLaneFrameDelta: number;
  stableLaneFrameFresh: boolean;
  stableLaneReliefEvents: number;
  workletProcessorErrorCount: number;
  transportForcedPosts: number;
  transportCoalescedPlans: number;
  blockers: string[];
};

export type StableLaneExpressivePressureAddOnReport = {
  version: 1;
  reportKind: 'stable-lane-expressive-pressure-addons';
  generatedAtIso: string;
  currentVoiceEngineMode: RootFollowVoiceEngineMode;
  sampleWindowMs: number;
  readiness: 'blocked' | 'armed' | 'observed';
  combinedVerdict: StableLaneExpressivePressureVerdict;
  combinedPressureScore: number;
  addOns: StableLaneExpressivePressureAddOnSnapshot[];
  blockers: string[];
  note: string;
};

function clampPressureScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function resolveExpressivePressureVerdict(args: {
  score: number;
  observedProxy: number;
  audioProbe: StableLaneAudioContextUserGestureProbeSnapshot;
  stressComparison: AudioStressComparisonSnapshot | null;
  processorErrors: number;
}): StableLaneExpressivePressureVerdict {
  if (args.audioProbe.audioContextState !== 'running') return 'blocked-before-audio';
  if (!args.stressComparison) return 'not-enough-data';
  if (args.processorErrors > 0 || args.score >= 78) return 'critical';
  if (args.score >= 42 || args.observedProxy > 0) return 'watch';
  return 'quiet';
}

export function buildStableLaneExpressivePressureAddOnReport(args: {
  currentVoiceEngineMode: RootFollowVoiceEngineMode;
  stressComparison: AudioStressComparisonSnapshot | null;
  responsibility: ResponsibilityLike;
  audioProbe: StableLaneAudioContextUserGestureProbeSnapshot;
  syntheticSilentProbe: RootFollowStableLaneSyntheticSilentProbeResult | null;
}): StableLaneExpressivePressureAddOnReport {
  const stress = args.stressComparison;
  const rootFollowEvents16 = stress?.maxRootFollowEventsPer16Ms ?? 0;
  const quantizedEvents16 = stress?.maxQuantizedTrafficEventsPer16Ms ?? 0;
  const waveStarterEvents16 = stress?.maxWaveStarterEventsPer16Ms ?? 0;
  const particleEvents16 = stress?.maxParticleEventsPer16Ms ?? 0;
  const stableLaneReliefEvents = stress?.stableLaneReliefEvents ?? 0;
  const workletProcessorErrorCount = stress?.workletProcessorErrorCount ?? 0;
  const transportForcedPosts = stress?.workletStableLanePlanTransportForcedPostCount ?? 0;
  const transportCoalescedPlans = stress?.workletStableLanePlanTransportDroppedSupersededCount ?? 0;
  const frameDelta = Math.max(args.responsibility.frameDelta, args.syntheticSilentProbe?.renderedFrameDelta ?? 0);
  const frameFresh = args.responsibility.frameAdvanceFresh || (args.syntheticSilentProbe?.renderedFrameDelta ?? 0) > 0;

  const keyboardObservedProxy = rootFollowEvents16 + quantizedEvents16;
  const keyboardScore = clampPressureScore(
    keyboardObservedProxy * 6
      + (args.responsibility.frameAdvanceFresh ? -8 : 10)
      + (args.responsibility.legacyReliefGate === 'stable-lane-sustained-relief' ? -12 : 8)
      + transportForcedPosts * 6
      + workletProcessorErrorCount * 24,
  );
  const keyboardBlockers: string[] = [];
  if (args.currentVoiceEngineMode !== 'worklet-stable-lane-pilot') keyboardBlockers.push('not-worklet-stable-lane-pilot');
  if (args.audioProbe.audioContextState !== 'running') keyboardBlockers.push(`audio-context-${args.audioProbe.audioContextState}`);
  if (!stress) keyboardBlockers.push('stress-comparison-missing');
  if (frameDelta <= 0) keyboardBlockers.push('stable-lane-frame-proof-missing');
  if (!frameFresh && frameDelta > 0) keyboardBlockers.push('stable-lane-frame-window-stale');
  if (transportForcedPosts > 0) keyboardBlockers.push('plan-transport-forced-posts-under-input-pressure');
  if (workletProcessorErrorCount > 0) keyboardBlockers.push('worklet-processor-errors');

  const waveObservedProxy = waveStarterEvents16 + Math.max(0, particleEvents16 - 1);
  const waveScore = clampPressureScore(
    waveStarterEvents16 * 10
      + particleEvents16 * 3
      + (stableLaneReliefEvents > 0 ? -10 : 8)
      + transportCoalescedPlans * 2
      + transportForcedPosts * 8
      + workletProcessorErrorCount * 24,
  );
  const waveBlockers: string[] = [];
  if (args.currentVoiceEngineMode !== 'worklet-stable-lane-pilot') waveBlockers.push('not-worklet-stable-lane-pilot');
  if (args.audioProbe.audioContextState !== 'running') waveBlockers.push(`audio-context-${args.audioProbe.audioContextState}`);
  if (!stress) waveBlockers.push('stress-comparison-missing');
  if (stableLaneReliefEvents <= 0 && args.responsibility.legacyReliefGate !== 'stable-lane-sustained-relief') waveBlockers.push('stable-lane-relief-not-observed');
  if (waveStarterEvents16 <= 0) waveBlockers.push('wave-starter-pressure-not-observed');
  if (transportForcedPosts > 0) waveBlockers.push('plan-transport-forced-posts-under-wave-pressure');
  if (workletProcessorErrorCount > 0) waveBlockers.push('worklet-processor-errors');

  const addOns: StableLaneExpressivePressureAddOnSnapshot[] = [
    {
      id: 'keyboard-glissando-root-follow-pressure',
      label: 'Keyboard-/Glissando-Druck',
      intent: 'Schnelle Tonhöhen-/Cursor-/Keyboard-Bewegung darf Root/Material nicht aus der Stable Lane reißen.',
      observedProxy: keyboardObservedProxy,
      pressureScore: keyboardScore,
      verdict: resolveExpressivePressureVerdict({
        score: keyboardScore,
        observedProxy: keyboardObservedProxy,
        audioProbe: args.audioProbe,
        stressComparison: stress,
        processorErrors: workletProcessorErrorCount,
      }),
      rootFollowEvents16,
      quantizedEvents16,
      waveStarterEvents16,
      particleEvents16,
      stableLaneFrameDelta: frameDelta,
      stableLaneFrameFresh: frameFresh,
      stableLaneReliefEvents,
      workletProcessorErrorCount,
      transportForcedPosts,
      transportCoalescedPlans,
      blockers: keyboardBlockers,
    },
    {
      id: 'wave-starter-microburst-root-follow-pressure',
      label: 'Wellenstarter-Microburst-Druck',
      intent: 'Wellenstarter-/Partikel-Druck darf Root/Material nicht zu stale Relief oder Catch-up-Bursts treiben.',
      observedProxy: waveObservedProxy,
      pressureScore: waveScore,
      verdict: resolveExpressivePressureVerdict({
        score: waveScore,
        observedProxy: waveObservedProxy,
        audioProbe: args.audioProbe,
        stressComparison: stress,
        processorErrors: workletProcessorErrorCount,
      }),
      rootFollowEvents16,
      quantizedEvents16,
      waveStarterEvents16,
      particleEvents16,
      stableLaneFrameDelta: frameDelta,
      stableLaneFrameFresh: frameFresh,
      stableLaneReliefEvents,
      workletProcessorErrorCount,
      transportForcedPosts,
      transportCoalescedPlans,
      blockers: waveBlockers,
    },
  ];
  const blockers = Array.from(new Set(addOns.flatMap((entry) => entry.blockers)));
  const combinedPressureScore = Math.max(...addOns.map((entry) => entry.pressureScore));
  const combinedVerdict = addOns.some((entry) => entry.verdict === 'critical')
    ? 'critical'
    : addOns.some((entry) => entry.verdict === 'blocked-before-audio')
      ? 'blocked-before-audio'
      : addOns.some((entry) => entry.verdict === 'watch')
        ? 'watch'
        : addOns.some((entry) => entry.verdict === 'not-enough-data')
          ? 'not-enough-data'
          : 'quiet';
  const readiness = blockers.some((blocker) => blocker.startsWith('audio-context-') || blocker === 'not-worklet-stable-lane-pilot')
    ? 'blocked'
    : addOns.some((entry) => entry.observedProxy > 0)
      ? 'observed'
      : 'armed';
  return {
    version: 1,
    reportKind: 'stable-lane-expressive-pressure-addons',
    generatedAtIso: new Date().toISOString(),
    currentVoiceEngineMode: args.currentVoiceEngineMode,
    sampleWindowMs: stress?.sampleWindowMs ?? 0,
    readiness,
    combinedVerdict,
    combinedPressureScore,
    addOns,
    blockers,
    note: 'Kontrollierter Expressive-Pressure-Add-on-Bericht: Keyboard-/Glissando- und Wellenstarter-Druck werden zunächst aus vorhandenen Traffic-Fenstern gelesen, nicht als musikalischer Autoplay-Stress ausgelöst. Ziel ist Default-Reife ohne blinde UI-Handarbeit.',
  };
}

export type StableLaneSabDifferentialDecision =
  | 'sab-ready'
  | 'secure-context-blocked'
  | 'cross-origin-isolation-missing'
  | 'shared-array-buffer-constructor-missing'
  | 'singlefile-path-blocked'
  | 'browser-runtime-missing'
  | 'unknown-blocked';

export type StableLaneSabReadinessDifferentialReport = {
  version: 1;
  reportKind: 'stable-lane-sab-readiness-differential';
  generatedAtIso: string;
  decision: StableLaneSabDifferentialDecision;
  browserSignals: {
    readiness: string;
    reason: string | null;
    ready: boolean;
    secureContext: boolean;
    crossOriginIsolated: boolean;
    sharedArrayBufferAvailable: boolean;
    singleFileHtmlLikelyBlocked: boolean;
  };
  requiredHeaders: {
    coop: string | null;
    coep: string | null;
  };
  probableNextAction: string;
  blockers: string[];
  note: string;
};

export type StableLaneSabReadinessLike = {
  stableLaneSabTransportReadiness?: string | null;
  stableLaneSabTransportReadinessReason?: string | null;
  stableLaneSabTransportReady?: boolean;
  stableLaneSabTransportSecureContext?: boolean;
  stableLaneSabTransportCrossOriginIsolated?: boolean;
  stableLaneSabTransportSharedArrayBufferAvailable?: boolean;
  stableLaneSabTransportSingleFileHtmlLikelyBlocked?: boolean;
  stableLaneSabTransportRequiredCoop?: string | null;
  stableLaneSabTransportRequiredCoep?: string | null;
};

export function buildStableLaneSabReadinessDifferentialReport(
  snapshot: StableLaneSabReadinessLike | null | undefined,
): StableLaneSabReadinessDifferentialReport {
  const readiness = snapshot?.stableLaneSabTransportReadiness ?? 'unknown';
  const reason = snapshot?.stableLaneSabTransportReadinessReason ?? null;
  const ready = Boolean(snapshot?.stableLaneSabTransportReady);
  const secureContext = Boolean(snapshot?.stableLaneSabTransportSecureContext);
  const crossOriginIsolated = Boolean(snapshot?.stableLaneSabTransportCrossOriginIsolated);
  const sharedArrayBufferAvailable = Boolean(snapshot?.stableLaneSabTransportSharedArrayBufferAvailable);
  const singleFileHtmlLikelyBlocked = Boolean(snapshot?.stableLaneSabTransportSingleFileHtmlLikelyBlocked);
  const blockers: string[] = [];
  let decision: StableLaneSabDifferentialDecision = 'unknown-blocked';
  let probableNextAction = 'Browser-Probe erneut über COOP/COEP-Testserver laufen lassen und konkreten Blocker auslesen.';

  if (ready && secureContext && crossOriginIsolated && sharedArrayBufferAvailable) {
    decision = 'sab-ready';
    probableNextAction = 'SAB nur als Shadow-/Mirror-Backend vorbereiten; message-port bleibt bis zum Vergleichslauf Wahrheit.';
  } else if (reason === 'not-in-browser-runtime') {
    decision = 'browser-runtime-missing';
    blockers.push('not-in-browser-runtime');
    probableNextAction = 'Browser-visible Probe statt statischer Node-Auswertung verwenden.';
  } else if (!secureContext) {
    decision = 'secure-context-blocked';
    blockers.push('secure-context-missing');
    probableNextAction = 'HTML über localhost/https mit COOP/COEP-Testserver öffnen, nicht file://.';
  } else if (!crossOriginIsolated) {
    decision = singleFileHtmlLikelyBlocked ? 'singlefile-path-blocked' : 'cross-origin-isolation-missing';
    blockers.push('cross-origin-isolation-missing');
    if (singleFileHtmlLikelyBlocked) blockers.push('singlefile-html-likely-blocked');
    probableNextAction = 'COOP/COEP-Header am HTML-Dokument und COEP-kompatible Subresources prüfen.';
  } else if (!sharedArrayBufferAvailable) {
    decision = 'shared-array-buffer-constructor-missing';
    blockers.push('shared-array-buffer-missing');
    probableNextAction = 'Bei crossOriginIsolated=true Browser-/Feature-Policy und SAB-Konstruktorfreigabe prüfen.';
  } else {
    if (readiness === 'blocked') blockers.push(reason ?? 'blocked-unknown');
  }

  return {
    version: 1,
    reportKind: 'stable-lane-sab-readiness-differential',
    generatedAtIso: new Date().toISOString(),
    decision,
    browserSignals: {
      readiness,
      reason,
      ready,
      secureContext,
      crossOriginIsolated,
      sharedArrayBufferAvailable,
      singleFileHtmlLikelyBlocked,
    },
    requiredHeaders: {
      coop: snapshot?.stableLaneSabTransportRequiredCoop ?? 'same-origin',
      coep: snapshot?.stableLaneSabTransportRequiredCoep ?? 'require-corp',
    },
    probableNextAction,
    blockers,
    note: 'SAB-Differenzbericht zerlegt blocked in Secure-Context, Cross-Origin-Isolation, SAB-Konstruktor und Singlefile/COOP-COEP-Pfad, ohne sab-ringbuffer zu aktivieren.',
  };
}

export function formatStableLaneExpressivePressureAddOnUiValue(report: StableLaneExpressivePressureAddOnReport): string {
  return `${report.combinedVerdict} · score ${report.combinedPressureScore} · ${report.readiness}`;
}

export function formatStableLaneSabReadinessDifferentialUiValue(report: StableLaneSabReadinessDifferentialReport): string {
  return `${report.decision} · ${report.browserSignals.reason ?? report.browserSignals.readiness}`;
}
