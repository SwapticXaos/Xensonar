import type { DrumKit, DrumPattern } from "../xensonar/domain/instrumentData";
import { getStaticDrumStepTriggers } from "../xensonar/drumPatternMachine";
import type { DrumLaneKitOverrides } from '../xensonar/groove/drumKitRoutingTypes';
import { resolveDrumLaneKit } from '../xensonar/groove/drumKitRouting';
import type { DrumVoice } from './drumMachineTypes';
export type { DrumVoice } from './drumMachineTypes';

export interface DrumStyle {
  edge: number;
  softness: number;
  air: number;
  snap: number;
  swing: number;
  pan: number;
  decayScale: number;
  chokeGroup: 'none' | 'hat';
}

export const DEFAULT_DRUM_STYLE: DrumStyle = {
  edge: 0.46,
  softness: 0.58,
  air: 0.5,
  snap: 0.48,
  swing: 0.38,
  pan: 0,
  decayScale: 1,
  chokeGroup: 'none',
};

export interface DrumMachine {
  trigger: (voice: DrumVoice, time: number, level: number, kit: DrumKit, style?: Partial<DrumStyle>) => void;
  schedulePattern: (pattern: DrumPattern, step: number, time: number, level: number, kit: DrumKit, style?: Partial<DrumStyle>, laneKitOverrides?: DrumLaneKitOverrides) => void;
}

type DrumOscWave = Exclude<OscillatorType, "custom">;

