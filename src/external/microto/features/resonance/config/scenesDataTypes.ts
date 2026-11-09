/**
 * Resonance scene types only.
 * Single source for ResonanceSceneId, ResonanceSceneDifficulty, ResonanceScene.
 * Data (RESONANCE_SCENES) lives in scenesData.ts.
 */
import type { GridTuning } from "../../../shared/tuning/grid";
import type { DronePreset, ParticlePreset } from "./types";
import type { QuantizeMacroPreset } from "./quantizePresets";

export type ResonanceSceneId =
  | "ji_warm_pad_groove"
  | "ji_warm_pad_wash"
  | "ji_ember_bridge"
  | "ji_ember_night_bridge"
  | "ji_slow_lanterns"
  | "ji_commons_practice_space"
  | "ji_commons_wash_orbit"
  | "bp_glass_halo"
  | "bp_constellation_polyrhythm"
  | "bp_lantern_run"
  | "edo19_string_swell_polyrhythm"
  | "edo19_tide_drift"
  | "ji_clockwork_pulsefield"
  | "ji_lumen_cathedral"
  | "edo12_night_grid"
  | "edo22_copper_horizon"
  | "edo22_commons_wash_ladder"
  | "ji_interval_ear_orbit"
  | "edo31_glass_wisp_constellation"
  | "edo17_ember_ladder"
  | "edo17_training_ladder"
  | "edo12_warm_grid"
  | "edo12_reference_orbit"
  | "edo22_arena_pulsefield"
  | "edo22_training_bridge"
  | "edo31_training_orbit"
  | "edo19_training_orbit"
  | "ji_dusk_meditation"
  | "bp_twilight_constellation"
  | "ji_dawn_meditation"
  | "edo17_evening_meditation"
  | "edo31_evening_meditation"
  | "edo22_evening_meditation"
  | "edo19_evening_meditation"
  | "ji_sunset_meditation"
  | "bp_morning_meditation"
  | "edo12_evening_meditation"
  | "ji_noon_exploration"
  | "edo17_noon_exploration"
  | "edo12_noon_exploration"
  | "edo19_noon_exploration"
  | "edo22_noon_exploration"
  | "edo31_noon_exploration"
  | "bp_evening_meditation"
  | "bp_noon_exploration"
  | "ji_midnight_wash"
  | "ji_dawn_wash"
  | "ji_evening_wash"
  | "ji_noon_wash"
  | "ji_morning_wash"
  | "ji_afternoon_wash"
  | "ji_twilight_wash"
  | "ji_dusk_wash"
  | "ji_night_wash"
  | "ji_pre_dawn_wash"
  | "ji_first_light_wash"
  | "ji_starlight_wash"
  | "ji_moonlight_wash"
  | "ji_aurora_wash"
  | "ji_daybreak_wash"
  | "ji_sunrise_wash"
  | "ji_midday_wash"
  | "ji_golden_hour_wash"
  | "ji_blue_hour_wash"
  | "ji_silver_hour_wash"
  | "ji_late_night_wash"
  | "ji_early_morning_wash"
  | "ji_pre_sunrise_wash"
  | "ji_high_noon_wash"
  | "ji_zenith_wash"
  | "ji_afternoon_glow_wash"
  | "ji_late_afternoon_wash"
  | "ji_evening_glow_wash"
  | "ji_nightfall_wash"
  | "ji_midnight_meditation_wash"
  | "ji_pre_midnight_wash"
  | "ji_post_midnight_wash"
  | "ji_dawn_light_wash"
  | "ji_sunrise_glow_wash"
  | "ji_morning_soft_wash"
  | "ji_early_afternoon_wash"
  | "ji_mid_afternoon_wash"
  | "ji_late_afternoon_wash"
  | "ji_dusk_glow_wash"
  | "ji_evening_twilight_wash"
  | "ji_night_twilight_wash"
  | "ji_deep_night_wash"
  | "ji_before_dawn_wash"
  | "ji_still_night_wash"
  | "ji_hour_before_dawn_wash"
  | "ji_dawn_break_wash"
  | "ji_sunrise_break_wash"
  | "ji_morning_light_wash"
  | "ji_mid_morning_wash"
  | "ji_late_morning_wash"
  | "ji_noon_approach_wash"
  | "ji_noon_peak_wash"
  | "ji_afternoon_descent_wash"
  | "ji_evening_approach_wash"
  | "ji_dusk_approach_wash"
  | "ji_twilight_wash"
  | "ji_nightfall_wash"
  | "ji_starlight_wash"
  | "ji_cosmic_wash"
  | "ji_void_wash"
  | "ji_horizon_wash"
  | "ji_ether_wash"
  | "ji_flow_wash"
  | "ji_glow_wash"
  | "ji_ember_wash"
  | "ji_ash_wash"
  | "ji_smoke_wash"
  | "ji_mist_wash"
  | "ji_fog_wash"
  | "ji_haze_wash"
  | "ji_starlight_wash"
  | "ji_moonrise_wash"
  | "ji_dawn_wash"
  | "ji_dew_wash"
  | "ji_frost_wash"
  | "ji_rime_wash";

export type ResonanceSceneDifficulty = "Intro" | "Intermediate" | "Advanced";

export type ResonanceScene = {
  id: ResonanceSceneId;
  label: string;
  description: string;
  /** Target grid tuning for the scene. */
  gridTuning: GridTuning;
  /** Drone preset that best matches the intended mood. */
  dronePreset: DronePreset;
  /** Optional particle preset; falls back to current when omitted. */
  particlePreset?: ParticlePreset;
  /**
   * Quantize macro preset id that defines subdivision, micro tightness, and harmony cascade.
   * Uses existing catalog; no new timing policy is introduced here.
   */
  quantizeMacroId: QuantizeMacroPreset["id"];
  /**
   * Optional BPM override; when omitted the current quantizeBpm is preserved.
   */
  quantizeBpm?: number;
  /**
   * Optional short mood label for discoverability (e.g. "Meditative", "Rhythmic").
   * Surfaces in World Gallery and shell HUD; enables future filtering by feel.
   */
  mood?: string;
  /**
   * Optional curator tags for discovery and future filtering (e.g. "pad", "polyrhythm").
   * Merged into world tags when building HarmonicWorld from this scene.
   */
  tags?: string[];
  /**
   * Optional difficulty hint for practice-oriented flows.
   * This is a lightweight, curator-facing label that can be surfaced in HUDs
   * to help future users pick scenes that match their current level.
   */
  difficulty?: ResonanceSceneDifficulty;
  /**
   * Optional one-line practice tip shown in the Resonance room when this scene is active.
   * Improves discoverability (vision §5) and enables future tutorial/onboarding content.
   */
  practiceTip?: string;
};
