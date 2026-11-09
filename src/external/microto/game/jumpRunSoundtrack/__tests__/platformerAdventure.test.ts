import { describe, expect, it } from "vitest";
import {
  arePlatformerGatePedestalsSolved,
  createPlatformerPuzzlePedestals,
  createPlatformerResonanceGates,
  describePlatformerPuzzleToken,
  getNextPlatformerPuzzlePedestal,
  resetPlatformerGatePedestals,
} from "../platformerAdventure";
import { createPlatforms } from "../platformerState";

describe("platformerAdventure", () => {
  it("creates a deterministic finish-gate puzzle path across the level", () => {
    const platforms = createPlatforms();
    const pedestals = createPlatformerPuzzlePedestals(platforms);
    const gates = createPlatformerResonanceGates(platforms);

    expect(gates).toEqual([
      expect.objectContaining({
        id: "finish-resonance",
        label: "Echo Gate",
        open: false,
      }),
    ]);
    expect(pedestals.map((pedestal) => pedestal.target)).toEqual(["major", "minor", "npc"]);
    expect(new Set(pedestals.map((pedestal) => pedestal.gateId))).toEqual(new Set(["finish-resonance"]));
  });

  it("tracks the next unresolved pedestal and solved state per gate", () => {
    const pedestals = createPlatformerPuzzlePedestals(createPlatforms());

    expect(getNextPlatformerPuzzlePedestal(pedestals, "finish-resonance")?.target).toBe("major");
    pedestals[0].activated = true;
    expect(getNextPlatformerPuzzlePedestal(pedestals, "finish-resonance")?.target).toBe("minor");
    pedestals[1].activated = true;
    pedestals[2].activated = true;
    expect(arePlatformerGatePedestalsSolved(pedestals, "finish-resonance")).toBe(true);
  });

  it("resets partial gate progress without removing the puzzle definition", () => {
    const pedestals = createPlatformerPuzzlePedestals(createPlatforms());
    pedestals[0].activated = true;
    pedestals[1].activated = true;

    resetPlatformerGatePedestals(pedestals, "finish-resonance");

    expect(pedestals.every((pedestal) => pedestal.activated === false)).toBe(true);
    expect(describePlatformerPuzzleToken("major")).toBe("Dur");
    expect(describePlatformerPuzzleToken("minor")).toBe("Moll");
    expect(describePlatformerPuzzleToken("npc")).toBe("NPC");
  });
});
