import {
  getEntrophonRuntime,
  resolveEntrophonWaveRuntimePressure,
  rememberEntrophonWaveStart,
  shouldRejectEntrophonWaveForChordBurst,
  resolveEntrophonWavePressureGainScale,
  chooseEntrophonOscillatorFrequencies,
  estimateEntrophonWaveRuntimeCost,
  readRuntimeNowMs,
} from "./entrophonWaveAdmission";
import { recordAudioPressureAdaptiveAction, recordAudioPressureCount } from "../../../core/audio/audioPressureMap";
import {
  isAudioEventValid,
  safeApplyAttack,
  safeApplyExponentialRelease,
} from "../../../core/audio/safeAudioScheduling";
import type {
  TransientEventPlan,
  TransientRuntime,
  TransientSource,
  TransientVoiceHandle,
} from "../../resonance/transientRuntime";
import type { ScheduledToneHandle } from "./useAudioContextRuntimeRefs";
import { createScheduledToneGraph, registerScheduledToneLifecycle } from "./scheduledToneLifecycle";
import {
  isEntrophonWaveVoiceActive,
  makeXensonarEngineDriveCurve,
  resolveXensonarMicrotonalVoice,
} from "../../../core/audio/xensonarMicrotonalSoundEngine";
import {
  noteBrowserEntrophonLegacyFallback,
  trySubmitBrowserEntrophonVoice,
  reserveBrowserEntrophonVoice,
  cancelUnsubmittedBrowserEntrophonVoice,
} from "../browserImplant/useBrowserEntrophonImplant";

type EntrophonVoiceOsc = { osc: OscillatorNode; freq: number; level: number; role: "base" | "color" };

type MutableRefLike<T> = { current: T };

export type ScheduledTonePlaybackOptions = {
  source?: TransientSource;
  plan?: TransientEventPlan | null;
  prominence?: number;
  /** Original intended start on this AudioContext timeline. Preserving it prevents resume-time catch-up bursts. */
  intendedStartTimeSec?: number;
};

export type ScheduledTonePlaybackRequest = {
  freq: number;
  offset: number;
  dur: number;
  type: OscillatorType;
  volume: number;
  q?: number;
  cutoff?: number;
  targetDestinations?: AudioNode | Array<AudioNode | null | undefined> | null;
  options?: ScheduledTonePlaybackOptions;
};

export type ScheduledTonePlaybackDeps = {
  ctx: AudioContext;
  activeScheduledTonesRef: MutableRefLike<ScheduledToneHandle[]>;
  transientRuntime: Pick<TransientRuntime, "admitVoice" | "pickTargets" | "releaseVoice"> &
    Partial<Pick<TransientRuntime, "retainRejectedAdmission">>;
  getMainOutput: (ctx: AudioContext) => AudioNode;
  heldLong: boolean;
  recordCount?: typeof recordAudioPressureCount;
  recordAdaptiveAction?: typeof recordAudioPressureAdaptiveAction;
  /** Keep specific sources allocations-light by suppressing pressure writes in the tone hot path. */
  silentHotPathSources?: Partial<Record<TransientSource, boolean>>;
  /** Test seam: production defaults to the real browser C11 Entrophon submitter. */
  submitEntrophonC11?: typeof trySubmitBrowserEntrophonVoice;
  /** Test seam: production defaults to route observability. */
  noteEntrophonLegacyFallback?: typeof noteBrowserEntrophonLegacyFallback;
};

const noopRecordCount: typeof recordAudioPressureCount = () => undefined;
const noopRecordAdaptiveAction: typeof recordAudioPressureAdaptiveAction = () => undefined;
const BURST_TRANSIENT_MAX_CATCHUP_SEC = 0.02;

function resolveEffectiveToneLatenessSec(
  source: TransientSource | undefined,
  hasOriginalIntent: boolean,
  maxLatenessSec: number,
): number {
  return hasOriginalIntent && (source === "wave" || source === "particle")
    ? Math.min(maxLatenessSec, BURST_TRANSIENT_MAX_CATCHUP_SEC)
    : maxLatenessSec;
}

