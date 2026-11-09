import {
  BASS_PATTERNS,
  DRONE_PRESETS,
  DRUM_KITS,
  DRUM_PATTERNS,
  GRID_TUNING_OPTIONS,
  MYZEL_BALL_MODE_OPTIONS,
  MYZEL_NODE_MODE_OPTIONS,
  MYZEL_PATTERNS,
  PARTICLE_PRESETS,
  RUN_EDOS,
  WAVE_DECAY_PRESETS,
  WAVE_SOUND_PRESETS,
  WAVE_TIMBRE_GRADIENT_PRESETS,
  WAVE_VOLUME_GRADIENT_PRESETS,
  PARTICLE_GRADIENT_PRESETS,
  createEmptyOvertoneMix,
  getModesForSystem,
  type BassPattern,
  type ChurchMode,
  type DronePreset,
  type DrumKit,
  type DrumPattern,
  type GridTuning,
  type MyzelPattern,
  type ParticleGradientPreset,
  type ParticlePreset,
  type ParticleSystem,
  type QuantizeGrid,
  type WaveDecayPreset,
  type WaveSoundPreset,
  type WaveTimbreGradientPreset,
  type WaveVolumeGradientPreset,
} from "../domain/instrumentData";
import type { MetaPresetDefinition } from "../domain/metaPresetTypes";
import type { MyzelBallMode, MyzelNodeMode } from "../../resonance/myceliumInterpreters";

export type SessionMetaOverride = {
  preset?: Partial<MetaPresetDefinition>;
  uiPatch?: Record<string, number | boolean | string | null | undefined>;
};

export const createEntropySeed = (mouseEntropy: number, nowMs: number, audioTimeSec = 0, heapEntropy = 0) => {
  let seed = (
    mouseEntropy ^
    Math.floor(nowMs * 1000) ^
    Math.floor(audioTimeSec * 1000000) ^
    heapEntropy
  ) >>> 0;
  if (!seed) seed = 0x9e3779b9;
  return seed >>> 0;
};

export const createXorShift = (initialSeed: number) => {
  let seed = initialSeed >>> 0;
  return () => {
    seed ^= seed << 13;
    seed >>>= 0;
    seed ^= seed >>> 17;
    seed >>>= 0;
    seed ^= seed << 5;
    seed >>>= 0;
    return (seed >>> 0) / 4294967296;
  };
};

const chooseOne = <T,>(items: readonly T[], rand: () => number): T => {
  if (items.length === 0) throw new Error('Cannot choose from an empty option list.');
  const index = Math.floor(rand() * items.length) % items.length;
  const item = items[index];
  if (item === undefined) throw new Error('Random option index resolved outside the option list.');
  return item;
};
const randRange = (rand: () => number, min: number, max: number, digits = 2) => Number((min + (max - min) * rand()).toFixed(digits));
const randBool = (rand: () => number, threshold = 0.5) => rand() < threshold;

export const buildRandomOvertoneMix = (rand: () => number) => {
  const base = createEmptyOvertoneMix();
  const entries = Object.keys(base);
  const mix: Record<string, number> = {};
  let activeCount = 0;
  entries.forEach((key, idx) => {
    const keep = rand() < (idx < 4 ? 0.62 : 0.32);
    if (!keep) return;
    activeCount += 1;
    mix[key] = randRange(rand, 0.04, idx < 3 ? 0.92 : 0.58);
  });
  if (!activeCount && entries[0]) mix[entries[0]] = 0.82;
  return mix;
};

