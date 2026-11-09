import { type ChurchMode } from "../../../shared/tuning/modes";
import { clamp, type GridTuning, type QuantizeSubdivision } from "../../../shared/tuning/grid";
import {
  DEFAULT_HYPER_PATTERN,
  DEFAULT_HYPERCALI2_PITCH_OFFSETS,
  DEFAULT_HYPERCALI2_WEIGHTS,
} from "../../../domain/hyperCalibration";
import { DRONE_MAX_FREQ, DRONE_MIN_FREQ, DEFAULT_SWARM_COUNT } from "./constants";
import {
  cloneOvertoneMixByPreset,
  createDefaultWaveStartOvertoneMix,
  DEFAULT_OVERTONE_BY_PRESET,
  DRONE_JI_OVERTONES,
} from "./overtones";
import { defaultAgentEnabled, getParticleNodes } from "./particles";
import { DRONE_PRESETS, PARTICLE_PRESETS } from "./presets";
import { type ResonanceState } from "./state";
import { type DronePreset, type ParticlePreset, type ParticleSystem, type ResonanceOvertoneWaveform } from "./types";

const clamp01 = (value: number, max = 1) => clamp(Number.isFinite(value) ? value : 0, 0, max);

export const createDefaultResonanceState = (): ResonanceState => {
  const agentEnabled = defaultAgentEnabled("ji", "lydian", DEFAULT_SWARM_COUNT);
  const agentVolumes = getParticleNodes("ji", DEFAULT_SWARM_COUNT).map(() => 1);
  const droneMixByPreset = cloneOvertoneMixByPreset(DEFAULT_OVERTONE_BY_PRESET);

  return {
    echoOn: false,
    echoTempo: 400,
    gridOn: true,
    gridBase: 440,
    gridTuning: "12edo",
    particleSystem: "ji",
    churchMode: "lydian",
    lockCursorToGrid: true,
    cursorSpeed: 4,
    cursorGravity: 0.62,
    droneTimbre: 0.73,
    droneVibrato: 0.8,
    droneFlanger: 0.6,
    droneOvertoneWaveform: "sine",
    droneRhythm: "Synkope",
    drumActive: true,
    drumPattern: "trip_hop",
    drumVolume: 0.6,
    bassActive: false,
    bassPattern: "stotter",
    bassVolume: 0.4,
    bassRootMode: "auto",
    bassRootHz: DRONE_MIN_FREQ,
    harmonyCascadeSteps: 3,
    hyperCalibrateOn: false,
    hyperCalibratedReady: false,
    hyperCalibratedPattern: [...DEFAULT_HYPER_PATTERN],
    hyperCali2On: false,
    hyperCali2Ready: false,
    hyperCali2Weights64: [...DEFAULT_HYPERCALI2_WEIGHTS],
    hyperCali2PitchOffsets: [...DEFAULT_HYPERCALI2_PITCH_OFFSETS],
    dronePreset: "warm_pad",
    particlePreset: "woodblock",
    particleVolume: 0.3,
    particleMute: false,
    swarmProfile: "wild_orbit",
    swarmCount: DEFAULT_SWARM_COUNT,
    swarmWildness: 0.94,
    clickSoundOnly: true,
    quantizeOn: true,
    quantizeBpm: 108,
    quantizeSubdivision: "16",
    quantizeMicroTightness: 0.74,
    agentEnabled,
    agentVolumes,
    droneJIOvertones: { ...droneMixByPreset.warm_pad },
    droneJIOvertonesByPreset: droneMixByPreset,
    waveStartOvertones: createDefaultWaveStartOvertoneMix(),
    waveStartWaveform: "square",
  };
};

const normalizeAgentVectors = (
  particleSystem: ResonanceState["particleSystem"],
  churchMode: ChurchMode,
  count: number,
  existingEnabled: boolean[] | undefined,
  existingVolumes: number[] | undefined,
) => {
  const nodes = getParticleNodes(particleSystem, count);
  const defaults = defaultAgentEnabled(particleSystem, churchMode, nodes.length);

  const agentEnabled = nodes.map((_, idx) => {
    const value = existingEnabled?.[idx];
    return typeof value === "boolean" ? value : defaults[idx];
  });
  const agentVolumes = nodes.map((_, idx) => {
    const value = existingVolumes?.[idx];
    return clamp01(typeof value === "number" ? value : 1);
  });

  return { agentEnabled, agentVolumes };
};

