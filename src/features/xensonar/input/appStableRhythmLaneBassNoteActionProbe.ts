import type { MutableRefObject } from 'react';
import { clamp } from '../rooms/resonanceRuntimeMath';
import type { AppNexusParams } from '../rooms/nexusParamsInitialState';
import type { AppStableRhythmLanePlayBassNote } from './appStableRhythmLaneSchedulerBoundaryPortsContractProbe';

export type AppStableRhythmLaneBassNoteFxSendsRef = MutableRefObject<{
  readonly waves?: GainNode | null;
  readonly bass?: GainNode | null;
}>;

export type AppStableRhythmLaneBassNoteActionProbeArgs = {
  readonly audioCtx: AudioContext;
  readonly nexusParamsRef: MutableRefObject<AppNexusParams>;
  readonly ensureFinalMixBus: (ctx: AudioContext) => AudioNode;
  readonly enterHoldPsyFxEnabled: boolean;
  readonly enterHoldRef: MutableRefObject<boolean>;
  readonly ensureEnterHoldPsyFxDevice: (ctx: AudioContext) => void;
  readonly enterHoldPsyFxSendsRef: AppStableRhythmLaneBassNoteFxSendsRef;
  readonly stableRhythmLaneBassNoteActionExtractedFromAppTsx: true;
  readonly audioBodyNowActionProbeOwned: true;
  readonly finalMixBusStillAppSupplied: true;
  readonly enterHoldFxDeviceStillAppSupplied: true;
};

export type AppStableRhythmLaneBassNoteActionProbeResult = {
  readonly playBassNote: AppStableRhythmLanePlayBassNote;
  readonly stableRhythmLaneBassNoteActionExtractedFromAppTsx: true;
  readonly audioBodyNowActionProbeOwned: true;
  readonly finalMixBusStillAppSupplied: true;
  readonly enterHoldFxDeviceStillAppSupplied: true;
  readonly schedulerStillLoopProbeOwned: true;
  readonly transportStillAppNexusRefOwned: true;
};

export const buildAppStableRhythmLaneBassNoteActionProbe = (
  args: AppStableRhythmLaneBassNoteActionProbeArgs,
): AppStableRhythmLaneBassNoteActionProbeResult => {
  const playBassNote: AppStableRhythmLanePlayBassNote = (time, freq, vol, dur, accent = 0.72, extras) => {
    const p = args.nexusParamsRef.current;
    const tone = clamp(p.bassTone ?? 0.48, 0, 1);
    const grit = clamp(p.bassGrit ?? 0.18, 0, 1);
    const ghost = !!extras?.ghost;
    const osc = args.audioCtx.createOscillator();
    const oscB = args.audioCtx.createOscillator();
    const subOsc = args.audioCtx.createOscillator();
    const pre = args.audioCtx.createGain();
    const shaper = args.audioCtx.createWaveShaper();
    const filter = args.audioCtx.createBiquadFilter();
    const gain = args.audioCtx.createGain();
    osc.type = grit > 0.56 ? 'square' : 'sawtooth';
    oscB.type = ghost ? 'sine' : 'triangle';
    subOsc.type = 'sine';
    osc.connect(pre);
    oscB.connect(pre);
    subOsc.connect(pre);
    pre.connect(shaper);
    shaper.connect(filter);
    filter.connect(gain);
    gain.connect(args.ensureFinalMixBus(args.audioCtx));
    if (args.enterHoldPsyFxEnabled && args.enterHoldRef.current) {
      args.ensureEnterHoldPsyFxDevice(args.audioCtx);
      if (args.enterHoldPsyFxSendsRef.current.bass) gain.connect(args.enterHoldPsyFxSendsRef.current.bass);
    }
    shaper.curve = (() => {
      const samples = 1024;
      const curve = new Float32Array(samples);
      const amount = 0.65 + grit * 2.6;
      for (let i = 0; i < samples; i += 1) {
        const x = (i / (samples - 1)) * 2 - 1;
        curve[i] = Math.tanh(x * amount);
      }
      return curve;
    })();
    pre.gain.value = (ghost ? 0.46 : 0.7) + grit * 0.16;
    filter.type = 'lowpass';
    const openHz = clamp(freq * (1.8 + tone * 3.8) * (0.9 + accent * 0.25), 120, 4200);
    const closedHz = clamp(freq * (0.95 + tone * 1.4), 80, 2200);
    filter.frequency.setValueAtTime(openHz, time);
    filter.frequency.exponentialRampToValueAtTime(closedHz, time + dur * 0.58);
    filter.Q.setValueAtTime((ghost ? 0.35 : 0.55) + grit * 1.1 + accent * 0.22, time);
    osc.frequency.setValueAtTime(freq, time);
    oscB.frequency.setValueAtTime(freq * (ghost ? 1.0015 : 1.004), time);
    subOsc.frequency.setValueAtTime(freq / 2, time);
    if (extras?.glideToNext) {
      const glideTime = Math.min(time + dur * 0.42, time + 0.08);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.122, glideTime);
      oscB.frequency.exponentialRampToValueAtTime(freq * 1.118, glideTime);
    }
    gain.gain.setValueAtTime(Math.max(0.0001, vol * (ghost ? 0.42 : 0.72 + accent * 0.5)), time);
    gain.gain.setTargetAtTime(0.0001, time + dur * 0.76, (ghost ? 0.016 : 0.024) + (1 - tone) * 0.02);
    osc.start(time);
    oscB.start(time);
    subOsc.start(time);
    osc.stop(time + dur);
    oscB.stop(time + dur);
    subOsc.stop(time + dur);
  };

  return {
    playBassNote,
    stableRhythmLaneBassNoteActionExtractedFromAppTsx: true,
    audioBodyNowActionProbeOwned: true,
    finalMixBusStillAppSupplied: true,
    enterHoldFxDeviceStillAppSupplied: true,
    schedulerStillLoopProbeOwned: true,
    transportStillAppNexusRefOwned: true,
  };
};
