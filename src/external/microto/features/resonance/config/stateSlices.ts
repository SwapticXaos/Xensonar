/**
 * Resonance state slices — typed read-only views of nexusParamsRef subsets.
 * Aligns with vision §6 (modular domains) and CORE "reduce broad mutable ref surfaces."
 * Readers use getXSlice(ref) instead of ref.current.field to make "who reads what" explicit.
 * Mutator: only App updates the ref via updateNParams. Preset load routes through it (usePresetHandlers calls update(next)).
 * These getters are read-only and must remain side-effect free.
 */

import type { MutableRefObject } from "react";
import type { GridTuning, QuantizeSubdivision } from "../../../shared/tuning/grid";
import type { ChurchMode } from "../../../shared/tuning/modes";
import type {
  BassPattern,
  DronePreset,
  DrumPattern,
  ParticlePreset,
  ParticleSystem,
  ResonanceOvertoneWaveform,
} from "./types";
import type { ResonanceState } from "./state";

/** Slice used by draw and grid-dependent logic (e.g. resonanceCanvasDraw, cursor snap, cursor movement). */
export type GridSlice = {
  gridOn: boolean;
  gridBase: number;
  gridTuning: GridTuning;
  lockCursorToGrid: boolean;
  cursorSpeed: number;
};

/** Slice used by Topology and quantize-dependent logic. Topology gets topologyQuantizeRef synced from this. */
export type QuantizeSlice = {
  quantizeOn: boolean;
  quantizeBpm: number;
  quantizeSubdivision: QuantizeSubdivision;
};

/**
 * Global harmonic context — single named read surface for "current harmonic center" across the instrument.
 * Used by HUDs, future cross-room sync, and "Set as root" UX. Extensible for harmonic journey / transpose-all.
 */
export type GlobalHarmonicContext = {
  baseFreq: number;
  quantizeOn: boolean;
  quantizeBpm: number;
  quantizeSubdivision: QuantizeSubdivision;
  gridTuning: GridTuning;
};

/** Slice used by drone/overtone orchestration and frame-sync simulation. */
export type DroneSlice = {
  droneTimbre: number;
  dronePreset: DronePreset;
  droneRhythm: string;
  droneFlanger: number;
  droneVibrato: number;
  droneOvertoneWaveform: ResonanceOvertoneWaveform;
  droneJIOvertones: Record<string, number>;
  droneJIOvertonesByPreset: Record<string, Record<string, number>>;
};

export type WaveStartSlice = {
  waveStartOvertones: Record<string, number>;
  waveStartWaveform: ResonanceOvertoneWaveform;
};

/** Slice used by simulation agent/particle init (useResonanceSimulation). */
export type SimulationSlice = {
  particleSystem: ParticleSystem;
  swarmCount: number;
  agentEnabled: boolean[];
};

/** Slice used by orchestrator logic that manages agents and particle system/mode. */
export type AgentSlice = {
  particleSystem: ParticleSystem;
  churchMode: ChurchMode;
  swarmProfile: "tight_groove" | "wild_orbit";
  swarmCount: number;
  agentEnabled: boolean[];
  agentVolumes: number[];
};

/** Slice used by orchestrator and particle voice selection. */
export type ParticleSlice = {
  particlePreset: ParticlePreset;
};

/** Slice used by Resonance room UI for particle controls. */
export type ParticleUiSlice = {
  particleSystem: ParticleSystem;
  particlePreset: ParticlePreset;
  particleVolume: number;
};

/** Slice used by quantized particle queue (agent-hit scheduler). */
export type QuantizedParticleSlice = {
  quantizeOn: boolean;
  quantizeEvents?: boolean;
  quantizeBpm: number;
  quantizeSubdivision: QuantizeSubdivision;
  particlePreset: ParticlePreset;
  particleMute: boolean;
  clickSoundOnly: boolean;
  particleVolume: number;
  agentEnabled: boolean[];
  agentVolumes: number[];
};

/** Slice used by useResonanceSimulation update loop: echo, agent/particle params for tickResonanceAgents. */
export type SimulationParamsSlice = {
  echoOn: boolean;
  echoTempo: number;
  particleMute: boolean;
  agentEnabled: boolean[];
  agentVolumes: number[];
  clickSoundOnly: boolean;
  swarmWildness: number;
  cursorGravity: number;
};