/**
 * Applies preset-load-safe constraints to merged state.
 * All incoming partials (from preset load or UI) pass through here before mutation.
 *
 * Constraint reference (applyResonanceStateConstraints):
 * | Field | Bounds / Valid Values | NaN/Infinity Fallback |
 * |-------|----------------------|------------------------|
 * | gridBase | ≥16 | 440 |
 * | echoTempo | 50–2000 ms | 400 |
 * | cursorSpeed | 0.5–18 | 4 |
 * | cursorGravity | 0–1.4 | 0.62 |
 * | swarmWildness | 0–1.2 | 0.94 |
 * | droneTimbre, droneVibrato, droneFlanger | 0–1 | clamp01 |
 * | droneOvertoneWaveform, waveStartWaveform | sine|square|sawtooth | sine, square |
 * | bassRootHz | DRONE_MIN–DRONE_MAX | DRONE_MIN_FREQ |
 * | harmonyCascadeSteps | 0–12 (integer) | 0 |
 * | quantizeBpm | 30–240 | 108 |
 * | quantizeSubdivision | 16|32|64 | 16 |
 * | gridTuning | 12edo|17edo|19edo|22edo|31edo|ji|bp | 12edo |
 * | particleSystem | ji|12edo|bp | ji |
 * | particlePreset | PARTICLE_PRESETS | woodblock |
 * | dronePreset | DRONE_PRESETS | warm_pad |
 * | churchMode | chromatic|ionian|…|locrian | lydian |
 * | droneJIOvertones, waveStartOvertones | [0,1] per key | 0 |
 * | swarmCount | 4–48 | DEFAULT_SWARM_COUNT |
 * | quantizeMicroTightness | 0–1 | 0 |
 * | particleVolume | 0–1; crystal_bowl ≤0.24 | clamp01 |
 * | particleMute, clickSoundOnly | boolean | keep current if invalid |
 * See config/state.ts JSDoc for ResonanceState.
 */
