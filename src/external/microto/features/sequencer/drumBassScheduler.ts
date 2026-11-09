import { type MutableRefObject, useEffect } from "react";
import { type Room } from "../../app/roomRegistry";
import { setSchedulerDriftMs } from "../runtime/schedulerDrift";
import { clamp, type QuantizeSubdivision } from "../../shared/tuning/grid";
import { type PlayOneShotTone } from "../audio";
import {
  getBaseParticleNodes,
} from "../resonance/config/particles";
import { type BassPattern, type DrumPattern, type ParticleSystem } from "../resonance/config/types";
import type { ResonanceState } from "../resonance/config/state";
import { getGrooveSlice } from "../resonance/config/stateSlices";
import {
  buildHarmonyCascadePlan,
  applyLongPatternPitchOffset,
  buildHyperPatternContext,
  computeSequencerStepState,
  deriveStepTiming,
  resolveComposerRootHz,
  type HarmonyCascadeEvent,
  type HyperPatternContext,
  type SequencerStepState,
} from "./policy";
import { isDrumCascadeAnchor, resolveBassTrigger, resolveDrumTriggers } from "./patternPolicy";

type SequencerParams = {
  quantizeSubdivision?: QuantizeSubdivision;
  quantizeBpm: number;
  quantizeMicroTightness?: number;
  hyperCalibrateOn: boolean;
  hyperCalibratedReady: boolean;
  hyperCalibratedPattern: number[];
  hyperCali2On: boolean;
  hyperCali2Ready: boolean;
  hyperCali2Weights64: number[];
  hyperCali2PitchOffsets: number[];
  bassRootMode: "auto" | "fixed";
  bassRootHz: number;
  bassVolume: number;
  bassActive: boolean;
  bassPattern: BassPattern;
  drumActive: boolean;
  drumPattern: DrumPattern;
  drumVolume: number;
  harmonyCascadeSteps: number;
  particleSystem: ParticleSystem;
};

type SequencerRefs = {
  cursorX: number;
  cursorY: number;
  nextAbsoluteStep: number | null;
  noiseBuffer: AudioBuffer | null;
};

type UseDrumBassSchedulerArgs = {
  room: Room;
  nexusActive: boolean;
  audioCtx: AudioContext | null;
  nexusParamsRef: MutableRefObject<ResonanceState>;
  nexusRefs: MutableRefObject<SequencerRefs>;
  freqFromY: (y: number) => number;
  playScheduledTone: PlayOneShotTone;
  clampFreq: (freq: number, min?: number, max?: number) => number;
  gameWidth: number;
};

export type SequencerStepPlan = {
  nextNoteTime: number;
  stepState: SequencerStepState;
  drum?: {
    kickVol?: number;
    snareVol?: number;
    hatVol?: number;
  };
  bass?: {
    freq: number;
    vol: number;
    dur: number;
  } | null;
  cascadePlan: HarmonyCascadeEvent[];
};