function retainPostAdmissionReject(
  transientRuntime: ScheduledTonePlaybackDeps["transientRuntime"],
  ticket: TransientVoiceHandle | null,
): void {
  if (transientRuntime.retainRejectedAdmission) {
    transientRuntime.retainRejectedAdmission(ticket);
    return;
  }
  // Compatibility fallback for narrow test doubles / legacy embeddings.
  transientRuntime.releaseVoice(ticket);
}

function resolveTargetDestinations(
  targetDestinations: ScheduledTonePlaybackRequest["targetDestinations"],
): Array<AudioNode | null | undefined> {
  return Array.isArray(targetDestinations) ? targetDestinations : targetDestinations ? [targetDestinations] : [];
}

function admitScheduledTone(
  deps: ScheduledTonePlaybackDeps,
  request: ScheduledTonePlaybackRequest,
  recordCount: typeof recordAudioPressureCount,
) {
  const activeCount = deps.activeScheduledTonesRef.current.length;
  const now = deps.ctx.currentTime + request.offset;
  let ticket: TransientVoiceHandle | null = null;
  let overloadSoftening = 1;
  let gainScale = 1;
  let auxTargets = resolveTargetDestinations(request.targetDestinations);

  if (request.options?.plan && request.options?.source) {
    ticket = deps.transientRuntime.admitVoice(request.options.plan, request.options.prominence ?? 1);
    if (!ticket) {
      recordCount("scheduled-tone-oscillator", "voice-rejected", 1);
      return null;
    }
    overloadSoftening = ticket.plan.envelopeScale;
    gainScale = ticket.plan.gainScale;
    try {
      auxTargets = deps.transientRuntime.pickTargets(auxTargets, ticket) as Array<AudioNode | null | undefined>;
    } catch (error) {
      deps.transientRuntime.releaseVoice(ticket);
      throw error;
    }
  } else {
    const fallbackLoad = activeCount >= 72 ? 1.35 : 1;
    overloadSoftening = fallbackLoad;
    if (activeCount >= 120) {
      recordCount("scheduled-tone-oscillator", "voice-rejected", 1);
      return null;
    }
    if (activeCount >= 92) auxTargets = auxTargets.slice(0, 1);
    else if (activeCount >= 72) auxTargets = auxTargets.slice(0, 2);
  }

  return { now, ticket, overloadSoftening, gainScale, auxTargets };
}

