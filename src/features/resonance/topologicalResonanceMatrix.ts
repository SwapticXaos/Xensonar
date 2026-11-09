import type { MyceliumSnapshot, MyzelTopologicalRelationSnapshot } from '../topology/myceliumSnapshot';
import { getNodalDeviceTargetLevel, type NodalDeviceMatrix, type NodalTargetId } from './nodalDeviceMatrix';

const finiteOr = (value: number | null | undefined, fallback = 0): number => (Number.isFinite(value) ? Number(value) : fallback);
const clampSafe = (value: number | null | undefined, min = 0, max = 1, fallback = min): number => {
  const n = finiteOr(value, fallback);
  return Math.max(min, Math.min(max, n));
};
const clamp01Safe = (value: number | null | undefined, fallback = 0): number => clampSafe(value, 0, 1, fallback);

const createTopologicalFoldCurve = () => {
  const samples = 1024;
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i += 1) {
    const x = (i / (samples - 1)) * 2 - 1;
    curve[i] = Math.tanh(Math.sin(x * Math.PI * 2.1) * 1.45 + x * 0.58) * 0.92;
  }
  return curve;
};

export type TopologicalRelationVoice = {
  osc: OscillatorNode;
  gain: GainNode;
  fmSends: GainNode[];
};

export type TopologicalResonatorDevice = {
  voices: TopologicalRelationVoice[];
  interferenceInput: GainNode;
  interferenceShaper: WaveShaperNode;
  combFilters: Array<{ delay: DelayNode; feedback: GainNode; wet: GainNode }>;
  combSum: GainNode;
  masterGain: GainNode;
};

export type TopologicalResonatorRefs = {
  _topologicalResonator?: TopologicalResonatorDevice | null;
};

export type TopologicalResonatorEnvelope = {
  relationEnergy: number;
  interference: number;
  sparkle: number;
};

export const createTopologicalResonatorEnvelope = (): TopologicalResonatorEnvelope => ({
  relationEnergy: 0,
  interference: 0,
  sparkle: 0,
});

export type TopologicalResonatorUpdateOptions = {
  matrix: NodalDeviceMatrix;
  target?: NodalTargetId;
  baseHz?: number;
  colorVoiceVolume?: number;
  enabled?: boolean;
};

export type TopologicalResonanceTelemetry = {
  relationEnergy: number;
  primaryInterference: number;
  primarySparkle: number;
  activeRelationCount: number;
  deviceLevel: number;
};

function strongestRelations(snapshot: MyceliumSnapshot): MyzelTopologicalRelationSnapshot[] {
  return [...(snapshot.myzelTopologicalRelations ?? [])]
    .filter((relation) => relation && (relation.overlap > 0.001 || relation.interference > 0.001 || relation.relationTension > 0.001))
    .sort((a, b) => {
      const scoreA = a.interference * 0.52 + a.overlap * 0.26 + a.relationTension * 0.18 + a.sparkle * 0.04;
      const scoreB = b.interference * 0.52 + b.overlap * 0.26 + b.relationTension * 0.18 + b.sparkle * 0.04;
      return scoreB - scoreA;
    })
    .slice(0, 3);
}

export function ensureTopologicalResonator(
  ctx: AudioContext,
  refs: TopologicalResonatorRefs,
  targetBus: AudioNode | null | undefined,
): TopologicalResonatorDevice | null {
  if (refs._topologicalResonator) return refs._topologicalResonator;
  if (!ctx || !targetBus || typeof targetBus.connect !== 'function') return null;

  const voices: TopologicalRelationVoice[] = [];
  for (let i = 0; i < 3; i += 1) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = i === 0 ? 'sine' : i === 1 ? 'triangle' : 'sine';
    gain.gain.value = 0.0001;
    osc.connect(gain);
    voices.push({ osc, gain, fmSends: [] });
  }

  voices.forEach((voice, fromIdx) => {
    voices.forEach((target, toIdx) => {
      if (fromIdx === toIdx) return;
      const fm = ctx.createGain();
      fm.gain.value = 0;
      voice.osc.connect(fm);
      fm.connect(target.osc.frequency);
      voice.fmSends[toIdx] = fm;
    });
  });

  const interferenceInput = ctx.createGain();
  interferenceInput.gain.value = 0.0001;
  const interferenceShaper = ctx.createWaveShaper();
  interferenceShaper.curve = createTopologicalFoldCurve();
  interferenceShaper.oversample = '2x';
  interferenceInput.connect(interferenceShaper);

  const combSum = ctx.createGain();
  combSum.gain.value = 0.0001;
  const combTimes = [0.014, 0.021, 0.031, 0.043];
  const combFilters = combTimes.map((time) => {
    const delay = ctx.createDelay(0.12);
    const feedback = ctx.createGain();
    const wet = ctx.createGain();
    delay.delayTime.value = time;
    feedback.gain.value = 0.22;
    wet.gain.value = 0.0001;
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(combSum);
    interferenceShaper.connect(delay);
    return { delay, feedback, wet };
  });

  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.0001;
  voices.forEach((voice) => {
    voice.gain.connect(masterGain);
    voice.gain.connect(interferenceInput);
  });
  combSum.connect(masterGain);
  masterGain.connect(targetBus);
  voices.forEach((voice) => voice.osc.start());

  const device: TopologicalResonatorDevice = { voices, interferenceInput, interferenceShaper, combFilters, combSum, masterGain };
  refs._topologicalResonator = device;
  return device;
}

