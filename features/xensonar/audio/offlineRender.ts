import {
  DRONE_JI_OVERTONES,
  PRESET_MAP,
} from "../constants";
import { clamp } from "../helpers";
import type {
  DronePreset,
  ParticlePreset,
  StemKey,
} from "../types";
import { resolveStemPlaybackTarget, type StemBusTargets } from "./stems";

export type OfflineStemOptions = {
  durationSeconds: number;
  stemKey: StemKey;
  includeDrone: boolean;
  includeParticles: boolean;
  includeWaves: boolean;
  includeFx: boolean;
  baseFreq: number;
  overtoneMix: Record<string, number>;
  dronePreset: DronePreset;
  droneVolume: number;
  droneTimbre: number;
  particlePreset: ParticlePreset;
  particleVolume: number;
  echoOn: boolean;
  echoTempo: number;
  echoDecay: number;
};

const getDronePreset = (preset: DronePreset) => PRESET_MAP[preset] ?? PRESET_MAP.warm_pad;

const createOfflineStemBuses = (ctx: OfflineAudioContext): StemBusTargets => {
  const master = ctx.createGain();
  const particles = ctx.createGain();
  const waves = ctx.createGain();
  const drone = ctx.createGain();
  const fx = ctx.createGain();

  master.gain.value = 1;
  particles.gain.value = 1;
  waves.gain.value = 1;
  drone.gain.value = 1;
  fx.gain.value = 1;

  particles.connect(master);
  waves.connect(master);
  drone.connect(master);
  fx.connect(master);
  master.connect(ctx.destination);

  return { master, particles, waves, drone, fx };
};

const addOfflineDroneVoice = (
  ctx: OfflineAudioContext,
  destination: AudioNode,
  baseFreq: number,
  preset: ReturnType<typeof getDronePreset>,
  overtoneMix: Record<string, number>,
  durationSeconds: number,
  droneVolume: number,
  droneTimbre: number,
) => {
  const filter = ctx.createBiquadFilter();
  filter.type = preset.filterType;
  filter.frequency.value = preset.cutoffBase + preset.cutoffSpan * 0.45;
  filter.Q.value = preset.qBase + droneTimbre * preset.qSpan;
  filter.connect(destination);

  const oscA = ctx.createOscillator();
  const oscB = ctx.createOscillator();
  const gainA = ctx.createGain();
  const gainB = ctx.createGain();
  oscA.type = preset.oscA;
  oscB.type = preset.oscB;
  oscA.frequency.value = baseFreq;
  oscB.frequency.value = baseFreq * preset.overtoneRatio;
  gainA.gain.value = (preset.gainA + droneTimbre * preset.gainASpan) * droneVolume;
  gainB.gain.value = (preset.gainBBase + droneTimbre * preset.gainBProfile) * droneVolume;
  oscA.connect(gainA);
  oscB.connect(gainB);
  gainA.connect(filter);
  gainB.connect(filter);
  oscA.start(0);
  oscB.start(0);
  oscA.stop(durationSeconds);
  oscB.stop(durationSeconds);

  const overtoneMaster = ctx.createGain();
  overtoneMaster.gain.value = 1;
  overtoneMaster.connect(filter);
  DRONE_JI_OVERTONES.forEach((node) => {
    const mix = clamp(overtoneMix[node.label] ?? 0, 0, 1);
    if (mix <= 0) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = baseFreq * node.ratio;
    gain.gain.value = mix * (0.004 + droneTimbre * 0.03) * droneVolume;
    osc.connect(gain);
    gain.connect(overtoneMaster);
    osc.start(0);
    osc.stop(durationSeconds);
  });
};

