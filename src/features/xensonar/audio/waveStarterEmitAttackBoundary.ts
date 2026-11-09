import { recordAudioPressureAdaptiveAction } from "../../../core/audio/audioPressureMap";
import { resolveWaveStarterPlaybackSelection } from "../../soundLibrary/waveStarterSoundAdapter";
import type { Room3ExciterProfile } from "../../resonance/modalBody";
import type {
  TransientEventPlan,
  TransientRuntime,
} from "../../resonance/transientRuntime";
import { acquireTransientPlaybackLease } from "../../resonance/transientRuntime";
import type {
  WaveOvertoneWaveform,
  WaveTimbreGradientPreset,
  WaveVolumeGradientPreset,
} from "../domain/instrumentData";
import { getWaveTransientDemand } from "../rooms/transientDemandProfiles";
import type { ActiveWaveOvertone } from "../rooms/resonanceRuntimeMath";
import type { ScheduledToneHandle } from "./useAudioContextRuntimeRefs";
import type { WaveStarterEmitOptions } from "./waveStarterLaneRuntimeBridge";
import { resolveWaveStarterEmitState } from "./waveStarterEmitState";
import {
  playWaveStarterGradientTone,
  type WaveStarterScheduledTonePlayer,
} from "./waveStarterGradientTonePlayback";
import {
  isWaveStarterSampleSelection,
  playWaveStarterSampleSelection,
} from "./waveStarterSamplePlaybackBoundary";
import { playWaveStarterHarmonicPlaybackPlans } from "./waveStarterHarmonicPlaybackOrchestrator";
import {
  buildWaveStarterVoiceSpec,
  publishWaveStarterVoiceSpecFailoverContract,
  resolveWaveStarterVoiceSpecSourceIntent,
} from "./waveStarterVoiceSpecFailoverContract";
import {
  buildWaveStarterSynthFailoverCandidate,
  publishWaveStarterSampleFailoverBlocked,
  publishWaveStarterSynthFailoverCandidatePosted,
} from "./waveStarterSynthFailoverCandidate";
import { publishWaveStarterSampleFailoverBlockedUntilHydrated } from "./waveStarterSampleBufferTokenShadow";
import {
  buildWaveStarterSampleFailoverCandidate,
  publishWaveStarterSampleFailoverBlockedMissingToken,
  publishWaveStarterSampleFailoverCandidateBlockedUntilHydrated,
  publishWaveStarterSampleFailoverCandidatePosted,
} from "./waveStarterSampleFailoverCandidate";
import {
  getWaveStarterWorkletPilotSnapshot,
  postWaveStarterWorkletSampleFailoverCandidate,
  postWaveStarterWorkletSynthFailoverCandidate,
  postWaveStarterWorkletVoiceSpecShadow,
} from "./waveStarterWorkletPilotBridge";
import {
  publishWaveStarterFailoverDecisionGate,
} from "./waveStarterFailoverDecisionGate";
import { recordWaveStarterFailoverGateLedgerEntry } from "./waveStarterFailoverEventLedger";

import {
  buildWaveStarterAuxTargets,
  ensureWaveStarterFxRoutes,
  type EnsureWaveStarterFxRoutesArgs,
} from "./waveStarterFxRouting";
import { resolveWaveStarterAttackSofteningForEmit } from "./waveStarterAttackIntegrityCongestionBrake";
import {
  buildWaveStarterWorkletInstrumentEngineSkeletonSubmission,
  publishWaveStarterWorkletInstrumentEngineSkeletonSubmission,
} from "./waveStarterWorkletInstrumentEngineSkeleton";
import { submitWaveStarterWorkletVoicePoolRuntime } from "./waveStarterWorkletVoicePoolRuntime";
import { isExplicitWaveStarterWorkletSpecialPath } from "./waveStarterWorkletRuntimeOwnership";
import type { WaveStarterOvertoneMode } from "./waveStarterOvertonePlaybackPlan";
import { estimateWaveStarterBodySourceDemand } from "./waveStarterBodyExciterPlan";
import {
  estimateEntrophonWaveVoiceDemand,
  isEntrophonWaveVoiceActive,
} from "../../../core/audio/xensonarMicrotonalSoundEngine";

