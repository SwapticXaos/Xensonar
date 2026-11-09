import { describe, expect, it } from "vitest";

import type { DirectedPulse, NexusAgent } from "../../runtime/types";
import {
  getCollapseConstellationInfluence,
  getConstellationMelodicOffsetSeconds,
  getSectorConstellationInfluence,
} from "../resonanceConstellations";

function createAgent(label: string, ratio: number): NexusAgent {
  return {
    x: 140,
    y: 120,
    vx: 0,
    vy: 0,
    ratio,
    label,
    phase: 0,
    lastHit: 0,
    history: [],
  };
}

function createPulse(direction: DirectedPulse["direction"]): DirectedPulse {
  return {
    x: 160,
    y: 140,
    radius: 64,
    life: 1,
    direction,
    hitAgents: [],
  };
}

describe("resonanceConstellations", () => {
  it("delays later constellation slots more strongly, especially for stubborn personas", () => {
    const helpfulLead = getConstellationMelodicOffsetSeconds(0, 5, "helpful", 0.1);
    const playfulMid = getConstellationMelodicOffsetSeconds(2, 5, "playful", 0.1);
    const stubbornTail = getConstellationMelodicOffsetSeconds(4, 5, "stubborn", 0.1);

    expect(helpfulLead).toBeLessThan(playfulMid);
    expect(playfulMid).toBeLessThan(stubbornTail);
    expect(stubbornTail).toBeLessThanOrEqual(0.1);
  });

  it("keeps collapse constellation targets inside the playfield", () => {
    const influence = getCollapseConstellationInfluence({
      agent: createAgent("Fifth", 1.5),
      index: 2,
      count: 8,
      lane: 0.42,
      centerX: 180,
      centerY: 150,
      seed: 9123,
      elapsedMs: 220,
      wildness: 0.7,
      cursorGravity: 0.6,
      gameWidth: 360,
      gameHeight: 240,
    });

    expect(influence.targetX).toBeGreaterThanOrEqual(44);
    expect(influence.targetX).toBeLessThanOrEqual(316);
    expect(influence.targetY).toBeGreaterThanOrEqual(44);
    expect(influence.targetY).toBeLessThanOrEqual(196);
    expect(influence.hitRadius).toBeGreaterThan(30);
  });

  it("fans sector constellations along the wave direction instead of collapsing toward the center", () => {
    const pulse = createPulse("right");
    const influence = getSectorConstellationInfluence({
      agent: createAgent("Third", 1.25),
      index: 1,
      count: 6,
      lane: 0.35,
      pulse,
      wildness: 0.6,
      cursorGravity: 0.5,
      gameWidth: 360,
      gameHeight: 240,
    });

    expect(influence.targetX).toBeGreaterThan(pulse.x);
    expect(Math.abs(influence.targetY - pulse.y)).toBeLessThan(90);
    expect(influence.pull).toBeGreaterThan(0.1);
  });
});
