import { recordAudioPressureCount } from "../../../core/audio/audioPressureMap";
import type {
  TransientEventPlan,
  TransientRuntime,
  TransientSource,
  TransientVoiceHandle,
} from "../../resonance/transientRuntime";
import type { WaveTimbreGradientState } from "../rooms/resonanceRuntimeMath";
import type { ScheduledToneHandle } from "./useAudioContextRuntimeRefs";
import { createWaveStarterGradientToneGraph, disconnectWaveStarterGradientToneGraph } from "./waveStarterGradientToneGraph";
import { resolveWaveStarterGradientToneRenderPlan, resolveWaveStarterGradientToneShape } from "./waveStarterGradientToneShape";
import { registerScheduledToneLifecycle } from "./scheduledToneLifecycle";
import { isEntrophonWaveVoiceActive } from "../../../core/audio/xensonarMicrotonalSoundEngine";
import { isAudioEventValid } from "../../../core/audio/safeAudioScheduling";
import {
  readWaveStarterRequestClockMs,
  resolveWaveStarterIntendedStartTimeSec,
} from "./waveStarterRequestTimeline";

type MutableRefLike<T> = { current: T };

export type WaveStarterScheduledTonePlayer = (
  freq: number,
  offset: number,
  dur: number,
  type: OscillatorType,
  volume: number,
  q: number,
  cutoff: number,
  targetDestinations?: AudioNode | Array<AudioNode | null | undefined> | null,
  options?: {
    source?: TransientSource;
    plan?: TransientEventPlan | null;
    prominence?: number;
    intendedStartTimeSec?: number;
  },
) => boolean;

export type PlayWaveStarterGradientToneArgs = {
  ctx: AudioContext;
  toneFreq: number;
  delay: number;
  duration: number;
  waveform: OscillatorType;
  gain: number;
  resonance: number;
  cutoffHz: number;
  prominence: number;
  waveGradient: WaveTimbreGradientState;
  wavePlan: TransientEventPlan | null;
  waveTargets: Array<AudioNode | null | undefined>;
  mainOutput: AudioNode;
  heldLong: boolean;
  activeScheduledTonesRef: MutableRefLike<ScheduledToneHandle[]>;
  transientRuntime: Pick<TransientRuntime, "admitVoice" | "pickTargets" | "releaseVoice">;
  playScheduledTone: WaveStarterScheduledTonePlayer;
  attackSoftening?: number;
  /** Request-clock origin captured by the Wellenstarter lane before any deferred callback. */
  requestedAtMs?: number;
  /** Pre-resolved once per attack so Classic/OFF does not re-read Entrophon state per partial. */
  entrophonWaveActive?: boolean;
  /** Suppress pressure-map writes for the 90.61 direct Wellenstarter path. */
  silentHotPath?: boolean;
};

