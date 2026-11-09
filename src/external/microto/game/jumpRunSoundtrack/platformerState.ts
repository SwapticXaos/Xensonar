/**
 * Platformer state, constants, and factory functions for Jump Run Soundtrack.
 * Keeps simulation types and level data separate from room UI and audio.
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../../shared/canvasConstants";
import {
  type PlatformerPuzzlePedestal,
  type PlatformerPuzzleToken,
  type PlatformerResonanceGate,
  createPlatformerPuzzlePedestals,
  createPlatformerResonanceGates,
} from "./platformerAdventure";
import {
  createPlatformerMusicNpcs,
  getPlatformerCollectibleKind,
  type PlatformerCollectibleKind,
  type PlatformerMusicNpc,
  type PlatformerNpcNoteOrb,
} from "./platformerNpcMusic";

export const VIEW_W = CANVAS_WIDTH;
export const VIEW_H = CANVAS_HEIGHT;
export const WORLD_W = 4300;

export const PLAYER_W = 34;
export const PLAYER_H = 46;

export const GRAVITY = 1900;
export const MOVE_ACCEL = 2300;
export const AIR_ACCEL = 1300;
export const MAX_SPEED = 420;
export const JUMP_SPEED = 760;

export const SCALE = [0, 2, 3, 5, 7, 10, 12];
export const CHORDS: number[][] = [
  [0, 7, 10],
  [3, 7, 12],
  [5, 8, 12],
  [7, 10, 14],
];

export const PLATFORMER_ROUTE_GROUP_IDS = ["fork-1", "fork-2"] as const;

export type PlatformKind = "solid" | "bounce" | "one_way";
export type RouteSelection = -1 | 0 | 1;
export type Platform = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: PlatformKind;
  routeGroupId?: string;
  routeDirection?: Exclude<RouteSelection, 0>;
  coinSlots?: number;
};
export type Coin = {
  id: number;
  x: number;
  y: number;
  taken: boolean;
  spin: number;
  kind: PlatformerCollectibleKind;
};
export type Keys = { left: boolean; right: boolean; jump: boolean };
export type ComposerObstacleKind = "sync_gate" | "phase_gate" | "tuning_crystal" | "chord_fork" | "silence_field";
export type ComposerObstaclePhase = "A" | "B" | "C";
export type ComposerObstacle = {
  id: number;
  kind: ComposerObstacleKind;
  x: number;
  y: number;
  w: number;
  h: number;
  lane: number;
  strength: number;
  pulseRate: number;
  pulseOffset: number;
  activated: boolean;
  lastTriggeredAt: number;
  phase?: ComposerObstaclePhase;
  detail?: number;
  groupId?: string;
};

export type Player = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
  wasGrounded: boolean;
  facing: 1 | -1;
  stepTravel: number;
  jumpQueued: boolean;
};

export type SimState = {
  t: number;
  player: Player;
  keys: Keys;
  cameraX: number;
  checkpointX: number;
  checkpointY: number;
  lastMilestone: number;
  lives: number;
  score: number;
  collected: number;
  coins: Coin[];
  musicNpcs: PlatformerMusicNpc[];
  noteOrbs: PlatformerNpcNoteOrb[];
  puzzlePedestals: PlatformerPuzzlePedestal[];
  resonanceGates: PlatformerResonanceGate[];
  lastMelodyToken: PlatformerPuzzleToken | null;
  lastMelodyTokenAt: number;
  lastProgressAt: number;
  lastProgressX: number;
  modeShift: number;
  nextNpcOrbId: number;
  composerObstacles: ComposerObstacle[];
  routeSelections: Record<string, RouteSelection>;
  win: boolean;
  uiClock: number;
};

const makePlatform = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  kind: PlatformKind,
  opts: Partial<Platform> = {},
): Platform => ({
  id,
  x,
  y,
  w,
  h,
  kind,
  routeGroupId: opts.routeGroupId,
  routeDirection: opts.routeDirection,
  coinSlots: opts.coinSlots,
});

const findPlatformById = (platforms: Platform[], id: string): Platform => {
  const platform = platforms.find((entry) => entry.id === id);
  if (!platform) {
    throw new Error(`Missing platform ${id}`);
  }
  return platform;
};

const buildInitialRouteSelections = (platforms: Platform[]): Record<string, RouteSelection> => {
  const selections: Record<string, RouteSelection> = {};
  for (const groupId of PLATFORMER_ROUTE_GROUP_IDS) {
    selections[groupId] = 0;
  }
  for (const platform of platforms) {
    if (platform.routeGroupId) selections[platform.routeGroupId] = 0;
  }
  return selections;
};

export const isPlatformActiveForRoute = (
  platform: Platform,
  routeSelections: Record<string, RouteSelection>,
): boolean => {
  if (!platform.routeGroupId || !platform.routeDirection) return true;
  const selection = routeSelections[platform.routeGroupId] ?? 0;
  return selection === 0 || selection === platform.routeDirection;
};

export function createPlatforms(): Platform[] {
  return [
    makePlatform("start", 0, 518, 460, 62, "solid"),
    makePlatform("plateau-1", 590, 506, 300, 74, "solid"),
    makePlatform("plateau-2", 980, 472, 250, 108, "solid"),
    makePlatform("fork-1-base", 1310, 446, 340, 134, "solid"),
    makePlatform("fork-1-low-a", 1695, 502, 150, 22, "solid", { routeGroupId: "fork-1", routeDirection: -1, coinSlots: 0 }),
    makePlatform("fork-1-high-a", 1684, 362, 146, 18, "solid", { routeGroupId: "fork-1", routeDirection: 1, coinSlots: 0 }),
    makePlatform("fork-1-low-b", 1872, 536, 162, 20, "solid", { routeGroupId: "fork-1", routeDirection: -1, coinSlots: 0 }),
    makePlatform("fork-1-high-b", 1870, 314, 170, 18, "solid", { routeGroupId: "fork-1", routeDirection: 1, coinSlots: 0 }),
    makePlatform("merge-1", 2120, 488, 300, 92, "solid"),
    makePlatform("mid-1", 2520, 456, 260, 124, "solid"),
    makePlatform("echo-lift-1", 2490, 346, 136, 12, "one_way", { coinSlots: 0 }),
    makePlatform("mid-2", 2870, 426, 330, 154, "solid"),
    makePlatform("echo-lift-2", 3050, 306, 140, 12, "one_way", { coinSlots: 0 }),
    makePlatform("fork-2-base", 3290, 500, 280, 80, "solid"),
    makePlatform("fork-2-low-a", 3590, 522, 150, 20, "solid", { routeGroupId: "fork-2", routeDirection: -1, coinSlots: 0 }),
    makePlatform("fork-2-high-a", 3545, 390, 150, 18, "solid", { routeGroupId: "fork-2", routeDirection: 1, coinSlots: 0 }),
    makePlatform("fork-2-low-b", 3770, 540, 156, 20, "solid", { routeGroupId: "fork-2", routeDirection: -1, coinSlots: 0 }),
    makePlatform("fork-2-high-b", 3738, 334, 168, 18, "solid", { routeGroupId: "fork-2", routeDirection: 1, coinSlots: 0 }),
    makePlatform("echo-lift-3", 3894, 288, 126, 12, "one_way", { coinSlots: 0 }),
    makePlatform("finish-platform", 4000, 520, 300, 60, "solid"),
  ];
}

export function createCoins(platforms: Platform[]): Coin[] {
  const coins: Coin[] = [];
  let id = 0;
  for (const [platformIndex, platform] of platforms.entries()) {
    const count = platform.coinSlots ?? (platform.routeGroupId ? 0 : (platform.w > 300 ? 4 : platform.w > 250 ? 3 : 2));
    for (let i = 0; i < count; i += 1) {
      const x = platform.x + (platform.w * (i + 1)) / (count + 1);
      const y = platform.y - (platform.kind === "bounce" ? 70 : 46);
      coins.push({
        id,
        x,
        y,
        taken: false,
        spin: Math.random() * Math.PI * 2,
        kind: getPlatformerCollectibleKind(platformIndex, i),
      });
      id += 1;
    }
  }
  return coins;
}

const laneFromWorldX = (x: number) => Math.floor((x / WORLD_W) * SCALE.length) % SCALE.length;

export function createComposerObstacles(platforms: Platform[]): ComposerObstacle[] {
  const makeObstacle = (
    id: number,
    kind: ComposerObstacleKind,
    x: number,
    y: number,
    w: number,
    h: number,
    opts: Partial<ComposerObstacle> = {},
  ): ComposerObstacle => ({
    id,
    kind,
    x,
    y,
    w,
    h,
    lane: opts.lane ?? laneFromWorldX(x + w * 0.5),
    strength: opts.strength ?? 0.8,
    pulseRate: opts.pulseRate ?? 1.6,
    pulseOffset: opts.pulseOffset ?? 0,
    activated: false,
    lastTriggeredAt: -999,
    phase: opts.phase,
    detail: opts.detail,
    groupId: opts.groupId,
  });

  const plateau1 = findPlatformById(platforms, "plateau-1");
  const plateau2 = findPlatformById(platforms, "plateau-2");
  const fork1LowA = findPlatformById(platforms, "fork-1-low-a");
  const fork1HighA = findPlatformById(platforms, "fork-1-high-a");
  const fork1LowB = findPlatformById(platforms, "fork-1-low-b");
  const fork1HighB = findPlatformById(platforms, "fork-1-high-b");
  const merge1 = findPlatformById(platforms, "merge-1");
  const mid2 = findPlatformById(platforms, "mid-2");
  const fork2LowA = findPlatformById(platforms, "fork-2-low-a");
  const fork2HighA = findPlatformById(platforms, "fork-2-high-a");
  const fork2LowB = findPlatformById(platforms, "fork-2-low-b");
  const fork2HighB = findPlatformById(platforms, "fork-2-high-b");
  const finishPlatform = findPlatformById(platforms, "finish-platform");

  return [
    makeObstacle(0, "sync_gate", plateau1.x + 130, plateau1.y - 118, 40, 102, {
      strength: 0.8,
      pulseRate: 1.75,
      pulseOffset: 0.16,
    }),
    makeObstacle(1, "phase_gate", plateau2.x + 96, plateau2.y - 160, 38, 150, {
      strength: 0.82,
      pulseRate: 0.9,
      pulseOffset: 0.08,
      phase: "A",
      detail: 0,
    }),
    makeObstacle(2, "chord_fork", fork1LowA.x + 48, fork1LowA.y - 54, 36, 30, {
      strength: 0.88,
      pulseRate: 1.48,
      pulseOffset: 0.18,
      detail: -1,
      groupId: "fork-1",
    }),
    makeObstacle(3, "chord_fork", fork1HighA.x + 60, fork1HighA.y - 56, 36, 30, {
      strength: 0.88,
      pulseRate: 1.48,
      pulseOffset: 0.72,
      detail: 1,
      groupId: "fork-1",
    }),
    makeObstacle(4, "silence_field", fork1LowB.x + 18, fork1LowB.y - 70, 122, 58, {
      strength: 0.78,
      pulseRate: 0.68,
      pulseOffset: 0.24,
      detail: 0.78,
    }),
    makeObstacle(5, "tuning_crystal", fork1HighB.x + 82, fork1HighB.y - 58, 28, 32, {
      strength: 0.94,
      pulseRate: 2.15,
      pulseOffset: 0.44,
      detail: 1,
    }),
    makeObstacle(6, "sync_gate", merge1.x + 154, merge1.y - 126, 42, 110, {
      strength: 0.92,
      pulseRate: 2.05,
      pulseOffset: 0.38,
    }),
    makeObstacle(7, "phase_gate", mid2.x + 148, mid2.y - 174, 38, 160, {
      strength: 0.9,
      pulseRate: 1.05,
      pulseOffset: 0.24,
      phase: "B",
      detail: 1,
    }),
    makeObstacle(8, "chord_fork", fork2LowA.x + 46, fork2LowA.y - 54, 36, 30, {
      strength: 0.92,
      pulseRate: 1.62,
      pulseOffset: 0.36,
      detail: -1,
      groupId: "fork-2",
    }),
    makeObstacle(9, "chord_fork", fork2HighA.x + 58, fork2HighA.y - 56, 36, 30, {
      strength: 0.92,
      pulseRate: 1.62,
      pulseOffset: 0.82,
      detail: 1,
      groupId: "fork-2",
    }),
    makeObstacle(10, "sync_gate", fork2LowB.x + 56, fork2LowB.y - 118, 40, 100, {
      strength: 0.98,
      pulseRate: 2.2,
      pulseOffset: 0.52,
    }),
    makeObstacle(11, "tuning_crystal", fork2HighB.x + 90, fork2HighB.y - 58, 28, 32, {
      strength: 0.96,
      pulseRate: 2.42,
      pulseOffset: 0.76,
      detail: 2,
    }),
    makeObstacle(12, "sync_gate", finishPlatform.x + 138, finishPlatform.y - 134, 42, 112, {
      strength: 1,
      pulseRate: 2.35,
      pulseOffset: 0.54,
    }),
    makeObstacle(13, "phase_gate", finishPlatform.x + 214, finishPlatform.y - 180, 38, 168, {
      strength: 0.98,
      pulseRate: 1.12,
      pulseOffset: 0.58,
      phase: "C",
      detail: 2,
    }),
  ];
}

export function createInitialState(
  coins: Coin[],
  composerObstacles: ComposerObstacle[] = [],
  platforms: Platform[] = [],
): SimState {
  const musicNpcs = createPlatformerMusicNpcs(platforms);
  const puzzlePedestals = createPlatformerPuzzlePedestals(platforms);
  const resonanceGates = createPlatformerResonanceGates(platforms);
  return {
    t: 0,
    player: {
      x: 84,
      y: 460,
      vx: 0,
      vy: 0,
      onGround: false,
      wasGrounded: false,
      facing: 1,
      stepTravel: 0,
      jumpQueued: false,
    },
    keys: { left: false, right: false, jump: false },
    cameraX: 0,
    checkpointX: 84,
    checkpointY: 460,
    lastMilestone: 0,
    lives: 5,
    score: 0,
    collected: 0,
    coins: coins.map((c) => ({ ...c })),
    musicNpcs: musicNpcs.map((npc) => ({ ...npc })),
    noteOrbs: [],
    puzzlePedestals: puzzlePedestals.map((pedestal) => ({ ...pedestal })),
    resonanceGates: resonanceGates.map((gate) => ({ ...gate })),
    lastMelodyToken: null,
    lastMelodyTokenAt: -999,
    lastProgressAt: 0,
    lastProgressX: 84,
    modeShift: 0,
    nextNpcOrbId: 0,
    composerObstacles: composerObstacles.map((obstacle) => ({ ...obstacle })),
    routeSelections: buildInitialRouteSelections(platforms),
    win: false,
    uiClock: 0,
  };
}