type MutableRefLike<T> = { current: T };

const CLASSIC_WAVE_VOICE_DEMAND = Object.freeze({ requestedVoiceMultiplier: 1 });

type WaveStarterRuntimeSnapshot = {
  enabled: boolean;
  preset: string;
  volume: number;
};

type WaveStarterCursorSnapshot = {
  cursorX: number;
  cursorY: number;
};

type WaveStarterNexusSoundParamsSnapshot = {
  waveTimbreGradientEnabled: boolean;
  waveTimbreGradientX: WaveTimbreGradientPreset;
  waveVolumeGradientEnabled: boolean;
  waveVolumeGradientX: WaveVolumeGradientPreset;
  waveOvertonesEnabled: boolean;
  waveOvertones: Partial<Record<string, number>>;
  waveOvertoneWaveform: WaveOvertoneWaveform;
  waveOvertoneMode: WaveStarterOvertoneMode;
  waveOvertoneGlobalLevel?: number;
};

type WaveStarterFxTargetSnapshot = {
  transientDriveWaves: AudioNode | null | undefined;
  psychedelicSpiralWaves: AudioNode | null | undefined;
  collectiveMemoryWaves: AudioNode | null | undefined;
  enterHoldPsyFxWaves: AudioNode | null | undefined;
  enterHoldPsyFxEnabled: boolean;
  enterHoldActive: boolean;
  schwarmdeuterWaves: AudioNode | null | undefined;
  myzelPostFxWaves: AudioNode | null | undefined;
};

export type EmitWaveStarterAttackArgs = {
  ctx: AudioContext;
  baseFreq: number;
  isSector: boolean;
  options?: WaveStarterEmitOptions;
  runtime: WaveStarterRuntimeSnapshot;
  cursor: WaveStarterCursorSnapshot;
  nexusSound: WaveStarterNexusSoundParamsSnapshot;
  fxRoutes: Omit<EnsureWaveStarterFxRoutesArgs, "ctx" | "essentialWaveOnly">;
  fxTargets: WaveStarterFxTargetSnapshot;
  octaveHeld: boolean;
  swellBlend: number;
  heldLong: boolean;
  activeScheduledTonesRef: MutableRefLike<ScheduledToneHandle[]>;
  transientRuntime: Pick<
    TransientRuntime,
    "canAdmitVoice" | "admitVoice" | "pickTargets" | "releaseVoice"
  >;
  beginTransientEvent: (
    source: "wave",
    requestedVoices: number,
    intensity?: number,
  ) => TransientEventPlan | null;
  getWaveOutput: (ctx: AudioContext) => AudioNode;
  primeMyzelFromY: (cursorY: number, source: "wave") => void;
  playScheduledTone: WaveStarterScheduledTonePlayer;
  triggerBodyExciter: (
    profile: Room3ExciterProfile,
    freq: number,
    gain: number,
    options: { voiceBudget: number; bodyScale: number; acquireVoice?: () => { gainScale: number; release: () => void } | null },
  ) => void;
  enqueueOvertoneArp: (
    baseFreq: number,
    volume: number,
    activeMix: ActiveWaveOvertone[],
    isSector: boolean,
  ) => void;
};

function acquireWaveStarterSampleVoice(
  args: EmitWaveStarterAttackArgs,
  volume: number,
  targets: Array<AudioNode | null | undefined>,
) {
  const plan = args.beginTransientEvent("wave", 1, volume);
  return plan
    ? acquireTransientPlaybackLease(args.transientRuntime, plan, 1, targets)
    : null;
}

