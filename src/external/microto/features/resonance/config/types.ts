export type ParticleSystem = "ji" | "12edo" | "bp";
export type ResonanceOvertoneWaveform = "sine" | "square" | "sawtooth";

export type DronePreset =
  | "warm_pad"
  | "string_swell"
  | "dark_sub"
  | "metallic"
  | "vocal_choir"
  | "ethereal_halo"
  | "reed_drone"
  | "pulse_matrix"
  | "fjord_tape"
  | "resonant_fifths"
  | "cello"
  | "saxophon"
  | "amber_drone"
  | "copper_bell"
  | "night_drone"
  | "dawn_drone"
  | "ember_drone"
  | "lumen_drone"
  | "glass_wisp"
  | "bp_glass"
  | "frost_drone"
  | "tide_drone"
  | "haze_drone"
  | "twilight_drone"
  | "moon_drone";

export type ParticlePreset =
  | "glass_ping"
  | "marimba"
  | "soft_pluck"
  | "fm_bell"
  | "pizzicato"
  | "steel_pan"
  | "crystal_bowl"
  | "woodblock"
  | "kalimba"
  | "gong"
  | "chime"
  | "tine"
  | "reed_tap"
  | "blip"
  | "spark"
  | "shimmer"
  | "dust"
  | "pebble";

export type DrumPattern = "trip_hop" | "four_on_floor" | "breakbeat" | "idm";
export type BassPattern = "offbeat" | "walking" | "stotter" | "arpeggio";

export type LabeledOption<T extends string> = { value: T; label: string };
