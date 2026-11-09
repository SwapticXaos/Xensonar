import type { ParticlePreset, WaveSoundPreset } from "../domain/instrumentData";

export function getWaveTransientDemand(preset: WaveSoundPreset) {
  switch (preset) {
    case "vibrato_glass":
    case "tape_halo":
    case "spark_chime":
    case "bowed_glass":
    case "gong_wash":
    case "chime_spray":
      return 3;
    case "bell_tone":
    case "deep_sub":
    case "membrane_thump":
    case "reed_sigh":
    case "kalimba_tine":
    case "dust_pulse":
      return 2;
    default:
      return 1;
  }
}

export function getParticleTransientDemand(preset: ParticlePreset) {
  switch (preset) {
    case "fm_bell":
    case "steel_pan":
    case "velvet_bloom":
    case "shimmer_pad":
    case "dust_chime":
    case "granular_spark":
    case "gong":
    case "chime":
    case "shimmer":
      return 3;
    case "glass_ping":
    case "marimba":
    case "pizzicato":
    case "crystal_bowl":
    case "rubber_click":
    case "reed_pop":
    case "woodblock":
    case "kalimba":
    case "tine":
    case "reed_tap":
    case "dust":
      return 2;
    case "blip":
      return 1;
    default:
      return 1;
  }
}