export function disposeTopologicalResonator(ctx: AudioContext | null | undefined, refs: TopologicalResonatorRefs): void {
  const device = refs._topologicalResonator;
  if (!device || !ctx) return;
  refs._topologicalResonator = null;
  const now = ctx.currentTime;
  try { device.masterGain.gain.setTargetAtTime(0.0001, now, 0.04); } catch {}
  const voices = [...device.voices];
  const nodes: AudioNode[] = [
    device.interferenceInput,
    device.interferenceShaper,
    device.combSum,
    device.masterGain,
    ...device.combFilters.flatMap((comb) => [comb.delay, comb.feedback, comb.wet]),
    ...voices.flatMap((voice) => [voice.gain, ...voice.fmSends]),
  ];
  globalThis.setTimeout(() => {
    voices.forEach((voice) => {
      try { voice.osc.stop(); } catch {}
      try { voice.osc.disconnect(); } catch {}
    });
    nodes.forEach((node) => {
      try { node.disconnect(); } catch {}
    });
  }, 160);
}

export function updateTopologicalResonator(
  ctx: AudioContext,
  refs: TopologicalResonatorRefs,
  snapshot: MyceliumSnapshot,
  env: TopologicalResonatorEnvelope,
  options: TopologicalResonatorUpdateOptions,
): TopologicalResonanceTelemetry {
  const device = refs._topologicalResonator;
  const target = options.target ?? 'myzelColorVoice';
  const matrixLevel = options.enabled === false ? 0 : getNodalDeviceTargetLevel(options.matrix, 'topologicalResonator', target);
  const colorVoiceVolume = clampSafe(options.colorVoiceVolume ?? 1, 0, 1.5, 1);
  const deviceLevel = clampSafe(matrixLevel * colorVoiceVolume, 0, 1.2, 0);
  const relations = strongestRelations(snapshot);
  const primary = relations[0] ?? null;
  const rawRelationEnergy = clamp01Safe(
    (primary?.interference ?? snapshot.myzelPrimaryRelationInterference ?? 0) * 0.58
      + (primary?.overlap ?? 0) * 0.22
      + (snapshot.myzelRelationTension ?? 0) * 0.18
      + (primary?.sparkle ?? snapshot.myzelPrimaryRelationSparkle ?? 0) * 0.08,
  );
  const rawInterference = clamp01Safe(primary?.interference ?? snapshot.myzelPrimaryRelationInterference ?? 0);
  const rawSparkle = clamp01Safe(primary?.sparkle ?? snapshot.myzelPrimaryRelationSparkle ?? 0);
  env.relationEnergy = clamp01Safe(env.relationEnergy + (rawRelationEnergy - env.relationEnergy) * (rawRelationEnergy > env.relationEnergy ? 0.28 : 0.045));
  env.interference = clamp01Safe(env.interference + (rawInterference - env.interference) * 0.18);
  env.sparkle = clamp01Safe(Math.max(env.sparkle * 0.86, rawSparkle));

  if (!device || !ctx) {
    return { relationEnergy: env.relationEnergy, primaryInterference: env.interference, primarySparkle: env.sparkle, activeRelationCount: relations.length, deviceLevel };
  }

  const now = ctx.currentTime;
  const baseHz = clampSafe(options.baseHz ?? snapshot.dominantFreq ?? snapshot.nearestNodeFreq ?? 110, 28, 2400, 110);
  const clusterMass = clamp01Safe(snapshot.myzelClusterMass ?? snapshot.constellationFlux ?? 0);
  const asymmetry = clamp01Safe(snapshot.myzelGestaltAsymmetry ?? 0);
  const linearity = clamp01Safe(snapshot.myzelGestaltLinearity ?? 0);
  const voidPressure = clamp01Safe(snapshot.myzelVoidPressure ?? 0);
  const metal = clamp01Safe(snapshot.myzelPaletteMetalCluster ?? 0);
  const unstable = clamp01Safe(snapshot.myzelPaletteUnstableNoise ?? 0);
  const reed = clamp01Safe(snapshot.myzelPaletteReedFormant ?? 0);
  const glass = clamp01Safe(snapshot.myzelPaletteGlassAir ?? 0);
  const master = clampSafe(deviceLevel * (0.028 + env.relationEnergy * 0.062 + clusterMass * 0.018), 0.0001, 0.16, 0.0001);
  device.masterGain.gain.setTargetAtTime(master, now, 0.11);

  device.voices.forEach((voice, idx) => {
    const relation = relations[idx];
    const relationLevel = relation ? clamp01Safe(relation.interference * 0.62 + relation.overlap * 0.24 + relation.relationTension * 0.14) : 0;
    const ratioA = clampSafe(relation?.ratioA ?? snapshot.myzelPrimaryRelationRatioA ?? (1.18 + idx * 0.21), 0.25, 6, 1);
    const ratioB = clampSafe(relation?.ratioB ?? snapshot.myzelPrimaryRelationRatioB ?? (1.32 + idx * 0.27), 0.25, 6, 1);
    const relationRatio = clampSafe(Math.sqrt(ratioA * ratioB), 0.25, 6, 1 + idx * 0.18);
    const drift = Math.sin(now * (0.8 + idx * 0.31)) * (asymmetry * 1.8 + unstable * 1.2 + env.interference * 1.6);
    voice.osc.frequency.setTargetAtTime(clampSafe(baseHz * relationRatio + drift, 24, 6200, baseHz), now, 0.16);
    voice.gain.gain.setTargetAtTime(clampSafe(deviceLevel * (0.004 + relationLevel * 0.055 + (idx === 2 ? voidPressure * 0.012 : 0)), 0.0001, 0.09, 0.0001), now, 0.12);
    voice.fmSends.forEach((send, toIdx) => {
      const routeStrength = toIdx === ((idx + 1) % 3) ? 1 : 0.38;
      const fmHz = clampSafe(deviceLevel * routeStrength * (relationLevel * 140 + env.interference * 90 + env.sparkle * 54 + metal * 22), 0, 320, 0);
      send.gain.setTargetAtTime(fmHz, now, env.sparkle > 0.18 ? 0.035 : 0.09);
    });
  });

  device.interferenceInput.gain.setTargetAtTime(clampSafe(deviceLevel * (env.interference * 0.5 + env.sparkle * 0.18 + unstable * 0.08), 0.0001, 0.72, 0.0001), now, env.sparkle > 0.16 ? 0.035 : 0.09);
  device.combSum.gain.setTargetAtTime(clampSafe(deviceLevel * (0.012 + env.relationEnergy * 0.16 + glass * 0.035 + reed * 0.025), 0.0001, 0.32, 0.0001), now, 0.12);
  const feedbackBase = 0.2 + linearity * 0.24 + env.relationEnergy * 0.12 + glass * 0.04;
  device.combFilters.forEach((comb, idx) => {
    const ratio = relations[idx % Math.max(1, relations.length)]?.ratioA ?? (1 + idx * 0.125);
    const delayTarget = clampSafe((0.010 + idx * 0.0065) * (1 + (ratio % 1) * 0.28 + asymmetry * 0.08), 0.006, 0.082, 0.018);
    comb.delay.delayTime.setTargetAtTime(delayTarget, now, 0.28);
    comb.feedback.gain.setTargetAtTime(clampSafe(feedbackBase + Math.sin(now * 0.41 + idx) * asymmetry * 0.035, 0.14, 0.72, 0.22), now, 0.2);
    comb.wet.gain.setTargetAtTime(clampSafe(deviceLevel * (0.025 + env.relationEnergy * 0.09 + env.sparkle * 0.04), 0.0001, 0.22, 0.0001), now, 0.12);
  });

  return { relationEnergy: env.relationEnergy, primaryInterference: env.interference, primarySparkle: env.sparkle, activeRelationCount: relations.length, deviceLevel };
}
