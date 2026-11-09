/**
 * Resonance state type and contract (vision §6 modular domains; single source of truth).
 *
 * State contract (do not add other mutators):
 * - Owner: useResonanceStateAPI owns the single ref (nexusParamsRef); App composes it.
 * - Mutator: Only the API's update() may mutate that ref. Preset load routes through update(): usePresetHandlers
 *   calls update(next) after applying defaults + constraints; no direct ref assignment in usePresetHandlers.
 * - Readers: Resonance domain (useResonanceOrchestrator, useResonanceAudio lifecycle, useResonanceSimulation,
 *   useResonanceInput, useQuantizedParticleQueue) and drumBassScheduler read only. Use state slices
 *   (getGridSlice, getQuantizeSlice, getDroneSlice, getSimulationSlice, getSimulationParamsSlice, getAgentSlice, getParticleSlice,
 *    getQuantizedParticleSlice, getGrooveSlice from stateSlices.ts) to narrow
 *   the read surface. Topology receives topologyQuantizeRef (synced from getQuantizeSlice in App; STRUCTURE opt #75), not the full ref.
 */
import { type ChurchMode } from "../../../shared/tuning/modes";
import { type GridTuning, type QuantizeSubdivision } from "../../../shared/tuning/grid";
import {
  type BassPattern,
  type DronePreset,
  type DrumPattern,
  type ParticlePreset,
  type ParticleSystem,
  type ResonanceOvertoneWaveform,
} from "./types";

/**
 * Resonance state shape. Constraints and defaults: config/defaults.ts applyResonanceStateConstraints.
 * Key bounds: echoTempo 50–2000 ms; cursorSpeed 0.5–18; cursorGravity 0–1.4; swarmWildness 0–1.2;
 * droneTimbre/droneVibrato/droneFlanger/drumVolume/bassVolume/particleVolume 0–1; quantizeBpm 30–240;
 * harmonyCascadeSteps 0–12; swarmCount 4–48; bassRootHz DRONE_MIN_FREQ–DRONE_MAX_FREQ;
 * quantizeSubdivision "16"|"32"|"64"; gridTuning/particleSystem/churchMode from valid enums.
 */
export type ResonanceState = {
  echoOn: boolean;
  /** Echo delay tempo in ms; constrained 50–2000. */
  echoTempo: number;
  gridOn: boolean;
  /** Grid base frequency Hz; min 16. */
  gridBase: number;
  gridTuning: GridTuning;
  particleSystem: ParticleSystem;
  churchMode: ChurchMode;
  lockCursorToGrid: boolean;
  /** Cursor speed; constrained 0.5–18. */
  cursorSpeed: number;
  /** Cursor gravity; constrained 0–1.4. */
  cursorGravity: number;
  /** Drone timbre mix 0–1. */
  droneTimbre: number;
  /** Drone vibrato amount 0–1. */
  droneVibrato: number;
  /** Drone flanger amount 0–1. */
  droneFlanger: number;
  droneOvertoneWaveform: ResonanceOvertoneWaveform;
  droneRhythm: string;
  drumActive: boolean;
  drumPattern: DrumPattern;
  drumVolume: number;
  bassActive: boolean;
  bassPattern: BassPattern;
  bassVolume: number;
  bassRootMode: "auto" | "fixed";
  /** Bass root Hz; constrained DRONE_MIN_FREQ–DRONE_MAX_FREQ. */
  bassRootHz: number;
  /** Harmony cascade steps; constrained 0–12. */
  harmonyCascadeSteps: number;
  hyperCalibrateOn: boolean;
  hyperCalibratedReady: boolean;
  hyperCalibratedPattern: number[];
  hyperCali2On: boolean;
  hyperCali2Ready: boolean;
  hyperCali2Weights64: number[];
  hyperCali2PitchOffsets: number[];
  dronePreset: DronePreset;
  particlePreset: ParticlePreset;
  particleVolume: number;
  particleMute: boolean;
  swarmProfile: "tight_groove" | "wild_orbit";
  /** Swarm count; constrained 4–48. */
  swarmCount: number;
  /** Swarm wildness 0–1.2; NaN/Infinity → 0.94. */
  swarmWildness: number;
  clickSoundOnly: boolean;
  quantizeOn: boolean;
  quantizeEvents?: boolean;
  /** Quantize BPM; constrained 30–240. */
  quantizeBpm: number;
  quantizeSubdivision: QuantizeSubdivision;
  quantizeMicroTightness: number;
  agentEnabled: boolean[];
  /** Per-agent volume 0–1. */
  agentVolumes: number[];
  droneJIOvertones: Record<string, number>;
  droneJIOvertonesByPreset: Record<string, Record<string, number>>;
  waveStartOvertones: Record<string, number>;
  waveStartWaveform: ResonanceOvertoneWaveform;
};