function emitWaveStarter9061DirectAttack(args: EmitWaveStarterAttackArgs): void {
  const runtime = args.runtime;
  if (!runtime.enabled) return;

  if (!args.transientRuntime.canAdmitVoice("wave")) return;

  const resolvedWaveSelection = resolveWaveStarterPlaybackSelection(args.options?.waveStarterPresetOverride ?? runtime.preset);
  const {
    playbackFreq: freq,
    volume: vol,
    waveGradient,
  } = resolveWaveStarterEmitState({
    baseFreq: args.baseFreq,
    isSector: args.isSector,
    cursorX: args.cursor.cursorX,
    octaveHeld: args.octaveHeld,
    swell: args.swellBlend,
    runtimeVolume: runtime.volume,
    waveTimbreGradientEnabled: args.nexusSound.waveTimbreGradientEnabled,
    waveTimbreGradientX: args.nexusSound.waveTimbreGradientX,
    waveVolumeGradientEnabled: args.nexusSound.waveVolumeGradientEnabled,
    waveVolumeGradientX: args.nexusSound.waveVolumeGradientX,
  });

  const isSampleSelection = isWaveStarterSampleSelection(resolvedWaveSelection);

  const essentialWaveOnly = false;
  args.primeMyzelFromY(args.cursor.cursorY, "wave");
  const waveOutput = args.getWaveOutput(args.ctx);
  ensureWaveStarterFxRoutes({
    ctx: args.ctx,
    essentialWaveOnly,
    ...args.fxRoutes,
  });
  const waveTargets = buildWaveStarterAuxTargets({
    essentialWaveOnly,
    ...args.fxTargets,
  });

  if (isSampleSelection) {
    // 90.61/6.8.7 direct-sample contract: the hard canAdmitVoice gate above is
    // sufficient here. Do not allocate a generic lease/ticket/timer for a sample hit.
    void playWaveStarterSampleSelection({
      ctx: args.ctx,
      selection: resolvedWaveSelection,
      requestedAtMs: args.options?.requestedAtMs,
      baseFreq: freq,
      volume: vol,
      isSector: args.isSector,
      output: waveOutput,
      auxTargets: waveTargets,
      primeTokenShadow: false,
    });
    return;
  }

  const resolvedWavePreset = resolvedWaveSelection.presetId;
  const entrophonWaveActive = isEntrophonWaveVoiceActive();
  const entrophonDemand = entrophonWaveActive
    ? estimateEntrophonWaveVoiceDemand()
    : CLASSIC_WAVE_VOICE_DEMAND;
  // 6.8.7/90.61 core-voice semantics: the transient event budgets the audible
  // wave partials, not a theoretical body-exciter graph that may be disabled.
  // Folding body demand into this number defeats low-intensity thinning (e.g.
  // tape_halo 3 -> 2 at normal volume) and makes every attack materially heavier.
  const requestedVoices = Math.max(
    1,
    Math.ceil(
      (getWaveTransientDemand(resolvedWavePreset) + (args.nexusSound.waveOvertonesEnabled ? 2 : 0))
        * entrophonDemand.requestedVoiceMultiplier,
    ),
  );
  const wavePlan = args.beginTransientEvent(
    "wave",
    requestedVoices,
    vol * (args.isSector ? 1.25 : 1),
  );
  const playWaveGradientTone = (
    toneFreq: number,
    delay: number,
    duration: number,
    waveform: OscillatorType,
    gain: number,
    resonance: number,
    cutoffHz: number,
    prominence: number,
  ) =>
    playWaveStarterGradientTone({
      ctx: args.ctx,
      toneFreq,
      delay,
      duration,
      waveform,
      gain,
      resonance,
      cutoffHz,
      prominence,
      waveGradient,
      wavePlan,
      waveTargets,
      mainOutput: waveOutput,
      heldLong: args.heldLong,
      activeScheduledTonesRef: args.activeScheduledTonesRef,
      transientRuntime: args.transientRuntime,
      playScheduledTone: args.playScheduledTone,
      entrophonWaveActive,
      attackSoftening: 1,
      requestedAtMs: args.options?.requestedAtMs,
      silentHotPath: true,
    });

  if (essentialWaveOnly) {
    playWaveGradientTone(
      freq,
      0,
      args.isSector ? 0.22 : 0.18,
      "triangle",
      vol * (args.isSector ? 0.36 : 0.3),
      1.0,
      1800,
      1,
    );
    return;
  }

  playWaveStarterHarmonicPlaybackPlans({
    preset: resolvedWavePreset,
    freq,
    volume: vol,
    runtimeVolume: runtime.volume,
    isSector: args.isSector,
    transientBodyScale: wavePlan?.bodyScale ?? 1,
    gradientAmount: waveGradient.amount,
    swellBlend: args.swellBlend,
    overtonesEnabled: args.nexusSound.waveOvertonesEnabled,
    overtoneAmounts: args.nexusSound.waveOvertones,
    overtoneWaveform: args.nexusSound.waveOvertoneWaveform,
    overtoneMode: args.nexusSound.waveOvertoneMode,
    overtoneGlobalLevel: args.nexusSound.waveOvertoneGlobalLevel ?? 1,
    callbacks: {
      playGradientTone: (tone) =>
        playWaveGradientTone(
          tone.toneFreq,
          tone.delay,
          tone.duration,
          tone.waveform,
          tone.gain,
          tone.resonance,
          tone.cutoffHz,
          tone.prominence,
        ),
      // Match 6.8.7 direct-path semantics: body excitation is a following colour
      // layer and does not inflate or consume the core partial admission budget.
      triggerBodyExciter: (profile, bodyFreq, gain, options) => args.triggerBodyExciter(
        profile,
        bodyFreq,
        gain,
        options,
      ),
      enqueueOvertoneArp: args.enqueueOvertoneArp,
    },
  });
}