export const planSequencerStep = (args: {
  params: SequencerParams;
  timing: ReturnType<typeof deriveStepTiming>;
  patternContext: HyperPatternContext;
  nextStep: number;
  cursorX: number;
  cursorY: number;
  gameWidth: number;
  freqFromY: (y: number) => number;
  clampFreq: (freq: number, min?: number, max?: number) => number;
}): SequencerStepPlan => {
  const { params, timing, patternContext, nextStep } = args;
  const { subFactor, stepsPerBar, stepSeconds } = timing;
  const grooveTightness = clamp(params.quantizeMicroTightness ?? 0.74, 0, 1);

  const stepState = computeSequencerStepState({
    nextStep,
    subFactor,
    stepsPerBar,
    grooveTightness,
    patterns: patternContext,
  });

  const nextNoteTime = nextStep * stepSeconds;

  let cascadeAnchorRoot: number | null = null;
  let cascadeFromDrum = false;

  let drum: SequencerStepPlan["drum"];
  if (params.drumActive) {
    const volume = params.drumVolume * (0.6 + stepState.longWeight * 0.9);
    const drumTriggers = resolveDrumTriggers({
      drumPattern: params.drumPattern,
      baseStep: stepState.baseStep,
      finalHit: stepState.finalHit,
      finalNearHit: stepState.finalNearHit,
      heavyHitAllowed: stepState.heavyHitAllowed,
    });

    if (drumTriggers.kick || drumTriggers.snare || drumTriggers.hat) {
      const snareVol = drumTriggers.snare
        ? params.drumPattern === "four_on_floor"
          ? volume * 0.5
          : volume
        : undefined;
      const hatMul =
        params.drumPattern === "four_on_floor"
          ? 0.7
          : params.drumPattern === "breakbeat"
            ? 0.5
            : params.drumPattern === "idm"
              ? 0.4
              : 0.6;
      const hatVol = drumTriggers.hat ? volume * hatMul * stepState.hatMicroGain : undefined;

      drum = {
        kickVol: drumTriggers.kick ? volume : undefined,
        snareVol,
        hatVol,
      };
    }

    cascadeFromDrum = isDrumCascadeAnchor({
      baseStep: stepState.baseStep,
      finalHit: stepState.finalHit,
      heavyHitAllowed: stepState.heavyHitAllowed,
    });
  }

  let bass: SequencerStepPlan["bass"] = null;
  if (params.bassActive) {
    const root = applyLongPatternPitchOffset({
      rootHz: resolveComposerRootHz({
        bassRootMode: params.bassRootMode,
        bassRootHz: params.bassRootHz,
        cursorY: args.cursorY,
        freqFromY: args.freqFromY,
      }),
      longStepBase: stepState.longStepBase,
      hyper2PitchOffsets: patternContext.hyper2PitchOffsets,
      longWeight: stepState.longWeight,
    });
    const bassTrigger = resolveBassTrigger({
      bassPattern: params.bassPattern,
      baseStep: stepState.baseStep,
      finalHit: stepState.finalHit,
      bassHitAllowed: stepState.bassHitAllowed,
      root,
    });

    if (bassTrigger) {
      bass = {
        freq: bassTrigger.freq,
        vol: params.bassVolume,
        dur: stepSeconds * bassTrigger.durMul,
      };
      cascadeAnchorRoot = bassTrigger.freq;
    }
  }

  const cascadePlan: HarmonyCascadeEvent[] = [];
  if ((params.harmonyCascadeSteps ?? 0) > 0) {
    const cascadeRoot =
      cascadeAnchorRoot ?? (cascadeFromDrum ? resolveComposerRootHz({
        bassRootMode: params.bassRootMode,
        bassRootHz: params.bassRootHz,
        cursorY: args.cursorY,
        freqFromY: args.freqFromY,
      }) : null);
    if (cascadeRoot) {
      const baseNodes = getBaseParticleNodes(params.particleSystem);
      const ratios = baseNodes
        .map((node) => node.ratio)
        .filter((ratio) => Number.isFinite(ratio) && ratio > 0);
      const plan = buildHarmonyCascadePlan({
        harmonyCascadeSteps: params.harmonyCascadeSteps,
        anchorTime: nextNoteTime,
        rootHz: cascadeRoot,
        baseStep: stepState.baseStep,
        longWeight: stepState.longWeight,
        ratios,
        cursorX: args.cursorX,
        gameWidth: args.gameWidth,
        stepSeconds,
        bassVolume: params.bassVolume,
        clampFreq: args.clampFreq,
      });
      cascadePlan.push(...plan);
    }
  }

  return {
    nextNoteTime,
    stepState,
    drum,
    bass,
    cascadePlan,
  };
};

