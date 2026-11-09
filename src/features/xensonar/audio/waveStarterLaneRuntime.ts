import type { AudioPressureAdaptiveAction } from "../../../core/audio/audioPressureMap";
import type { WaveStarterRuntimePolicy } from "../performanceCrisis/performanceCrisisRuntimePolicies";
import type { WaveStarterLaneState } from "./waveStarterLaneGuard";
import { createWaveStarterDirectSafeLane } from "./waveStarterDirectSafeLane";
import { readWaveStarterSpecialPathIsolationForHotPath } from "../performanceCrisis/waveStarterSpecialPathIsolationContract";
import { postWaveStarterWorkletShadowIntent } from "./waveStarterWorkletPilotBridge";
import { publishWaveStarterVoicePoolLiveReport, type WaveStarterVoicePoolLiveCounters,
  type WaveStarterVoicePoolLiveReport } from "./waveStarterVoicePoolLiveReport";

export type DeferredWaveStarterAttack = {
  id: number;
  baseFreq: number;
  isSector: boolean;
  requestedAtMs: number;
  attempts: number;
  options?: WaveStarterEmitOptions;
};

export type WaveStarterEmitOptions = {
  fromDeferredSlot?: boolean;
  requestedAtMs?: number;
  microOrchestrated?: boolean;
  microReason?: string;
  microGainScale?: number;
  microVoiceDemandMul?: number;
  microAttackSoftening?: number;
  congestionBrakeState?: "clear" | "watch" | "brake" | "critical";
  congestionBrakeReason?: string;
  attackIntegrityPreserved?: boolean;
  forceSustainExtend?: boolean;
  legacy9061DirectGate?: boolean;
  waveStarterPresetOverride?: string;
  keyboardGestureSource?:
    | "keyboard-direct"
    | "keyboard-glissando"
    | "apostrophe-hold";
  keyboardGlissandoWorkletDirect?: boolean;
  keyboardGlissandoWorkletOnly?: boolean;
  waveStarterGestureLoopWorkletBridge?: boolean;
  waveStarterGestureLoopWorkletOnly?: boolean;
  waveStarterSpecialPathDisabled?: boolean;
  waveStarterGestureLoopLane?: "wellenstart" | "klaviatur";
  waveStarterGestureLoopPulseIndex?: number;
  waveStarterGestureLoopSegmentsPerBar?: number;
  waveStarterGestureLoopExtendPolicy?: "none" | "apostrophe-safe-extend";
  waveStarterInstrumentEngineSkeleton?: boolean;
  waveStarterInstrumentEngineSource?:
    | "hold-gesture-loop"
    | "keyboard-glissando";
  waveStarterInstrumentEngineSegmentClock?: boolean;
  synthWorkletFailoverCandidate?: boolean;
  sampleWorkletFailoverCandidate?: boolean;
};

export type WaveStarterLaneRuntimeDeps = {
  getPressureBias: () => number;
  getActiveScheduledToneCount: () => number;
  getPolicy: () => WaveStarterRuntimePolicy | undefined;
  getAudioContext?: () => BaseAudioContext | null | undefined;
  emitAttack: (
    baseFreq: number,
    isSector: boolean,
    options?: WaveStarterEmitOptions,
  ) => void;
  recordAdaptiveAction: (action: AudioPressureAdaptiveAction) => void;
  nowMs?: () => number;
  setTimeoutFn?: (handler: () => void, delayMs: number) => number;
  clearTimeoutFn?: (id: number) => void;
};

export type WaveStarterLaneRuntime = {
  readonly state: WaveStarterLaneState;
  request: (
    baseFreq: number,
    isSector?: boolean,
    options?: WaveStarterEmitOptions,
  ) => void;
  flushDeferred: () => void;
  clearDeferredTimer: () => void;
  getLiveReport: () => WaveStarterVoicePoolLiveReport;
  dispose: () => void;
};

const LIVE_REPORT_FLUSH_MS = 900;

/** Special render routes share the immediate attack gate. Their routing flags
 * survive, but an expired discrete attack never becomes a deferred retry. */