interface DrumKitProfile {
  kickPitchStart: number;
  kickPitchEnd: number;
  kickDecay: number;
  kickDrive: number;
  kickOsc: DrumOscWave;
  kickClickHz: number;
  snareToneHz: number;
  snareNoiseHz: number;
  snareOsc: DrumOscWave;
  hatHz: number;
  hatDecay: number;
  hatOscA: DrumOscWave;
  hatOscB: DrumOscWave;
  hatMetalMix: number;
  hatNoiseMix: number;
  noiseColor: number;
  clapBursts: number;
  clapSpacing: number;
  percRatio: number;
  percOsc: DrumOscWave;
  percDecay: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const KIT_PROFILE: Record<DrumKit, DrumKitProfile> = {
  dusty_tape: {
    kickPitchStart: 128,
    kickPitchEnd: 38,
    kickDecay: 0.18,
    kickDrive: 1.7,
    kickOsc: "sine",
    kickClickHz: 1580,
    snareToneHz: 180,
    snareNoiseHz: 2400,
    snareOsc: "triangle",
    hatHz: 7600,
    hatDecay: 0.075,
    hatOscA: "square",
    hatOscB: "triangle",
    hatMetalMix: 1,
    hatNoiseMix: 1,
    noiseColor: 0.85,
    clapBursts: 3,
    clapSpacing: 0.012,
    percRatio: 1.33,
    percOsc: "sine",
    percDecay: 0.1,
  },
  membrane_box: {
    kickPitchStart: 112,
    kickPitchEnd: 30,
    kickDecay: 0.22,
    kickDrive: 1.4,
    kickOsc: "sine",
    kickClickHz: 1440,
    snareToneHz: 208,
    snareNoiseHz: 2100,
    snareOsc: "sine",
    hatHz: 6900,
    hatDecay: 0.09,
    hatOscA: "square",
    hatOscB: "triangle",
    hatMetalMix: 0.86,
    hatNoiseMix: 1.04,
    noiseColor: 0.72,
    clapBursts: 3,
    clapSpacing: 0.013,
    percRatio: 1.18,
    percOsc: "sine",
    percDecay: 0.11,
  },
  glass_metal: {
    kickPitchStart: 142,
    kickPitchEnd: 48,
    kickDecay: 0.14,
    kickDrive: 2.1,
    kickOsc: "triangle",
    kickClickHz: 1920,
    snareToneHz: 250,
    snareNoiseHz: 3600,
    snareOsc: "triangle",
    hatHz: 9800,
    hatDecay: 0.055,
    hatOscA: "triangle",
    hatOscB: "triangle",
    hatMetalMix: 1.18,
    hatNoiseMix: 0.86,
    noiseColor: 1,
    clapBursts: 3,
    clapSpacing: 0.011,
    percRatio: 1.72,
    percOsc: "triangle",
    percDecay: 0.085,
  },
  asphalt_punch: {
    kickPitchStart: 154,
    kickPitchEnd: 41,
    kickDecay: 0.16,
    kickDrive: 2.45,
    kickOsc: "sine",
    kickClickHz: 1980,
    snareToneHz: 196,
    snareNoiseHz: 2820,
    snareOsc: "triangle",
    hatHz: 8400,
    hatDecay: 0.06,
    hatOscA: "square",
    hatOscB: "sawtooth",
    hatMetalMix: 1.2,
    hatNoiseMix: 0.82,
    noiseColor: 0.78,
    clapBursts: 4,
    clapSpacing: 0.009,
    percRatio: 1.26,
    percOsc: "triangle",
    percDecay: 0.08,
  },
  velvet_breaks: {
    kickPitchStart: 102,
    kickPitchEnd: 28,
    kickDecay: 0.24,
    kickDrive: 1.18,
    kickOsc: "sine",
    kickClickHz: 1260,
    snareToneHz: 164,
    snareNoiseHz: 1820,
    snareOsc: "sine",
    hatHz: 6000,
    hatDecay: 0.11,
    hatOscA: "triangle",
    hatOscB: "sine",
    hatMetalMix: 0.52,
    hatNoiseMix: 1.08,
    noiseColor: 0.6,
    clapBursts: 3,
    clapSpacing: 0.014,
    percRatio: 1.08,
    percOsc: "sine",
    percDecay: 0.14,
  },
  neon_arc: {
    kickPitchStart: 136,
    kickPitchEnd: 52,
    kickDecay: 0.13,
    kickDrive: 1.95,
    kickOsc: "triangle",
    kickClickHz: 2380,
    snareToneHz: 282,
    snareNoiseHz: 4220,
    snareOsc: "square",
    hatHz: 11000,
    hatDecay: 0.05,
    hatOscA: "sawtooth",
    hatOscB: "triangle",
    hatMetalMix: 1.42,
    hatNoiseMix: 0.74,
    noiseColor: 1.05,
    clapBursts: 5,
    clapSpacing: 0.007,
    percRatio: 1.88,
    percOsc: "triangle",
    percDecay: 0.068,
  },
  bronze_static: {
    kickPitchStart: 118,
    kickPitchEnd: 34,
    kickDecay: 0.21,
    kickDrive: 1.62,
    kickOsc: "triangle",
    kickClickHz: 1710,
    snareToneHz: 228,
    snareNoiseHz: 3040,
    snareOsc: "triangle",
    hatHz: 8800,
    hatDecay: 0.08,
    hatOscA: "triangle",
    hatOscB: "square",
    hatMetalMix: 1.26,
    hatNoiseMix: 0.92,
    noiseColor: 0.92,
    clapBursts: 4,
    clapSpacing: 0.011,
    percRatio: 1.62,
    percOsc: "triangle",
    percDecay: 0.11,
  },
  resin_tom: {
    kickPitchStart: 96,
    kickPitchEnd: 26,
    kickDecay: 0.26,
    kickDrive: 1.34,
    kickOsc: "sine",
    kickClickHz: 1180,
    snareToneHz: 146,
    snareNoiseHz: 1620,
    snareOsc: "sine",
    hatHz: 5200,
    hatDecay: 0.12,
    hatOscA: "square",
    hatOscB: "triangle",
    hatMetalMix: 0.4,
    hatNoiseMix: 1.16,
    noiseColor: 0.56,
    clapBursts: 2,
    clapSpacing: 0.016,
    percRatio: 0.94,
    percOsc: "sine",
    percDecay: 0.16,
  },
  paper_spark: {
    kickPitchStart: 126,
    kickPitchEnd: 44,
    kickDecay: 0.15,
    kickDrive: 1.52,
    kickOsc: "triangle",
    kickClickHz: 2120,
    snareToneHz: 214,
    snareNoiseHz: 3380,
    snareOsc: "square",
    hatHz: 9700,
    hatDecay: 0.045,
    hatOscA: "square",
    hatOscB: "triangle",
    hatMetalMix: 0.98,
    hatNoiseMix: 1.22,
    noiseColor: 1,
    clapBursts: 4,
    clapSpacing: 0.008,
    percRatio: 1.44,
    percOsc: "triangle",
    percDecay: 0.072,
  },
};

function makeDriveCurve(amount: number) {
  const k = clamp(amount, 0.5, 8);
  const samples = 1024;
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i += 1) {
    const x = (i / (samples - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * k);
  }
  return curve;
}

function createNoiseBuffer(audioCtx: AudioContext) {
  const length = audioCtx.sampleRate;
  const buffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    data[i] = white * (0.6 + Math.random() * 0.4);
  }
  return buffer;
}

