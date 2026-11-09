import { describe, expect, it } from "vitest";
import {
  applyPlatformerSectionBiasToOrder,
  formatPlatformerSectionBias,
  sanitizePlatformerSectionBias,
} from "../platformerSectionBias";

describe("platformerSectionBias", () => {
  it("sanitizes unknown values to auto", () => {
    expect(sanitizePlatformerSectionBias("A")).toBe("A");
    expect(sanitizePlatformerSectionBias("B")).toBe("B");
    expect(sanitizePlatformerSectionBias("C")).toBe("C");
    expect(sanitizePlatformerSectionBias("weird")).toBe("auto");
  });

  it("formats bias labels for UI output", () => {
    expect(formatPlatformerSectionBias("auto")).toBe("AUTO");
    expect(formatPlatformerSectionBias("A")).toBe("A-FOCUS");
    expect(formatPlatformerSectionBias("B")).toBe("B-FOCUS");
    expect(formatPlatformerSectionBias("C")).toBe("C-FOCUS");
  });

  it("applies deterministic section emphasis to arrangement order", () => {
    expect(applyPlatformerSectionBiasToOrder([0, 1, 2, 1], "auto")).toEqual([0, 1, 2, 1]);
    expect(applyPlatformerSectionBiasToOrder([0, 1, 2, 1], "A")).toEqual([0, 1, 0, 2, 0]);
    expect(applyPlatformerSectionBiasToOrder([0, 1, 2, 1], "B")).toEqual([0, 1, 2, 1, 1]);
    expect(applyPlatformerSectionBiasToOrder([0, 1, 2, 1], "C")).toEqual([0, 1, 2, 2, 2]);
  });
});