function playLegacyScheduledToneWithLifecycle(
  deps: ScheduledTonePlaybackDeps,
  request: ScheduledTonePlaybackRequest,
): boolean {
  const forcePressureTelemetry = request.options?.source === "wave" && isEntrophonWaveVoiceActive();
  const isSilentHotPathSource = request.options?.source
    ? deps.silentHotPathSources?.[request.options.source] === true && !forcePressureTelemetry
    : false;
  const recordCount = isSilentHotPathSource ? noopRecordCount : (deps.recordCount ?? recordAudioPressureCount);
  const recordAdaptiveAction = isSilentHotPathSource
    ? noopRecordAdaptiveAction
    : (deps.recordAdaptiveAction ?? recordAudioPressureAdaptiveAction);
  const admission = admitScheduledTone(deps, request, recordCount);
  if (!admission) return false;
  const { now, ticket, overloadSoftening, gainScale, auxTargets } = admission;

  const actualDur = deps.heldLong ? request.dur * 6 : request.dur;
  const attackDur = Math.min(0.032, Math.max(0.005, actualDur * 0.18 * overloadSoftening));
  const releaseDur = Math.min(0.14, Math.max(0.03, actualDur * 0.42 * overloadSoftening));
  const maxLatenessSec = Math.max(0.018, Math.min(0.09, actualDur * 0.4 + attackDur));
  const originalIntent = request.options?.intendedStartTimeSec;
  const hasOriginalIntent = originalIntent !== undefined;
  const validityStartTimeSec = originalIntent ?? now;
  // Wellenstarter and particle attacks are transients, not deferred work. Replaying
  // an attack more than one ~20 ms window late after a control stall creates a
  // catch-up cluster; non-burst-critical sources keep their prior duration window.
  const effectiveMaxLatenessSec = resolveEffectiveToneLatenessSec(
    request.options?.source,
    hasOriginalIntent,
    maxLatenessSec,
  );
  if (!isAudioEventValid(deps.ctx, validityStartTimeSec, effectiveMaxLatenessSec)) {
    deps.transientRuntime.releaseVoice(ticket);
    recordCount("scheduled-tone-oscillator", "voice-rejected", 1);
    recordAdaptiveAction("safe-envelope-stale-dropped", 1);
    return false;
  }

  const graph = createScheduledToneGraph();
  const { own } = graph;
  let cleanup: (() => void) | null = null;
  try {
    recordCount("scheduled-tone-oscillator", "voice-admitted", 1);
    const mainOutput = deps.getMainOutput(deps.ctx);
    const osc = own(deps.ctx.createOscillator());
    const gain = own(deps.ctx.createGain());
    const filter = own(deps.ctx.createBiquadFilter());
    osc.type = request.type;
    osc.frequency.value = request.freq;
    const envelope = safeApplyAttack({
      param: gain.gain,
      audioCtx: deps.ctx,
      intendedStartTime: validityStartTimeSec,
      attackDurationSec: attackDur,
      peakValue: Math.max(0.0002, request.volume * gainScale),
    });
    if (envelope.usedCatchUpRamp) {
      recordAdaptiveAction("safe-envelope-catchup-ramped", 1);
    }
    const safeStart = envelope.safeStartTime;
    const peakAt = envelope.actualPeakTime;
    const isWaveSource = request.options?.source === "wave";
    const useDecayEnvelope = isWaveSource;
    const releaseStart = useDecayEnvelope
      ? peakAt
      : Math.max(peakAt + 0.006, safeStart + Math.max(attackDur + 0.006, actualDur - releaseDur));
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(request.cutoff ?? 2400, safeStart);
    filter.Q.setValueAtTime(request.q ?? 1, safeStart);
    const releaseEnd = useDecayEnvelope
      ? safeApplyExponentialRelease({
          param: gain.gain,
          audioCtx: deps.ctx,
          releaseStartTime: safeStart + actualDur,
          releaseDurationSec: Math.max(0.01, releaseDur * 0.45),
          startValue: Math.max(0.0002, request.volume * gainScale),
        })
      : (() => {
          gain.gain.setTargetAtTime(0.0001, releaseStart, Math.max(0.01, releaseDur * 0.34));
          return releaseStart + releaseDur;
        })();
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(mainOutput);
    auxTargets.forEach((target) => {
      if (target && target !== mainOutput) gain.connect(target);
    });
    const activeTone = { osc, gain, filter, ticket };
    const stopAt = releaseEnd + 0.08;
    cleanup = registerScheduledToneLifecycle({
      activeScheduledTonesRef: deps.activeScheduledTonesRef,
      transientRuntime: deps.transientRuntime,
      activeTone,
      disconnect: graph.dispose,
    });
    osc.onended = cleanup;
    recordCount("scheduled-tone-oscillator", "oscillator-start", 1);
    recordCount("scheduled-tone-oscillator", "gain-node-create", 1);
    recordCount("scheduled-tone-oscillator", "filter-node-create", 1);
    osc.start(safeStart);
    osc.stop(stopAt);
    return true;
  } catch (error) {
    if (cleanup) cleanup();
    else {
      try {
        deps.transientRuntime.releaseVoice(ticket);
      } finally {
        graph.dispose();
      }
    }
    throw error;
  }
}