const applySoftTransient = (gain: GainNode, time: number, peak: number, attack: number, release: number) => {
  const safePeak = Math.max(0.0002, peak);
  gain.gain.cancelScheduledValues(time);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(safePeak, time + Math.max(0.0012, attack));
  gain.gain.setTargetAtTime(0.0001, time + Math.max(0.0012, attack), Math.max(0.004, release));
};

const resolveStyle = (style?: Partial<DrumStyle>): DrumStyle => ({
  edge: clamp(style?.edge ?? DEFAULT_DRUM_STYLE.edge, 0, 1),
  softness: clamp(style?.softness ?? DEFAULT_DRUM_STYLE.softness, 0, 1),
  air: clamp(style?.air ?? DEFAULT_DRUM_STYLE.air, 0, 1),
  snap: clamp(style?.snap ?? DEFAULT_DRUM_STYLE.snap, 0, 1),
  swing: clamp(style?.swing ?? DEFAULT_DRUM_STYLE.swing, 0, 1),
  pan: clamp(style?.pan ?? DEFAULT_DRUM_STYLE.pan, -1, 1),
  decayScale: clamp(style?.decayScale ?? DEFAULT_DRUM_STYLE.decayScale, 0.25, 2),
  chokeGroup: style?.chokeGroup === 'hat' ? 'hat' : 'none',
});

