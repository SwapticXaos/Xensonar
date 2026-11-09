/**
 * L3 Lab state types and initial factory.
 * Single source for state shape; aligns with arena/platformer state-draw pattern.
 */

export type Wisp = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ratio: number;
  phase: number;
  hue: number;
};

export type Bolt = { x: number; y: number; vx: number; vy: number; r: number };

export type PulseDirection = "left" | "right" | "up" | "down";

export type Pulse = {
  x: number;
  y: number;
  radius: number;
  life: number;
  hit: Set<number>;
  direction: PulseDirection;
};

export type Level3State = {
  t: number;
  cursorX: number;
  cursorY: number;
  keys: { left: boolean; right: boolean; up: boolean; down: boolean };
  wisps: Wisp[];
  bolts: Bolt[];
  pulses: Pulse[];
  stepClock: number;
  stepIndex: number;
  hitCooldown: number;
  pulseCooldown: number;
  score: number;
  hp: number;
  status: string;
  uiTimer: number;
};

export const PATTERN = [1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0];

export function createInitialLevel3State(width: number, height: number): Level3State {
  return {
    t: 0,
    cursorX: width * 0.5,
    cursorY: height * 0.7,
    keys: { left: false, right: false, up: false, down: false },
    wisps: [],
    bolts: [],
    pulses: [],
    stepClock: 0,
    stepIndex: 0,
    hitCooldown: 0,
    pulseCooldown: 0,
    score: 0,
    hp: 6,
    status: "L3-Lab bereit",
    uiTimer: 0,
  };
}

export function createInitialWisps(width: number, height: number): Wisp[] {
  return [
    { x: width * 0.28, y: height * 0.24, vx: 0, vy: 0, ratio: 3 / 2, phase: 0.1, hue: 186 },
    { x: width * 0.52, y: height * 0.34, vx: 0, vy: 0, ratio: 5 / 4, phase: 0.45, hue: 286 },
    { x: width * 0.72, y: height * 0.22, vx: 0, vy: 0, ratio: 7 / 4, phase: 0.8, hue: 34 },
  ];
}
