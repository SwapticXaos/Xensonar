import { describe, expect, it } from "vitest";

import { QUANTIZE_MACRO_PRESETS } from "../quantizePresets";

describe("quantizePresets", () => {
  it("includes 64-swing preset for product deepening (vision §3)", () => {
    const swing64 = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "64-swing");
    expect(swing64).toBeDefined();
    expect(swing64!.label).toBe("64tel swing");
    expect(swing64!.quantizeSubdivision).toBe("64");
    expect(swing64!.quantizeMicroTightness).toBe(0.22);
    expect(swing64!.harmonyCascadeSteps).toBe(5);
  });

  it("includes 32-tight preset (vision §3 optional quantization; tight family)", () => {
    const tight32 = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "32-tight");
    expect(tight32).toBeDefined();
    expect(tight32!.label).toBe("32tel tight");
    expect(tight32!.quantizeSubdivision).toBe("32");
    expect(tight32!.quantizeMicroTightness).toBe(0.85);
    expect(tight32!.harmonyCascadeSteps).toBe(1);
  });

  it("includes 32-stable-relaxed preset (vision §3 stable family; mirrors 16/64-stable-relaxed)", () => {
    const relaxed32 = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "32-stable-relaxed");
    expect(relaxed32).toBeDefined();
    expect(relaxed32!.label).toBe("32tel stable (relaxed)");
    expect(relaxed32!.quantizeSubdivision).toBe("32");
    expect(relaxed32!.quantizeMicroTightness).toBe(0.58);
    expect(relaxed32!.harmonyCascadeSteps).toBe(2);
    expect(relaxed32!.kind).toBe("stable");
  });

  it("has unique ids and valid subdivision/microTightness per preset", () => {
    const ids = new Set<string>();
    for (const p of QUANTIZE_MACRO_PRESETS) {
      expect(ids.has(p.id)).toBe(false);
      ids.add(p.id);
      expect(["16", "32", "64"]).toContain(p.quantizeSubdivision);
      expect(p.quantizeMicroTightness).toBeGreaterThanOrEqual(0);
      expect(p.quantizeMicroTightness).toBeLessThanOrEqual(1);
      expect(p.harmonyCascadeSteps).toBeGreaterThanOrEqual(0);
      expect(p.harmonyCascadeSteps).toBeLessThanOrEqual(12);
    }
  });

  it("locks catalog size for product deepening (vision §3; quantize macro presets)", () => {
    expect(QUANTIZE_MACRO_PRESETS).toHaveLength(77);
  });

  it("includes 32-steady-tight preset (vision §3 Path 3; 60th; steady-tight variant)", () => {
    const steady32 = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "32-steady-tight");
    expect(steady32).toBeDefined();
    expect(steady32!.label).toBe("32tel steady (tight)");
    expect(steady32!.quantizeSubdivision).toBe("32");
    expect(steady32!.quantizeMicroTightness).toBe(0.58);
    expect(steady32!.harmonyCascadeSteps).toBe(2);
    expect(steady32!.kind).toBe("stable");
  });

  it("includes 64-steady-tight preset (vision §3 Path 3; 61st; steady-tight family 32/64)", () => {
    const steady64 = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "64-steady-tight");
    expect(steady64).toBeDefined();
    expect(steady64!.label).toBe("64tel steady (tight)");
    expect(steady64!.quantizeSubdivision).toBe("64");
    expect(steady64!.quantizeMicroTightness).toBe(0.58);
    expect(steady64!.harmonyCascadeSteps).toBe(2);
    expect(steady64!.kind).toBe("stable");
  });

  it("includes 16-steady-tight preset (vision §3 Path 3; 62nd; completes steady-tight family 16/32/64)", () => {
    const steady16 = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "16-steady-tight");
    expect(steady16).toBeDefined();
    expect(steady16!.label).toBe("16tel steady (tight)");
    expect(steady16!.quantizeSubdivision).toBe("16");
    expect(steady16!.quantizeMicroTightness).toBe(0.58);
    expect(steady16!.harmonyCascadeSteps).toBe(2);
    expect(steady16!.kind).toBe("stable");
  });

  it("includes 16-push-relaxed preset (vision §3 Path 3; 63rd; push-relaxed family)", () => {
    const push16 = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "16-push-relaxed");
    expect(push16).toBeDefined();
    expect(push16!.label).toBe("16tel push (relaxed)");
    expect(push16!.quantizeSubdivision).toBe("16");
    expect(push16!.quantizeMicroTightness).toBe(0.28);
    expect(push16!.harmonyCascadeSteps).toBe(4);
    expect(push16!.kind).toBe("push");
  });

  it("includes 32-push-relaxed preset (vision §3 Path 3; 64th; push-relaxed family)", () => {
    const push32 = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "32-push-relaxed");
    expect(push32).toBeDefined();
    expect(push32!.label).toBe("32tel push (relaxed)");
    expect(push32!.quantizeSubdivision).toBe("32");
    expect(push32!.quantizeMicroTightness).toBe(0.28);
    expect(push32!.harmonyCascadeSteps).toBe(4);
    expect(push32!.kind).toBe("push");
  });

  it("includes 64-push-relaxed preset (vision §3 Path 3; 65th; completes push-relaxed family 16/32/64)", () => {
    const push64 = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "64-push-relaxed");
    expect(push64).toBeDefined();
    expect(push64!.label).toBe("64tel push (relaxed)");
    expect(push64!.quantizeSubdivision).toBe("64");
    expect(push64!.quantizeMicroTightness).toBe(0.28);
    expect(push64!.harmonyCascadeSteps).toBe(4);
    expect(push64!.kind).toBe("push");
  });

  it("includes 16-steady-relaxed preset (vision §3 Path 3; 66th; steady-relaxed variant)", () => {
    const steady16 = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "16-steady-relaxed");
    expect(steady16).toBeDefined();
    expect(steady16!.label).toBe("16tel steady (relaxed)");
    expect(steady16!.quantizeSubdivision).toBe("16");
    expect(steady16!.quantizeMicroTightness).toBe(0.22);
    expect(steady16!.harmonyCascadeSteps).toBe(2);
  });

  it("includes 32-steady-relaxed preset (vision §3 Path 3; 67th; steady-relaxed family)", () => {
    const steady32 = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "32-steady-relaxed");
    expect(steady32).toBeDefined();
    expect(steady32!.label).toBe("32tel steady (relaxed)");
    expect(steady32!.quantizeSubdivision).toBe("32");
    expect(steady32!.quantizeMicroTightness).toBe(0.22);
    expect(steady32!.harmonyCascadeSteps).toBe(2);
    expect(steady32!.kind).toBe("stable");
  });

  it("includes 64-steady-relaxed preset (vision §3 Path 3; 68th; steady-relaxed family)", () => {
    const steady64 = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "64-steady-relaxed");
    expect(steady64).toBeDefined();
    expect(steady64!.label).toBe("64tel steady (relaxed)");
    expect(steady64!.quantizeSubdivision).toBe("64");
    expect(steady64!.quantizeMicroTightness).toBe(0.22);
    expect(steady64!.harmonyCascadeSteps).toBe(2);
    expect(steady64!.kind).toBe("stable");
  });

  it("includes 16-drift-relaxed preset (vision §3 Path 3; 71st; drift-relaxed family)", () => {
    const drift16 = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "16-drift-relaxed");
    expect(drift16).toBeDefined();
    expect(drift16!.label).toBe("16tel drift (relaxed)");
    expect(drift16!.quantizeSubdivision).toBe("16");
    expect(drift16!.quantizeMicroTightness).toBe(0.22);
    expect(drift16!.harmonyCascadeSteps).toBe(4);
    expect(drift16!.kind).toBe("drift");
  });

  it("includes 16-drift-tight preset (vision §3 Path 3; 72nd; drift-tight family start)", () => {
    const drift16 = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "16-drift-tight");
    expect(drift16).toBeDefined();
    expect(drift16!.label).toBe("16tel drift (tight)");
    expect(drift16!.quantizeSubdivision).toBe("16");
    expect(drift16!.quantizeMicroTightness).toBe(0.52);
    expect(drift16!.harmonyCascadeSteps).toBe(2);
    expect(drift16!.kind).toBe("drift");
  });

  it("includes 32-drift-tight preset (vision §3 Path 3; 73rd; drift-tight family 16/32)", () => {
    const drift32 = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "32-drift-tight");
    expect(drift32).toBeDefined();
    expect(drift32!.label).toBe("32tel drift (tight)");
    expect(drift32!.quantizeSubdivision).toBe("32");
    expect(drift32!.quantizeMicroTightness).toBe(0.52);
    expect(drift32!.harmonyCascadeSteps).toBe(2);
    expect(drift32!.kind).toBe("drift");
  });

  it("includes 64-drift-tight preset (vision §3 Path 3; 74th; completes drift-tight family 16/32/64)", () => {
    const drift64 = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "64-drift-tight");
    expect(drift64).toBeDefined();
    expect(drift64!.label).toBe("64tel drift (tight)");
    expect(drift64!.quantizeSubdivision).toBe("64");
    expect(drift64!.quantizeMicroTightness).toBe(0.52);
    expect(drift64!.harmonyCascadeSteps).toBe(2);
    expect(drift64!.kind).toBe("drift");
  });

  it("includes 16-drift-medium preset (vision §3 Path 3; 75th; drift family medium variant)", () => {
    const drift16 = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "16-drift-medium");
    expect(drift16).toBeDefined();
    expect(drift16!.label).toBe("16tel drift (medium)");
  });

  it("includes 32-drift-medium preset (vision §3 Path 3; 76th; drift family medium variant)", () => {
    const drift32 = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "32-drift-medium");
    expect(drift32).toBeDefined();
    expect(drift32!.label).toBe("32tel drift (medium)");
    expect(drift32!.quantizeSubdivision).toBe("32");
    expect(drift32!.quantizeMicroTightness).toBe(0.35);
    expect(drift32!.harmonyCascadeSteps).toBe(3);
    expect(drift32!.kind).toBe("drift");
  });

  it("includes 64-drift-medium preset (vision §3 Path 3; 77th; drift family medium variant)", () => {
    const drift64 = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "64-drift-medium");
    expect(drift64).toBeDefined();
    expect(drift64!.label).toBe("64tel drift (medium)");
    expect(drift64!.quantizeSubdivision).toBe("64");
    expect(drift64!.quantizeMicroTightness).toBe(0.35);
    expect(drift64!.harmonyCascadeSteps).toBe(3);
    expect(drift64!.kind).toBe("drift");
  });

  it("includes 32-drift-relaxed preset (vision §3 Path 3; 70th; drift-relaxed family)", () => {
    const drift32 = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "32-drift-relaxed");
    expect(drift32).toBeDefined();
    expect(drift32!.label).toBe("32tel drift (relaxed)");
    expect(drift32!.quantizeSubdivision).toBe("32");
    expect(drift32!.quantizeMicroTightness).toBe(0.22);
    expect(drift32!.harmonyCascadeSteps).toBe(4);
    expect(drift32!.kind).toBe("drift");
  });

  it("includes 64-drift-relaxed preset (vision §3 Path 3; 69th; drift-relaxed variant)", () => {
    const drift64 = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "64-drift-relaxed");
    expect(drift64).toBeDefined();
    expect(drift64!.label).toBe("64tel drift (relaxed)");
    expect(drift64!.quantizeSubdivision).toBe("64");
    expect(drift64!.quantizeMicroTightness).toBe(0.22);
    expect(drift64!.harmonyCascadeSteps).toBe(4);
    expect(drift64!.kind).toBe("drift");
  });

  it("includes 16-push-tight preset (vision §3 Path 3; expressive timbre)", () => {
    const push16 = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "16-push-tight");
    expect(push16).toBeDefined();
    expect(push16!.label).toBe("16tel push (tight)");
    expect(push16!.quantizeSubdivision).toBe("16");
    expect(push16!.quantizeMicroTightness).toBe(0.52);
    expect(push16!.harmonyCascadeSteps).toBe(2);
    expect(push16!.kind).toBe("push");
  });

  it("includes 32-push-tight preset (vision §3 Path 3; mirrors 16-push-tight at 32nd)", () => {
    const push32 = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "32-push-tight");
    expect(push32).toBeDefined();
    expect(push32!.label).toBe("32tel push (tight)");
    expect(push32!.quantizeSubdivision).toBe("32");
    expect(push32!.quantizeMicroTightness).toBe(0.52);
    expect(push32!.harmonyCascadeSteps).toBe(2);
    expect(push32!.kind).toBe("push");
  });

  it("includes 64-push-tight preset (vision §3 Path 3; completes push-tight family at 64)", () => {
    const push64 = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "64-push-tight");
    expect(push64).toBeDefined();
    expect(push64!.label).toBe("64tel push (tight)");
    expect(push64!.quantizeSubdivision).toBe("64");
    expect(push64!.quantizeMicroTightness).toBe(0.52);
    expect(push64!.harmonyCascadeSteps).toBe(2);
    expect(push64!.kind).toBe("push");
  });

  it("includes 16-tight preset (vision §3 Path 3; 56th; completes tight family 16/32/64)", () => {
    const tight16 = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "16-tight");
    expect(tight16).toBeDefined();
    expect(tight16!.label).toBe("16tel tight");
    expect(tight16!.quantizeSubdivision).toBe("16");
    expect(tight16!.quantizeMicroTightness).toBe(0.85);
    expect(tight16!.harmonyCascadeSteps).toBe(1);
    expect(tight16!.kind).toBe("stable");
  });

  it("includes 64-groove-tight preset (vision §3 Path 3; 57th; groove-tight family)", () => {
    const groove64 = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "64-groove-tight");
    expect(groove64).toBeDefined();
    expect(groove64!.label).toBe("64tel groove (tight)");
    expect(groove64!.quantizeSubdivision).toBe("64");
    expect(groove64!.quantizeMicroTightness).toBe(0.55);
    expect(groove64!.harmonyCascadeSteps).toBe(2);
    expect(groove64!.kind).toBe("groove");
  });

  it("includes 32-groove-tight preset (vision §3 Path 3; 58th; groove-tight family 16/32/64)", () => {
    const groove32 = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "32-groove-tight");
    expect(groove32).toBeDefined();
    expect(groove32!.label).toBe("32tel groove (tight)");
    expect(groove32!.quantizeSubdivision).toBe("32");
    expect(groove32!.quantizeMicroTightness).toBe(0.55);
    expect(groove32!.harmonyCascadeSteps).toBe(2);
    expect(groove32!.kind).toBe("groove");
  });

  it("includes 16-groove-tight preset (vision §3 Path 3; 59th; completes groove-tight family 16/32/64)", () => {
    const groove16 = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "16-groove-tight");
    expect(groove16).toBeDefined();
    expect(groove16!.label).toBe("16tel groove (tight)");
    expect(groove16!.quantizeSubdivision).toBe("16");
    expect(groove16!.quantizeMicroTightness).toBe(0.55);
    expect(groove16!.harmonyCascadeSteps).toBe(2);
    expect(groove16!.kind).toBe("groove");
  });

  it("includes 32-groove-relaxed preset (vision §3 Path 3; expressive timbre)", () => {
    const groove = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "32-groove-relaxed");
    expect(groove).toBeDefined();
    expect(groove!.label).toBe("32tel groove (relaxed)");
    expect(groove!.quantizeSubdivision).toBe("32");
    expect(groove!.quantizeMicroTightness).toBe(0.28);
    expect(groove!.harmonyCascadeSteps).toBe(3);
    expect(groove!.kind).toBe("groove");
  });

  it("includes 64-groove-relaxed preset (vision §3 Path 3; mirrors 32-groove-relaxed)", () => {
    const groove = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "64-groove-relaxed");
    expect(groove).toBeDefined();
    expect(groove!.label).toBe("64tel groove (relaxed)");
    expect(groove!.quantizeSubdivision).toBe("64");
    expect(groove!.quantizeMicroTightness).toBe(0.28);
    expect(groove!.harmonyCascadeSteps).toBe(3);
    expect(groove!.kind).toBe("groove");
  });

  it("includes 16-groove-relaxed preset (vision §3 Path 3; completes groove-relaxed family 16/32/64)", () => {
    const groove = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "16-groove-relaxed");
    expect(groove).toBeDefined();
    expect(groove!.label).toBe("16tel groove (relaxed)");
    expect(groove!.quantizeSubdivision).toBe("16");
    expect(groove!.quantizeMicroTightness).toBe(0.28);
    expect(groove!.harmonyCascadeSteps).toBe(3);
    expect(groove!.kind).toBe("groove");
  });

  it("includes 32-human-relaxed preset (vision §3 Path 3; expressive timbre)", () => {
    const human = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "32-human-relaxed");
    expect(human).toBeDefined();
    expect(human!.label).toBe("32tel human (relaxed)");
    expect(human!.quantizeSubdivision).toBe("32");
    expect(human!.quantizeMicroTightness).toBe(0.22);
    expect(human!.harmonyCascadeSteps).toBe(4);
    expect(human!.kind).toBe("human");
  });

  it("includes 64-human-relaxed preset (vision §3 Path 3; mirrors 32-human-relaxed at 64)", () => {
    const human = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "64-human-relaxed");
    expect(human).toBeDefined();
    expect(human!.label).toBe("64tel human (relaxed)");
    expect(human!.quantizeSubdivision).toBe("64");
    expect(human!.quantizeMicroTightness).toBe(0.22);
    expect(human!.harmonyCascadeSteps).toBe(4);
    expect(human!.kind).toBe("human");
  });

  it("includes 16-human-relaxed preset (vision §3 Path 3; 55th; completes human-relaxed family 16/32/64)", () => {
    const human = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "16-human-relaxed");
    expect(human).toBeDefined();
    expect(human!.label).toBe("16tel human (relaxed)");
    expect(human!.quantizeSubdivision).toBe("16");
    expect(human!.quantizeMicroTightness).toBe(0.22);
    expect(human!.harmonyCascadeSteps).toBe(4);
    expect(human!.kind).toBe("human");
  });

  it("includes 32-human-wash preset (vision §3 Path 3; mirrors 64-human-wash)", () => {
    const wash32 = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "32-human-wash");
    expect(wash32).toBeDefined();
    expect(wash32!.label).toBe("32tel human wash");
    expect(wash32!.quantizeSubdivision).toBe("32");
    expect(wash32!.quantizeMicroTightness).toBe(0.35);
    expect(wash32!.harmonyCascadeSteps).toBe(7);
    expect(wash32!.kind).toBe("human");
  });

  it("includes 32-wash-tight preset (vision §3 Path 3; locked grid expressive timbre)", () => {
    const wash32 = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "32-wash-tight");
    expect(wash32).toBeDefined();
    expect(wash32!.label).toBe("32tel wash (tight)");
    expect(wash32!.quantizeSubdivision).toBe("32");
    expect(wash32!.quantizeMicroTightness).toBe(0.88);
    expect(wash32!.harmonyCascadeSteps).toBe(3);
    expect(wash32!.kind).toBe("stable");
  });

  it("includes 16-wash-relaxed preset (vision §3 wash family; mirrors 32/64-wash-relaxed)", () => {
    const wash16 = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "16-wash-relaxed");
    expect(wash16).toBeDefined();
    expect(wash16!.label).toBe("16tel wash (relaxed)");
    expect(wash16!.quantizeSubdivision).toBe("16");
    expect(wash16!.quantizeMicroTightness).toBe(0.22);
    expect(wash16!.harmonyCascadeSteps).toBe(3);
    expect(wash16!.kind).toBe("drift");
  });

  it("includes 64-wash-tight preset (vision §3 Path 3; mirrors 32-wash-tight, dense locked grid)", () => {
    const wash64 = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "64-wash-tight");
    expect(wash64).toBeDefined();
    expect(wash64!.label).toBe("64tel wash (tight)");
    expect(wash64!.quantizeSubdivision).toBe("64");
    expect(wash64!.quantizeMicroTightness).toBe(0.88);
    expect(wash64!.harmonyCascadeSteps).toBe(3);
    expect(wash64!.kind).toBe("stable");
  });

  it("includes 16-wash-tight preset (vision §3 Path 3; completes wash-tight family 16/32/64)", () => {
    const wash16 = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "16-wash-tight");
    expect(wash16).toBeDefined();
    expect(wash16!.label).toBe("16tel wash (tight)");
    expect(wash16!.quantizeSubdivision).toBe("16");
    expect(wash16!.quantizeMicroTightness).toBe(0.88);
    expect(wash16!.harmonyCascadeSteps).toBe(3);
    expect(wash16!.kind).toBe("stable");
  });

  it("includes 32-steady preset (vision §3 expressive timbre; mirrors 16-steady at 32)", () => {
    const steady32 = QUANTIZE_MACRO_PRESETS.find((p) => p.id === "32-steady");
    expect(steady32).toBeDefined();
    expect(steady32!.label).toBe("32tel steady");
    expect(steady32!.quantizeSubdivision).toBe("32");
    expect(steady32!.quantizeMicroTightness).toBe(0.48);
    expect(steady32!.harmonyCascadeSteps).toBe(2);
    expect(steady32!.kind).toBe("stable");
  });
});
