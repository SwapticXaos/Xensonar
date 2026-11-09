import type { MyceliumSnapshot } from '../topology/myceliumSnapshot';
import { getNodalDeviceTargetLevel, type NodalDeviceMatrix, type NodalTargetId } from './nodalDeviceMatrix';

const finiteOr = (value: number | null | undefined, fallback = 0): number => (Number.isFinite(value) ? Number(value) : fallback);

const clampSafe = (value: number | null | undefined, min = 0, max = 1, fallback = min): number => {
  const n = finiteOr(value, fallback);
  return Math.max(min, Math.min(max, n));
};

const clamp01Safe = (value: number | null | undefined, fallback = 0): number => clampSafe(value, 0, 1, fallback);

export type NodalSemanticProfile = {
  obsession: number;
  symbiosis: number;
  rawReality: number;
  peripheryStarve: number;
  interactionPressure: number;
  envObsession: number;
  envRaw: number;
};

export type SemanticInteractionEnvelope = {
  obs: number;
  raw: number;
};

export const createSemanticInteractionEnvelope = (): SemanticInteractionEnvelope => ({ obs: 0, raw: 0 });

export type SemanticInteractionDevice = {
  modulatorA: OscillatorNode;
  modulatorB: OscillatorNode;
  fmOutput: GainNode;
  crossModIndex: GainNode;
  rawSub: OscillatorNode;
  rawNoise: AudioBufferSourceNode;
  rawFilter: BiquadFilterNode;
  rawOutput: GainNode;
  deviceMaster: GainNode;
};

export type SemanticInteractionRefs = {
  _semanticDevice?: SemanticInteractionDevice | null;
};

export type SemanticInteractionUpdateOptions = {
  matrix: NodalDeviceMatrix;
  target?: NodalTargetId;
  baseHz?: number;
  masterGain?: number;
  colorVoiceVolume?: number;
  enabled?: boolean;
};

