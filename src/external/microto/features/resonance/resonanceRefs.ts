/**
 * Resonance runtime refs: canonical type and factory.
 * Keeps the shape and initial state of nexus runtime refs inside the resonance domain;
 * App (or a single resonance facade hook) uses createInitialNexusRefsState / useResonanceRefs
 * instead of defining this structure inline.
 * Aligns with project-vision §6 (modular domains) and CORE §7 (reduce broad mutable ref surfaces).
 */

import { useRef, type MutableRefObject } from "react";
import { type NexusAgent, type NexusRipple, type DirectedPulse } from "../runtime/types";
import type { ParticlePreset } from "./config/types";
import type { ResonanceAgentPersona } from "./resonanceConstellations";

export type QuantizedParticleEvent = {
  dueTime: number;
  freq: number;
  amp: number;
  preset: ParticlePreset;
};

/** Full runtime state held in the resonance nexus ref (mutable ref content). */
export type NexusRuntimeRefs = {
  cursorX: number;
  cursorY: number;
  pointerCursorX: number;
  pointerCursorY: number;
  keyboardCursorYOverride: number | null;
  wobble: number;
  wobblePhase: number;
  swarmCollapseUntil: number;
  swarmCollapseX: number;
  swarmCollapseY: number;
  swarmScatterSeed: number;
  osc: OscillatorNode | null;
  oscB: OscillatorNode | null;
  filter: BiquadFilterNode | null;
  gain: GainNode | null;
  gainB: GainNode | null;
  lfo: OscillatorNode | null;
  lfoGain: GainNode | null;
  delayNode: DelayNode | null;
  delayFeedback: GainNode | null;
  droneGroupBus: GainNode | null;
  droneRhythmGain: GainNode | null;
  droneVolumeBus: GainNode | null;
  flangerDelay: DelayNode | null;
  flangerFeedback: GainNode | null;
  flangerLfo: OscillatorNode | null;
  flangerLfoGain: GainNode | null;
  flangerWet: GainNode | null;
  overtoneMaster: GainNode | null;
  manualJiMaster: GainNode | null;
  manualJiOscs: Record<string, OscillatorNode>;
  manualJiGains: Record<string, GainNode>;
  jiOscs: Record<string, OscillatorNode>;
  jiGains: Record<string, GainNode>;
  ripples: NexusRipple[];
  agents: NexusAgent[];
  sectorPulses: DirectedPulse[];
  directedPulses: DirectedPulse[];
  waveAudibleUntil: number;
  waveAudiblePersistent: boolean;
  nextAbsoluteStep: number | null;
  noiseBuffer: AudioBuffer | null;
  recentAudibleHitWindowStartedAt: number;
  recentAudibleHitCount: number;
  agentMelodicOffsetByIndex: number[];
  agentConstellationOrderByIndex: number[];
  agentPersonaByIndex: ResonanceAgentPersona[];
  quantizedHitQueue: QuantizedParticleEvent[];
  quantizedLastHitByAgent: number[];
  waveOctaveBoostHeld: boolean;
  waveOctaveBoostLatched: boolean;
  waveOctaveBoostPressedAt: number;
  waveDriveHeld: boolean;
  waveDriveLevel: number;
};

export type NexusArrowState = {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
};

const INITIAL_ARROW: NexusArrowState = {
  left: false,
  right: false,
  up: false,
  down: false,
};

/**
 * Creates the initial state for the nexus runtime ref (no ref wrapper).
 * Single source of truth for shape and defaults; used by useResonanceRefs.
 */
export function createInitialNexusRefsState(
  gameWidth: number,
  gameHeight: number
): NexusRuntimeRefs {
  const cx = gameWidth / 2;
  const cy = gameHeight / 2;
  return {
    cursorX: cx,
    cursorY: cy,
    pointerCursorX: cx,
    pointerCursorY: cy,
    keyboardCursorYOverride: null,
    wobble: 0,
    wobblePhase: 0,
    swarmCollapseUntil: 0,
    swarmCollapseX: cx,
    swarmCollapseY: cy,
    swarmScatterSeed: 0,
    osc: null,
    oscB: null,
    filter: null,
    gain: null,
    gainB: null,
    lfo: null,
    lfoGain: null,
    delayNode: null,
    delayFeedback: null,
    droneGroupBus: null,
    droneRhythmGain: null,
    droneVolumeBus: null,
    flangerDelay: null,
    flangerFeedback: null,
    flangerLfo: null,
    flangerLfoGain: null,
    flangerWet: null,
    overtoneMaster: null,
    manualJiMaster: null,
    manualJiOscs: {},
    manualJiGains: {},
    jiOscs: {},
    jiGains: {},
    ripples: [],
    agents: [],
    sectorPulses: [],
    directedPulses: [],
    waveAudibleUntil: 0,
    waveAudiblePersistent: false,
    nextAbsoluteStep: null,
    noiseBuffer: null,
    recentAudibleHitWindowStartedAt: 0,
    recentAudibleHitCount: 0,
    agentMelodicOffsetByIndex: [],
    agentConstellationOrderByIndex: [],
    agentPersonaByIndex: [],
    quantizedHitQueue: [],
    quantizedLastHitByAgent: [],
    waveOctaveBoostHeld: false,
    waveOctaveBoostLatched: false,
    waveOctaveBoostPressedAt: 0,
    waveDriveHeld: false,
    waveDriveLevel: 0,
  };
}

export function createInitialNexusArrowState(): NexusArrowState {
  return { ...INITIAL_ARROW };
}

export type NexusRuntimeRefsRef = MutableRefObject<NexusRuntimeRefs>;
export type NexusArrowRef = MutableRefObject<NexusArrowState>;

/**
 * Hook that creates and returns the resonance runtime refs (nexusRefs, nexusArrowRef).
 * Call from App or from a single resonance facade; refs are created in the resonance domain.
 */
export function useResonanceRefs(gameWidth: number, gameHeight: number) {
  const nexusRefs = useRef<NexusRuntimeRefs>(
    createInitialNexusRefsState(gameWidth, gameHeight)
  );
  const nexusArrowRef = useRef<NexusArrowState>(createInitialNexusArrowState());
  return { nexusRefs, nexusArrowRef };
}
