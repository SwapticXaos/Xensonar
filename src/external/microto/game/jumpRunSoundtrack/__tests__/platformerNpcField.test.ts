import { describe, expect, it } from "vitest";
import { createPlatformerPuzzlePedestals, createPlatformerResonanceGates } from "../platformerAdventure";
import { buildPlatformerNpcFieldState } from "../platformerNpcField";
import { createPlatformerMusicNpcs } from "../platformerNpcMusic";
import { createPlatforms } from "../platformerState";

describe("platformerNpcField", () => {
  it("builds a stabilizing guide field for a stuck panda encounter", () => {
    const platforms = createPlatforms();
    const panda = createPlatformerMusicNpcs(platforms).find((npc) => npc.animal === "panda");

    expect(panda).toBeTruthy();
    const field = buildPlatformerNpcFieldState({
      playerX: panda!.x,
      playerY: panda!.y,
      playerVx: 0,
      playerOnGround: true,
      t: 8,
      lastProgressAt: 0,
      lastMelodyToken: null,
      routeSelections: { "fork-1": 0, "fork-2": 0 },
      platforms,
      musicNpcs: [{ ...panda!, disposition: "guide", tarotOrientation: "upright" }],
      puzzlePedestals: createPlatformerPuzzlePedestals(platforms),
      resonanceGates: createPlatformerResonanceGates(platforms),
    });

    expect(field.landingSnapBonus).toBeGreaterThan(0);
    expect(field.pickupRadiusBonus).toBeGreaterThan(0);
    expect(field.gravityScale).toBeLessThan(1);
    expect(field.oneWaySnapBonus).toBeGreaterThan(0);
    expect(field.pedestalTouchBonus).toBeGreaterThan(0);
    expect(field.echoPuzzleToken).toBe("major");
    expect(field.echoPuzzleLabel).toBe("Dur");
    expect(field.manifestPlatforms.some((platform) => platform.fieldKind === "lift_echo")).toBe(true);
    expect(field.manifestPlatforms.some((platform) => platform.fieldKind === "pedestal_echo")).toBe(true);
    expect(field.statusLabel).toContain("restorer");
    expect(field.auras[0]?.tarotOrientation).toBe("upright");
  });

  it("builds a destabilizing trickster field for the wolf", () => {
    const platforms = createPlatforms();
    const wolf = createPlatformerMusicNpcs(platforms).find((npc) => npc.animal === "wolf");

    expect(wolf).toBeTruthy();
    const field = buildPlatformerNpcFieldState({
      playerX: wolf!.x,
      playerY: wolf!.y,
      playerVx: 360,
      playerOnGround: true,
      t: 3,
      lastProgressAt: 2.8,
      lastMelodyToken: "major",
      routeSelections: { "fork-1": 0, "fork-2": 0 },
      platforms,
      musicNpcs: [{ ...wolf!, disposition: "trickster", tarotOrientation: "reversed" }],
      puzzlePedestals: createPlatformerPuzzlePedestals(platforms),
      resonanceGates: createPlatformerResonanceGates(platforms),
    });

    expect(field.tractionScale).toBeLessThan(1);
    expect(field.actionDriveBias).toBeGreaterThan(0);
    expect(field.statusLabel).toContain("shock");
    expect(field.auras[0]?.tarotOrientation).toBe("reversed");
  });

  it("uses mirror fields to point at the next unresolved puzzle pedestal", () => {
    const platforms = createPlatforms();
    const owl = createPlatformerMusicNpcs(platforms).find((npc) => npc.animal === "owl");
    const pedestals = createPlatformerPuzzlePedestals(platforms);

    expect(owl).toBeTruthy();
    pedestals[0].activated = true;
    const field = buildPlatformerNpcFieldState({
      playerX: owl!.x,
      playerY: owl!.y,
      playerVx: 42,
      playerOnGround: false,
      t: 4,
      lastProgressAt: 3.2,
      lastMelodyToken: "mode",
      routeSelections: { "fork-1": 0, "fork-2": 0 },
      platforms,
      musicNpcs: [{ ...owl!, disposition: "mirror", tarotOrientation: "upright" }],
      puzzlePedestals: pedestals,
      resonanceGates: createPlatformerResonanceGates(platforms),
    });

    expect(field.focusPedestalId).toBe(pedestals[1].id);
    expect(field.focusLabel).toBe("Moll");
    expect(field.noteMagnetism).toBeGreaterThan(0);
    expect(field.routeFocusGroupId).toBe("fork-1");
    expect(field.routeFocusChoice).toBe(-1);
    expect(field.routeHintLabel).toBe("ECHO LOW");
    expect(field.echoPuzzleToken).toBe("minor");
    expect(field.manifestPlatforms.some((platform) => platform.fieldKind === "route_bridge")).toBe(true);
    expect(field.statusLabel).toContain("mirrors Moll");
  });

  it("builds a draft gate slit when a nearby release/open draft faces a closed gate", () => {
    const platforms = createPlatforms();
    const fox = createPlatformerMusicNpcs(platforms).find((npc) => npc.animal === "fox");
    const gates = createPlatformerResonanceGates(platforms);

    expect(fox).toBeTruthy();
    const gate = gates[0];
    const field = buildPlatformerNpcFieldState({
      playerX: gate.x - 20,
      playerY: gate.y + gate.h - 32,
      playerVx: 180,
      playerOnGround: false,
      t: 5,
      lastProgressAt: 4.7,
      lastMelodyToken: "npc",
      routeSelections: { "fork-1": 0, "fork-2": 0 },
      platforms,
      musicNpcs: [{
        ...fox!,
        x: gate.x + 40,
        y: gate.y + gate.h - 54,
        disposition: "trickster",
        tarotOrientation: "reversed",
        loomActiveLabel: "RELEASE",
      }],
      puzzlePedestals: createPlatformerPuzzlePedestals(platforms),
      resonanceGates: gates,
    });

    expect(field.draftGateWindow).not.toBeNull();
    expect(field.draftGateWindow?.gateId).toBe(gate.id);
    expect(field.draftGateWindow?.label).toBe("RELEASE");
    expect(field.statusLabel).toContain("gate");
  });

  it("builds a route seal and mirage decoy for negative veil drafts", () => {
    const platforms = createPlatforms();
    const owl = createPlatformerMusicNpcs(platforms).find((npc) => npc.animal === "owl");

    expect(owl).toBeTruthy();
    const field = buildPlatformerNpcFieldState({
      playerX: 1690,
      playerY: 320,
      playerVx: 220,
      playerOnGround: false,
      t: 4,
      lastProgressAt: 3.5,
      lastMelodyToken: "major",
      routeSelections: { "fork-1": 0, "fork-2": 0 },
      platforms,
      musicNpcs: [{
        ...owl!,
        x: 1710,
        y: 310,
        disposition: "mirror",
        tarotOrientation: "reversed",
        loomActiveLabel: "VEIL",
      }],
      puzzlePedestals: createPlatformerPuzzlePedestals(platforms),
      resonanceGates: createPlatformerResonanceGates(platforms),
    });

    expect(field.routeLockGroupId).toBe("fork-1");
    expect(field.routeLockChoice).toBe(1);
    expect(field.routeLockLabel).toBe("VEIL HIGH");
    expect(field.decoyRouteChoice).toBe(-1);
    expect(field.decoyRouteLabel).toBe("MIRAGE LOW");
    expect(field.manifestPlatforms.some((platform) => platform.fieldKind === "route_seal")).toBe(true);
  });

  it("derives a shadow puzzle token from negative drafts for the next unresolved pedestal", () => {
    const platforms = createPlatforms();
    const owl = createPlatformerMusicNpcs(platforms).find((npc) => npc.animal === "owl");

    expect(owl).toBeTruthy();
    const field = buildPlatformerNpcFieldState({
      playerX: 1008,
      playerY: 398,
      playerVx: 110,
      playerOnGround: true,
      t: 4.2,
      lastProgressAt: 3.8,
      lastMelodyToken: "mode",
      routeSelections: { "fork-1": 0, "fork-2": 0 },
      platforms,
      musicNpcs: [{
        ...owl!,
        x: 1020,
        y: 394,
        disposition: "mirror",
        tarotOrientation: "reversed",
        loomActiveLabel: "VEIL",
      }],
      puzzlePedestals: createPlatformerPuzzlePedestals(platforms),
      resonanceGates: createPlatformerResonanceGates(platforms),
    });

    expect(field.focusPedestalId).toBe("pedestal-major-0");
    expect(field.shadowPuzzleToken).toBe("mode");
    expect(field.shadowPuzzleLabel).toBe("Modus");
    expect(field.shadowPuzzleStrength).toBeGreaterThan(0.16);
    expect(field.statusLabel).toContain("shadow modus");
  });
});
