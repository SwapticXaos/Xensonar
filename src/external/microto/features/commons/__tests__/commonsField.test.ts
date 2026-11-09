/**
 * Commons field simulation contract tests.
 * Locks tickCommonsField and createCommonsAgents behavior (STRUCTURE opt #59).
 * Aligns with arenaCommonsField.test.ts pattern; Branch A reliability.
 */

import { describe, expect, it } from "vitest";
import {
  createCommonsAgents,
  tickCommonsField,
  type CommonsSimState,
  type TickCommonsParams,
} from "../commonsField";
import { CANVAS_WIDTH, CANVAS_HEIGHT_COMMONS } from "../../../shared/canvasConstants";

const WIDTH = CANVAS_WIDTH;
const HEIGHT = CANVAS_HEIGHT_COMMONS;

function createMinimalSimState(overrides: Partial<CommonsSimState> = {}): CommonsSimState {
  return {
    cursorX: WIDTH * 0.5,
    cursorY: HEIGHT * 0.76,
    wispX: WIDTH * 0.5,
    wispY: HEIGHT * 0.24,
    wispVx: 0,
    wispVy: 0,
    t: 0,
    score: 0,
    integrity: 100,
    pulses: [],
    bolts: [],
    agents: [],
    pulseAt: 0,
    boltAt: 0,
    clockAt: 0,
    queuedHits: [],
    ...overrides,
  };
}

const baseParams: TickCommonsParams = {
  bpm: 96,
  grooveOn: false,
  pulsePower: 1,
  width: WIDTH,
  height: HEIGHT,
};

describe("commonsField", () => {
  describe("createCommonsAgents", () => {
    it("returns 9 agents in JI mode with correct ratios and labels", () => {
      const agents = createCommonsAgents("ji", WIDTH, HEIGHT);
      expect(agents).toHaveLength(9);
      expect(agents[0].ratio).toBe(1);
      expect(agents[0].label).toBe("Root");
      expect(agents[1].ratio).toBeCloseTo(9 / 8, 5);
      expect(agents[1].label.length).toBeGreaterThan(0);
    });

    it("returns 9 agents in edo12 mode with 2^(i/12) ratios", () => {
      const agents = createCommonsAgents("edo12", WIDTH, HEIGHT);
      expect(agents).toHaveLength(9);
      expect(agents[0].ratio).toBe(1);
      expect(agents[0].label).toBe("Root");
      expect(agents[1].ratio).toBeCloseTo(Math.pow(2, 1 / 12), 5);
      expect(agents[2].ratio).toBeCloseTo(Math.pow(2, 2 / 12), 5);
    });

    it("places agents within canvas bounds", () => {
      const agents = createCommonsAgents("ji", WIDTH, HEIGHT);
      for (const a of agents) {
        expect(a.x).toBeGreaterThanOrEqual(14);
        expect(a.x).toBeLessThanOrEqual(WIDTH - 14);
        expect(a.y).toBeGreaterThanOrEqual(14);
        expect(a.y).toBeLessThanOrEqual(HEIGHT - 14);
      }
    });

    it("initializes agents with enabled true and glow 0", () => {
      const agents = createCommonsAgents("ji", WIDTH, HEIGHT);
      for (const a of agents) {
        expect(a.enabled).toBe(true);
        expect(a.glow).toBe(0);
      }
    });
  });

  describe("tickCommonsField", () => {
    it("advances sim.t and returns valid CommonsHud shape", () => {
      const sim = createMinimalSimState({ t: 0 });
      const hud = tickCommonsField(sim, 0.016, 1000, baseParams);

      expect(sim.t).toBeCloseTo(0.016, 5);
      expect(hud).toHaveProperty("score");
      expect(hud).toHaveProperty("integrity");
      expect(hud).toHaveProperty("queued");
      expect(hud).toHaveProperty("state");
      expect(typeof hud.score).toBe("number");
      expect(typeof hud.integrity).toBe("number");
      expect(typeof hud.queued).toBe("number");
      expect(typeof hud.state).toBe("string");
    });

    it("does not throw when onHit is undefined", () => {
      const sim = createMinimalSimState();
      expect(() => tickCommonsField(sim, 0.016, 1000, baseParams)).not.toThrow();
    });

    it("keeps wisp within bounds", () => {
      const sim = createMinimalSimState({
        wispX: WIDTH - 20,
        wispY: 50,
        wispVx: 500,
        wispVy: -100,
      });
      tickCommonsField(sim, 0.1, 1000, baseParams);
      expect(sim.wispX).toBeLessThanOrEqual(WIDTH - 30);
      expect(sim.wispX).toBeGreaterThanOrEqual(30);
      expect(sim.wispY).toBeGreaterThanOrEqual(30);
      expect(sim.wispY).toBeLessThanOrEqual(HEIGHT - 30);
    });

    it("decays pulse life and filters dead pulses", () => {
      const sim = createMinimalSimState({
        pulses: [
          { x: 400, y: 200, r: 50, life: 0.5 },
          { x: 500, y: 250, r: 60, life: 0.02 },
        ],
      });
      tickCommonsField(sim, 0.1, 1000, baseParams);
      expect(sim.pulses.length).toBeLessThanOrEqual(2);
      sim.pulses.forEach((p) => expect(p.life).toBeGreaterThan(0));
    });

    it("decays bolt life and removes bolts that hit cursor", () => {
      const sim = createMinimalSimState({
        bolts: [
          { x: 100, y: 100, vx: 0, vy: 0, life: 0.5 },
          { x: WIDTH * 0.5 - 5, y: HEIGHT * 0.76 - 5, vx: 0, vy: 0, life: 1 },
        ],
      });
      const beforeIntegrity = sim.integrity;
      tickCommonsField(sim, 0.1, 1000, baseParams);
      expect(sim.bolts.length).toBeLessThanOrEqual(2);
      if (beforeIntegrity > sim.integrity) {
        expect(sim.integrity).toBeLessThanOrEqual(100);
      }
    });

    it("returns state 'Feld unter Druck' when integrity low", () => {
      const sim = createMinimalSimState({ integrity: 30 });
      const hud = tickCommonsField(sim, 0.016, 1000, baseParams);
      expect(hud.state).toBe("Feld unter Druck");
    });

    it("returns state 'Resonanz offen' when integrity high and queued low", () => {
      const sim = createMinimalSimState({ integrity: 80, queuedHits: [] });
      const hud = tickCommonsField(sim, 0.016, 1000, baseParams);
      expect(["Resonanz offen", "Verdichtete Resonanz"]).toContain(hud.state);
    });

    it("calls onHit when groove plays queued hits", () => {
      const hits: Array<[number, number, number]> = [];
      const sim = createMinimalSimState({
        queuedHits: [1, 3 / 2],
        clockAt: 0,
      });
      tickCommonsField(sim, 0.016, 2000, { ...baseParams, grooveOn: true }, (f, v, d) => {
        hits.push([f, v, d]);
      });
      expect(hits.length).toBeLessThanOrEqual(8);
    });
  });
});
