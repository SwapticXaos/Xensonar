/**
 * Scenes config: structure and practice-tip contract.
 */
import { RESONANCE_SCENES, findResonanceSceneForState } from "../scenes";
import type { ResonanceState } from "../state";

describe("RESONANCE_SCENES", () => {
  it("has exactly 121 curated scenes (catalog lock for docu and Gallery)", () => {
    expect(RESONANCE_SCENES).toHaveLength(121);
  });

  it("includes ji_night_twilight_wash scene (86th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_night_twilight_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Night Twilight Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_deep_night_wash scene (87th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_deep_night_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Deep Night Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_before_dawn_wash scene (88th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_before_dawn_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Before Dawn Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_still_night_wash scene (89th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_still_night_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Still Night Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_hour_before_dawn_wash scene (90th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_hour_before_dawn_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Hour Before Dawn Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_dawn_break_wash scene (91st; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_dawn_break_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Dawn Break Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_sunrise_break_wash scene (92nd; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_sunrise_break_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Sunrise Break Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_morning_light_wash scene (93rd; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_morning_light_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Morning Light Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_mid_morning_wash scene (94th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_mid_morning_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Mid Morning Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_late_morning_wash scene (95th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_late_morning_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Late Morning Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_noon_approach_wash scene (96th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_noon_approach_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Noon Approach Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_noon_peak_wash scene (97th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_noon_peak_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Noon Peak Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_afternoon_descent_wash scene (98th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_afternoon_descent_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Afternoon Descent Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_evening_approach_wash scene (99th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_evening_approach_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Evening Approach Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_dusk_approach_wash scene (100th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_dusk_approach_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Dusk Approach Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_twilight_wash scene (101st; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_twilight_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Twilight Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_nightfall_wash scene (102nd; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_nightfall_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Nightfall Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_starlight_wash scene (103rd; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_starlight_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Starlight Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_cosmic_wash scene (104th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_cosmic_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Cosmic Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_void_wash scene (105th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_void_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Void Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_horizon_wash scene (106th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_horizon_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Horizon Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_ether_wash scene (107th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_ether_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Ether Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_flow_wash scene (108th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_flow_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Flow Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_glow_wash scene (109th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_glow_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Glow Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_ember_wash scene (110th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_ember_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Ember Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_ash_wash scene (111th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_ash_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Ash Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_smoke_wash scene (112th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_smoke_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Smoke Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_mist_wash scene (113th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_mist_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Mist Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_fog_wash scene (114th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_fog_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Fog Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_haze_wash scene (115th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_haze_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Haze Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_starlight_wash scene (116th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_starlight_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Starlight Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_moonrise_wash scene (117th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_moonrise_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Moonrise Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_dawn_wash scene (118th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_dawn_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Dawn Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_dew_wash scene (119th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_dew_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Dew Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_frost_wash scene (120th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_frost_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Frost Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_rime_wash scene (121st; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_rime_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Rime Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_aurora_wash scene", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_aurora_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Aurora Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_daybreak_wash scene", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_daybreak_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Daybreak Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_sunrise_wash scene", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_sunrise_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Sunrise Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_golden_hour_wash scene", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_golden_hour_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Golden Hour Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_blue_hour_wash scene", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_blue_hour_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Blue Hour Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_silver_hour_wash scene", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_silver_hour_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Silver Hour Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_early_morning_wash scene", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_early_morning_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Early Morning Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_pre_sunrise_wash scene", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_pre_sunrise_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Pre-Sunrise Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_first_light_wash scene", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_first_light_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · First Light Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_high_noon_wash scene", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_high_noon_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · High Noon Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_zenith_wash scene (71st; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_zenith_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Zenith Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_late_afternoon_wash scene (83rd; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_late_afternoon_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Late Afternoon Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_dusk_glow_wash scene (84th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_dusk_glow_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Dusk Glow Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_evening_twilight_wash scene (85th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_evening_twilight_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Evening Twilight Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_evening_glow_wash scene (73rd; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_evening_glow_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Evening Glow Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_nightfall_wash scene (74th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_nightfall_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Nightfall Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_midnight_meditation_wash scene (75th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_midnight_meditation_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Midnight Meditation Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_pre_midnight_wash scene (76th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_pre_midnight_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Pre-Midnight Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_post_midnight_wash scene (77th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_post_midnight_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Post-Midnight Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_dawn_light_wash scene (78th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_dawn_light_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Dawn Light Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_sunrise_glow_wash scene (79th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_sunrise_glow_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Sunrise Glow Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_morning_soft_wash scene (80th; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_morning_soft_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Morning Soft Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("includes ji_early_afternoon_wash scene (81st; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_early_afternoon_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Early Afternoon Wash");
  });

  it("includes ji_mid_afternoon_wash scene (82nd; vision §3 Path 4)", () => {
    const scene = RESONANCE_SCENES.find((s) => s.id === "ji_mid_afternoon_wash");
    expect(scene).toBeDefined();
    expect(scene?.label).toBe("JI · Mid Afternoon Wash");
    expect(scene?.gridTuning).toBe("ji");
    expect(scene?.quantizeMacroId).toBe("16-wash");
  });

  it("has required fields on every scene (id, label, gridTuning, dronePreset, quantizeMacroId)", () => {
    for (const scene of RESONANCE_SCENES) {
      expect(scene.id).toBeDefined();
      expect(typeof scene.label).toBe("string");
      expect(scene.label.length).toBeGreaterThan(0);
      expect(["ji", "bp", "12edo", "17edo", "19edo", "22edo", "31edo"]).toContain(scene.gridTuning);
      expect(scene.dronePreset).toBeDefined();
      expect(scene.quantizeMacroId).toBeDefined();
    }
  });

  it("when practiceTip is present it is a non-empty string", () => {
    const withTip = RESONANCE_SCENES.filter((s) => s.practiceTip != null);
    expect(withTip.length).toBeGreaterThan(0);
    for (const scene of withTip) {
      expect(typeof scene.practiceTip).toBe("string");
      expect((scene.practiceTip as string).trim().length).toBeGreaterThan(0);
    }
  });
});

describe("findResonanceSceneForState", () => {
  it("returns null for state that matches no scene", () => {
    const state = {
      gridTuning: "ji",
      dronePreset: "warm_pad",
      particlePreset: "glass_ping",
      quantizeSubdivision: 64,
      quantizeMicroTightness: 0.99,
      harmonyCascadeSteps: 8,
    } as unknown as ResonanceState;
    const scene = findResonanceSceneForState(state);
    expect(scene).toBeNull();
  });

  it("returns scene with practiceTip when state matches JI warm pad scene", () => {
    const state = {
      gridTuning: "ji",
      dronePreset: "warm_pad",
      particlePreset: "glass_ping",
      quantizeSubdivision: "16",
      quantizeMicroTightness: 0.35,
      harmonyCascadeSteps: 3,
    } as unknown as ResonanceState;
    const scene = findResonanceSceneForState(state);
    expect(scene).not.toBeNull();
    expect(scene?.id).toBe("ji_warm_pad_groove");
    expect(scene?.practiceTip).toBeDefined();
    expect(typeof scene?.practiceTip).toBe("string");
  });
});
