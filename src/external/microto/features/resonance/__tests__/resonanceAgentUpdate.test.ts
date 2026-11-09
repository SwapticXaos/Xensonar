import { describe, expect, it, vi } from "vitest";
import { tickResonanceAgents } from "../resonanceAgentUpdate";
import type { DirectedPulse, NexusAgent, NexusRipple } from "../../runtime/types";

function createAgent(x: number, y: number, label: string): NexusAgent {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    ratio: 1,
    label,
    phase: 0,
    lastHit: 0,
    history: [],
  };
}

function createRipple(radius: number): NexusRipple {
  return {
    x: 100,
    y: 100,
    radius,
    life: 1,
  };
}

function createSectorPulse(radius: number, persistent = false): DirectedPulse {
  return {
    x: 100,
    y: 100,
    radius,
    life: 1,
    direction: "right",
    hitAgents: [],
    persistent,
  };
}

const baseParams = {
  particleMute: false,
  agentEnabled: [true, true, true],
  agentVolumes: [1, 1, 1],
  echoOn: false,
  clickSoundOnly: false,
  swarmWildness: 0.5,
  cursorGravity: 0.5,
  particleVolume: 0.2,
};

const baseOpts = {
  gameWidth: 400,
  gameHeight: 400,
  frameNow: 1000,
  t: 0,
  targetFreq: 440,
  clampFreq: (freq: number) => freq,
};

describe("tickResonanceAgents", () => {
  it("turns ripple-triggered clusters into short melodic constellations instead of a two-note cap", () => {
    const playNexusAgentTone = vi.fn();
    const ripple = createRipple(50);
    tickResonanceAgents(
      {
        cursorX: 100,
        cursorY: 100,
        agents: [
          createAgent(150, 100, "A"),
          createAgent(50, 100, "B"),
          createAgent(100, 150, "C"),
        ],
        ripples: [ripple],
        sectorPulses: [],
        wobble: 0,
        swarmCollapseUntil: 0,
        swarmCollapseX: 100,
        swarmCollapseY: 100,
        swarmScatterSeed: 0,
        recentAudibleHitWindowStartedAt: 0,
        recentAudibleHitCount: 0,
        agentMelodicOffsetByIndex: [],
        agentConstellationOrderByIndex: [],
        agentPersonaByIndex: [],
      },
      baseParams,
      {
        ...baseOpts,
        playNexusAgentTone,
      },
    );

    expect(playNexusAgentTone).toHaveBeenCalledTimes(3);
    expect(playNexusAgentTone.mock.calls[0]?.[3]).toEqual(
      expect.objectContaining({ source: "ripple", density: 0, constellationIndex: 0 }),
    );
    expect(playNexusAgentTone.mock.calls[1]?.[3]).toEqual(
      expect.objectContaining({ source: "ripple", constellationIndex: 1 }),
    );
    expect(playNexusAgentTone.mock.calls[1]?.[3]?.density).toBeGreaterThan(
      playNexusAgentTone.mock.calls[0]?.[3]?.density ?? 0,
    );
    expect(playNexusAgentTone.mock.calls[2]?.[3]).toEqual(
      expect.objectContaining({ source: "ripple", constellationIndex: 2 }),
    );
    expect(playNexusAgentTone.mock.calls[2]?.[3]?.autonomy).toBeGreaterThan(0);
    expect(ripple.hitAgents).toEqual([0, 1, 2]);
    expect(ripple.lastImpactAt).toBe(baseOpts.frameNow);
  });

  it("lets one-shot sector pulses catch a compact two-note phrase per frame", () => {
    const playNexusAgentTone = vi.fn();
    const pulse = createSectorPulse(50, false);
    tickResonanceAgents(
      {
        cursorX: 100,
        cursorY: 100,
        agents: [
          createAgent(150, 100, "A"),
          createAgent(146, 117, "B"),
          createAgent(146, 83, "C"),
        ],
        ripples: [],
        sectorPulses: [pulse],
        wobble: 0,
        swarmCollapseUntil: 0,
        swarmCollapseX: 100,
        swarmCollapseY: 100,
        swarmScatterSeed: 0,
        recentAudibleHitWindowStartedAt: 0,
        recentAudibleHitCount: 0,
        agentMelodicOffsetByIndex: [],
        agentConstellationOrderByIndex: [],
        agentPersonaByIndex: [],
      },
      baseParams,
      {
        ...baseOpts,
        playNexusAgentTone,
      },
    );

    expect(playNexusAgentTone).toHaveBeenCalledTimes(2);
    expect(pulse.hitAgents).toHaveLength(2);
    expect(playNexusAgentTone).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      undefined,
      expect.objectContaining({
        source: "sector",
        direction: "right",
        persistent: false,
        density: 0,
        constellationIndex: 0,
      }),
    );
    expect(playNexusAgentTone.mock.calls[1]?.[3]).toEqual(
      expect.objectContaining({
        source: "sector",
        constellationIndex: 1,
      }),
    );
    expect(playNexusAgentTone.mock.calls[0]?.[3]?.autonomy).toBeGreaterThan(0);
    expect(pulse.lastImpactAt).toBe(baseOpts.frameNow);
  });

  it("does not double-trigger the same agent from ripple and sector pulse in the same frame", () => {
    const playNexusAgentTone = vi.fn();
    tickResonanceAgents(
      {
        cursorX: 100,
        cursorY: 100,
        agents: [createAgent(150, 100, "A")],
        ripples: [createRipple(50)],
        sectorPulses: [createSectorPulse(50, false)],
        wobble: 0,
        swarmCollapseUntil: 0,
        swarmCollapseX: 100,
        swarmCollapseY: 100,
        swarmScatterSeed: 0,
        recentAudibleHitWindowStartedAt: 0,
        recentAudibleHitCount: 0,
        agentMelodicOffsetByIndex: [],
        agentConstellationOrderByIndex: [],
        agentPersonaByIndex: [],
      },
      {
        ...baseParams,
        agentEnabled: [true],
        agentVolumes: [1],
      },
      {
        ...baseOpts,
        playNexusAgentTone,
      },
    );

    expect(playNexusAgentTone).toHaveBeenCalledTimes(1);
  });
});
