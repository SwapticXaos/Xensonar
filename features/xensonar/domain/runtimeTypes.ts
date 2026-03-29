import type { WaveDecayPreset } from "./instrumentData";

export interface SemanticNode {
  x: number;
  y: number;
  freq: number;
  energy: number;
  label: string;
}

export interface Orb {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
}

export interface HiddenAnchor {
  ratio: number;
  label: string;
  angle: number;
  radius: number;
  jitter: number;
  orbit: number;
  weight: number;
  x: number;
  y: number;
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  hue: number;
}

export interface HeartPickup {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  spin: number;
  life: number;
}

export interface NexusAgent {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ratio: number;
  label: string;
  phase: number;
  lastHit: number;
  lastHitGain: number;
  lastHitX: number;
  lastHitY: number;
  history: { x: number; y: number }[];
}

export interface NexusRipple {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxRadius: number;
  decay: WaveDecayPreset;
  direction?: "left" | "right" | "up" | "down";
  hitAgents?: number[];
}

export interface DirectedPulse {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxRadius: number;
  decay: WaveDecayPreset;
  direction: "left" | "right" | "up" | "down";
  hitAgents: number[];
}

export interface AgentImpactRipple {
  x: number;
  y: number;
  radius: number;
  life: number;
  hue: number | null;
}

export interface GridLine {
  id: string;
  label: string;
  freq: number;
  manualMuted: boolean;
  modeMuted: boolean;
  stepIndex?: number;
}

export interface RecordingState {
  isRecording: boolean;
  durationMs: number;
  hasTake: boolean;
  filenameBase: string;
  exportStatus: "idle" | "encoding" | "ready" | "error";
  exportMessage: string;
}

export interface RecordingMarker {
  id: string;
  timeMs: number;
  usedInCrop: boolean;
}

export interface RecordingCropRange {
  startMs: number;
  endMs: number;
}

export type RecordingSourceMode = "with_drums" | "without_drums";

export type Room = "MAIN" | "NEXUS" | "TOPOLOGY" | "GAME" | "RESONANCE" | "COMMONS" | "L3LAB";
