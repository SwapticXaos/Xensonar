import { clamp } from "./music";
import type { DronePreset, ParticlePreset } from "./types";

type VoiceRecord = {
  gain: GainNode;
  panner: StereoPannerNode;
  dry: GainNode;
};

export function createEcho(ctx: AudioContext) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const wet = ctx.createGain();
  const dry = ctx.createGain();
  const feedback = ctx.createGain();
  const delayA = ctx.createDelay(1.5);
  const delayB = ctx.createDelay(1.5);
  delayA.delayTime.value = 0.27;
  delayB.delayTime.value = 0.41;
  feedback.gain.value = 0.28;
  wet.gain.value = 0.22;
  dry.gain.value = 1;

  input.connect(dry);
  input.connect(delayA);
  delayA.connect(delayB);
  delayB.connect(feedback);
  feedback.connect(delayA);
  delayB.connect(wet);
  dry.connect(output);
  wet.connect(output);

  return { input, output, wet, dry, feedback };
}


export function createMediaRecorderNode(ctx: AudioContext, mix: AudioNode) {
  const dest = ctx.createMediaStreamDestination();
  mix.connect(dest);
  return dest;
}


export function createEnvelope(gain: GainNode, now: number, attack: number, decay: number, sustain: number, peak: number) {
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(peak, now + attack);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustain), now + attack + decay);
}


export function scheduleWaveStartVoice(
  ctx: AudioContext,
  destination: AudioNode,
  frequency: number,
  velocity: number,
  pan: number,
  when: number,
) {
  const oscA = ctx.createOscillator();
  const oscB = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  const panner = ctx.createStereoPanner();

  oscA.type = "triangle";
  oscB.type = "sine";
  oscA.frequency.setValueAtTime(frequency, when);
  oscB.frequency.setValueAtTime(frequency * 1.5, when);

  filter.type = "bandpass";
  filter.frequency.setValueAtTime(Math.max(180, frequency * 2.2), when);
  filter.Q.value = 0.8;

  panner.pan.value = clamp(pan, -1, 1);

  oscA.connect(gain);
  oscB.connect(gain);
  gain.connect(filter);
  filter.connect(panner);
  panner.connect(destination);

  createEnvelope(gain, when, 0.004, 0.12, 0.0001, 0.08 + velocity * 0.12);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.4);

  oscA.start(when);
  oscB.start(when);
  oscA.stop(when + 0.45);
  oscB.stop(when + 0.45);
}


export function scheduleParticleVoice(
  ctx: AudioContext,
  destination: AudioNode,
  frequency: number,
  velocity: number,
  preset: ParticlePreset,
  pan: number,
  when: number,
): VoiceRecord {
  const oscA = ctx.createOscillator();
  const oscB = ctx.createOscillator();
  const gain = ctx.createGain();
  const dry = ctx.createGain();
  const panner = ctx.createStereoPanner();

  let attack = 0.002;
  let decay = 0.28;
  let sustain = 0.0001;
  let peak = 0.12 + velocity * 0.18;
  let duration = 0.9;

  switch (preset) {
    case "glass_ping":
      oscA.type = "sine";
      oscB.type = "triangle";
      oscB.frequency.value = frequency * 2.01;
      peak *= 0.9;
      decay = 0.22;
      duration = 0.95;
      break;
    case "soft_pluck":
      oscA.type = "triangle";
      oscB.type = "sawtooth";
      oscB.frequency.value = frequency * 1.002;
      decay = 0.16;
      duration = 0.55;
      break;
    case "fm_bell": {
      oscA.type = "sine";
      oscB.type = "sine";
      const modGain = ctx.createGain();
      modGain.gain.value = frequency * 0.85;
      oscB.connect(modGain);
      modGain.connect(oscA.frequency);
      decay = 0.45;
      duration = 1.2;
      peak *= 0.95;
      break;
    }
    case "marimba":
      oscA.type = "triangle";
      oscB.type = "square";
      oscB.frequency.value = frequency * 4.0;
      decay = 0.19;
      duration = 0.6;
      peak *= 0.78;
      break;
    case "crystal_bowl":
      oscA.type = "sine";
      oscB.type = "sine";
      oscB.frequency.value = frequency * 1.5;
      attack = 0.01;
      decay = 0.65;
      duration = 1.6;
      peak *= 0.72;
      break;
    case "woodblock":
      oscA.type = "square";
      oscB.type = "triangle";
      oscB.frequency.value = frequency * 2.8;
      decay = 0.08;
      duration = 0.35;
      peak *= 0.62;
      break;
  }

  oscA.frequency.setValueAtTime(frequency, when);
  if (oscB.frequency.value === 0) oscB.frequency.setValueAtTime(frequency * 1.01, when);
  panner.pan.value = clamp(pan, -1, 1);
  dry.gain.value = 1;

  oscA.connect(gain);
  oscB.connect(gain);
  gain.connect(dry);
  dry.connect(panner);
  panner.connect(destination);

  createEnvelope(gain, when, attack, decay, sustain, peak);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);

  oscA.start(when);
  oscB.start(when);
  oscA.stop(when + duration + 0.05);
  oscB.stop(when + duration + 0.05);

  return { gain, panner, dry };
}


export function createDroneVoice(ctx: AudioContext, destination: AudioNode, frequency: number, preset: DronePreset) {
  const root = ctx.createOscillator();
  const upper = ctx.createOscillator();
  const gain = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  filter.type = "lowpass";
  filter.frequency.value = 1800;
  filter.Q.value = 0.7;

  root.frequency.value = frequency;
  upper.frequency.value = frequency * 1.5;
  lfo.frequency.value = 0.11;
  lfoGain.gain.value = 14;
  lfo.connect(lfoGain);
  lfoGain.connect(root.detune);
  lfoGain.connect(upper.detune);

  switch (preset) {
    case "warm_pad":
      root.type = "triangle";
      upper.type = "sine";
      gain.gain.value = 0.08;
      break;
    case "reed_drone":
      root.type = "sawtooth";
      upper.type = "triangle";
      gain.gain.value = 0.055;
      filter.frequency.value = 1400;
      break;
    case "pulse_matrix":
      root.type = "square";
      upper.type = "square";
      gain.gain.value = 0.03;
      lfo.frequency.value = 1.4;
      lfoGain.gain.value = 22;
      break;
    case "dark_sub":
      root.type = "sine";
      upper.type = "triangle";
      gain.gain.value = 0.11;
      filter.frequency.value = 700;
      break;
    case "ethereal_halo":
      root.type = "sine";
      upper.type = "sine";
      gain.gain.value = 0.06;
      filter.frequency.value = 2200;
      break;
  }

  const targetGain = Math.max(gain.gain.value, 0.0001);
  gain.gain.value = 0.0001;

  root.connect(filter);
  upper.connect(filter);
  filter.connect(gain);
  gain.connect(destination);

  const startAt = ctx.currentTime + 0.01;
  gain.gain.cancelScheduledValues(startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(targetGain, startAt + 0.28);

  root.start(startAt);
  upper.start(startAt);
  lfo.start(startAt);

  return {
    gain,
    stop: () => {
      const t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      root.stop(t + 0.7);
      upper.stop(t + 0.7);
      lfo.stop(t + 0.7);
    },
  };
}