export function playScheduledToneWithLifecycle(
  deps: ScheduledTonePlaybackDeps,
  request: ScheduledTonePlaybackRequest,
): boolean {
  // Validate before ticket admission or AudioNode construction, including legacy callers.
  if (
    deps.ctx.state === "closed" ||
    !Number.isFinite(request.freq) ||
    request.freq <= 0 ||
    !Number.isFinite(request.dur) ||
    request.dur <= 0 ||
    !Number.isFinite(request.offset) ||
    !Number.isFinite(request.volume) ||
    request.volume <= 0 ||
    (request.q !== undefined && !Number.isFinite(request.q)) ||
    (request.cutoff !== undefined && !Number.isFinite(request.cutoff)) ||
    (request.options?.intendedStartTimeSec !== undefined &&
      !Number.isFinite(request.options.intendedStartTimeSec))
  )
    return false;
  if (request.options?.source !== "wave" || !isEntrophonWaveVoiceActive()) {
    return playLegacyScheduledToneWithLifecycle(deps, request);
  }
  // Reserve before VoiceSpec, pressure shaping, FX/node work or encoding. Held
  // voices keep their explicit early-release renderer; test seams own themselves.
  const reservationToken = !deps.heldLong && !deps.submitEntrophonC11
    ? reserveBrowserEntrophonVoice(deps.ctx, request.options?.intendedStartTimeSec ?? deps.ctx.currentTime + request.offset)
    : 0;
  if (reservationToken < 0) return true;
  try {
  const forcePressureTelemetry = reservationToken === 0 && request.options?.source === "wave" && isEntrophonWaveVoiceActive();
  const isSilentHotPathSource = request.options?.source
    ? deps.silentHotPathSources?.[request.options.source] === true && !forcePressureTelemetry
    : false;
  const recordCount = isSilentHotPathSource ? noopRecordCount : (deps.recordCount ?? recordAudioPressureCount);
  const recordAdaptiveAction = isSilentHotPathSource
    ? noopRecordAdaptiveAction
    : (deps.recordAdaptiveAction ?? recordAudioPressureAdaptiveAction);
  const admission = admitScheduledTone(deps, request, recordCount);
  if (!admission) return false;
  const { now, ticket, overloadSoftening, gainScale, auxTargets } = admission;

  const actualDur = deps.heldLong ? request.dur * 6 : request.dur;
  const state = getEntrophonRuntime(deps.ctx);
  const runtimeNowMs = readRuntimeNowMs();
  const prominence = request.options?.prominence ?? 1;
  const preVoicePressure = reservationToken > 0 ? 0 : Math.max(resolveEntrophonWaveRuntimePressure(state, runtimeNowMs), ticket?.plan.load ?? 0);
  if (
    shouldRejectEntrophonWaveForChordBurst({
      state,
      pressure: preVoicePressure,
      prominence,
      offsetSec: Math.max(0, request.offset),
      nowMs: runtimeNowMs,
    })
  ) {
    retainPostAdmissionReject(deps.transientRuntime, ticket);
    recordCount("scheduled-tone-oscillator", "voice-rejected", 1);
    recordAdaptiveAction("transient-dropped-voice", 1);
    return false;
  }
  const microVoice = resolveXensonarMicrotonalVoice({
    surface: "wave",
    freq: request.freq,
    waveform: request.type,
    velocity: request.volume,
    filterFreq: request.cutoff,
    filterQ: request.q,
  });
  const runtimePressure = preVoicePressure;
  const oscillatorPlan = chooseEntrophonOscillatorFrequencies(microVoice, runtimePressure);
  const chordGainScale = resolveEntrophonWavePressureGainScale(runtimePressure);
  if (oscillatorPlan.pressure >= 0.46) {
    recordAdaptiveAction("transient-reduced-event", 1);
  }
  const attackDur = Math.min(
    Math.max(0.0008, microVoice.attack * overloadSoftening),
    Math.max(0.004, actualDur * 0.42),
  );
  const releaseDur = Math.min(2.5, Math.max(0.006, microVoice.release * overloadSoftening));
  const maxLatenessSec = Math.max(0.018, Math.min(0.09, actualDur * 0.4 + attackDur));
  const originalIntent = request.options?.intendedStartTimeSec;
  const hasOriginalIntent = originalIntent !== undefined;
  const validityStartTimeSec = originalIntent ?? now;
  const effectiveMaxLatenessSec = resolveEffectiveToneLatenessSec(
    request.options?.source,
    hasOriginalIntent,
    maxLatenessSec,
  );
  if (!isAudioEventValid(deps.ctx, validityStartTimeSec, effectiveMaxLatenessSec)) {
    retainPostAdmissionReject(deps.transientRuntime, ticket);
    recordCount("scheduled-tone-oscillator", "voice-rejected", 1);
    recordAdaptiveAction("safe-envelope-stale-dropped", 1);
    return false;
  }

  // Exactly silent color branches need no oscillator. Keep the old normalization
  // denominator so removing their CPU cost does not change the audible base level.
  const normalizationOscillatorCount = oscillatorPlan.baseFreqs.length + oscillatorPlan.colorFreqs.length;
  const audibleColors = oscillatorPlan.colorFreqs
    .map((freq, index) => ({ freq, level: microVoice.colorGains[index] ?? 0.12 }))
    .filter(({ level }) => level !== 0);
  const delayAmount = microVoice.delayAmount * oscillatorPlan.delayScale;
  const projectedCost = estimateEntrophonWaveRuntimeCost({
    oscillatorCount: oscillatorPlan.baseFreqs.length + audibleColors.length,
    delayActive: delayAmount > 0.002,
  });
  if (reservationToken === 0 && state.activeEntrophonWaveVoiceCost > 0 && state.activeEntrophonWaveVoiceCost + projectedCost > 68) {
    retainPostAdmissionReject(deps.transientRuntime, ticket);
    recordCount("scheduled-tone-oscillator", "voice-rejected", Math.max(1, Math.ceil(projectedCost)));
    recordAdaptiveAction("transient-dropped-voice", 1);
    return false;
  }

  // Xensonar 395 candidate: ownership cut at the last semantically complete
  // boundary before Legacy AudioNode construction. The browser/control side
  // still owns tuning, pressure thinning and musical policy; C11 owns the actual
  // Entrophon oscillator/filter/envelope/delay execution from this point onward.
  const submitEntrophonC11 = deps.submitEntrophonC11 ?? trySubmitBrowserEntrophonVoice;
  const noteEntrophonLegacy = deps.noteEntrophonLegacyFallback ?? noteBrowserEntrophonLegacyFallback;
  const waveformCode = ({ sine: 0, triangle: 1, sawtooth: 2, square: 3 } as Partial<Record<OscillatorType, number>>)[microVoice.waveform];
  const filterCode = ({ lowpass: 0, highpass: 1, bandpass: 2, notch: 3 } as Partial<Record<BiquadFilterType, number>>)[microVoice.filterType];
  // Hold/Space has its own early-release lifecycle through activeScheduledTonesRef.
  // Keep that special subclass on its proven Legacy lifecycle until C11 has a
  // token-addressed release command; migrating it here would silently break release.
  if (deps.heldLong) {
    noteEntrophonLegacy(deps.ctx, "held-special-path");
  } else if (waveformCode !== undefined && filterCode !== undefined) {
    const bendMul = Math.pow(2, microVoice.pitchBend / 12);
    const filterPeak = Math.max(80, Math.min(19000, microVoice.filterFreq * (1 + microVoice.filterEnvAmount * 1.45)));
    const sr = deps.ctx.sampleRate;
    const releaseStartSec = Math.max(
      attackDur + 0.004,
      Math.max(attackDur + 0.006, actualDur - Math.min(actualDur * 0.42, releaseDur * 0.35)),
    );
    const releaseSec = Math.max(0.008, releaseDur);
    const stopAfterSec = releaseStartSec + releaseSec + 0.08 + delayAmount * 0.4;
    const filterAttackSec = Math.max(0.003, attackDur);
    const filterDecaySec = Math.max(filterAttackSec + 1 / sr, Math.max(0.012, microVoice.filterDecay));
    let c11TicketReleased = false;
    const releaseC11Ticket = () => {
      if (c11TicketReleased) return;
      c11TicketReleased = true;
      deps.transientRuntime.releaseVoice(ticket);
    };
    const c11 = submitEntrophonC11(deps.ctx, {
      reservationToken: reservationToken > 0 ? reservationToken : undefined,
      onEnded: releaseC11Ticket,
      intendedStartTimeSec: validityStartTimeSec,
      auxTargets,
      waveform: waveformCode,
      filterType: filterCode,
      baseFreqs: oscillatorPlan.baseFreqs,
      colorFreqs: audibleColors.map(color => color.freq),
      colorGains: audibleColors.map(color => color.level),
      peakGain: Math.max(0.0002, request.volume * gainScale * microVoice.gainScale * chordGainScale),
      sustainGain: Math.max(0.0001, request.volume * gainScale * microVoice.gainScale * chordGainScale * microVoice.sustain),
      attackFrames: Math.max(1, Math.round(attackDur * sr)),
      decayFrames: Math.max(0, Math.round(Math.max(0.005, microVoice.decay) * sr)),
      releaseStartFrames: Math.max(1, Math.round(releaseStartSec * sr)),
      releaseFrames: Math.max(1, Math.round(releaseSec * sr)),
      stopAfterFrames: Math.max(2, Math.round(stopAfterSec * sr)),
      pitchBendMul: Math.abs(microVoice.pitchBend) > 0.0001 ? bendMul : 1,
      pitchBendFrames: Math.abs(microVoice.pitchBend) > 0.0001 ? Math.max(1, Math.round(Math.max(0.002, microVoice.pitchBendTime) * sr)) : 0,
      filterStartHz: microVoice.filterFreq,
      filterPeakHz: filterPeak,
      filterEndHz: Math.max(70, microVoice.filterFreq * 0.62),
      filterAttackFrames: Math.max(1, Math.round(filterAttackSec * sr)),
      filterDecayFrames: Math.max(2, Math.round(filterDecaySec * sr)),
      filterQ: microVoice.filterQ,
      preDriveGain: 0.62 + microVoice.distortion * 0.28,
      driveAmount: microVoice.drive,
      bodyFreqHz: Math.max(80, microVoice.tunedFreq * 1.5),
      bodyQ: 3.2,
      bodyGain: 0.08 + microVoice.reverbAmount * 0.14 + microVoice.colorAmount * 0.04,
      delayFrames: delayAmount > 0.002 ? Math.max(1, Math.round((0.08 + microVoice.reverbAmount * 0.08) * sr)) : 0,
      delayWetGain: delayAmount > 0.002 ? delayAmount * 0.16 : 0,
      delayFeedback: delayAmount > 0.002 ? Math.min(0.42, delayAmount * 0.38) : 0,
      normalizationGain: 1 / Math.max(1, normalizationOscillatorCount * 0.7),
    });
    if (c11.owned) {
      if (!c11.submitted) {
        releaseC11Ticket();
        recordCount("scheduled-tone-oscillator", "voice-rejected", 1);
        return true; // C11 already owns this render class; never replay ambiguously through Legacy.
      }
      recordCount("scheduled-tone-oscillator", "voice-admitted", 1);
      // The render callback releases this lease. A wall-clock timeout could
      // free it while the AudioContext is suspended and the voice still exists.
      return true;
    }
    noteEntrophonLegacy(deps.ctx, "pre-ready");
  }

  const graph = createScheduledToneGraph();
  const { own } = graph;
  let cleanup: (() => void) | null = null;
  try {
    recordCount("scheduled-tone-oscillator", "voice-admitted", 1);
    const mainOutput = deps.getMainOutput(deps.ctx);
    const bendMul = Math.pow(2, microVoice.pitchBend / 12);
    const applyPitchBend = (osc: OscillatorNode, oscFreq: number, startTime: number) => {
      osc.frequency.setValueAtTime(oscFreq, startTime);
      if (Math.abs(microVoice.pitchBend) > 0.0001) {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(10, oscFreq * bendMul),
          startTime + Math.max(0.002, microVoice.pitchBendTime),
        );
      }
    };
    const baseOscs: EntrophonVoiceOsc[] = oscillatorPlan.baseFreqs.map((oscFreq) => {
      const osc = own(deps.ctx.createOscillator());
      osc.type = microVoice.waveform;
      return { osc, freq: oscFreq, level: 1, role: "base" };
    });
    const colorOscs: EntrophonVoiceOsc[] = audibleColors.map(({ freq: oscFreq, level }) => {
      const osc = own(deps.ctx.createOscillator());
      osc.type = "square";
      return { osc, freq: oscFreq, level, role: "color" };
    });
    const voiceOscs = [...baseOscs, ...colorOscs];
    const osc = voiceOscs[0]?.osc;
    if (!osc) throw new Error("Entrophon voice has no base oscillator");
    const gain = own(deps.ctx.createGain());
    const preDrive = own(deps.ctx.createGain());
    const drive = own(deps.ctx.createWaveShaper());
    const filter = own(deps.ctx.createBiquadFilter());
    const bodyBand = own(deps.ctx.createBiquadFilter());
    const bodyBandGain = own(deps.ctx.createGain());
    const envelope = safeApplyAttack({
      param: gain.gain,
      audioCtx: deps.ctx,
      intendedStartTime: validityStartTimeSec,
      attackDurationSec: attackDur,
      peakValue: Math.max(0.0002, request.volume * gainScale * microVoice.gainScale * chordGainScale),
    });
    if (envelope.usedCatchUpRamp) {
      recordAdaptiveAction("safe-envelope-catchup-ramped", 1);
    }
    const safeStart = envelope.safeStartTime;
    const peakAt = envelope.actualPeakTime;
    const isWaveSource = request.options?.source === "wave";
    const useDecayEnvelope = isWaveSource || microVoice.decay > 0.005;
    const sustainLevel = Math.max(
      0.0001,
      request.volume * gainScale * microVoice.gainScale * chordGainScale * microVoice.sustain,
    );
    if (useDecayEnvelope) {
      gain.gain.linearRampToValueAtTime(sustainLevel, peakAt + Math.max(0.005, microVoice.decay));
    }
    const releaseStart = Math.max(
      peakAt + 0.004,
      safeStart + Math.max(attackDur + 0.006, actualDur - Math.min(actualDur * 0.42, releaseDur * 0.35)),
    );
    drive.curve = makeXensonarEngineDriveCurve(microVoice.drive);
    drive.oversample = "2x";
    preDrive.gain.setValueAtTime(0.62 + microVoice.distortion * 0.28, safeStart);
    filter.type = microVoice.filterType;
    filter.frequency.setValueAtTime(microVoice.filterFreq, safeStart);
    const filterPeak = Math.max(80, Math.min(19000, microVoice.filterFreq * (1 + microVoice.filterEnvAmount * 1.45)));
    filter.frequency.exponentialRampToValueAtTime(filterPeak, safeStart + Math.max(0.003, attackDur));
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(70, microVoice.filterFreq * 0.62),
      safeStart + Math.max(0.012, microVoice.filterDecay),
    );
    filter.Q.setValueAtTime(microVoice.filterQ, safeStart);
    bodyBand.type = "bandpass";
    bodyBand.frequency.setValueAtTime(Math.max(80, microVoice.tunedFreq * 1.5), safeStart);
    bodyBand.Q.setValueAtTime(3.2, safeStart);
    bodyBandGain.gain.setValueAtTime(0.08 + microVoice.reverbAmount * 0.14 + microVoice.colorAmount * 0.04, safeStart);
    const releaseEnd = safeApplyExponentialRelease({
      param: gain.gain,
      audioCtx: deps.ctx,
      releaseStartTime: releaseStart,
      releaseDurationSec: Math.max(0.008, releaseDur),
      startValue: Math.max(0.0002, useDecayEnvelope ? sustainLevel : request.volume * gainScale * chordGainScale),
    });
    const baseGain = own(deps.ctx.createGain());
    baseGain.gain.setValueAtTime(1 / Math.max(1, normalizationOscillatorCount * 0.7), safeStart);
    baseGain.connect(preDrive);
    baseGain.connect(bodyBand);
    for (const { osc: voiceOsc } of baseOscs) voiceOsc.connect(baseGain);
    for (const { osc: voiceOsc, level } of colorOscs) {
      const colorGain = own(deps.ctx.createGain());
      colorGain.gain.setValueAtTime(level / Math.max(1, normalizationOscillatorCount * 0.7), safeStart);
      voiceOsc.connect(colorGain);
      colorGain.connect(preDrive);
      colorGain.connect(bodyBand);
    }
    preDrive.connect(drive);
    drive.connect(filter);
    bodyBand.connect(bodyBandGain);
    bodyBandGain.connect(gain);
    filter.connect(gain);
    gain.connect(mainOutput);
    let delayNode: DelayNode | null = null;
    let delayGain: GainNode | null = null;
    let delayFeedback: GainNode | null = null;
    if (delayAmount > 0.002) {
      delayNode = own(deps.ctx.createDelay(1.6));
      delayGain = own(deps.ctx.createGain());
      delayFeedback = own(deps.ctx.createGain());
      delayNode.delayTime.setValueAtTime(0.08 + microVoice.reverbAmount * 0.08, safeStart);
      delayGain.gain.setValueAtTime(delayAmount * 0.16, safeStart);
      delayFeedback.gain.setValueAtTime(Math.min(0.42, delayAmount * 0.38), safeStart);
      gain.connect(delayNode);
      delayNode.connect(delayFeedback);
      delayFeedback.connect(delayNode);
      delayNode.connect(delayGain);
      delayGain.connect(mainOutput);
    }
    auxTargets.forEach((target) => {
      if (target && target !== mainOutput) gain.connect(target);
    });
    const activeTone = { osc, gain, filter, ticket };
    const stopAt = releaseEnd + 0.08 + delayAmount * 0.4;
    state.activeEntrophonWaveVoiceCost += projectedCost;
    let releasedEntrophonCost = false;
    const releaseEntrophonRuntimeCost = () => {
      if (releasedEntrophonCost) return;
      releasedEntrophonCost = true;
      state.activeEntrophonWaveVoiceCost = Math.max(0, state.activeEntrophonWaveVoiceCost - projectedCost);
    };
    cleanup = registerScheduledToneLifecycle({
      activeScheduledTonesRef: deps.activeScheduledTonesRef,
      transientRuntime: deps.transientRuntime,
      activeTone,
      disconnect: () => {
        releaseEntrophonRuntimeCost();
        graph.dispose();
      },
    });
    osc.onended = cleanup;
    recordCount("scheduled-tone-oscillator", "oscillator-start", voiceOscs.length);
    recordCount(
      "scheduled-tone-oscillator",
      "gain-node-create",
      1 + colorOscs.length + (delayAmount > 0.002 ? 2 : 0) + 3,
    );
    recordCount("scheduled-tone-oscillator", "filter-node-create", 2);
    voiceOscs.forEach(({ osc: voiceOsc, freq }) => {
      applyPitchBend(voiceOsc, freq, safeStart);
      voiceOsc.start(safeStart);
      voiceOsc.stop(stopAt);
    });
    rememberEntrophonWaveStart({ state, cost: projectedCost, nowMs: runtimeNowMs });
    return true;
  } catch (error) {
    if (cleanup) cleanup();
    else {
      try {
        deps.transientRuntime.releaseVoice(ticket);
      } finally {
        graph.dispose();
      }
    }
    throw error;
  }
  } finally {
    cancelUnsubmittedBrowserEntrophonVoice(deps.ctx, reservationToken);
  }
}