export const buildRandomMetaSessionOverride = (rand: () => number): SessionMetaOverride => {
  const gridTuning = chooseOne(GRID_TUNING_OPTIONS.map((entry) => entry.value), rand) as GridTuning;
  const particleSystem = chooseOne(["ji", "bp", ...RUN_EDOS] as ParticleSystem[], rand);
  const gridMode = chooseOne(getModesForSystem(gridTuning).map((entry) => entry.value), rand) as ChurchMode;
  const churchMode = chooseOne(getModesForSystem(particleSystem).map((entry) => entry.value), rand) as ChurchMode;
  const buildSend = (chance = 0.38) => ({ enabled: randBool(rand, chance), send: randRange(rand, 0.04, 0.72) });
  const buildMemory = () => ({ enabled: randBool(rand, 0.44), send: randRange(rand, 0.02, 0.52), wet: randRange(rand, 0.05, 0.64) });
  return {
    preset: {
      dronePreset: chooseOne(DRONE_PRESETS.map((entry) => entry.value), rand) as DronePreset,
      particlePreset: chooseOne(PARTICLE_PRESETS.map((entry) => entry.value), rand) as ParticlePreset,
      waveSoundPreset: chooseOne(WAVE_SOUND_PRESETS.map((entry) => entry.value), rand) as WaveSoundPreset,
      waveSoundEnabled: randBool(rand, 0.12),
      waveSoundVolume: randRange(rand, 0.14, 0.34),
      droneVolume: randRange(rand, 0.02, 0.24),
      quantizeGrid: chooseOne([8, 16, 32, 64] as const, rand) as QuantizeGrid,
      gridTempoBpm: Math.round(randRange(rand, 82, 148, 0)),
      myzelEnabled: true,
      myzelPattern: chooseOne(MYZEL_PATTERNS.map((entry) => entry.value), rand) as MyzelPattern,
      myzelBallMode: chooseOne(MYZEL_BALL_MODE_OPTIONS.map((entry) => entry.value), rand) as MyzelBallMode,
      myzelNodeMode: chooseOne(MYZEL_NODE_MODE_OPTIONS.map((entry) => entry.value), rand) as MyzelNodeMode,
      myzelStep16ths: chooseOne([1, 2, 4, 8] as const, rand),
      tParams: {
        tension: randRange(rand, 0.18, 0.96),
        slimLayers: randRange(rand, 0.08, 0.94),
        rawReality: randRange(rand, 0.12, 0.96),
        intensityGlobal: randRange(rand, 0.28, 1),
      },
      room3Body: {
        enabled: randBool(rand, 0.14),
        controls: {
          coupling: randRange(rand, 0.14, 0.96),
          material: randRange(rand, 0, 1),
          air: randRange(rand, 0, 1),
          roughness: randRange(rand, 0, 1),
          resonance: randRange(rand, 0.12, 0.96),
        },
      },
      collectiveMemory: {
        enabled: randBool(rand, 0.48),
        window: randRange(rand, 3, 15, 1),
        drone: buildMemory(),
        particles: buildMemory(),
        waves: buildMemory(),
        myzel: buildMemory(),
      },
      spiral: {
        enabled: randBool(rand, 0.52),
        follow: randRange(rand, 0, 1),
        drive: randRange(rand, 0, 1),
        color: randRange(rand, 0, 1),
        motion: randRange(rand, 0, 1),
        feedback: randRange(rand, 0.04, 0.82),
        bloom: randRange(rand, 0, 1),
        mix: randRange(rand, 0.4, 0.96),
        stereoWidth: randRange(rand, 0.08, 1),
        outputGain: randRange(rand, 0.38, 1),
        drone: buildSend(),
        particles: buildSend(),
        waves: buildSend(),
        myzel: buildSend(),
      },
      transientDrive: {
        drone: buildSend(),
        particles: buildSend(),
        waves: buildSend(),
        myzel: buildSend(),
      },
      liveMastering: {
        enabled: randBool(rand, 0.52),
        strength: randRange(rand, 0, 1),
        glue: randRange(rand, 0, 1),
        air: randRange(rand, 0, 1),
      },
      nexusPatch: {
        echoOn: randBool(rand, 0.62),
        echoTempo: Math.round(randRange(rand, 180, 720, 0)),
        echoDecay: randRange(rand, 0.16, 0.84),
        waveRadius: randRange(rand, 0.88, 1.42),
        waveDecay: chooseOne(WAVE_DECAY_PRESETS.map((entry) => entry.value), rand) as WaveDecayPreset,
        gridOn: true,
        gridBase: chooseOne([110, 123.47, 130.81, 146.83, 164.81, 174.61, 196, 220, 246.94, 261.63, 293.66, 329.63, 392, 415.3, 440] as const, rand),
        gridTuning,
        gridMode,
        particleSystem,
        churchMode,
        lockCursorToGrid: randBool(rand, 0.24),
        cursorSpeed: Math.round(randRange(rand, 2, 8, 0)),
        droneTimbre: randRange(rand, 0, 1),
        droneVibrato: randRange(rand, 0, 1),
        droneFlanger: randRange(rand, 0, 1),
        droneRhythm: chooseOne(["Off", "Puls 1/4", "Puls 1/8", "Puls 1/16", "Synkope"] as const, rand),
        droneDriveOn: randBool(rand, 0.58),
        droneDriveAmount: randRange(rand, 0, 0.82),
        droneDriveTone: randRange(rand, 0, 1),
        droneDriveMix: randRange(rand, 0, 1),
        droneDriveOutput: randRange(rand, 0.22, 1),
        drumActive: randBool(rand, 0.08),
        drumPattern: chooseOne(DRUM_PATTERNS.map((entry) => entry.value), rand) as DrumPattern,
        drumKit: chooseOne(DRUM_KITS.map((entry) => entry.value), rand) as DrumKit,
        drumVolume: randRange(rand, 0.2, 0.72),
        bassActive: randBool(rand, 0.12),
        bassPattern: chooseOne(BASS_PATTERNS.map((entry) => entry.value), rand) as BassPattern,
        bassVolume: randRange(rand, 0.16, 0.62),
        bassRootMode: randBool(rand, 0.68) ? "auto" : "fixed",
        bassRootHz: chooseOne([41.2, 55, 61.74, 73.42, 82.41, 98, 110] as const, rand),
        particleGradientX: chooseOne(PARTICLE_GRADIENT_PRESETS.map((entry) => entry.value), rand) as ParticleGradientPreset,
        particleGradientY: chooseOne(PARTICLE_GRADIENT_PRESETS.map((entry) => entry.value), rand) as ParticleGradientPreset,
        waveTimbreGradientEnabled: randBool(rand, 0.52),
        waveTimbreGradientX: chooseOne(WAVE_TIMBRE_GRADIENT_PRESETS.map((entry) => entry.value), rand) as WaveTimbreGradientPreset,
        waveVolumeGradientEnabled: randBool(rand, 0.36),
        waveVolumeGradientX: chooseOne(WAVE_VOLUME_GRADIENT_PRESETS.map((entry) => entry.value), rand) as WaveVolumeGradientPreset,
        waveOvertonesEnabled: randBool(rand, 0.56),
        droneOvertoneWaveform: chooseOne(["sine", "triangle", "square", "sawtooth"] as const, rand),
        waveOvertoneWaveform: chooseOne(["sine", "triangle", "square", "sawtooth"] as const, rand),
        particleVolume: randRange(rand, 0.08, 0.28),
        particleMute: false,
        quantizeOn: randBool(rand, 0.48),
        quantizeBpm: Math.round(randRange(rand, 84, 156, 0)),
      },
      droneOvertones: buildRandomOvertoneMix(rand),
      waveOvertones: buildRandomOvertoneMix(rand),
    } as Partial<MetaPresetDefinition>,
    uiPatch: {
      drumEdge: randRange(rand, 0, 1),
      drumSoftness: randRange(rand, 0, 1),
      drumAir: randRange(rand, 0, 1),
      drumSnap: randRange(rand, 0, 1),
      grooveSwing: randRange(rand, 0, 1),
      bassTone: randRange(rand, 0, 1),
      bassGrit: randRange(rand, 0, 1),
    },
  };
};


export function mixMouseEntropySeed(currentEntropy: number, clientX: number, clientY: number, dtMs: number, nowMs: number) {
  const mix = (
    ((clientX + 1) * 73856093) ^
    ((clientY + 1) * 19349663) ^
    ((Math.round(dtMs * 1000) + 1) * 83492791) ^
    Math.round(nowMs * 1000)
  ) >>> 0;
  let next = currentEntropy ^ mix;
  next = Math.imul(next ^ (next >>> 15), 2246822519) >>> 0;
  next ^= next >>> 13;
  return next >>> 0;
}

export function readMetaEntropySeed(mouseEntropy: number, nowMs: number, audioTimeSec: number, heapEntropy: number) {
  return createEntropySeed(mouseEntropy, nowMs, audioTimeSec, heapEntropy);
}