export function useDrumBassScheduler({
  room,
  nexusActive,
  audioCtx,
  nexusParamsRef,
  nexusRefs,
  freqFromY,
  playScheduledTone,
  clampFreq,
  gameWidth,
}: UseDrumBassSchedulerArgs) {
  useEffect(() => {
    if (room !== "RESONANCE" || !audioCtx || !nexusActive) return;

    let timerId = 0;
    const refs = nexusRefs.current;

    if (!refs.noiseBuffer) {
      const bufferSize = audioCtx.sampleRate;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i += 1) {
        data[i] = Math.random() * 2 - 1;
      }
      refs.noiseBuffer = buffer;
    }

    const playKick = (time: number, vol: number) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.1);
      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
      osc.start(time);
      osc.stop(time + 0.1);
    };

    const playSnare = (time: number, vol: number) => {
      const osc = audioCtx.createOscillator();
      const gainOsc = audioCtx.createGain();
      osc.type = "triangle";
      osc.connect(gainOsc);
      gainOsc.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(220, time);
      osc.frequency.exponentialRampToValueAtTime(80, time + 0.1);
      gainOsc.gain.setValueAtTime(vol * 0.5, time);
      gainOsc.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
      osc.start(time);
      osc.stop(time + 0.1);

      if (!refs.noiseBuffer) return;
      const noise = audioCtx.createBufferSource();
      noise.buffer = refs.noiseBuffer;
      const noiseFilter = audioCtx.createBiquadFilter();
      const noiseGain = audioCtx.createGain();

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(audioCtx.destination);

      noiseFilter.type = "bandpass";
      noiseFilter.frequency.setValueAtTime(3000, time);
      noiseFilter.Q.setValueAtTime(1.0, time);

      noiseGain.gain.setValueAtTime(vol * 0.8, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);

      noise.start(time);
      noise.stop(time + 0.25);
    };

    const playHat = (time: number, vol: number) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();
      osc.type = "square";
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      filter.type = "highpass";
      filter.frequency.setValueAtTime(6000, time);
      gain.gain.setValueAtTime(vol * 0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
      osc.start(time);
      osc.stop(time + 0.05);
    };

    const playBassNote = (time: number, freq: number, vol: number, dur: number) => {
      const osc = audioCtx.createOscillator();
      const subOsc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();
      osc.type = "sawtooth";
      subOsc.type = "sine";
      osc.connect(filter);
      subOsc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(freq * 3, time);
      filter.frequency.exponentialRampToValueAtTime(freq, time + dur * 0.5);
      osc.frequency.setValueAtTime(freq, time);
      subOsc.frequency.setValueAtTime(freq / 2, time);
      gain.gain.setValueAtTime(vol, time);
      gain.gain.setTargetAtTime(0, time + dur * 0.8, 0.02);
      osc.start(time);
      subOsc.start(time);
      osc.stop(time + dur);
      subOsc.stop(time + dur);
    };

    const schedule = () => {
      const groove = getGrooveSlice(nexusParamsRef);
      const subdivision = (groove.quantizeSubdivision ?? "16") as QuantizeSubdivision;
      const timing = deriveStepTiming(groove.quantizeBpm, subdivision);
      const { stepSeconds } = timing;
      if (!Number.isFinite(stepSeconds) || stepSeconds <= 0) {
        timerId = window.setTimeout(schedule, 25);
        return;
      }
      const now = audioCtx.currentTime;

      const patternContext = buildHyperPatternContext({
        hyperCalibrateOn: groove.hyperCalibrateOn,
        hyperCalibratedReady: groove.hyperCalibratedReady,
        hyperCalibratedPattern: groove.hyperCalibratedPattern,
        hyperCali2On: groove.hyperCali2On,
        hyperCali2Ready: groove.hyperCali2Ready,
        hyperCali2Weights64: groove.hyperCali2Weights64,
        hyperCali2PitchOffsets: groove.hyperCali2PitchOffsets,
      });

      let nextStep = nexusRefs.current.nextAbsoluteStep ?? Math.ceil(now / stepSeconds);
      if (Math.abs(nextStep * stepSeconds - now) > 1.0) {
        nextStep = Math.ceil(now / stepSeconds);
      }

      const nextStepTime = nextStep * stepSeconds;
      setSchedulerDriftMs((nextStepTime - now) * 1000);

      let safetyCounter = 0;
      while (nextStep * stepSeconds < now + 0.1 && safetyCounter < 128) {
        const plan = planSequencerStep({
          params: groove,
          timing,
          patternContext,
          nextStep,
          cursorX: nexusRefs.current.cursorX,
          cursorY: nexusRefs.current.cursorY,
          gameWidth,
          freqFromY,
          clampFreq,
        });

        if (plan.drum?.kickVol) {
          playKick(plan.nextNoteTime, plan.drum.kickVol);
        }
        if (plan.drum?.snareVol) {
          playSnare(plan.nextNoteTime, plan.drum.snareVol);
        }
        if (plan.drum?.hatVol) {
          playHat(plan.nextNoteTime, plan.drum.hatVol);
        }

        if (plan.bass) {
          playBassNote(plan.nextNoteTime, plan.bass.freq, plan.bass.vol, plan.bass.dur);
        }

        if (plan.cascadePlan.length) {
          for (const event of plan.cascadePlan) {
            playBassNote(event.time, event.bassFreq, event.bassVol, event.bassDur);
            const leadOffset = Math.max(0, event.time - audioCtx.currentTime);
            playScheduledTone(
              event.leadFreq,
              leadOffset,
              event.leadDur,
              event.leadType,
              event.leadVol,
              event.leadQ,
              event.leadCutoff,
            );
          }
        }

        nextStep += 1;
        safetyCounter += 1;
      }

      nexusRefs.current.nextAbsoluteStep = nextStep;
      timerId = window.setTimeout(schedule, 25);
    };

    schedule();

    return () => {
      setSchedulerDriftMs(null);
      window.clearTimeout(timerId);
    };
    // Keep dependency surface narrow to avoid scheduler timer churn during slider updates.
  }, [audioCtx, nexusActive, room]);
}