/** Slice used by drum/bass scheduler and harmony cascade policy. */
export type GrooveSlice = {
  quantizeBpm: number;
  quantizeSubdivision: QuantizeSubdivision;
  quantizeMicroTightness: number;
  hyperCalibrateOn: boolean;
  hyperCalibratedReady: boolean;
  hyperCalibratedPattern: number[];
  hyperCali2On: boolean;
  hyperCali2Ready: boolean;
  hyperCali2Weights64: number[];
  hyperCali2PitchOffsets: number[];
  bassRootMode: "auto" | "fixed";
  bassRootHz: number;
  bassVolume: number;
  bassActive: boolean;
  bassPattern: BassPattern;
  drumActive: boolean;
  drumPattern: DrumPattern;
  drumVolume: number;
  harmonyCascadeSteps: number;
  particleSystem: ParticleSystem;
};

/**
 * Grouped read-only view for Resonance room UI.
 * Bundles the most frequently used slices so panels do not need to depend on the full ResonanceState shape.
 * Intended for use in layout/components only (hooks and runtime still use the more focused slice getters above).
 */
export type ResonanceUiSlice = {
  grid: GridSlice;
  quantize: QuantizeSlice;
  drone: DroneSlice;
  particle: ParticleUiSlice;
  groove: GrooveSlice;
  agent: AgentSlice;
  waveStart: WaveStartSlice;
};

export function getGridSliceFromState(s: ResonanceState): GridSlice {
  return {
    gridOn: s.gridOn,
    gridBase: s.gridBase,
    gridTuning: s.gridTuning,
    lockCursorToGrid: s.lockCursorToGrid,
    cursorSpeed: s.cursorSpeed,
  };
}

export function getGridSlice(ref: MutableRefObject<ResonanceState>): GridSlice {
  return getGridSliceFromState(ref.current);
}

export function getQuantizeSliceFromState(s: ResonanceState): QuantizeSlice {
  return {
    quantizeOn: s.quantizeOn,
    quantizeBpm: s.quantizeBpm,
    quantizeSubdivision: s.quantizeSubdivision,
  };
}

export function getQuantizeSlice(ref: MutableRefObject<ResonanceState>): QuantizeSlice {
  return getQuantizeSliceFromState(ref.current);
}

/** Read-only global harmonic context (base freq + quantize + grid tuning). Single source for cross-room / HUD. */
export function getGlobalHarmonicContext(ref: MutableRefObject<ResonanceState>): GlobalHarmonicContext {
  const grid = getGridSlice(ref);
  const quantize = getQuantizeSlice(ref);
  return {
    baseFreq: grid.gridBase,
    quantizeOn: quantize.quantizeOn,
    quantizeBpm: quantize.quantizeBpm,
    quantizeSubdivision: quantize.quantizeSubdivision,
    gridTuning: grid.gridTuning,
  };
}

export function getDroneSlice(ref: MutableRefObject<ResonanceState>): DroneSlice {
  const s = ref.current;
  return {
    droneTimbre: s.droneTimbre,
    dronePreset: s.dronePreset,
    droneRhythm: s.droneRhythm,
    droneFlanger: s.droneFlanger,
    droneVibrato: s.droneVibrato,
    droneOvertoneWaveform: s.droneOvertoneWaveform,
    droneJIOvertones: s.droneJIOvertones,
    droneJIOvertonesByPreset: s.droneJIOvertonesByPreset,
  };
}

export function getWaveStartSlice(ref: MutableRefObject<ResonanceState>): WaveStartSlice {
  const s = ref.current;
  return {
    waveStartOvertones: s.waveStartOvertones,
    waveStartWaveform: s.waveStartWaveform,
  };
}

export function getSimulationSlice(ref: MutableRefObject<ResonanceState>): SimulationSlice {
  const s = ref.current;
  return {
    particleSystem: s.particleSystem,
    swarmCount: s.swarmCount,
    agentEnabled: s.agentEnabled,
  };
}

export function getAgentSlice(ref: MutableRefObject<ResonanceState>): AgentSlice {
  const s = ref.current;
  return {
    particleSystem: s.particleSystem,
    churchMode: s.churchMode,
    swarmProfile: s.swarmProfile,
    swarmCount: s.swarmCount,
    agentEnabled: s.agentEnabled,
    agentVolumes: s.agentVolumes,
  };
}

