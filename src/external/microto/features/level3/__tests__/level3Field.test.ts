/**
 * Level3 field simulation contract tests.
 * Locks tickLevel3Field and addPulse behavior (STRUCTURE opt #71).
 * Aligns with commonsField.test.ts pattern; Branch A reliability.
 */

import { describe, expect, it } from "vitest";
import { addPulse, tickLevel3Field, type TickLevel3Params } from "../level3Field";
import {
  createInitialLevel3State,
  createInitialWisps,
  type Level3State,
} from "../level3State";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../../../shared/canvasConstants";

const WIDTH = CANVAS_WIDTH;
const HEIGHT = CANVAS_HEIGHT;

function createMinimalState(overrides: Partial<Level3State> = {}): Level3State {
  const s = createInitialLevel3State(WIDTH, HEIGHT);
  s.wisps = createInitialWisps(WIDTH, HEIGHT);
  return { ...s, ...overrides };
}

const baseParams: TickLevel3Params = {
  stepDur: 60 / 104 / 4,
  width: WIDTH,
  height: HEIGHT,
};

describe("level3Field", () => {
  describe("tickLevel3Field", () => {
    it("advances state.t and returns valid { events, hud } shape", () => {
      const state = createMinimalState({ t: 0 });
      const { events, hud } = tickLevel3Field(state, 0.016, baseParams);

      expect(state.t).toBeCloseTo(0.016, 5);
      expect(Array.isArray(events)).toBe(true);
      expect(hud).toHaveProperty("score");
      expect(hud).toHaveProperty("hp");
      expect(hud).toHaveProperty("status");
      expect(typeof hud.score).toBe("number");
      expect(typeof hud.hp).toBe("number");
      expect(typeof hud.status).toBe("string");
    });

    it("keeps cursor within bounds when keys pressed", () => {
      const state = createMinimalState({
        cursorX: WIDTH - 10,
        cursorY: HEIGHT - 10,
        keys: { left: false, right: true, up: false, down: true },
      });
      tickLevel3Field(state, 0.1, baseParams);
      expect(state.cursorX).toBeLessThanOrEqual(WIDTH);
      expect(state.cursorX).toBeGreaterThanOrEqual(0);
      expect(state.cursorY).toBeLessThanOrEqual(HEIGHT);
      expect(state.cursorY).toBeGreaterThanOrEqual(0);
    });

    it("decays pulse life and filters dead pulses", () => {
      const state = createMinimalState({
        pulses: [
          {
            x: 400,
            y: 300,
            radius: 50,
            life: 0.5,
            hit: new Set(),
            direction: "left",
          },
          {
            x: 500,
            y: 350,
            radius: 60,
            life: 0.02,
            hit: new Set(),
            direction: "right",
          },
        ],
      });
      tickLevel3Field(state, 0.1, baseParams);
      expect(state.pulses.length).toBeLessThanOrEqual(2);
      state.pulses.forEach((p) => expect(p.life).toBeGreaterThan(0));
    });

    it("returns hud with score and hp matching state", () => {
      const state = createMinimalState({ score: 5, hp: 4 });
      const { hud } = tickLevel3Field(state, 0.016, baseParams);
      expect(hud.score).toBe(5);
      expect(hud.hp).toBe(4);
    });

    it("emits game_over when hp reaches 0", () => {
      const state = createMinimalState({
        hp: 1,
        cursorX: WIDTH * 0.5,
        cursorY: HEIGHT * 0.5,
        bolts: [{ x: WIDTH * 0.5, y: HEIGHT * 0.5, vx: 0, vy: 0, r: 10 }],
        hitCooldown: 0,
      });
      const { events } = tickLevel3Field(state, 0.1, baseParams);
      const gameOver = events.find((e) => e.type === "game_over");
      expect(gameOver).toBeDefined();
    });

    it("emits won when score reaches 18", () => {
      const state = createMinimalState({ score: 17 });
      state.wisps = [];
      const { events } = tickLevel3Field(state, 0.016, baseParams);
      expect(events.some((e) => e.type === "won")).toBe(false);
      state.score = 18;
      const { events: events2 } = tickLevel3Field(state, 0.016, baseParams);
      expect(events2.some((e) => e.type === "won")).toBe(true);
    });
  });

  describe("addPulse", () => {
    it("adds pulse at cursor with correct direction", () => {
      const state = createMinimalState({
        cursorX: 300,
        cursorY: 400,
        pulseCooldown: 0,
        pulses: [],
      });
      addPulse(state, "left");
      expect(state.pulses).toHaveLength(1);
      expect(state.pulses[0].x).toBe(300);
      expect(state.pulses[0].y).toBe(400);
      expect(state.pulses[0].direction).toBe("left");
      expect(state.pulses[0].radius).toBe(2);
      expect(state.pulses[0].life).toBe(1);
      expect(state.pulses[0].hit).toBeInstanceOf(Set);
    });

    it("does not add pulse when pulseCooldown > 0", () => {
      const state = createMinimalState({
        pulseCooldown: 0.05,
        pulses: [],
      });
      addPulse(state, "right");
      expect(state.pulses).toHaveLength(0);
    });

    it("sets pulseCooldown after adding", () => {
      const state = createMinimalState({ pulseCooldown: 0, pulses: [] });
      addPulse(state, "up");
      expect(state.pulseCooldown).toBeGreaterThan(0);
    });

    it("accepts all PulseDirection values", () => {
      const dirs = ["left", "right", "up", "down"] as const;
      for (const dir of dirs) {
        const state = createMinimalState({ pulseCooldown: 0, pulses: [] });
        addPulse(state, dir);
        expect(state.pulses[0].direction).toBe(dir);
      }
    });
  });
});