export function emitWaveStarterAttack(args: EmitWaveStarterAttackArgs): void {
  const runtime = args.runtime;
  if (!runtime.enabled) return;

  if (args.options?.legacy9061DirectGate === true) {
    emitWaveStarter9061DirectAttack(args);
    return;
  }

  const essentialWaveOnly = false;
  args.primeMyzelFromY(args.cursor.cursorY, "wave");
  const waveOutput = args.getWaveOutput(args.ctx);
  recordAudioPressureAdaptiveAction("wave-starter-lane-space-routed");
  const resolvedWaveSelection = resolveWaveStarterPlaybackSelection(
    args.options?.waveStarterPresetOverride ?? runtime.preset,
  );

  const {
    playbackFreq: freq,
    volume: vol,
    microVoiceDemandMul,
    waveGradient,
  } = resolveWaveStarterEmitState({
    baseFreq: args.baseFreq,
    isSector: args.isSector,
    cursorX: args.cursor.cursorX,
    octaveHeld: args.octaveHeld,
    swell: args.swellBlend,
    runtimeVolume: runtime.volume,
    waveTimbreGradientEnabled: args.nexusSound.waveTimbreGradientEnabled,
    waveTimbreGradientX: args.nexusSound.waveTimbreGradientX,
    waveVolumeGradientEnabled: args.nexusSound.waveVolumeGradientEnabled,
    waveVolumeGradientX: args.nexusSound.waveVolumeGradientX,
    options: args.options,
  });

  const microAttackSoftening = args.options?.microOrchestrated
    ? resolveWaveStarterAttackSofteningForEmit({
        requestedSoftening: args.options.microAttackSoftening,
        congestionState: args.options.congestionBrakeState,
      })
    : 1;

  if (isExplicitWaveStarterWorkletSpecialPath(args.options)) {
    const voiceSpec = buildWaveStarterVoiceSpec({
      selection: resolvedWaveSelection,
      runtimePresetId: args.options?.waveStarterPresetOverride ?? runtime.preset,
      runtimeVolume: runtime.volume,
      baseFreqHz: args.baseFreq,
      playbackFreqHz: freq,
      gain: vol,
      isSector: args.isSector,
      createdAtMs: args.options?.requestedAtMs,
      sourceIntent: resolveWaveStarterVoiceSpecSourceIntent(args.options),
      microGainScale: args.options?.microGainScale ?? null,
      microVoiceDemandMul:
        args.options?.microVoiceDemandMul ?? microVoiceDemandMul,
      timbreGradientEnabled: args.nexusSound.waveTimbreGradientEnabled,
      timbreGradientX: args.nexusSound.waveTimbreGradientX,
      volumeGradientEnabled: args.nexusSound.waveVolumeGradientEnabled,
      volumeGradientX: args.nexusSound.waveVolumeGradientX,
      gradientAmount: waveGradient.amount,
      overtonesEnabled: args.nexusSound.waveOvertonesEnabled,
      overtoneWaveform: args.nexusSound.waveOvertoneWaveform,
      overtoneMode: args.nexusSound.waveOvertoneMode,
      overtoneGlobalLevel: args.nexusSound.waveOvertoneGlobalLevel ?? 1,
      overtoneAmounts: args.nexusSound.waveOvertones,
      swellBlend: args.swellBlend,
    });
    postWaveStarterWorkletVoiceSpecShadow(args.ctx, voiceSpec);
    const pilotSnapshot = getWaveStarterWorkletPilotSnapshot();
    publishWaveStarterVoiceSpecFailoverContract({
      spec: voiceSpec,
      workletSpecMirrorAcceptedCount:
        pilotSnapshot.voiceSpecMirrorAcceptedCount,
    });
    const failoverDecision = publishWaveStarterFailoverDecisionGate({
      voiceSpec,
      options: args.options,
      pilotSnapshot,
    });
    recordWaveStarterFailoverGateLedgerEntry(failoverDecision);

    const instrumentEngineSubmission =
      buildWaveStarterWorkletInstrumentEngineSkeletonSubmission({
        voiceSpec,
        options: args.options,
        pilotSnapshot,
      });
    if (instrumentEngineSubmission) {
      publishWaveStarterWorkletInstrumentEngineSkeletonSubmission(
        instrumentEngineSubmission,
      );
    }

    const voicePoolRuntimeResult = submitWaveStarterWorkletVoicePoolRuntime({
      ctx: args.ctx,
      voiceSpec,
      options: args.options,
      pilotSnapshot,
      submission: instrumentEngineSubmission,
    });
    if (voicePoolRuntimeResult.handledByWorklet) return;
    if (!voicePoolRuntimeResult.allowLegacyFallback) {
      // Keyboard glissando and Hold-Gesture-Loop pulses must not fall back into
      // a full legacy node burst when explicitly marked Worklet-only. The musical
      // gesture may lose this Wellenstarter accent, but it must not block
      // Drum/Bass/Material/Root-Follow. Gesture-loop pulses keep legacy fallback
      // by default until the Worklet voice-pool runtime is proven audible.
      return;
    }

    if (args.options?.sampleWorkletFailoverCandidate && voiceSpec.kind === "sample") {
      if (failoverDecision.decision !== "sample-failover") {
        publishWaveStarterSampleFailoverBlocked(
          voiceSpec,
          pilotSnapshot,
        );
        publishWaveStarterSampleFailoverBlockedUntilHydrated(
          voiceSpec,
          pilotSnapshot,
        );
        if (failoverDecision.decision === "drop-token-missing") {
          publishWaveStarterSampleFailoverBlockedMissingToken(
            voiceSpec,
            pilotSnapshot,
          );
        } else {
          publishWaveStarterSampleFailoverCandidateBlockedUntilHydrated(
            voiceSpec,
            pilotSnapshot,
          );
        }
        return;
      }
      const candidate = buildWaveStarterSampleFailoverCandidate(voiceSpec);
      const postedSnapshot = postWaveStarterWorkletSampleFailoverCandidate(
        args.ctx,
        candidate,
      );
      publishWaveStarterSampleFailoverCandidatePosted(
        candidate,
        postedSnapshot,
      );
      return;
    }

    if (args.options?.synthWorkletFailoverCandidate) {
      if (failoverDecision.decision !== "synth-failover" || voiceSpec.kind !== "synth") {
        if (voiceSpec.kind === "sample") {
          publishWaveStarterSampleFailoverBlocked(
            voiceSpec,
            pilotSnapshot,
          );
          publishWaveStarterSampleFailoverBlockedUntilHydrated(
            voiceSpec,
            pilotSnapshot,
          );
          publishWaveStarterSampleFailoverCandidateBlockedUntilHydrated(
            voiceSpec,
            pilotSnapshot,
          );
        }
        return;
      }
      const candidate = buildWaveStarterSynthFailoverCandidate(voiceSpec);
      const postedSnapshot = postWaveStarterWorkletSynthFailoverCandidate(
        args.ctx,
        candidate,
      );
      publishWaveStarterSynthFailoverCandidatePosted(candidate, postedSnapshot);
      return;
    }
  }

  ensureWaveStarterFxRoutes({
    ctx: args.ctx,
    essentialWaveOnly,
    ...args.fxRoutes,
  });
  const waveTargets = buildWaveStarterAuxTargets({
    essentialWaveOnly,
    ...args.fxTargets,
  });

  if (isWaveStarterSampleSelection(resolvedWaveSelection)) {
    void playWaveStarterSampleSelection({
      ctx: args.ctx,
      selection: resolvedWaveSelection,
      acquireVoice: () => acquireWaveStarterSampleVoice(args, vol, waveTargets),
      requestedAtMs: args.options?.requestedAtMs,
      baseFreq: freq,
      volume: vol,
      isSector: args.isSector,
      output: waveOutput,
      auxTargets: waveTargets,
    });
    return;
  }

  const resolvedWavePreset = resolvedWaveSelection.presetId;
  const baseRequestedVoices =
    getWaveTransientDemand(resolvedWavePreset) +
    (args.nexusSound.waveOvertonesEnabled ? 2 : 0);
  const entrophonWaveActive = isEntrophonWaveVoiceActive();
  const entrophonDemand = entrophonWaveActive
    ? estimateEntrophonWaveVoiceDemand()
    : CLASSIC_WAVE_VOICE_DEMAND;
  const requestedVoices = Math.max(
    1,
    Math.ceil(baseRequestedVoices * microVoiceDemandMul * entrophonDemand.requestedVoiceMultiplier)
      + estimateWaveStarterBodySourceDemand(resolvedWavePreset),
  );
  const wavePlan = args.beginTransientEvent(
    "wave",
    requestedVoices,
    vol * (args.isSector ? 1.25 : 1),
  );
  const playWaveGradientTone = (
    toneFreq: number,
    delay: number,
    duration: number,
    waveform: OscillatorType,
    gain: number,
    resonance: number,
    cutoffHz: number,
    prominence: number,
  ) =>
    playWaveStarterGradientTone({
      ctx: args.ctx,
      toneFreq,
      delay,
      duration,
      waveform,
      gain,
      resonance,
      cutoffHz,
      prominence,
      waveGradient,
      wavePlan,
      waveTargets,
      mainOutput: waveOutput,
      heldLong: args.heldLong,
      activeScheduledTonesRef: args.activeScheduledTonesRef,
      transientRuntime: args.transientRuntime,
      playScheduledTone: args.playScheduledTone,
      entrophonWaveActive,
      attackSoftening: microAttackSoftening,
      requestedAtMs: args.options?.requestedAtMs,
    });

  if (essentialWaveOnly) {
    playWaveGradientTone(
      freq,
      0,
      args.isSector ? 0.22 : 0.18,
      "triangle",
      vol * (args.isSector ? 0.36 : 0.3),
      1.0,
      1800,
      1,
    );
    return;
  }

  playWaveStarterHarmonicPlaybackPlans({
    preset: resolvedWavePreset,
    freq,
    volume: vol,
    runtimeVolume: runtime.volume,
    isSector: args.isSector,
    transientBodyScale: wavePlan?.bodyScale ?? 1,
    gradientAmount: waveGradient.amount,
    swellBlend: args.swellBlend,
    overtonesEnabled: args.nexusSound.waveOvertonesEnabled,
    overtoneAmounts: args.nexusSound.waveOvertones,
    overtoneWaveform: args.nexusSound.waveOvertoneWaveform,
    overtoneMode: args.nexusSound.waveOvertoneMode,
    overtoneGlobalLevel: args.nexusSound.waveOvertoneGlobalLevel ?? 1,
    callbacks: {
      playGradientTone: (tone) =>
        playWaveGradientTone(
          tone.toneFreq,
          tone.delay,
          tone.duration,
          tone.waveform,
          tone.gain,
          tone.resonance,
          tone.cutoffHz,
          tone.prominence,
        ),
      triggerBodyExciter: (profile, bodyFreq, gain, options) => args.triggerBodyExciter(
        profile,
        bodyFreq,
        gain,
        {
          ...options,
          acquireVoice: () => {
            if (!wavePlan) return null;
            const lease = acquireTransientPlaybackLease(args.transientRuntime, wavePlan, 0.45);
            return lease ? { gainScale: lease.gainScale, release: lease.release } : null;
          },
        },
      ),
      enqueueOvertoneArp: args.enqueueOvertoneArp,
    },
  });
}