export function createWaveStarterLaneRuntime(deps: WaveStarterLaneRuntimeDeps): WaveStarterLaneRuntime {
  let disposed = false, liveReportTimer: number | null = null, liveReportDirty = false;
  let lastAdmissionKind: string | null = null, lastAdmissionReason: string | null = null;
  let lastRequestAtMs: number | null = null, lastEmitAtMs: number | null = null, lastStaleDropAtMs: number | null = null;
  const nowMs = () => deps.nowMs?.() ?? performance.now();
  const setTimer = deps.setTimeoutFn ?? ((fn, ms) => window.setTimeout(fn, ms));
  const clearTimer = deps.clearTimeoutFn ?? (id => window.clearTimeout(id));
  const isolation = () => readWaveStarterSpecialPathIsolationForHotPath(deps.getPolicy());
  const counters: WaveStarterVoicePoolLiveCounters = {
    requestTotal: 0, admittedTotal: 0, deferredTotal: 0, latestIntentReplacedTotal: 0,
    flushAttemptTotal: 0, retrySlotTotal: 0, microReleasedTotal: 0,
    staleDroppedTotal: 0, overloadSlotTotal: 0, emittedFromDeferredTotal: 0,
  };
  const publishLiveReport = () => publishWaveStarterVoicePoolLiveReport({
    nowMs: nowMs(), pressureBias: deps.getPressureBias(), activeScheduledToneCount: deps.getActiveScheduledToneCount(),
    pendingSlotCount: 0, pendingRequestedAtMs: null, timerActive: false,
    lastAdmissionKind, lastAdmissionReason, lastRequestAtMs, lastEmitAtMs, lastStaleDropAtMs,
    lastMicroDecisionKind: null, lastMicroDecisionReason: null, lastMicroGainScale: null, lastMicroVoiceDemandMul: null,
    lastDeferredAtMs: null, lastFlushAtMs: null, lastMicroReleaseAtMs: null, disposed, counters,
  });
  const clearLiveReportTimer = () => {
    if(liveReportTimer!==null){clearTimer(liveReportTimer);liveReportTimer=null;}
  };
  const publishLiveReportIfAllowed = () => {
    if(!isolation().liveReports)return;
    liveReportDirty = true;
    if (liveReportTimer !== null) return;
    liveReportTimer = setTimer(() => {
      liveReportTimer=null;
      if(liveReportDirty && isolation().liveReports)publishLiveReport();
      liveReportDirty=false;
    },LIVE_REPORT_FLUSH_MS);
  };
  const gate=createWaveStarterDirectSafeLane({
    diagnosticName: "special-input",
    nowMs,
    getPressureBias: deps.getPressureBias,
    getActiveScheduledToneCount: deps.getActiveScheduledToneCount,
    getAudioFrame: () => {
      const ctx=deps.getAudioContext?.();
      return ctx ? ctx.state==='running' ? Math.round(ctx.currentTime*ctx.sampleRate) : NaN : nowMs()*48;
    },
    emitDirectAttack(baseFreq,isSector,options) {
      const policy=isolation();
      counters.admittedTotal++;lastEmitAtMs=nowMs();
      lastAdmissionKind='admit-full';lastAdmissionReason='immediate-live-attack';
      if(policy.workletShadowMirroring)postWaveStarterWorkletShadowIntent(deps.getAudioContext?.()??null,{
        baseFreq,isSector,requestedAtMs:options?.requestedAtMs??lastEmitAtMs,
        pressureBias:deps.getPressureBias(),activeScheduledToneCount:deps.getActiveScheduledToneCount(),
        admissionKind:lastAdmissionKind,admissionReason:lastAdmissionReason,source:'request',
      });
      deps.recordAdaptiveAction('wave-starter-lane-admitted');
      deps.emitAttack(baseFreq,isSector,(options?.waveStarterGestureLoopWorkletBridge || options?.keyboardGlissandoWorkletDirect) ? {
        ...options,microOrchestrated:true,
        waveStarterGestureLoopWorkletOnly:options.waveStarterGestureLoopWorkletBridge && !policy.holdGestureLegacyFallback ? true : options.waveStarterGestureLoopWorkletOnly,
      } : options);
    },
  });
  return {
    state:gate.state,
    request(baseFreq,isSector=false,options) {
      if(disposed)return;
      const requestedAtMs=options?.requestedAtMs??nowMs();
      lastRequestAtMs=requestedAtMs;counters.requestTotal++;
      const policy=isolation();
      if(options?.waveStarterSpecialPathDisabled || options?.fromDeferredSlot ||
        (options?.waveStarterGestureLoopWorkletBridge && !policy.holdGestureLoopWorkletBridge) ||
        ((options?.synthWorkletFailoverCandidate || options?.sampleWorkletFailoverCandidate) && !policy.staleFailoverCandidates)) {
        lastAdmissionKind='special-path-disabled';lastAdmissionReason='no-deferred-or-disabled-route';
        publishLiveReportIfAllowed();return;
      }
      const before=counters.admittedTotal;
      gate.request(baseFreq,isSector,{...options,requestedAtMs});
      if(counters.admittedTotal===before) {
        lastAdmissionKind='drop-overload';lastAdmissionReason='live-budget-or-deadline';
        if(nowMs()-requestedAtMs>20){
          counters.staleDroppedTotal++;lastStaleDropAtMs=nowMs();
          deps.recordAdaptiveAction('wave-starter-lane-stale-dropped');
        }
      }
      publishLiveReportIfAllowed();
    },
    flushDeferred() { /* No musical work is retained. */ },
    clearDeferredTimer() { /* No musical timer exists. */ },
    getLiveReport() { liveReportDirty=false;clearLiveReportTimer();return publishLiveReport(); },
    dispose() {
      disposed=true;
      clearLiveReportTimer();
      liveReportDirty = false;
      gate.dispose();
      publishLiveReport();
    },
  };
}