export function createDrumMachine(audioCtx: AudioContext, output: AudioNode): DrumMachine {
  const noiseBuffer = createNoiseBuffer(audioCtx);
  let activeHatOpenGain: GainNode | null = null;
  const connectOutput = (source: AudioNode, pan: number, time: number) => {
    if (typeof audioCtx.createStereoPanner === 'function') {
      const panner = audioCtx.createStereoPanner();
      panner.pan.setValueAtTime(clamp(pan, -1, 1), time);
      source.connect(panner);
      panner.connect(output);
      return panner;
    }
    source.connect(output);
    return null;
  };
  const releaseNode = (gainNode: GainNode | null, time: number, release = 0.012) => {
    if (!gainNode) return;
    gainNode.gain.cancelScheduledValues(time);
    gainNode.gain.setTargetAtTime(0.0001, time, Math.max(0.002, release));
  };
  const makeNoiseSource = () => {
    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;
    return noise;
  };

  const triggerKick = (time: number, level: number, kit: DrumKit, style: DrumStyle) => {
    const profile = KIT_PROFILE[kit];
    const osc = audioCtx.createOscillator();
    const body = audioCtx.createGain();
    const clickNoise = makeNoiseSource();
    const clickFilter = audioCtx.createBiquadFilter();
    const clickGain = audioCtx.createGain();
    const sum = audioCtx.createGain();
    const shaper = audioCtx.createWaveShaper();
    const tone = audioCtx.createBiquadFilter();

    osc.type = profile.kickOsc;
    osc.connect(body);
    body.connect(sum);
    clickNoise.connect(clickFilter);
    clickFilter.connect(clickGain);
    clickGain.connect(sum);
    sum.connect(shaper);
    shaper.connect(tone);
    connectOutput(tone, style.pan, time);

    const kickDrive = profile.kickDrive * lerp(0.78, 1.22, style.edge);
    const decay = profile.kickDecay * style.decayScale * lerp(1.18, 0.84, style.snap) * lerp(1.16, 0.9, 1 - style.softness);
    shaper.curve = makeDriveCurve(kickDrive);
    tone.type = "lowpass";
    tone.frequency.setValueAtTime(profile.kickPitchStart * lerp(5.4, 6.8, style.air), time);
    tone.frequency.exponentialRampToValueAtTime(Math.max(140, profile.kickPitchEnd * lerp(6.2, 7.6, style.air)), time + decay);
    osc.frequency.setValueAtTime(profile.kickPitchStart, time);
    osc.frequency.exponentialRampToValueAtTime(profile.kickPitchEnd, time + decay);
    body.gain.setValueAtTime(Math.max(0.0001, level), time);
    body.gain.exponentialRampToValueAtTime(0.0001, time + decay);
    clickFilter.type = "highpass";
    clickFilter.frequency.setValueAtTime(profile.kickClickHz + kickDrive * 180 + style.air * 720, time);
    clickGain.gain.setValueAtTime(level * lerp(0.08, 0.22, style.snap), time);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, time + lerp(0.024, 0.012, style.snap));

    osc.start(time);
    osc.stop(time + decay + 0.02);
    clickNoise.start(time);
    clickNoise.stop(time + 0.02);
  };

  const triggerSnare = (time: number, level: number, kit: DrumKit, style: DrumStyle) => {
    const profile = KIT_PROFILE[kit];
    const bodyOsc = audioCtx.createOscillator();
    const bodyGain = audioCtx.createGain();
    const noise = makeNoiseSource();
    const noiseBand = audioCtx.createBiquadFilter();
    const noiseHigh = audioCtx.createBiquadFilter();
    const noiseGain = audioCtx.createGain();
    const shaper = audioCtx.createWaveShaper();
    const outGain = audioCtx.createGain();

    bodyOsc.type = profile.snareOsc;
    bodyOsc.connect(bodyGain);
    bodyGain.connect(shaper);
    noise.connect(noiseBand);
    noiseBand.connect(noiseHigh);
    noiseHigh.connect(noiseGain);
    noiseGain.connect(shaper);
    shaper.connect(outGain);
    connectOutput(outGain, style.pan, time);

    shaper.curve = makeDriveCurve(lerp(1.05, 2.1, (style.edge + style.snap) * 0.5));
    bodyOsc.frequency.setValueAtTime(profile.snareToneHz * lerp(0.92, 1.12, style.snap), time);
    bodyOsc.frequency.exponentialRampToValueAtTime(profile.snareToneHz * lerp(0.5, 0.72, style.softness), time + lerp(0.08, 0.13, style.softness) * style.decayScale);
    bodyGain.gain.setValueAtTime(level * lerp(0.18, 0.34, style.snap), time);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, time + lerp(0.08, 0.14, style.softness) * style.decayScale);
    noiseBand.type = "bandpass";
    noiseBand.frequency.setValueAtTime(profile.snareNoiseHz * lerp(0.82, 1.18, style.air), time);
    noiseBand.Q.setValueAtTime(0.7 + profile.noiseColor * 0.75 + style.snap * 0.3, time);
    noiseHigh.type = "highpass";
    noiseHigh.frequency.setValueAtTime(1100 + profile.noiseColor * 700 + style.air * 1200, time);
    noiseGain.gain.setValueAtTime(level * lerp(0.42, 0.78, style.edge), time);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + lerp(0.21, 0.12, style.snap) * style.decayScale);
    outGain.gain.setValueAtTime(1, time);
    outGain.gain.exponentialRampToValueAtTime(0.0001, time + lerp(0.28, 0.18, style.snap) * style.decayScale);

    bodyOsc.start(time);
    bodyOsc.stop(time + 0.16);
    noise.start(time);
    noise.stop(time + 0.2);
  };

  const triggerHat = (time: number, level: number, kit: DrumKit, style: DrumStyle, open = false) => {
    const profile = KIT_PROFILE[kit];
    const noise = makeNoiseSource();
    const hp = audioCtx.createBiquadFilter();
    const bp = audioCtx.createBiquadFilter();
    const lp = audioCtx.createBiquadFilter();
    const metallicA = audioCtx.createOscillator();
    const metallicB = audioCtx.createOscillator();
    const metallicGain = audioCtx.createGain();
    const noiseGain = audioCtx.createGain();
    const sum = audioCtx.createGain();
    const shaper = audioCtx.createWaveShaper();
    const gain = audioCtx.createGain();

    noise.connect(hp);
    hp.connect(bp);
    bp.connect(lp);
    lp.connect(noiseGain);
    noiseGain.connect(sum);
    metallicA.type = profile.hatOscA;
    metallicB.type = profile.hatOscB;
    metallicA.connect(metallicGain);
    metallicB.connect(metallicGain);
    metallicGain.connect(sum);
    sum.connect(shaper);
    shaper.connect(gain);
    connectOutput(gain, style.pan, time);

    const bodyHz = profile.hatHz * lerp(0.78, 1.14, style.air) * (open ? 0.92 : 0.84);
    hp.type = "highpass";
    hp.frequency.setValueAtTime(bodyHz * lerp(0.5, 0.7, style.air), time);
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(bodyHz, time);
    bp.Q.setValueAtTime(lerp(0.55, 0.95, style.edge) * (open ? 0.9 : 1.0), time);
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(Math.min(12000, bodyHz * lerp(0.95, 1.32, style.air) * (open ? 1.12 : 1.0)), time);
    lp.Q.setValueAtTime(0.25 + style.edge * 0.12, time);
    noiseGain.gain.setValueAtTime(profile.hatNoiseMix, time);
    metallicA.frequency.setValueAtTime(bodyHz * 0.43, time);
    metallicB.frequency.setValueAtTime(bodyHz * 0.57, time);
    applySoftTransient(
      metallicGain,
      time,
      level * lerp(0.04, 0.12, style.edge) * profile.hatMetalMix,
      lerp(0.0032, 0.0012, style.snap),
      (open ? lerp(0.042, 0.02, style.snap) : lerp(0.026, 0.012, style.snap)) * style.decayScale,
    );
    shaper.curve = makeDriveCurve(lerp(0.72, 1.8, style.edge));
    applySoftTransient(
      gain,
      time,
      level * (open ? 0.2 : 0.15) * lerp(0.85, 1.12, style.air),
      lerp(0.0034, 0.0012, 1 - style.softness),
      (open ? profile.hatDecay * lerp(1.18, 0.76, style.snap) : profile.hatDecay * lerp(0.92, 0.55, style.snap)) * style.decayScale,
    );

    if (!open && style.chokeGroup === 'hat') releaseNode(activeHatOpenGain, time, 0.01);
    if (open && style.chokeGroup === 'hat') activeHatOpenGain = gain;

    noise.start(time);
    noise.stop(time + (open ? 0.14 : 0.065));
    metallicA.start(time);
    metallicB.start(time);
    metallicA.stop(time + (open ? 0.14 : 0.065));
    metallicB.stop(time + (open ? 0.14 : 0.065));
  };

  const triggerClap = (time: number, level: number, kit: DrumKit, style: DrumStyle) => {
    const profile = KIT_PROFILE[kit];
    Array.from({ length: profile.clapBursts }, (_, idx) => idx).forEach((idx) => {
      const offset = idx * profile.clapSpacing;
      const noise = makeNoiseSource();
      const hp = audioCtx.createBiquadFilter();
      const gain = audioCtx.createGain();

      noise.connect(hp);
      hp.connect(gain);
      connectOutput(gain, style.pan, time);

      hp.type = "highpass";
      hp.frequency.setValueAtTime(profile.snareNoiseHz * 0.75 + idx * 120 + style.air * 300, time + offset);
      applySoftTransient(
        gain,
        time + offset,
        level * Math.max(0.04, 0.12 - idx * 0.024) * lerp(0.9, 1.15, style.snap),
        lerp(0.0022, 0.0012, style.snap),
lerp(0.034, 0.018, style.snap) * style.decayScale,
      );
      noise.start(time + offset);
      noise.stop(time + offset + 0.08);
    });
  };

  const triggerPerc = (time: number, level: number, kit: DrumKit, style: DrumStyle) => {
    const profile = KIT_PROFILE[kit];
    const osc = audioCtx.createOscillator();
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();

    osc.type = profile.percOsc;
    osc.connect(filter);
    filter.connect(gain);
    connectOutput(gain, style.pan, time);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(520 * profile.percRatio * lerp(0.88, 1.2, style.air), time);
    filter.Q.setValueAtTime(3.8 + style.edge * 1.4, time);
    osc.frequency.setValueAtTime(280 * profile.percRatio, time);
    osc.frequency.exponentialRampToValueAtTime(180 * profile.percRatio, time + lerp(profile.percDecay, profile.percDecay * 0.7, style.snap) * style.decayScale);
    gain.gain.setValueAtTime(level * lerp(0.18, 0.28, style.snap), time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + lerp(profile.percDecay * 1.2, profile.percDecay * 0.82, style.snap) * style.decayScale);

    osc.start(time);
    osc.stop(time + profile.percDecay * style.decayScale + 0.02);
  };

  const trigger = (voice: DrumVoice, time: number, level: number, kit: DrumKit, styleInput?: Partial<DrumStyle>) => {
    const style = resolveStyle(styleInput);
    const v = clamp(level, 0, 1.5);
    if (v <= 0.0001) return;
    switch (voice) {
      case "kick":
        triggerKick(time, v, kit, style);
        break;
      case "snare":
        triggerSnare(time, v, kit, style);
        break;
      case "hat_closed":
        triggerHat(time, v, kit, style, false);
        break;
      case "hat_open":
        triggerHat(time, v, kit, style, true);
        break;
      case "clap":
        triggerClap(time, v, kit, style);
        break;
      case "perc":
        triggerPerc(time, v, kit, style);
        break;
    }
  };

  const schedulePattern = (pattern: DrumPattern, step: number, time: number, level: number, kit: DrumKit, styleInput?: Partial<DrumStyle>, laneKitOverrides?: DrumLaneKitOverrides) => {
    const style = resolveStyle(styleInput);
    const softSwing = 0.004 + style.swing * 0.018;
    const late = time + softSwing;
    const early = Math.max(0, time - softSwing * 0.45);
    const triggers = getStaticDrumStepTriggers(pattern, step);
    if (!triggers.length) return;
    triggers.forEach((entry) => {
      const when = entry.timing === "late" ? late : entry.timing === "early" ? early : time;
      const voice = entry.laneId === "hatClosed" ? "hat_closed" : entry.laneId === "hatOpen" ? "hat_open" : entry.laneId;
      trigger(voice, when, level * (entry.levelMultiplier ?? 1), resolveDrumLaneKit({ laneId: entry.laneId, globalKit: kit, overrides: laneKitOverrides }), style);
    });
  };

  return { trigger, schedulePattern };
}
