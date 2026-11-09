import { describe, expect, it } from "vitest";
import {
  PLATFORMER_ROUTE_GROUP_IDS,
  createCoins,
  createComposerObstacles,
  createInitialState,
  createPlatforms,
  isPlatformActiveForRoute,
} from "../platformerState";

describe("platformerState route branches", () => {
  it("creates explicit low/high branch platforms for both fork groups", () => {
    const platforms = createPlatforms();
    const branchPlatforms = platforms.filter((platform) => platform.routeGroupId);
    const oneWayPlatforms = platforms.filter((platform) => platform.kind === "one_way");

    expect(branchPlatforms).toHaveLength(8);
    expect(oneWayPlatforms.length).toBeGreaterThanOrEqual(3);
    expect(new Set(branchPlatforms.map((platform) => platform.routeGroupId))).toEqual(new Set(PLATFORMER_ROUTE_GROUP_IDS));
    expect(new Set(branchPlatforms.map((platform) => platform.routeDirection))).toEqual(new Set([-1, 1]));
    expect(branchPlatforms.every((platform) => platform.coinSlots === 0)).toBe(true);
  });

  it("keeps both branch paths active before commitment and collapses to the chosen route after", () => {
    const platforms = createPlatforms();
    const lowBranch = platforms.find((platform) => platform.id === "fork-1-low-a");
    const highBranch = platforms.find((platform) => platform.id === "fork-1-high-a");

    expect(lowBranch).toBeTruthy();
    expect(highBranch).toBeTruthy();
    expect(isPlatformActiveForRoute(lowBranch!, { "fork-1": 0, "fork-2": 0 })).toBe(true);
    expect(isPlatformActiveForRoute(highBranch!, { "fork-1": 0, "fork-2": 0 })).toBe(true);
    expect(isPlatformActiveForRoute(lowBranch!, { "fork-1": -1, "fork-2": 0 })).toBe(true);
    expect(isPlatformActiveForRoute(highBranch!, { "fork-1": -1, "fork-2": 0 })).toBe(false);
    expect(isPlatformActiveForRoute(lowBranch!, { "fork-1": 1, "fork-2": 0 })).toBe(false);
    expect(isPlatformActiveForRoute(highBranch!, { "fork-1": 1, "fork-2": 0 })).toBe(true);
  });

  it("initializes route selections and route-specific fork obstacles coherently", () => {
    const platforms = createPlatforms();
    const coins = createCoins(platforms);
    const obstacles = createComposerObstacles(platforms);
    const state = createInitialState(coins, obstacles, platforms);
    const forkObstacles = obstacles.filter((obstacle) => obstacle.kind === "chord_fork");

    expect(state.routeSelections).toEqual({ "fork-1": 0, "fork-2": 0 });
    expect(forkObstacles).toHaveLength(4);
    expect(forkObstacles.filter((obstacle) => obstacle.groupId === "fork-1")).toHaveLength(2);
    expect(forkObstacles.filter((obstacle) => obstacle.groupId === "fork-2")).toHaveLength(2);
    expect(new Set(forkObstacles.map((obstacle) => Math.sign(obstacle.detail ?? 0)))).toEqual(new Set([-1, 1]));
    expect(state.musicNpcs.length).toBeGreaterThanOrEqual(8);
    expect(state.musicNpcs.every((npc) => npc.tarotTitle && npc.disposition)).toBe(true);
    expect(state.noteOrbs).toEqual([]);
    expect(state.puzzlePedestals).toHaveLength(3);
    expect(state.resonanceGates).toHaveLength(1);
    expect(state.lastMelodyToken).toBeNull();
    expect(state.lastProgressAt).toBe(0);
    expect(state.lastProgressX).toBe(84);
    expect(state.modeShift).toBe(0);
    expect(state.nextNpcOrbId).toBe(0);
  });

  it("assigns red, blue, and mushroom collectible kinds across the route", () => {
    const platforms = createPlatforms();
    const coins = createCoins(platforms);
    const kinds = new Set(coins.map((coin) => coin.kind));

    expect(kinds).toEqual(new Set(["coin_red", "coin_blue", "mushroom"]));
    expect(coins.some((coin) => coin.kind === "mushroom")).toBe(true);
  });
});