const createNoiseBuffer = (ctx: BaseAudioContext): AudioBuffer => {
  const buffer = ctx.createBuffer(1, Math.max(1, ctx.sampleRate), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    // Deterministic enough for source generation; the buffer is built once, not per frame.
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
};

export function calculateSemanticProfile(snapshot: MyceliumSnapshot, env?: SemanticInteractionEnvelope | null): NodalSemanticProfile {
  const speedNorm = clamp01Safe((snapshot.myceliumBallSpeed ?? 0) / 15);
  const focusEnergy = clamp01Safe(snapshot.nearestNodeEnergy ?? snapshot.maxEnergy ?? 0);
  const tension = clamp01Safe(snapshot.myzelRelationTension ?? snapshot.constellationTension ?? 0);
  const voidPressure = clamp01Safe(snapshot.myzelVoidPressure ?? 0);
  const clusterMass = clamp01Safe(snapshot.myzelClusterMass ?? snapshot.constellationFlux ?? 0);

  const obsessionRaw = focusEnergy * (1 - speedNorm);
  const obsession = clamp01Safe(Math.pow(obsessionRaw, 2.5));
  const symbiosis = clamp01Safe(clusterMass * speedNorm * (1 - obsession));
  const rawReality = clamp01Safe(voidPressure + tension * obsession * 1.5);
  const peripheryStarve = clamp01Safe(obsession * 1.2);
  const interactionPressure = clamp01Safe(tension * (0.4 + clusterMass * 0.6));

  const prevObs = Number.isFinite(env?.obs) ? env!.obs : 0;
  const prevRaw = Number.isFinite(env?.raw) ? env!.raw : 0;
  const envObsession = env ? prevObs + (obsession - prevObs) * 0.05 : obsession;
  const envRaw = env ? prevRaw + (rawReality - prevRaw) * 0.02 : rawReality;
  if (env) {
    env.obs = clamp01Safe(envObsession);
    env.raw = clamp01Safe(envRaw);
  }

  return {
    obsession,
    symbiosis,
    rawReality,
    peripheryStarve,
    interactionPressure,
    envObsession: env ? env.obs : clamp01Safe(envObsession),
    envRaw: env ? env.raw : clamp01Safe(envRaw),
  };
}

export function ensureSemanticInteractionDevice(
  ctx: AudioContext,
  refs: SemanticInteractionRefs,
  targetBus: AudioNode | null | undefined,
  noiseBuffer?: AudioBuffer | null,
): SemanticInteractionDevice | null {
  if (refs._semanticDevice) return refs._semanticDevice;
  if (!ctx || !targetBus || typeof targetBus.connect !== 'function') return null;

  const modulatorA = ctx.createOscillator();
  const modulatorB = ctx.createOscillator();
  const fmOutput = ctx.createGain();
  const crossModIndex = ctx.createGain();
  const rawSub = ctx.createOscillator();
  const rawNoise = ctx.createBufferSource();
  const rawFilter = ctx.createBiquadFilter();
  const rawOutput = ctx.createGain();
  const deviceMaster = ctx.createGain();

  modulatorA.type = 'triangle';
  modulatorB.type = 'square';
  rawSub.type = 'sawtooth';
  fmOutput.gain.value = 0.0001;
  crossModIndex.gain.value = 0;
  rawOutput.gain.value = 0.0001;
  deviceMaster.gain.value = 0.0001;
  rawNoise.buffer = noiseBuffer ?? createNoiseBuffer(ctx);
  rawNoise.loop = true;
  rawFilter.type = 'lowpass';
  rawFilter.frequency.value = 120;
  rawFilter.Q.value = 0.5;

  modulatorA.connect(crossModIndex);
  crossModIndex.connect(modulatorB.frequency);
  modulatorB.connect(fmOutput);
  rawSub.connect(rawFilter);
  rawNoise.connect(rawFilter);
  rawFilter.connect(rawOutput);
  fmOutput.connect(deviceMaster);
  rawOutput.connect(deviceMaster);
  deviceMaster.connect(targetBus);

  modulatorA.start();
  modulatorB.start();
  rawSub.start();
  rawNoise.start();

  const device: SemanticInteractionDevice = {
    modulatorA,
    modulatorB,
    fmOutput,
    crossModIndex,
    rawSub,
    rawNoise,
    rawFilter,
    rawOutput,
    deviceMaster,
  };
  refs._semanticDevice = device;
  return device;
}

export function disposeSemanticInteractionDevice(ctx: AudioContext | null | undefined, refs: SemanticInteractionRefs): void {
  const dev = refs._semanticDevice;
  if (!dev || !ctx) return;
  refs._semanticDevice = null;
  const now = ctx.currentTime;
  try { dev.deviceMaster.gain.setTargetAtTime(0.0001, now, 0.05); } catch {}
  const oscillators = [dev.modulatorA, dev.modulatorB, dev.rawSub, dev.rawNoise];
  const nodes = [dev.fmOutput, dev.crossModIndex, dev.rawFilter, dev.rawOutput, dev.deviceMaster];
  window.setTimeout(() => {
    oscillators.forEach((osc) => {
      try { osc.stop(); } catch {}
      try { osc.disconnect(); } catch {}
    });
    nodes.forEach((node) => {
      try { node.disconnect(); } catch {}
    });
  }, 150);
}

export function updateSemanticInteractionDevice(
  ctx: AudioContext,
  refs: SemanticInteractionRefs,
  snapshot: MyceliumSnapshot,
  env: SemanticInteractionEnvelope,
  options: SemanticInteractionUpdateOptions,
): NodalSemanticProfile {
  const profile = calculateSemanticProfile(snapshot, env);
  const dev = refs._semanticDevice;
  const target = options.target ?? 'myzelColorVoice';
  const matrixAmount = options.enabled === false ? 0 : getNodalDeviceTargetLevel(options.matrix, 'semanticFriction', target);
  const baseHz = clampSafe(options.baseHz ?? snapshot.dominantFreq ?? snapshot.nearestNodeFreq ?? 110, 35, 2200, 110);
  const colorVoiceVolume = clampSafe(options.colorVoiceVolume ?? 1, 0, 1.5, 1);
  const masterGain = clampSafe(options.masterGain ?? 0.06, 0, 0.22, 0.06);
  const deviceLevel = clampSafe(matrixAmount * colorVoiceVolume, 0, 1.2, 0);

  if (!dev || !ctx) return profile;
  const now = ctx.currentTime;
  const driftLfo = Math.sin(now * 3.5) * profile.envRaw * 0.035;
  const fmAmount = clampSafe(profile.interactionPressure * 150 + profile.envObsession * 220, 0, 360, 0);
  const fmAudible = clampSafe(profile.interactionPressure * 0.18 + profile.symbiosis * 0.08, 0, 0.32, 0);
  const rawAudible = clampSafe(profile.envRaw * 0.22 + profile.envObsession * 0.06, 0, 0.32, 0);

  dev.modulatorA.frequency.setTargetAtTime(clampSafe(baseHz * 2.25, 70, 5200, 220), now, 0.1);
  dev.modulatorB.frequency.setTargetAtTime(clampSafe(baseHz * 0.5 * (1 + driftLfo), 24, 1600, 55), now, 0.1);
  dev.crossModIndex.gain.setTargetAtTime(fmAmount * 0.45, now, 0.08);
  dev.fmOutput.gain.setTargetAtTime(fmAudible, now, 0.08);
  dev.rawSub.frequency.setTargetAtTime(clampSafe((baseHz / 2) * (1 - driftLfo), 20, 800, 55), now, 0.1);
  dev.rawFilter.frequency.setTargetAtTime(clampSafe(120 + profile.envRaw * 1200 + profile.envObsession * 360, 70, 2600, 120), now, 0.15);
  dev.rawFilter.Q.setTargetAtTime(clampSafe(0.5 + profile.envRaw * 2.2, 0.4, 7.2, 0.5), now, 0.15);
  dev.rawOutput.gain.setTargetAtTime(rawAudible, now, 0.1);
  dev.deviceMaster.gain.setTargetAtTime(Math.max(0.0001, masterGain * deviceLevel), now, 0.1);

  return profile;
}