export const applyResonanceStateConstraints = (
  current: ResonanceState,
  partial: Partial<ResonanceState>,
): ResonanceState => {
  const merged = { ...current, ...partial };

  merged.gridBase = Math.max(16, Number.isFinite(merged.gridBase) ? merged.gridBase : 440);
  merged.echoTempo = clamp(Number.isFinite(merged.echoTempo) ? merged.echoTempo : 400, 50, 2000);
  merged.cursorSpeed = clamp(Number.isFinite(merged.cursorSpeed) ? merged.cursorSpeed : 4, 0.5, 18);
  merged.cursorGravity = clamp(Number.isFinite(merged.cursorGravity) ? merged.cursorGravity : 0.62, 0, 1.4);
  merged.swarmWildness = clamp(Number.isFinite(merged.swarmWildness) ? merged.swarmWildness : 0.94, 0, 1.2);
  merged.droneTimbre = clamp01(merged.droneTimbre);
  merged.droneVibrato = clamp01(merged.droneVibrato);
  merged.droneFlanger = clamp01(merged.droneFlanger);
  const validWaveforms: ResonanceOvertoneWaveform[] = ["sine", "square", "sawtooth"];
  merged.droneOvertoneWaveform = validWaveforms.includes(
    merged.droneOvertoneWaveform as ResonanceOvertoneWaveform,
  )
    ? (merged.droneOvertoneWaveform as ResonanceOvertoneWaveform)
    : "sine";
  merged.waveStartWaveform = validWaveforms.includes(
    merged.waveStartWaveform as ResonanceOvertoneWaveform,
  )
    ? (merged.waveStartWaveform as ResonanceOvertoneWaveform)
    : "square";
  merged.drumVolume = clamp01(merged.drumVolume);
  merged.bassVolume = clamp01(merged.bassVolume);
  merged.particleVolume = clamp01(merged.particleVolume);
  if (merged.particlePreset === "crystal_bowl") {
    merged.particleVolume = Math.min(merged.particleVolume, 0.24);
  }
  merged.bassRootHz = clamp(
    Number.isFinite(merged.bassRootHz) ? merged.bassRootHz : DRONE_MIN_FREQ,
    DRONE_MIN_FREQ,
    DRONE_MAX_FREQ,
  );
  merged.harmonyCascadeSteps = Number.isFinite(merged.harmonyCascadeSteps)
    ? Math.max(0, Math.min(12, Math.round(merged.harmonyCascadeSteps)))
    : 0;
  merged.quantizeBpm = clamp(Number.isFinite(merged.quantizeBpm) ? merged.quantizeBpm : 108, 30, 240);
  const validSubdivisions: QuantizeSubdivision[] = ["16", "32", "64"];
  merged.quantizeSubdivision = validSubdivisions.includes(
    merged.quantizeSubdivision as QuantizeSubdivision,
  )
    ? (merged.quantizeSubdivision as QuantizeSubdivision)
    : "16";
  const validGridTunings: GridTuning[] = ["12edo", "17edo", "19edo", "22edo", "31edo", "ji", "bp"];
  merged.gridTuning = validGridTunings.includes(merged.gridTuning as GridTuning)
    ? (merged.gridTuning as GridTuning)
    : "12edo";
  const validParticleSystems: ParticleSystem[] = ["ji", "12edo", "bp"];
  merged.particleSystem = validParticleSystems.includes(merged.particleSystem as ParticleSystem)
    ? (merged.particleSystem as ParticleSystem)
    : "ji";
  const validChurchModes: ChurchMode[] = [
    "chromatic", "ionian", "dorian", "phrygian", "lydian", "mixolydian", "aeolian", "locrian",
  ];
  merged.churchMode = validChurchModes.includes(merged.churchMode as ChurchMode)
    ? (merged.churchMode as ChurchMode)
    : "lydian";
  const validParticlePresets = PARTICLE_PRESETS.map((p) => p.value);
  merged.particlePreset = validParticlePresets.includes(merged.particlePreset as ParticlePreset)
    ? (merged.particlePreset as ParticlePreset)
    : "woodblock";
  const validDronePresets = DRONE_PRESETS.map((p) => p.value);
  merged.dronePreset = validDronePresets.includes(merged.dronePreset as DronePreset)
    ? (merged.dronePreset as DronePreset)
    : "warm_pad";
  merged.quantizeMicroTightness = clamp01(merged.quantizeMicroTightness);
  merged.swarmCount = Number.isFinite(merged.swarmCount)
    ? Math.max(4, Math.min(48, Math.round(merged.swarmCount)))
    : DEFAULT_SWARM_COUNT;
  merged.particleMute = typeof merged.particleMute === "boolean" ? merged.particleMute : current.particleMute;
  merged.clickSoundOnly = typeof merged.clickSoundOnly === "boolean" ? merged.clickSoundOnly : current.clickSoundOnly;

  const { agentEnabled, agentVolumes } = normalizeAgentVectors(
    merged.particleSystem,
    merged.churchMode,
    merged.swarmCount,
    merged.agentEnabled,
    merged.agentVolumes,
  );
  merged.agentEnabled = agentEnabled;
  merged.agentVolumes = agentVolumes;

  const overtoneByPreset =
    merged.droneJIOvertonesByPreset ?? cloneOvertoneMixByPreset(DEFAULT_OVERTONE_BY_PRESET);
  for (const p of DRONE_PRESETS) {
    if (!overtoneByPreset[p.value] || Object.keys(overtoneByPreset[p.value]).length === 0) {
      overtoneByPreset[p.value] = { ...DEFAULT_OVERTONE_BY_PRESET[p.value] };
    }
  }
  merged.droneJIOvertonesByPreset = overtoneByPreset;
  const rawOvertone = merged.droneJIOvertones ?? { ...overtoneByPreset[merged.dronePreset] };
  const clamped: Record<string, number> = {};
  for (const { label } of DRONE_JI_OVERTONES) {
    const v = rawOvertone[label];
    clamped[label] = clamp01(typeof v === "number" ? v : 0);
  }
  merged.droneJIOvertones = clamped;
  const rawWaveStart = merged.waveStartOvertones ?? createDefaultWaveStartOvertoneMix();
  const clampedWaveStart: Record<string, number> = {};
  for (const { label } of DRONE_JI_OVERTONES) {
    const v = rawWaveStart[label];
    clampedWaveStart[label] = clamp01(typeof v === "number" ? v : 0);
  }
  merged.waveStartOvertones = clampedWaveStart;

  return merged;
};
