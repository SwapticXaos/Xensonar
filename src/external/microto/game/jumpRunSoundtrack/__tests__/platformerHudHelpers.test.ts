import { describe, expect, it } from "vitest";

import { createResetPlatformerHud } from "../platformerHudHelpers";

describe("platformerHudHelpers", () => {
  it("returns base reset HUD with expected shape and defaults", () => {
    const hud = createResetPlatformerHud();

    expect(hud.score).toBe(0);
    expect(hud.lives).toBe(5);
    expect(hud.collected).toBe(0);
    expect(hud.totalCoins).toBe(0);
    expect(hud.combo).toBe(4);
    expect(hud.form).toBe("--");
    expect(hud.events).toBe(0);
    expect(hud.syncHits).toBe(0);
    expect(hud.phaseHits).toBe(0);
    expect(hud.tuningHits).toBe(0);
    expect(hud.forkHits).toBe(0);
    expect(hud.restHits).toBe(0);
    expect(hud.phaseFocus).toBe("--");
    expect(hud.tuningTilt).toBe(0);
    expect(hud.forkBias).toBe(0);
    expect(hud.restDensity).toBe(0);
    expect(hud.previewSlots).toBe(0);
    expect(hud.puzzleSteps).toBe(0);
    expect(hud.puzzleTotal).toBe(0);
    expect(hud.gatesOpen).toBe(0);
    expect(hud.actionDrive).toBe(0);
    expect(hud.routeOne).toBe("--");
    expect(hud.routeTwo).toBe("--");
    expect(hud.routeMode).toBe("BALANCED");
    expect(hud.routeBias).toBe(0);
    expect(hud.routeTravel).toBe(0);
    expect(hud.routeColor).toBe("--");
    expect(hud.routeGroove).toBe("--");
    expect(hud.routeLeadVoice).toBe("--");
    expect(hud.sectionBias).toBe("AUTO");
    expect(hud.targetTempo).toBe(0);
    expect(hud.complexity).toBe(0);
    expect(hud.cycle).toBe(0);
    expect(hud.tuning).toBe("12edo");
    expect(hud.arrangement).toBe("balanced");
    expect(hud.formMode).toBe("auto");
    expect(hud.evolution).toBe(0.68);
    expect(hud.tempoFollow).toBe(0.62);
    expect(hud.status).toBe("Run zurueckgesetzt");
  });

  it("merges overrides into base HUD", () => {
    const hud = createResetPlatformerHud({
      totalCoins: 12,
      sectionBias: "A",
      tuning: "ji",
      status: "Custom status",
    });

    expect(hud.totalCoins).toBe(12);
    expect(hud.sectionBias).toBe("A");
    expect(hud.tuning).toBe("ji");
    expect(hud.status).toBe("Custom status");
    expect(hud.score).toBe(0);
    expect(hud.lives).toBe(5);
  });

  it("returns new object (does not mutate shared default)", () => {
    const a = createResetPlatformerHud();
    const b = createResetPlatformerHud({ score: 100 });

    expect(a.score).toBe(0);
    expect(b.score).toBe(100);
    expect(a).not.toBe(b);
  });
});
