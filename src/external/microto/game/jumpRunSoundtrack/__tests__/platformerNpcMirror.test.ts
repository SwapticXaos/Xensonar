import { describe, expect, it } from "vitest";
import {
  analyzePlatformerNpcMirrorProfile,
  buildPlatformerLevelMemory,
  resolvePlatformerNpcLoomDraft,
} from "../platformerNpcMirror";

describe("platformerNpcMirror", () => {
  it("detects recovery pressure from stuck low-agency telemetry", () => {
    const profile = analyzePlatformerNpcMirrorProfile({
      recentEvents: [
        { kind: "land", semi: 0, energy: 0.32, t: 0.1, lane: 1, airborne: false },
      ],
      playerVx: 0,
      actionDrive: 0.1,
      stuckTime: 8.4,
      solvedPedestals: 0,
      gatesOpen: 0,
      lives: 1,
      lastMelodyToken: null,
      lastLevelMemory: null,
    });

    expect(profile.facet).toBe("recovery");
    expect(profile.label).toContain("recovery");
    expect(profile.supportNeed).toBeGreaterThan(0.6);
    expect(profile.motif[0]).toBe(0);
  });

  it("builds a reusable level-memory seed from movement DNA", () => {
    const memory = buildPlatformerLevelMemory(
      [
        { kind: "step", semi: 2, energy: 0.7, t: 0.1, lane: 0, airborne: false },
        { kind: "jump", semi: 7, energy: 0.9, t: 0.2, lane: 2, airborne: true },
        { kind: "coin", semi: 12, energy: 0.95, t: 0.3, lane: 4, airborne: false },
        { kind: "npc_orb", semi: 9, energy: 0.84, t: 0.4, lane: 5, airborne: true },
      ],
      [2, 7, 12, 9],
    );

    expect(memory).not.toBeNull();
    expect(memory?.phrase).toEqual([2, 7, 12, 9]);
    expect(memory?.motif[0]).toBe(0);
    expect(memory?.cadence.length).toBeGreaterThan(0);
    expect(memory?.seed).toBeGreaterThan(0);
  });

  it("blends mirror telemetry and last-level memory into Loom-style NPC drafts", () => {
    const memory = buildPlatformerLevelMemory(
      [
        { kind: "puzzle_step", semi: 11, energy: 0.82, t: 0.2, lane: 1, airborne: false },
        { kind: "gate_unlock", semi: 19, energy: 1, t: 0.3, lane: 0, airborne: false },
      ],
      [4, 9, 11, 19],
    );
    const mirror = analyzePlatformerNpcMirrorProfile({
      recentEvents: [
        { kind: "turn", semi: 5, energy: 0.8, t: 0.1, lane: 2, airborne: false },
        { kind: "step", semi: 2, energy: 0.6, t: 0.2, lane: 2, airborne: false },
      ],
      playerVx: 360,
      actionDrive: 0.88,
      stuckTime: 0.2,
      solvedPedestals: 1,
      gatesOpen: 0,
      lives: 4,
      lastMelodyToken: "major",
      lastLevelMemory: memory,
    });
    const draft = resolvePlatformerNpcLoomDraft({
      animal: "wolf",
      disposition: "trickster",
      tarotOrientation: "reversed",
      mirror,
      lastLevelMemory: memory,
    });

    expect(draft.activeLabel).toBe("BRIDGE");
    expect(draft.verbLabel).toContain("distorts");
    expect(draft.echoLabel).toContain("echoes");
    expect(draft.motif[0]).toBe(0);
  });
});
