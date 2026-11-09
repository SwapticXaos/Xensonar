/**
 * Locks drone and particle preset catalog size (vision §3 expressive timbre; FIX-NEXT §2.2c).
 * When adding a preset: update types → presets → overtones (drone) or presets only (particle),
 * then update this test and any canonical docu snapshot.
 */

import { describe, expect, it } from "vitest";

import { DRONE_PRESETS, PARTICLE_PRESETS } from "../presets";

describe("presets catalog", () => {
  it("locks drone preset count for product deepening (vision §3; 25 presets)", () => {
    expect(DRONE_PRESETS).toHaveLength(25);
  });

  it("locks particle preset count for product deepening (vision §3; 17 presets)", () => {
    expect(PARTICLE_PRESETS).toHaveLength(18);
  });
});