export function getParticleSlice(ref: MutableRefObject<ResonanceState>): ParticleSlice {
  const s = ref.current;
  return {
    particlePreset: s.particlePreset,
  };
}

export function getParticleUiSlice(ref: MutableRefObject<ResonanceState>): ParticleUiSlice {
  const s = ref.current;
  return {
    particleSystem: s.particleSystem,
    particlePreset: s.particlePreset,
    particleVolume: s.particleVolume,
  };
}

export function getSimulationParamsSlice(ref: MutableRefObject<ResonanceState>): SimulationParamsSlice {
  const s = ref.current;
  return {
    echoOn: s.echoOn,
    echoTempo: s.echoTempo,
    particleMute: s.particleMute,
    agentEnabled: s.agentEnabled,
    agentVolumes: s.agentVolumes,
    clickSoundOnly: s.clickSoundOnly,
    swarmWildness: s.swarmWildness ?? 0.82,
    cursorGravity: s.cursorGravity ?? 0.42,
  };
}

export function getQuantizedParticleSlice(ref: MutableRefObject<ResonanceState>): QuantizedParticleSlice {
  const s = ref.current;
  return {
    quantizeOn: s.quantizeOn,
    quantizeEvents: s.quantizeEvents,
    quantizeBpm: s.quantizeBpm,
    quantizeSubdivision: s.quantizeSubdivision,
    particlePreset: s.particlePreset,
    particleMute: s.particleMute,
    clickSoundOnly: s.clickSoundOnly,
    particleVolume: s.particleVolume,
    agentEnabled: s.agentEnabled,
    agentVolumes: s.agentVolumes,
  };
}

export function getGrooveSlice(ref: MutableRefObject<ResonanceState>): GrooveSlice {
  const s = ref.current;
  return {
    quantizeBpm: s.quantizeBpm,
    quantizeSubdivision: s.quantizeSubdivision,
    quantizeMicroTightness: s.quantizeMicroTightness,
    hyperCalibrateOn: s.hyperCalibrateOn,
    hyperCalibratedReady: s.hyperCalibratedReady,
    hyperCalibratedPattern: s.hyperCalibratedPattern,
    hyperCali2On: s.hyperCali2On,
    hyperCali2Ready: s.hyperCali2Ready,
    hyperCali2Weights64: s.hyperCali2Weights64,
    hyperCali2PitchOffsets: s.hyperCali2PitchOffsets,
    bassRootMode: s.bassRootMode,
    bassRootHz: s.bassRootHz,
    bassVolume: s.bassVolume,
    bassActive: s.bassActive,
    bassPattern: s.bassPattern,
    drumActive: s.drumActive,
    drumPattern: s.drumPattern,
    drumVolume: s.drumVolume,
    harmonyCascadeSteps: s.harmonyCascadeSteps,
    particleSystem: s.particleSystem,
  };
}

export function getResonanceUiSlice(ref: MutableRefObject<ResonanceState>): ResonanceUiSlice {
  const s = ref.current;
  return {
    grid: getGridSliceFromState(s),
    quantize: getQuantizeSliceFromState(s),
    drone: getDroneSlice(ref),
    particle: getParticleUiSlice(ref),
    groove: getGrooveSlice(ref),
    agent: getAgentSlice(ref),
    waveStart: getWaveStartSlice(ref),
  };
}

export function getResonanceUiSliceFromState(s: ResonanceState): ResonanceUiSlice {
  return {
    grid: getGridSliceFromState(s),
    quantize: getQuantizeSliceFromState(s),
    drone: {
      droneTimbre: s.droneTimbre,
      dronePreset: s.dronePreset,
      droneRhythm: s.droneRhythm,
      droneFlanger: s.droneFlanger,
      droneVibrato: s.droneVibrato,
      droneOvertoneWaveform: s.droneOvertoneWaveform,
      droneJIOvertones: s.droneJIOvertones,
      droneJIOvertonesByPreset: s.droneJIOvertonesByPreset,
    },
    particle: {
      particleSystem: s.particleSystem,
      particlePreset: s.particlePreset,
      particleVolume: s.particleVolume,
    },
    groove: getGrooveSlice({ current: s }),
    agent: getAgentSlice({ current: s }),
    waveStart: {
      waveStartOvertones: s.waveStartOvertones,
      waveStartWaveform: s.waveStartWaveform,
    },
  };
}
