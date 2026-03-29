import type { MyceliumSnapshot } from "../topology/myceliumSnapshot";
import type { DronePreset, ParticlePreset, WaveSoundPreset } from "../xensonar/domain/instrumentData";
import type { Room3ModField } from "./modField";
import type { Room3PartialGroups, Room3TimbreState } from "./timbreModel";

export interface Room3ModalMode {
  freq: number;
  q: number;
  gain: number;
}

export interface Room3ModalBodyState {
  exciterGain: number;
  noiseGain: number;
  pulseFrequency: number;
  highpassHz: number;
  lowpassHz: number;
  preDriveAmount: number;
  postDriveAmount: number;
  masterGain: number;
  modes: Room3ModalMode[];
  partialGroups: Room3PartialGroups;
}

export interface Room3ExciterVoiceSpec {
  type: OscillatorType;
  ratio: number;
  gain: number;
  detuneCents?: number;
  delay?: number;
}

export interface Room3ExciterProfile {
  id: string;
  duration: number;
  attack: number;
  q: number;
  highpassHz: number;
  lowpassHz: number;
  noiseGain: number;
  bodyGain: number;
  voices: Room3ExciterVoiceSpec[];
}

export interface ParticleGradientAxes {
  brightness: number;
  attackHardness: number;
}

