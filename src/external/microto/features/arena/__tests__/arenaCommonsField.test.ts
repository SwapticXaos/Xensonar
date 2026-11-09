import { describe, expect, it } from "vitest";
import { createInitialArenaState } from "../arenaState";
import { ARENA_COMMONS_MAX_BOLTS, tickArenaCommonsField } from "../arenaCommonsField";
import { tickArenaState } from "../arenaPhysics";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../../../shared/canvasConstants";

const GAME_WIDTH = CANVAS_WIDTH;
const GAME_HEIGHT = CANVAS_HEIGHT;

function createLevelThreeArenaState() {
  const state = createInitialArenaState(GAME_WIDTH, GAME_HEIGHT);
  state.level = 3;
  state.playerX = 620;
  state.playerY = 420;
  state.orb.x = 480;
  state.orb.y = 180;
  state.orb.vx = 0;
  state.orb.vy = 0;
  state.enemyTimer = 999;
  state.commonsClock = 0;
  state.commonsStep = 15;
  return state;
}

describe("arena commons field", () => {
  it("stays inert before level 3", () => {
    const state = createInitialArenaState(GAME_WIDTH, GAME_HEIGHT);
    state.level = 2;
    const before = {
      phaseA: state.phaseA,
      phaseB: state.phaseB,
      commonsClock: state.commonsClock,
      bolts: state.bolts.length,
      vx: state.orb.vx,
      vy: state.orb.vy,
    };

    tickArenaCommonsField(state, 0.16, GAME_WIDTH, GAME_HEIGHT);

    expect(state.phaseA).toBe(before.phaseA);
    expect(state.phaseB).toBe(before.phaseB);
    expect(state.commonsClock).toBe(before.commonsClock);
    expect(state.bolts).toHaveLength(before.bolts);
    expect(state.orb.vx).toBe(before.vx);
    expect(state.orb.vy).toBe(before.vy);
  });

  it("advances phases and emits gated bolt triplets on the commons rhythm grid", () => {
    const state = createLevelThreeArenaState();

    tickArenaCommonsField(state, 0.14, GAME_WIDTH, GAME_HEIGHT);

    expect(state.phaseA).toBeGreaterThan(0);
    expect(state.phaseB).toBeGreaterThan(0);
    expect(state.commonsStep).toBe(0);
    expect(state.bolts).toHaveLength(3);
    expect(state.commonsStepDur).toBeCloseTo(0.14, 5);
  });

  it("caps commons bolts to the shared maximum", () => {
    const state = createLevelThreeArenaState();
    state.bolts = Array.from({ length: ARENA_COMMONS_MAX_BOLTS + 9 }, (_, index) => ({
      x: index,
      y: index,
      vx: 0,
      vy: 0,
      r: 7,
    }));

    tickArenaCommonsField(state, 0.01, GAME_WIDTH, GAME_HEIGHT);

    expect(state.bolts).toHaveLength(ARENA_COMMONS_MAX_BOLTS);
  });

  it("runs through tickArenaState so GAME has a single simulation authority", () => {
    const state = createLevelThreeArenaState();

    const result = tickArenaState(
      state,
      0.14,
      { left: false, right: false, shoot: false },
      GAME_WIDTH,
      GAME_HEIGHT,
    );

    expect(result.orbShot).toBe(false);
    expect(state.commonsStep).toBe(0);
    expect(state.bolts).toHaveLength(3);
  });
});
