/**
 * Arena (Irrlicht) game state and types.
 * Keeps state shape and initial factory in one place so useArenaLoop stays a thin orchestrator.
 * Aligns with project-vision: simulation modules, clearer modules.
 */

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

/** Full arena game state held in useArenaLoop ref. */
export interface ArenaGameState {
  playerX: number;
  playerY: number;
  playerRadius: number;
  orb: Orb;
  anchors: HiddenAnchor[];
  phaseA: number;
  phaseB: number;
  phaseC: number;
  soundChaos: number;
  melodicDrift: number;
  activeAnchorRatio: number;
  activeAnchorLabel: string;
  anchorDist: number;
  chaos: number;
  shotCount: number;
  lasers: Bullet[];
  bolts: Bullet[];
  hearts: HeartPickup[];
  heartDropCooldown: number;
  particles: Particle[];
  score: number;
  totalScore: number;
  level: number;
  levelUpTimer: number;
  levelUpFrom: number;
  levelUpTo: number;
  hp: number;
  hits: number;
  elapsed: number;
  enemyTimer: number;
  laserTimer: number;
  invuln: number;
  over: boolean;
  won: boolean;
  commonsClock: number;
  commonsStep: number;
  commonsStepDur: number;
}

/** HUD display state for GAME room (Irrlicht Arena). Single source of truth for useArenaLoop and GameRoomView. */
export type ArenaHud = {
  score: number;
  goal: number;
  total: number;
  hp: number;
  phase: string;
  time: number;
  level: number;
  anchor: string;
  message: string;
};

export const INITIAL_ARENA_HUD: ArenaHud = {
  score: 0,
  goal: 46,
  total: 0,
  hp: 6,
  phase: "Dormant",
  time: 0,
  level: 1,
  anchor: "Root",
  message: "Irrlicht wartet.",
};

export function createInitialArenaState(gameWidth: number, gameHeight: number): ArenaGameState {
  return {
    playerX: gameWidth / 2,
    playerY: gameHeight - 60,
    playerRadius: 18,
    orb: { x: gameWidth / 2, y: 140, r: 34, vx: 140, vy: -60 },
    anchors: [],
    phaseA: 0,
    phaseB: 0,
    phaseC: 0,
    soundChaos: 0.618,
    melodicDrift: 0,
    activeAnchorRatio: 1,
    activeAnchorLabel: "Root",
    anchorDist: Number.POSITIVE_INFINITY,
    chaos: 0.63,
    shotCount: 0,
    lasers: [],
    bolts: [],
    hearts: [],
    heartDropCooldown: 0,
    particles: [],
    score: 0,
    totalScore: 0,
    level: 1,
    levelUpTimer: 0,
    levelUpFrom: 1,
    levelUpTo: 1,
    hp: 6,
    hits: 0,
    elapsed: 0,
    enemyTimer: 0,
    laserTimer: 0,
    invuln: 0,
    over: false,
    won: false,
    commonsClock: 0,
    commonsStep: 0,
    commonsStepDur: 0.14,
  };
}

/** Anchor node shape supplied by caller (e.g. JI_NODES from shared/tuning/harmonicNodes). */
export type ArenaAnchorNode = { ratio: number; label: string };

/**
 * Run-ready arena state: base + JI anchors, random phases, orb velocity and timers.
 * Single source of truth for both startGameRun and enterArenaWorkspace.
 */
export function createRunStartArenaState(
  gameWidth: number,
  gameHeight: number,
  options: { level?: number; anchorNodes: ArenaAnchorNode[] }
): ArenaGameState {
  const base = createInitialArenaState(gameWidth, gameHeight);
  const level = Math.max(1, Math.min(9, options.level ?? 1));
  const { anchorNodes } = options;
  const anchors: HiddenAnchor[] = anchorNodes.map((ji, idx) => ({
    ratio: ji.ratio,
    label: ji.label,
    angle: (Math.PI * 2 * idx) / anchorNodes.length,
    radius: 80 + idx * 24,
    jitter: Math.random() * Math.PI * 2,
    orbit: 0.8 + Math.random() * 0.9,
    weight: 0.7 + ji.ratio * 0.35,
    x: gameWidth / 2,
    y: gameHeight * 0.46,
  }));
  const orbVx = level === 1 ? 150 : 120 + level * 18;
  const orbVy = level === 1 ? -70 : -50 - level * 8;
  return {
    ...base,
    level,
    levelUpFrom: level,
    levelUpTo: level,
    orb: { ...base.orb, x: gameWidth / 2, y: 140, vx: orbVx, vy: orbVy },
    anchors,
    phaseA: Math.random() * Math.PI * 2,
    phaseB: Math.random() * Math.PI * 2,
    phaseC: Math.random() * Math.PI * 2,
    soundChaos: 0.52 + Math.random() * 0.18,
    melodicDrift: (Math.random() - 0.5) * 0.3,
    enemyTimer: level === 1 ? 0.9 : 0.5,
    laserTimer: 0,
  };
}