const scheduleOfflineParticlePhrase = (
  ctx: OfflineAudioContext,
  destination: AudioNode,
  preset: ParticlePreset,
  volume: number,
  baseFreq: number,
  durationSeconds: number,
) => {
  const phrase = [0, 0.4, 0.8, 1.2, 1.7, 2.1, 2.6, 3.1];
  phrase.forEach((time, index) => {
    if (time >= durationSeconds) return;
    const freq = baseFreq * [1, 9 / 8, 5 / 4, 3 / 2][index % 4];
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = preset === "fm_bell" || preset === "crystal_bowl" ? "sine" : preset === "pizzicato" ? "sawtooth" : "triangle";
    osc.frequency.setValueAtTime(freq, time);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1400 + index * 120, time);
    filter.Q.setValueAtTime(1.4, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, Math.min(durationSeconds, time + 0.35));
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    osc.start(time);
    osc.stop(Math.min(durationSeconds, time + 0.4));
  });
};

const scheduleOfflineWavePhrase = (
  ctx: OfflineAudioContext,
  destination: AudioNode,
  baseFreq: number,
  durationSeconds: number,
) => {
  const phrase = [0, 0.75, 1.5, 2.25, 3.0, 3.75];
  phrase.forEach((time, index) => {
    if (time >= durationSeconds) return;
    const root = baseFreq * (index % 2 === 0 ? 1 : 1.18);
    const a = ctx.createOscillator();
    const b = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    a.type = index % 3 === 0 ? "triangle" : "sine";
    b.type = "sine";
    a.frequency.setValueAtTime(root, time);
    b.frequency.setValueAtTime(root * 1.5, time + 0.02);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2000 + index * 120, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.06, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, Math.min(durationSeconds, time + 0.22));
    a.connect(filter);
    b.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    a.start(time);
    b.start(time + 0.02);
    a.stop(Math.min(durationSeconds, time + 0.24));
    b.stop(Math.min(durationSeconds, time + 0.24));
  });
};

const scheduleOfflineFxPhrase = (
  ctx: OfflineAudioContext,
  destination: AudioNode,
  baseFreq: number,
  durationSeconds: number,
  delayTimeSeconds: number,
  feedbackAmount: number,
) => {
  const echo = ctx.createDelay(2.5);
  const feedback = ctx.createGain();
  const wet = ctx.createGain();
  echo.delayTime.value = delayTimeSeconds;
  feedback.gain.value = feedbackAmount;
  wet.gain.value = 0.8;
  echo.connect(feedback);
  feedback.connect(echo);
  echo.connect(wet);
  wet.connect(destination);
  scheduleOfflineWavePhrase(ctx, echo, baseFreq * 0.95, durationSeconds);
};

export async function renderOfflineStem(options: OfflineStemOptions) {
  const sampleRate = 44100;
  const frameCount = Math.max(1, Math.ceil(options.durationSeconds * sampleRate));
  const ctx = new OfflineAudioContext(2, frameCount, sampleRate);
  const buses = createOfflineStemBuses(ctx);

  const droneTarget = resolveStemPlaybackTarget(options.stemKey, buses, "drone");
  const particleTarget = resolveStemPlaybackTarget(options.stemKey, buses, "particles");
  const waveTarget = resolveStemPlaybackTarget(options.stemKey, buses, "waves");
  const fxTarget = resolveStemPlaybackTarget(options.stemKey, buses, "fx");

  if (options.includeDrone) {
    addOfflineDroneVoice(
      ctx,
      droneTarget,
      options.baseFreq,
      getDronePreset(options.dronePreset),
      options.overtoneMix,
      options.durationSeconds,
      options.droneVolume,
      options.droneTimbre,
    );
  }

  if (options.includeParticles) {
    scheduleOfflineParticlePhrase(
      ctx,
      particleTarget,
      options.particlePreset,
      options.particleVolume,
      options.baseFreq * 2,
      options.durationSeconds,
    );
  }

  if (options.includeWaves) {
    scheduleOfflineWavePhrase(
      ctx,
      waveTarget,
      options.baseFreq,
      options.durationSeconds,
    );
  }

  if (options.includeFx && options.echoOn) {
    scheduleOfflineFxPhrase(
      ctx,
      fxTarget,
      options.baseFreq,
      options.durationSeconds,
      options.echoTempo / 1000,
      clamp(options.echoDecay, 0, 0.92),
    );
  }

  return ctx.startRendering();
}
