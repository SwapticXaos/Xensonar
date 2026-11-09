import type { AudioStressComparisonSnapshot } from '../audioTraffic/audioTrafficForensics';
import type { RootFollowVoiceEngineMode } from '../performanceCrisis/performanceCrisisTypes';
import type { StableLaneAudioContextUserGestureProbeSnapshot } from '../rootFollow/rootFollowAudioContextUserGestureProbe';
import type { RootFollowStableLaneSyntheticSilentProbeResult } from '../rootFollow/rootFollowWorkletShadowBridge';

export type StableLaneLiveDeliveryDecision =
  | 'live-route-observed'
  | 'ui-default-only'
  | 'blocked-before-audio'
  | 'needs-plan-transport'
  | 'needs-blend-event'
  | 'needs-frame-proof'
  | 'runtime-mode-mismatch';

export type StableLaneLiveDeliveryProofReport = {
  version: 1;
  reportKind: 'stable-lane-live-delivery-proof';
  generatedAtIso: string;
  currentVoiceEngineMode: RootFollowVoiceEngineMode;
  uiDefaultArrived: boolean;
  runtimeModeObserved: string | null;
  runtimePolicyArrived: boolean;
  audioContextState: string;
  userActivationState: string;
  planTransportPostedCount: number;
  stableLaneBlendEvents: number;
  stableLaneReliefEvents: number;
  stableLaneFrameDelta: number;
  stableLaneFrameFresh: boolean;
  stableLaneQuanta: number;
  syntheticSilentProbeStatus: string;
  syntheticSilentProbeFrameDelta: number;
  syntheticSilentProbeLaneQuantaDelta: number;
  decision: StableLaneLiveDeliveryDecision;
  blockers: string[];
  note: string;
};

export type StableLaneLiveDeliveryResponsibilityLike = {
  rootFollowVoiceEngineMode: RootFollowVoiceEngineMode;
  frameDelta: number;
  frameAdvanceFresh: boolean;
  laneQuanta: number;
  planTransportPostedCount: number;
};

export function buildStableLaneLiveDeliveryProofReport(args: {
  currentVoiceEngineMode: RootFollowVoiceEngineMode;
  stressComparison: AudioStressComparisonSnapshot | null;
  responsibility: StableLaneLiveDeliveryResponsibilityLike;
  audioProbe: StableLaneAudioContextUserGestureProbeSnapshot;
  syntheticSilentProbe: RootFollowStableLaneSyntheticSilentProbeResult | null;
}): StableLaneLiveDeliveryProofReport {
  const uiDefaultArrived = args.currentVoiceEngineMode === 'worklet-stable-lane-pilot'
    && args.responsibility.rootFollowVoiceEngineMode === 'worklet-stable-lane-pilot';
  const runtimeModeObserved = args.stressComparison?.rootFollowVoiceEngineMode ?? null;
  const runtimePolicyArrived = runtimeModeObserved === 'worklet-stable-lane-pilot'
    || args.responsibility.planTransportPostedCount > 0
    || (args.stressComparison?.stableLaneBlendEvents ?? 0) > 0
    || (args.stressComparison?.stableLaneReliefEvents ?? 0) > 0;
  const planTransportPostedCount = Math.max(
    args.responsibility.planTransportPostedCount,
    args.stressComparison?.workletStableLanePlanTransportPostedCount ?? 0,
  );
  const stableLaneBlendEvents = args.stressComparison?.stableLaneBlendEvents ?? 0;
  const stableLaneReliefEvents = args.stressComparison?.stableLaneReliefEvents ?? 0;
  const stableLaneFrameDelta = Math.max(
    args.responsibility.frameDelta,
    args.syntheticSilentProbe?.renderedFrameDelta ?? 0,
    args.stressComparison?.workletStableLaneRenderedFrameDelta ?? 0,
  );
  const stableLaneQuanta = Math.max(
    args.responsibility.laneQuanta,
    args.syntheticSilentProbe?.laneQuantaDelta ?? 0,
    args.stressComparison?.workletStableLaneActiveRenderQuantumCount ?? 0,
  );
  const stableLaneFrameFresh = args.responsibility.frameAdvanceFresh
    || Boolean(args.stressComparison?.workletStableLaneFrameAdvanceFresh)
    || (args.syntheticSilentProbe?.renderedFrameDelta ?? 0) > 0;
  const blockers: string[] = [];
  if (!uiDefaultArrived) blockers.push('worklet-stable-lane-pilot-ui-default-not-arrived');
  if (args.audioProbe.audioContextState !== 'running') blockers.push(`audio-context-${args.audioProbe.audioContextState}`);
  if (!runtimePolicyArrived) blockers.push('stable-lane-runtime-policy-not-observed');
  if (planTransportPostedCount <= 0) blockers.push('stable-lane-plan-transport-not-posted');
  if (stableLaneBlendEvents <= 0 && stableLaneReliefEvents <= 0) blockers.push('stable-lane-blend-or-relief-event-not-observed');
  if (stableLaneFrameDelta <= 0 || stableLaneQuanta <= 0) blockers.push('stable-lane-frame-proof-missing');
  if (!stableLaneFrameFresh && stableLaneFrameDelta > 0) blockers.push('stable-lane-frame-window-stale');

  let decision: StableLaneLiveDeliveryDecision = 'live-route-observed';
  if (!uiDefaultArrived) decision = 'runtime-mode-mismatch';
  else if (args.audioProbe.audioContextState !== 'running') decision = 'blocked-before-audio';
  else if (!runtimePolicyArrived) decision = 'ui-default-only';
  else if (planTransportPostedCount <= 0) decision = 'needs-plan-transport';
  else if (stableLaneBlendEvents <= 0 && stableLaneReliefEvents <= 0) decision = 'needs-blend-event';
  else if (stableLaneFrameDelta <= 0 || stableLaneQuanta <= 0) decision = 'needs-frame-proof';

  return {
    version: 1,
    reportKind: 'stable-lane-live-delivery-proof',
    generatedAtIso: new Date().toISOString(),
    currentVoiceEngineMode: args.currentVoiceEngineMode,
    uiDefaultArrived,
    runtimeModeObserved,
    runtimePolicyArrived,
    audioContextState: args.audioProbe.audioContextState,
    userActivationState: args.audioProbe.userActivationState,
    planTransportPostedCount,
    stableLaneBlendEvents,
    stableLaneReliefEvents,
    stableLaneFrameDelta,
    stableLaneFrameFresh,
    stableLaneQuanta,
    syntheticSilentProbeStatus: args.syntheticSilentProbe?.status ?? 'not-run',
    syntheticSilentProbeFrameDelta: args.syntheticSilentProbe?.renderedFrameDelta ?? 0,
    syntheticSilentProbeLaneQuantaDelta: args.syntheticSilentProbe?.laneQuantaDelta ?? 0,
    decision,
    blockers,
    note: 'Live-Delivery-Proof prüft, ob Worklet Stable-Lane Pilot nicht nur im Select steht, sondern im laufenden Root/Material-Pfad Plantransport, Blend/Relief-Events und Frame-Fortschritt erzeugt.',
  };
}

export function formatStableLaneLiveDeliveryProofUiValue(report: StableLaneLiveDeliveryProofReport): string {
  return `${report.decision} · mode ${report.currentVoiceEngineMode} · P ${report.planTransportPostedCount} · Δ ${report.stableLaneFrameDelta} · Q ${report.stableLaneQuanta}`;
}
