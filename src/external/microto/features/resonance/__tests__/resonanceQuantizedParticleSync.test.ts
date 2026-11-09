import { describe, expect, it } from "vitest";

import { syncQuantizedParticleHits } from "../resonanceQuantizedParticleSync";
import { createInitialNexusRefsState } from "../resonanceRefs";

describe("syncQuantizedParticleHits", () => {
  it("uses constellation order and melodic lag to stagger quantized hits into a phrase", () => {
    const refs = createInitialNexusRefsState(900, 520);
    refs.gain = {} as GainNode;
    refs.agents = [
      { x: 0, y: 0, vx: 0, vy: 0, ratio: 1, label: "Root", phase: 0, lastHit: 1000, history: [] },
      { x: 0, y: 0, vx: 0, vy: 0, ratio: 1.25, label: "Third", phase: 0, lastHit: 1000, history: [] },
      { x: 0, y: 0, vx: 0, vy: 0, ratio: 1.5, label: "Fifth", phase: 0, lastHit: 1000, history: [] },
    ];
    refs.agentConstellationOrderByIndex = [2, 0, 1];
    refs.agentMelodicOffsetByIndex = [0.06, 0, 0.03];

    syncQuantizedParticleHits({
      refs,
      quantized: {
        quantizeOn: true,
        quantizeEvents: true,
        quantizeBpm: 120,
        quantizeSubdivision: "16",
        particlePreset: "glass_ping",
        particleMute: false,
        clickSoundOnly: false,
        particleVolume: 0.3,
        agentEnabled: [true, true, true],
        agentVolumes: [1, 1, 1],
      },
      audioTime: 1.01,
      frameNow: 1000,
      baseFreq: 220,
    });

    expect(refs.quantizedHitQueue).toHaveLength(3);
    expect(refs.quantizedHitQueue[0]?.freq).toBeCloseTo(220 * 1.25, 5);
    expect(refs.quantizedHitQueue[1]?.freq).toBeCloseTo(220 * 1.5, 5);
    expect(refs.quantizedHitQueue[2]?.freq).toBeCloseTo(220 * 1, 5);
    expect(refs.quantizedHitQueue[0]?.dueTime).toBeCloseTo(1.126, 5);
    expect(refs.quantizedHitQueue[1]?.dueTime).toBeCloseTo(1.156, 5);
    expect(refs.quantizedHitQueue[2]?.dueTime).toBeGreaterThan(refs.quantizedHitQueue[1]?.dueTime ?? 0);
  });
});
