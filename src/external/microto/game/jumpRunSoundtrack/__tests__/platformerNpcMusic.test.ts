import { describe, expect, it } from "vitest";
import { createPlatforms } from "../platformerState";
import {
  createPlatformerMusicNpcs,
  getPlatformerCollectibleKind,
  getPlatformerNpcIntent,
  getPlatformerNpcThrowDirection,
  getPlatformerModeShiftSemis,
  getPlatformerNpcOrbSemi,
  getPlatformerTriadSemis,
} from "../platformerNpcMusic";

describe("platformerNpcMusic", () => {
  it("maps collectible slots to red, blue, and mushroom variants", () => {
    expect(getPlatformerCollectibleKind(0, 0)).toBe("coin_red");
    expect(getPlatformerCollectibleKind(0, 1)).toBe("coin_blue");
    expect(getPlatformerCollectibleKind(3, 0)).toBe("mushroom");
  });

  it("derives major and minor triads from the current lane and mode shift", () => {
    expect(getPlatformerTriadSemis("coin_red", 2, 0)).toEqual([2, 6, 9]);
    expect(getPlatformerTriadSemis("coin_blue", 2, 0)).toEqual([2, 5, 9]);
    expect(getPlatformerModeShiftSemis(2, 1)).toEqual([3, 7, 10]);
  });

  it("creates anchored animal NPCs across the level", () => {
    const npcs = createPlatformerMusicNpcs(createPlatforms());

    expect(npcs.length).toBeGreaterThanOrEqual(8);
    expect(new Set(npcs.map((npc) => npc.animal)).size).toBeGreaterThanOrEqual(8);
    expect(npcs.every((npc) => npc.throwInterval > 0.8)).toBe(true);
    expect(npcs.every((npc) => npc.tarotTitle)).toBe(true);
    expect(npcs.every((npc) => npc.modernRole)).toBe(true);
    expect(npcs.every((npc) => npc.giftLabel)).toBe(true);
    expect(npcs.every((npc) => npc.shadowLabel)).toBe(true);
    expect(npcs.every((npc) => npc.disposition)).toBe(true);
  });

  it("resolves orb semis through each npc scale and the active mode shift", () => {
    const semi = getPlatformerNpcOrbSemi({
      id: 12,
      npcId: "npc-panda",
      animal: "panda",
      label: "Panda",
      scaleId: "chinese_pentatonic",
      throwStyle: "fan",
      color: "#f1f5f9",
      lane: 3,
      rootOffset: 2,
      noteIndex: 4,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      age: 0,
      life: 2,
      drift: 0,
    }, 1);

    expect(semi).toBe(14);
  });

  it("pushes the wolf into Tower/Trickster tritone behavior under high action pressure", () => {
    const intent = getPlatformerNpcIntent(
      { animal: "wolf" },
      {
        playerX: 1600,
        playerVx: 390,
        actionDrive: 0.88,
        stuckTime: 0.2,
        solvedPedestals: 1,
        gatesOpen: 0,
        lives: 4,
        lastMelodyToken: "major",
        recentEvents: [
          { kind: "step", semi: 2, energy: 0.7, t: 0.1, lane: 2, airborne: false },
          { kind: "turn", semi: 6, energy: 0.9, t: 0.2, lane: 2, airborne: false },
        ],
        lastLevelMemory: null,
      },
    );

    expect(intent.tarotTitle).toBe("Tower");
    expect(intent.tarotOrientation).toBe("reversed");
    expect(intent.modernRole).toBe("Shock Breaker");
    expect(intent.shadowLabel).toBe("shock");
    expect(intent.disposition).toBe("trickster");
    expect(intent.pitchBias).toBe(6);
    expect(intent.moodLabel).toContain("shock");
    expect(intent.loomActiveLabel).toBe("BRIDGE");
    expect(intent.mirrorFacet).toBe("repetition");
    expect(intent.mirrorLabel).toContain("repetition");
    expect(intent.draftMotif[0]).toBe(0);
    expect(getPlatformerNpcThrowDirection({ x: 1500, throwDirection: 1 }, intent.disposition, 1620, 390)).toBe(-1);
  });

  it("turns the panda into a Star/Guide helper when the player is stuck", () => {
    const intent = getPlatformerNpcIntent(
      { animal: "panda" },
      {
        playerX: 2200,
        playerVx: 12,
        actionDrive: 0.14,
        stuckTime: 8.2,
        solvedPedestals: 0,
        gatesOpen: 0,
        lives: 2,
        lastMelodyToken: null,
        recentEvents: [
          { kind: "land", semi: 0, energy: 0.45, t: 0.1, lane: 1, airborne: false },
        ],
        lastLevelMemory: null,
      },
    );

    expect(intent.tarotTitle).toBe("Star");
    expect(intent.tarotOrientation).toBe("upright");
    expect(intent.modernRole).toBe("Restorer");
    expect(intent.giftLabel).toBe("hope");
    expect(intent.disposition).toBe("guide");
    expect(intent.lifeScale).toBeGreaterThan(1);
    expect(intent.velocityScale).toBeLessThan(1);
    expect(intent.pitchBias).toBe(7);
    expect(intent.moodLabel).toContain("hope");
    expect(intent.loomActiveLabel).toBe("MEND");
    expect(intent.mirrorFacet).toBe("recovery");
    expect(intent.draftMotif[0]).toBe(0);
  });
});