interface Room3DroneBodyVoicing {
  modeRatioMul: number[];
  modeGainMul: number[];
  qMul: number;
  exciterMul: number;
  noiseMul: number;
  pulseMul: number;
  highpassMul: number;
  lowpassMul: number;
  preDriveMul: number;
  postDriveMul: number;
  masterMul: number;
  groupBias: Partial<Room3PartialGroups>;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const foldFreqIntoRange = (freq: number, min: number, max: number) => {
  let out = Number.isFinite(freq) && freq > 0 ? freq : min;
  while (out < min) out *= 2;
  while (out > max) out /= 2;
  return clamp(out, min, max);
};

const NEUTRAL_VOICING: Room3DroneBodyVoicing = {
  modeRatioMul: [1, 1, 1, 1],
  modeGainMul: [1, 1, 1, 1],
  qMul: 1,
  exciterMul: 1,
  noiseMul: 1,
  pulseMul: 1,
  highpassMul: 1,
  lowpassMul: 1,
  preDriveMul: 1,
  postDriveMul: 1,
  masterMul: 1,
  groupBias: {},
};

const DRONE_BODY_VOICINGS: Partial<Record<DronePreset, Room3DroneBodyVoicing>> = {
  metallic: {
    modeRatioMul: [1, 1.08, 1.26, 1.48],
    modeGainMul: [0.86, 1.02, 1.18, 1.26],
    qMul: 1.18,
    exciterMul: 0.95,
    noiseMul: 0.92,
    pulseMul: 1.08,
    highpassMul: 1.16,
    lowpassMul: 1.08,
    preDriveMul: 1.08,
    postDriveMul: 1.14,
    masterMul: 1,
    groupBias: { shimmer: 1.16, roughness: 1.12 },
  },
  vocal_choir: {
    modeRatioMul: [1, 1.18, 1.5, 2.06],
    modeGainMul: [0.82, 1.18, 1.14, 0.84],
    qMul: 1.12,
    exciterMul: 0.88,
    noiseMul: 0.82,
    pulseMul: 0.96,
    highpassMul: 0.96,
    lowpassMul: 0.92,
    preDriveMul: 0.94,
    postDriveMul: 1.02,
    masterMul: 1,
    groupBias: { formant: 1.22, shimmer: 1.06 },
  },
  reed_drone: {
    modeRatioMul: [1, 1.14, 1.78, 2.58],
    modeGainMul: [0.94, 1.02, 1.06, 0.84],
    qMul: 1.08,
    exciterMul: 0.96,
    noiseMul: 1.08,
    pulseMul: 1.04,
    highpassMul: 1.04,
    lowpassMul: 0.94,
    preDriveMul: 1.08,
    postDriveMul: 1.04,
    masterMul: 1,
    groupBias: { formant: 1.08, roughness: 1.1 },
  },
  pulse_matrix: {
    modeRatioMul: [1, 1.12, 1.62, 2.1],
    modeGainMul: [0.92, 1.04, 1.12, 1],
    qMul: 1.05,
    exciterMul: 1.15,
    noiseMul: 0.9,
    pulseMul: 1.22,
    highpassMul: 1.04,
    lowpassMul: 1.04,
    preDriveMul: 1.12,
    postDriveMul: 1.08,
    masterMul: 1.02,
    groupBias: { roughness: 1.08, shimmer: 1.06 },
  },
  glass_pipe: {
    modeRatioMul: [1, 1.34, 1.92, 2.6],
    modeGainMul: [0.56, 0.94, 1.22, 1.34],
    qMul: 1.34,
    exciterMul: 0.84,
    noiseMul: 0.74,
    pulseMul: 0.94,
    highpassMul: 1.3,
    lowpassMul: 1.22,
    preDriveMul: 0.9,
    postDriveMul: 1.12,
    masterMul: 0.98,
    groupBias: { fundamental: 0.84, formant: 1.1, shimmer: 1.24 },
  },
  membrane_bloom: {
    modeRatioMul: [1, 1.06, 1.32, 1.74],
    modeGainMul: [1.28, 1.02, 0.76, 0.52],
    qMul: 0.82,
    exciterMul: 1.22,
    noiseMul: 0.78,
    pulseMul: 0.9,
    highpassMul: 0.7,
    lowpassMul: 0.82,
    preDriveMul: 1.08,
    postDriveMul: 0.94,
    masterMul: 1.08,
    groupBias: { fundamental: 1.22, shimmer: 0.72, roughness: 0.82 },
  },
  bronze_reed: {
    modeRatioMul: [1, 1.18, 1.74, 2.48],
    modeGainMul: [0.88, 1.08, 1.02, 0.8],
    qMul: 1.14,
    exciterMul: 0.96,
    noiseMul: 1.12,
    pulseMul: 1.06,
    highpassMul: 1.06,
    lowpassMul: 0.96,
    preDriveMul: 1.12,
    postDriveMul: 1.08,
    masterMul: 1.02,
    groupBias: { formant: 1.1, roughness: 1.16 },
  },
  dust_bow: {
    modeRatioMul: [1, 1.26, 1.62, 2.14],
    modeGainMul: [0.92, 1.02, 1.08, 1],
    qMul: 1.02,
    exciterMul: 0.82,
    noiseMul: 1.26,
    pulseMul: 0.88,
    highpassMul: 1.08,
    lowpassMul: 0.92,
    preDriveMul: 0.98,
    postDriveMul: 1.04,
    masterMul: 1,
    groupBias: { fundamental: 0.9, shimmer: 1.18, roughness: 1.06 },
  },
  cello: {
    modeRatioMul: [1, 1.12, 1.52, 2.02],
    modeGainMul: [1.12, 1.02, 0.88, 0.68],
    qMul: 0.94,
    exciterMul: 1.02,
    noiseMul: 0.86,
    pulseMul: 0.94,
    highpassMul: 0.84,
    lowpassMul: 0.88,
    preDriveMul: 1.04,
    postDriveMul: 0.98,
    masterMul: 1.06,
    groupBias: { fundamental: 1.14, formant: 1.04 },
  },
  saxophon: {
    modeRatioMul: [1, 1.2, 1.68, 2.32],
    modeGainMul: [0.94, 1.1, 1.04, 0.82],
    qMul: 1.1,
    exciterMul: 1.02,
    noiseMul: 1.08,
    pulseMul: 1,
    highpassMul: 1.02,
    lowpassMul: 0.96,
    preDriveMul: 1.1,
    postDriveMul: 1.06,
    masterMul: 1.02,
    groupBias: { formant: 1.12, roughness: 1.08 },
  },
};

const getDroneBodyVoicing = (preset: DronePreset): Room3DroneBodyVoicing => ({
  ...NEUTRAL_VOICING,
  ...(DRONE_BODY_VOICINGS[preset] ?? {}),
  groupBias: { ...NEUTRAL_VOICING.groupBias, ...(DRONE_BODY_VOICINGS[preset]?.groupBias ?? {}) },
});

const exciteProfile = (
  id: string,
  partial: Partial<Room3ExciterProfile>,
): Room3ExciterProfile => ({
  id,
  duration: partial.duration ?? 0.22,
  attack: partial.attack ?? 0.006,
  q: partial.q ?? 3.5,
  highpassHz: partial.highpassHz ?? 80,
  lowpassHz: partial.lowpassHz ?? 2600,
  noiseGain: partial.noiseGain ?? 0,
  bodyGain: partial.bodyGain ?? 1,
  voices: partial.voices ?? [],
});

export const getWaveBodyExciterProfile = (preset: WaveSoundPreset): Room3ExciterProfile => {
  switch (preset) {
    case "bell_tone":
      return exciteProfile("wave-bell", { duration: 0.34, attack: 0.004, q: 5.2, highpassHz: 180, lowpassHz: 5200, bodyGain: 0.9, voices: [
        { type: "sine", ratio: 1, gain: 0.78 },
        { type: "triangle", ratio: 2.02, gain: 0.34, delay: 0.012 },
      ] });
    case "deep_sub":
      return exciteProfile("wave-sub", { duration: 0.42, attack: 0.01, q: 2.2, highpassHz: 40, lowpassHz: 1200, bodyGain: 1.18, voices: [
        { type: "sine", ratio: 0.5, gain: 1.0 },
        { type: "triangle", ratio: 0.74, gain: 0.34, delay: 0.018 },
      ] });
    case "vibrato_glass":
      return exciteProfile("wave-vibrato-glass", { duration: 0.3, attack: 0.006, q: 4.8, highpassHz: 220, lowpassHz: 5600, noiseGain: 0.04, bodyGain: 0.92, voices: [
        { type: "triangle", ratio: 1, gain: 0.7 },
        { type: "sine", ratio: 2.01, gain: 0.28, detuneCents: 8, delay: 0.015 },
      ] });
    case "tape_halo":
      return exciteProfile("wave-tape", { duration: 0.4, attack: 0.01, q: 3.1, highpassHz: 90, lowpassHz: 2600, noiseGain: 0.08, bodyGain: 0.94, voices: [
        { type: "triangle", ratio: 1, gain: 0.72 },
        { type: "sine", ratio: 1.5, gain: 0.24, delay: 0.03 },
      ] });
    case "membrane_thump":
      return exciteProfile("wave-thump", { duration: 0.18, attack: 0.002, q: 1.9, highpassHz: 35, lowpassHz: 900, noiseGain: 0.03, bodyGain: 1.22, voices: [
        { type: "triangle", ratio: 0.5, gain: 1 },
        { type: "sine", ratio: 1, gain: 0.32 },
      ] });
    case "reed_sigh":
      return exciteProfile("wave-reed", { duration: 0.26, attack: 0.004, q: 3.9, highpassHz: 140, lowpassHz: 2200, noiseGain: 0.11, bodyGain: 1.04, voices: [
        { type: "square", ratio: 1, gain: 0.6 },
        { type: "triangle", ratio: 1.48, gain: 0.24, delay: 0.015 },
      ] });
    case "spark_chime":
      return exciteProfile("wave-spark", { duration: 0.16, attack: 0.002, q: 6.2, highpassHz: 280, lowpassHz: 6400, noiseGain: 0.06, bodyGain: 0.82, voices: [
        { type: "sine", ratio: 1, gain: 0.64 },
        { type: "triangle", ratio: 2.48, gain: 0.2 },
        { type: "sine", ratio: 3.72, gain: 0.14, delay: 0.01 },
      ] });
    case "bowed_glass":
      return exciteProfile("wave-bowed-glass", { duration: 0.44, attack: 0.014, q: 4.6, highpassHz: 160, lowpassHz: 4200, noiseGain: 0.1, bodyGain: 0.96, voices: [
        { type: "triangle", ratio: 1, gain: 0.68 },
        { type: "sine", ratio: 2.01, gain: 0.24, delay: 0.04 },
      ] });
    case "clean_pluck":
      return exciteProfile("wave-clean-pluck", { duration: 0.14, attack: 0.002, q: 2.8, highpassHz: 120, lowpassHz: 1800, bodyGain: 0.94, voices: [
        { type: "sawtooth", ratio: 1, gain: 0.7 },
      ] });
    case "soft_pluck":
      return exciteProfile("wave-soft-pluck", { duration: 0.18, attack: 0.003, q: 2.6, highpassHz: 90, lowpassHz: 1600, bodyGain: 1.02, voices: [
        { type: "triangle", ratio: 1, gain: 0.66 },
      ] });
    case "glass_ping":
    default:
      return exciteProfile("wave-glass", { duration: 0.22, attack: 0.003, q: 4.8, highpassHz: 180, lowpassHz: 5000, bodyGain: 0.88, voices: [
        { type: "triangle", ratio: 1, gain: 0.74 },
        { type: "sine", ratio: 2.02, gain: 0.24, delay: 0.012 },
      ] });
  }
};

export const getParticleBodyExciterProfile = (
  preset: ParticlePreset,
  gradientAxes: ParticleGradientAxes | number = 0,
): Room3ExciterProfile => {
  const axes = typeof gradientAxes === "number"
    ? { brightness: clamp(gradientAxes, 0, 1), attackHardness: clamp(gradientAxes, 0, 1) }
    : {
        brightness: clamp(gradientAxes.brightness, 0, 1),
        attackHardness: clamp(gradientAxes.attackHardness, 0, 1),
      };
  const b = axes.brightness;
  const a = axes.attackHardness;
  switch (preset) {
    case "marimba":
      return exciteProfile("particle-marimba", { duration: 0.17 + b * 0.06 - a * 0.03, attack: 0.0015 + (1 - a) * 0.0012, q: 2.4 + a * 1.8, highpassHz: 110 + a * 60, lowpassHz: 2100 + b * 1500, noiseGain: 0.01 + a * 0.03, bodyGain: 1.04, voices: [
        { type: "sine", ratio: 1, gain: 0.8 },
        { type: "sine", ratio: 3.2 + b * 0.6, gain: 0.18 },
      ] });
    case "fm_bell":
      return exciteProfile("particle-fm-bell", { duration: 0.32 + b * 0.1 - a * 0.04, attack: 0.0018 + (1 - a) * 0.0018, q: 4.2 + a * 2.2, highpassHz: 170 + a * 80, lowpassHz: 4200 + b * 1000, bodyGain: 0.88, voices: [
        { type: "sine", ratio: 1, gain: 0.72 },
        { type: "triangle", ratio: 1.38 + b * 0.12, gain: 0.34 },
        { type: "triangle", ratio: 2.28 + b * 0.55, gain: 0.14 },
      ] });
    case "steel_pan":
      return exciteProfile("particle-pan", { duration: 0.25 + b * 0.08 - a * 0.04, attack: 0.0024 + (1 - a) * 0.0024, q: 3.8 + a * 1.3, highpassHz: 140 + a * 50, lowpassHz: 3400 + b * 1200, bodyGain: 0.96, voices: [
        { type: "sine", ratio: 1, gain: 0.78 },
        { type: "sine", ratio: 1.08 + b * 0.12, gain: 0.28, delay: 0.02 },
      ] });
    case "crystal_bowl":
      return exciteProfile("particle-bowl", { duration: 0.5 + b * 0.24 - a * 0.08, attack: 0.006 + (1 - a) * 0.006, q: 5 + a * 1.2, highpassHz: 70 + a * 40, lowpassHz: 1500 + b * 420, bodyGain: 0.86, voices: [
        { type: "sine", ratio: 1, gain: 0.76 },
        { type: "sine", ratio: 1.01 + b * 0.02, gain: 0.22, delay: 0.08 },
      ] });
    case "velvet_bloom":
      return exciteProfile("particle-velvet", { duration: 0.42 + b * 0.16 - a * 0.08, attack: 0.007 + (1 - a) * 0.007, q: 2.8 + a * 1.2, highpassHz: 80 + a * 40, lowpassHz: 2100 + b * 900, noiseGain: 0.02 + a * 0.03, bodyGain: 0.92, voices: [
        { type: "triangle", ratio: 1, gain: 0.7 },
        { type: "sine", ratio: 1.46 + b * 0.12, gain: 0.24, delay: 0.04 },
      ] });
    case "shimmer_pad":
      return exciteProfile("particle-shimmer", { duration: 0.46 + b * 0.2 - a * 0.08, attack: 0.006 + (1 - a) * 0.006, q: 4.1 + a * 1.3, highpassHz: 110 + a * 50, lowpassHz: 3200 + b * 1200, noiseGain: 0.03 + a * 0.03, bodyGain: 0.86, voices: [
        { type: "sine", ratio: 1, gain: 0.68 },
        { type: "triangle", ratio: 1.96 + b * 0.14, gain: 0.24, delay: 0.06 },
        { type: "sine", ratio: 2.96 + b * 0.16, gain: 0.12, delay: 0.11 },
      ] });
    case "dust_chime":
      return exciteProfile("particle-dust-chime", { duration: 0.14 + b * 0.09 - a * 0.03, attack: 0.0012 + (1 - a) * 0.0012, q: 5.6 + a * 1.8, highpassHz: 260 + a * 120, lowpassHz: 5000 + b * 1800, noiseGain: 0.08 + a * 0.06, bodyGain: 0.76, voices: [
        { type: "sine", ratio: 1, gain: 0.56 },
        { type: "triangle", ratio: 2.56 + b * 0.42, gain: 0.16 },
        { type: "sine", ratio: 3.84 + b * 0.56, gain: 0.08, delay: 0.008 },
      ] });
    case "rubber_click":
      return exciteProfile("particle-rubber", { duration: 0.08 + b * 0.025 - a * 0.02, attack: 0.001 + (1 - a) * 0.0009, q: 1.6 + a * 1.2, highpassHz: 60 + a * 30, lowpassHz: 1200 + b * 600, noiseGain: 0.02 + a * 0.03, bodyGain: 1.18, voices: [
        { type: "triangle", ratio: 0.84 + b * 0.12, gain: 0.9 },
      ] });
    case "reed_pop":
      return exciteProfile("particle-reed-pop", { duration: 0.11 + b * 0.05 - a * 0.03, attack: 0.0012 + (1 - a) * 0.0012, q: 3.4 + a * 1.8, highpassHz: 140 + a * 50, lowpassHz: 1800 + b * 900, noiseGain: 0.06 + a * 0.05, bodyGain: 1.04, voices: [
        { type: "square", ratio: 1, gain: 0.66 },
        { type: "triangle", ratio: 1.46 + b * 0.16, gain: 0.18, delay: 0.01 },
      ] });
    case "granular_spark":
      return exciteProfile("particle-granular", { duration: 0.12 + b * 0.06 - a * 0.03, attack: 0.001 + (1 - a) * 0.001, q: 4.9 + a * 1.9, highpassHz: 220 + a * 120, lowpassHz: 3800 + b * 1400, noiseGain: 0.08 + a * 0.08, bodyGain: 0.82, voices: [
        { type: "triangle", ratio: 1, gain: 0.5 },
        { type: "sine", ratio: 2.12 + b * 0.26, gain: 0.14, delay: 0.004 },
        { type: "sine", ratio: 3.2 + b * 0.32, gain: 0.1, delay: 0.012 },
      ] });
    case "pizzicato":
      return exciteProfile("particle-pizz", { duration: 0.1 + b * 0.04 - a * 0.025, attack: 0.0012 + (1 - a) * 0.001, q: 2.6 + a * 1.8, highpassHz: 120 + a * 40, lowpassHz: 1500 + b * 700, bodyGain: 1.02, voices: [
        { type: "triangle", ratio: 1, gain: 0.74 },
      ] });
    case "woodblock":
      return exciteProfile("particle-wood", { duration: 0.065 + b * 0.025 - a * 0.015, attack: 0.0008 + (1 - a) * 0.0006, q: 2.8 + a * 1.4, highpassHz: 120 + a * 40, lowpassHz: 1200 + b * 700, bodyGain: 1.14, voices: [
        { type: "triangle", ratio: 1, gain: 0.8 },
      ] });
    case "soft_pluck":
      return exciteProfile("particle-soft", { duration: 0.16 + b * 0.06 - a * 0.04, attack: 0.0016 + (1 - a) * 0.0014, q: 2.2 + a * 1.8, highpassHz: 90 + a * 40, lowpassHz: 1500 + b * 850, bodyGain: 0.98, voices: [
        { type: "triangle", ratio: 1, gain: 0.72 },
      ] });
    case "glass_ping":
    default:
      return exciteProfile("particle-glass", { duration: 0.2 + b * 0.1 - a * 0.04, attack: 0.0015 + (1 - a) * 0.0015, q: 4.1 + a * 1.9, highpassHz: 170 + a * 60, lowpassHz: 3400 + b * 1800, bodyGain: 0.88, voices: [
        { type: "triangle", ratio: 1, gain: 0.74 },
        { type: "sine", ratio: 1.92 + b * 0.2, gain: 0.24, delay: 0.02 },
      ] });
  }
};

export const deriveRoom3ModalBody = (
  snapshot: MyceliumSnapshot,
  baseHz: number,
  timbre: Room3TimbreState,
  modField: Room3ModField,
  dronePreset: DronePreset = "warm_pad",
): Room3ModalBodyState => {
  const voicing = getDroneBodyVoicing(dronePreset);
  const tension = clamp(snapshot.constellationTension ?? snapshot.tensionField ?? 0, 0, 1);
  const flux = clamp(snapshot.constellationFlux ?? 0, 0, 1);
  const brightness = clamp(snapshot.constellationBrightness ?? 0.5, 0, 1);
  const ratios = (snapshot.constellationRatios?.length ? snapshot.constellationRatios : [1.18, 1.46, 1.94]).slice(0, 3);
  while (ratios.length < 3) ratios.push(1.18 + ratios.length * 0.46);
  const drift = clamp(modField.drift, 0, 1);
  const centroidX = clamp(snapshot.constellationCentroidX ?? 0.5, 0, 1);

  const inharmonicSpread = timbre.inharmonicity * 0.16 + tension * 0.08;
  const qBase = 1.8 + timbre.resonanceFocus * 4.6 + (1 - timbre.damping) * 2.4;
  const gainBase = 0.008 + timbre.bodyMix * 0.02 + flux * 0.014;
  const modeRatios = [
    1,
    ratios[0] * (1 + inharmonicSpread * 0.18),
    ratios[1] * (1 + inharmonicSpread * 0.3),
    ratios[2] * (1 + inharmonicSpread * 0.46),
  ].map((ratio, idx) => ratio * (voicing.modeRatioMul[idx] ?? 1));

  const modes = modeRatios.map((ratio, idx) => {
    const freq = foldFreqIntoRange(baseHz * ratio * (1 + (centroidX - 0.5) * 0.035 * idx), 90, 5400);
    const q = clamp((qBase + idx * (0.8 + brightness * 0.35) - drift * idx * 0.6) * voicing.qMul, 1.2, 18);
    const slotBias = idx === 0 ? 1.1 : idx === 1 ? 0.92 : idx === 2 ? 0.72 : 0.52;
    const gain = clamp(gainBase * slotBias * (0.72 + brightness * 0.34 + tension * 0.28) * (voicing.modeGainMul[idx] ?? 1), 0.001, 0.09);
    return { freq, q, gain };
  });

  return {
    exciterGain: clamp((0.001 + modField.gateBody * 0.018 + flux * 0.012 + timbre.exciterHardness * 0.008) * voicing.exciterMul, 0.001, 0.09),
    noiseGain: clamp((0.0005 + timbre.exciterNoise * 0.02 + modField.air * 0.008) * voicing.noiseMul, 0.0005, 0.065),
    pulseFrequency: foldFreqIntoRange(baseHz * (1.2 + timbre.exciterHardness * 1.8 + brightness * 0.6) * voicing.pulseMul, 40, 2200),
    highpassHz: clamp((80 + timbre.exciterHardness * 260 + brightness * 160) * voicing.highpassMul, 40, 1800),
    lowpassHz: clamp((1400 + brightness * 2600 + timbre.air * 1100 - timbre.damping * 520) * voicing.lowpassMul, 700, 7800),
    preDriveAmount: clamp(timbre.saturationPre * (0.75 + flux * 0.45 + modField.roughness * 0.2) * voicing.preDriveMul, 0.02, 1),
    postDriveAmount: clamp(timbre.saturationPost * (0.72 + brightness * 0.32 + tension * 0.28) * voicing.postDriveMul, 0.02, 1),
    masterGain: clamp((0.0001 + timbre.bodyMix * 0.08 + flux * 0.025 + brightness * 0.012) * voicing.masterMul, 0.0001, 0.2),
    modes,
    partialGroups: {
      fundamental: clamp(timbre.partialGroups.fundamental * (voicing.groupBias.fundamental ?? 1), 0.18, 1.4),
      formant: clamp(timbre.partialGroups.formant * (voicing.groupBias.formant ?? 1), 0.14, 1.35),
      shimmer: clamp(timbre.partialGroups.shimmer * (voicing.groupBias.shimmer ?? 1), 0.08, 1.4),
      roughness: clamp(timbre.partialGroups.roughness * (voicing.groupBias.roughness ?? 1), 0.05, 1.35),
    },
  };
};

export const getPartialGroupWeight = (label: string, groups: Room3PartialGroups) => {
  if (label === "Root") return groups.fundamental;
  const match = label.match(/(\d+)\/(\d+)/);
  if (!match) return 1;
  const ratio = Number(match[1]) / Number(match[2]);
  if (!Number.isFinite(ratio) || ratio <= 0) return 1;
  if (ratio <= 1.6) return groups.fundamental;
  if (ratio <= 2.4) return groups.formant;
  if (ratio <= 4.2) return groups.shimmer;
  return groups.roughness;
};