export function playWaveStarterGradientTone(args: PlayWaveStarterGradientToneArgs): boolean {
  const recordHotPathCount: typeof recordAudioPressureCount = args.silentHotPath
    ? () => undefined
    : recordAudioPressureCount;
  const gradientShape = resolveWaveStarterGradientToneShape({
    waveGradient: args.waveGradient,
    duration: args.duration,
    gain: args.gain,
    resonance: args.resonance,
    cutoffHz: args.cutoffHz,
  });
  const { gradientDuration, shapedVolume, shapedResonance, shapedCutoff } = gradientShape;
  const hasOriginalRequestTime = args.requestedAtMs !== undefined && Number.isFinite(args.requestedAtMs);
  const intendedStartTimeSec = resolveWaveStarterIntendedStartTimeSec({
    audioNowSec: args.ctx.currentTime,
    requestNowMs: readWaveStarterRequestClockMs(),
    requestedAtMs: args.requestedAtMs,
    delaySec: args.delay,
    audioClockRunning: args.ctx.state === "running",
  });
  // Do not turn stale deferred Wellenstarter work into an immediate resume-time
  // cluster. Twenty milliseconds is intentionally tighter than the generic tone
  // envelope window: this lane is attack-driven and newer intent supersedes old.
  if (hasOriginalRequestTime && !isAudioEventValid(args.ctx, intendedStartTimeSec, 0.02)) {
    recordHotPathCount("scheduled-tone-oscillator", "voice-rejected", 1);
    return false;
  }

  // Patch 116: when Entrophon Wellenstarter is active, every Wellenstarter tone
  // uses the same live voice path. The Xensonar grid still supplies pitch; Entrophon
  // supplies waveform, unison, detune, ADSR, bend, filter, fold, delay and body color.
  // The legacy gradient graph remains only as the disabled/Classic fallback.
  const entrophonWaveActive = args.entrophonWaveActive ?? isEntrophonWaveVoiceActive();
  if (gradientShape.useScheduledTonePath || entrophonWaveActive) {
    return args.playScheduledTone(
      args.toneFreq,
      args.delay,
      gradientDuration,
      args.waveform,
      shapedVolume,
      shapedResonance,
      shapedCutoff,
      args.waveTargets,
      {
        source: "wave",
        plan: args.wavePlan,
        prominence: args.prominence,
        intendedStartTimeSec: hasOriginalRequestTime ? intendedStartTimeSec : undefined,
      },
    );
  }

  const activeCount = args.activeScheduledTonesRef.current.length;
  const now = Math.max(intendedStartTimeSec, args.ctx.currentTime + 0.005);
  let ticket: TransientVoiceHandle | null = null;
  let overloadSoftening = 1;
  let gainScale = 1;
  let auxTargets: Array<AudioNode | null | undefined> = [...args.waveTargets];

  if (args.wavePlan) {
    ticket = args.transientRuntime.admitVoice(args.wavePlan, args.prominence);
    if (!ticket) {
      recordHotPathCount("scheduled-tone-oscillator", "voice-rejected", 1);
      return false;
    }
    overloadSoftening = ticket.plan.envelopeScale;
    gainScale = ticket.plan.gainScale;
    auxTargets = args.transientRuntime.pickTargets(auxTargets, ticket) as Array<AudioNode | null | undefined>;
  } else {
    const fallbackLoad = activeCount >= 72 ? 1.35 : 1;
    overloadSoftening = fallbackLoad;
    if (activeCount >= 120) {
      recordHotPathCount("scheduled-tone-oscillator", "voice-rejected", 1);
      return false;
    }
    if (activeCount >= 92) auxTargets = auxTargets.slice(0, 1);
    else if (activeCount >= 72) auxTargets = auxTargets.slice(0, 2);
  }

  const gradientRenderPlan = resolveWaveStarterGradientToneRenderPlan({
    waveGradient: args.waveGradient,
    toneFreq: args.toneFreq,
    now,
    gradientDuration,
    shapedVolume,
    activeCount,
    heldLong: args.heldLong,
    gainScale,
    overloadSoftening,
    attackSoftening: args.attackSoftening ?? 1,
  });
  const { stopAt } = gradientRenderPlan;

  const gradientGraph = createWaveStarterGradientToneGraph({
    ctx: args.ctx,
    toneFreq: args.toneFreq,
    waveform: args.waveform,
    shapedCutoff,
    shapedResonance,
    waveGradient: args.waveGradient,
    renderPlan: gradientRenderPlan,
    mainOutput: args.mainOutput,
    auxTargets,
  });
  const { osc, finalOut, dryFilter } = gradientGraph;

  const activeTone = { osc, gain: finalOut, filter: dryFilter, ticket };
  osc.onended = registerScheduledToneLifecycle({
    activeScheduledTonesRef: args.activeScheduledTonesRef,
    transientRuntime: args.transientRuntime,
    activeTone,
    disconnect: () => disconnectWaveStarterGradientToneGraph(gradientGraph),
  });
  osc.start(now);
  osc.stop(stopAt);
  return true;
}
