/**
 * Resonance scene catalog (part 2a of 2): first 20 of part2. Combined in scenesData.ts. Types in scenesDataTypes.ts.
 */
import type { ResonanceScene } from "./scenesDataTypes";

export const RESONANCE_SCENES_PART2A: ResonanceScene[] = [
  {
    id: "edo31_training_orbit",
    label: "31-EDO · Training Orbit",
    description:
      "31-EDO motion-training orbit: a clear 32tel human grid with bright glass wisps tuned for precise micro-step practice in Arena and Platformer rooms.",
    gridTuning: "31edo",
    dronePreset: "glass_wisp",
    particlePreset: "spark",
    quantizeMacroId: "32-human",
    quantizeBpm: 104,
    mood: "Training",
    tags: ["31-EDO", "arena", "platformer", "practice"],
    difficulty: "Intermediate",
    practiceTip:
      "Lock into the 32tel grid and run short phrases up and down the 31-EDO ladder; listen for how tiny step changes reshape motion when carried into Arena and Platformer.",
  },
  {
    id: "ji_dusk_meditation",
    label: "JI · Dusk Meditation",
    description:
      "Just Intonation with a warm pad and soft crystal tones on a slow 16tel wash — minimal, meditative, ideal for ear-training pure intervals.",
    gridTuning: "ji",
    dronePreset: "warm_pad",
    particlePreset: "crystal_bowl",
    quantizeMacroId: "16-wash",
    quantizeBpm: 72,
    mood: "Meditative",
    tags: ["JI", "meditation", "dusk", "warm"],
    difficulty: "Intro",
    practiceTip:
      "Turn grid on and move the cursor slowly along the JI ratios; let the pure intervals guide the mood.",
  },
  {
    id: "bp_twilight_constellation",
    label: "BP · Twilight Constellation",
    description:
      "Bohlen–Pierce grid with glass wisps and a relaxed 32tel drift — exploratory, non-octave harmony for twilight listening.",
    gridTuning: "bp",
    dronePreset: "glass_wisp",
    particlePreset: "spark",
    quantizeMacroId: "32-drift",
    quantizeBpm: 88,
    mood: "Exploratory",
    tags: ["BP", "non-octave", "constellation", "twilight"],
    difficulty: "Intermediate",
    practiceTip:
      "Move the cursor through the BP scale and notice how the 3:1 tritave replaces the octave; try Arena or Commons with this tuning.",
  },
  {
    id: "ji_dawn_meditation",
    label: "JI · Dawn Meditation",
    description:
      "Just Intonation with a warm pad and a gentle 16tel groove — calm, minimal harmonic space for morning exploration.",
    gridTuning: "ji",
    dronePreset: "warm_pad",
    particlePreset: "glass_ping",
    quantizeMacroId: "16-groove",
    quantizeBpm: 72,
    mood: "Calm",
    tags: ["JI", "warm", "meditation", "dawn"],
    difficulty: "Intro",
    practiceTip: "Turn grid on and move slowly along the JI ratios; keep tempo low to hear each interval clearly.",
  },
  {
    id: "edo17_evening_meditation",
    label: "17-EDO · Evening Meditation",
    description:
      "17-EDO grid with a warm pad and soft wash — low tempo for interval exploration and tuning color.",
    gridTuning: "17edo",
    dronePreset: "warm_pad",
    particlePreset: "glass_ping",
    quantizeMacroId: "16-wash",
    quantizeBpm: 72,
    mood: "Meditative",
    tags: ["17-EDO", "meditation", "warm", "wash"],
    difficulty: "Intro",
    practiceTip:
      "Move the cursor slowly through 17-EDO steps; compare with 12-EDO and 19-EDO for tuning color.",
  },
  {
    id: "edo31_evening_meditation",
    label: "31-EDO · Evening Meditation",
    description:
      "31-EDO grid with a warm pad and soft wash — low tempo for dense micro-step exploration and tuning color.",
    gridTuning: "31edo",
    dronePreset: "warm_pad",
    particlePreset: "glass_ping",
    quantizeMacroId: "16-wash",
    quantizeBpm: 72,
    mood: "Meditative",
    tags: ["31-EDO", "meditation", "warm", "wash"],
    difficulty: "Intro",
    practiceTip:
      "Move the cursor slowly through 31-EDO steps; compare with 12-EDO and 17-EDO for tuning color.",
  },
  {
    id: "edo22_evening_meditation",
    label: "22-EDO · Evening Meditation",
    description:
      "22-EDO grid with a warm pad and soft wash — low tempo for quarter-tone flavor and tuning color.",
    gridTuning: "22edo",
    dronePreset: "warm_pad",
    particlePreset: "glass_ping",
    quantizeMacroId: "16-wash",
    quantizeBpm: 72,
    mood: "Meditative",
    tags: ["22-EDO", "meditation", "warm", "wash"],
    difficulty: "Intro",
    practiceTip:
      "Move the cursor slowly through 22-EDO steps; compare with 12-EDO and 31-EDO for tuning color.",
  },
  {
    id: "edo19_evening_meditation",
    label: "19-EDO · Evening Meditation",
    description:
      "19-EDO grid with a warm pad and soft wash — low tempo for interval exploration and tuning color between 17- and 22-EDO.",
    gridTuning: "19edo",
    dronePreset: "warm_pad",
    particlePreset: "glass_ping",
    quantizeMacroId: "16-wash",
    quantizeBpm: 72,
    mood: "Meditative",
    tags: ["19-EDO", "meditation", "warm", "wash"],
    difficulty: "Intro",
    practiceTip:
      "Move the cursor slowly through 19-EDO steps; compare with 17-EDO and 22-EDO for tuning color.",
  },
  {
    id: "ji_sunset_meditation",
    label: "JI · Sunset Meditation",
    description:
      "Just Intonation grid with a warm pad and soft wash — low tempo for pure-ratio exploration at the end of the day.",
    gridTuning: "ji",
    dronePreset: "warm_pad",
    particlePreset: "glass_ping",
    quantizeMacroId: "16-wash",
    quantizeBpm: 72,
    mood: "Meditative",
    tags: ["JI", "meditation", "warm", "wash"],
    difficulty: "Intro",
    practiceTip:
      "Move the cursor slowly through JI ratios; compare with 12-EDO and 19-EDO for tuning color.",
  },
  {
    id: "bp_morning_meditation",
    label: "BP · Morning Meditation",
    description:
      "Bohlen–Pierce grid with glass wisp and soft wash — low tempo for tritave (3:1) exploration; non-octave harmony for calm morning listening.",
    gridTuning: "bp",
    dronePreset: "glass_wisp",
    particlePreset: "crystal_bowl",
    quantizeMacroId: "16-wash",
    quantizeBpm: 72,
    mood: "Meditative",
    tags: ["BP", "meditation", "non-octave", "wash"],
    difficulty: "Intro",
    practiceTip:
      "Move the cursor slowly through the BP scale; notice how the 3:1 tritave replaces the octave. Compare with JI or 12-EDO scenes for tuning color.",
  },
  {
    id: "edo12_evening_meditation",
    label: "12-EDO · Evening Meditation",
    description:
      "12-EDO grid with a warm pad and soft wash — low tempo for familiar equal temperament in a meditative context; reference for comparing with other EDO scenes.",
    gridTuning: "12edo",
    dronePreset: "warm_pad",
    particlePreset: "glass_ping",
    quantizeMacroId: "16-wash",
    quantizeBpm: 72,
    mood: "Meditative",
    tags: ["12-EDO", "meditation", "warm", "wash", "reference"],
    difficulty: "Intro",
    practiceTip:
      "Move the cursor slowly through 12-EDO steps; use as reference before trying 17-, 19-, 22-, or 31-EDO meditation scenes.",
  },
  {
    id: "ji_noon_exploration",
    label: "JI · Noon Exploration",
    description:
      "Just Intonation grid with lumen drone and 32tel wash — mid tempo for pure-ratio exploration and harmonic navigation in a brighter, exploratory context.",
    gridTuning: "ji",
    dronePreset: "lumen_drone",
    particlePreset: "glass_ping",
    quantizeMacroId: "32-wash",
    quantizeBpm: 96,
    mood: "Exploratory",
    tags: ["JI", "exploration", "lumen", "wash", "harmonic navigation"],
    difficulty: "Intro",
    practiceTip:
      "Explore JI ratios at a steady pulse; compare intervals with the evening meditation scenes for tuning color at different tempos.",
  },
  {
    id: "edo17_noon_exploration",
    label: "17-EDO · Noon Exploration",
    description:
      "17-EDO grid with ember drone and 32tel wash — mid tempo for equal-step exploration between 12- and 19-EDO; bright, exploratory context.",
    gridTuning: "17edo",
    dronePreset: "ember_drone",
    particlePreset: "glass_ping",
    quantizeMacroId: "32-wash",
    quantizeBpm: 96,
    mood: "Exploratory",
    tags: ["17-EDO", "exploration", "ember", "wash", "harmonic navigation"],
    difficulty: "Intro",
    practiceTip:
      "Explore 17-EDO steps at a steady pulse; compare with JI Noon Exploration and 17-EDO Evening Meditation for tuning color at different tempos.",
  },
  {
    id: "edo12_noon_exploration",
    label: "12-EDO · Noon Exploration",
    description:
      "12-EDO grid with warm pad and 32tel wash — mid tempo for equal-step exploration and harmonic navigation in a bright, reference context.",
    gridTuning: "12edo",
    dronePreset: "warm_pad",
    particlePreset: "glass_ping",
    quantizeMacroId: "32-wash",
    quantizeBpm: 96,
    mood: "Exploratory",
    tags: ["12-EDO", "exploration", "warm", "wash", "reference", "harmonic navigation"],
    difficulty: "Intro",
    practiceTip:
      "Explore 12-EDO at a steady pulse; compare with JI and 17-EDO Noon Exploration for tuning color; useful as reference for other EDO scenes.",
  },
  {
    id: "edo19_noon_exploration",
    label: "19-EDO · Noon Exploration",
    description:
      "19-EDO grid with warm pad and 32tel wash — mid tempo for equal-step exploration between 17- and 22-EDO; bright, exploratory context.",
    gridTuning: "19edo",
    dronePreset: "warm_pad",
    particlePreset: "glass_ping",
    quantizeMacroId: "32-wash",
    quantizeBpm: 96,
    mood: "Exploratory",
    tags: ["19-EDO", "exploration", "warm", "wash", "harmonic navigation"],
    difficulty: "Intro",
    practiceTip:
      "Explore 19-EDO steps at a steady pulse; compare with 17-EDO and 12-EDO Noon Exploration and 19-EDO Evening Meditation for tuning color.",
  },
  {
    id: "edo22_noon_exploration",
    label: "22-EDO · Noon Exploration",
    description:
      "22-EDO grid with warm pad and 32tel wash — mid tempo for equal-step exploration; bridges 19- and 31-EDO in a bright, exploratory context.",
    gridTuning: "22edo",
    dronePreset: "warm_pad",
    particlePreset: "glass_ping",
    quantizeMacroId: "32-wash",
    quantizeBpm: 96,
    mood: "Exploratory",
    tags: ["22-EDO", "exploration", "warm", "wash", "harmonic navigation"],
    difficulty: "Intro",
    practiceTip:
      "Explore 22-EDO steps at a steady pulse; compare with 19-EDO and 31-EDO Noon Exploration and 22-EDO Evening Meditation for tuning color.",
  },
  {
    id: "edo31_noon_exploration",
    label: "31-EDO · Noon Exploration",
    description:
      "31-EDO grid with warm pad and 32tel wash — mid tempo for equal-step exploration; fine resolution in a bright, exploratory context.",
    gridTuning: "31edo",
    dronePreset: "warm_pad",
    particlePreset: "glass_ping",
    quantizeMacroId: "32-wash",
    quantizeBpm: 96,
    mood: "Exploratory",
    tags: ["31-EDO", "exploration", "warm", "wash", "harmonic navigation"],
    difficulty: "Intro",
    practiceTip:
      "Explore 31-EDO steps at a steady pulse; compare with 22-EDO and 19-EDO Noon Exploration and 31-EDO Evening Meditation for tuning color.",
  },
  {
    id: "bp_evening_meditation",
    label: "BP · Evening Meditation",
    description:
      "Bohlen–Pierce grid with glass wisp and soft wash — low tempo for tritave (3:1) exploration; non-octave harmony for calm evening listening.",
    gridTuning: "bp",
    dronePreset: "glass_wisp",
    particlePreset: "crystal_bowl",
    quantizeMacroId: "16-wash",
    quantizeBpm: 72,
    mood: "Meditative",
    tags: ["BP", "meditation", "non-octave", "wash"],
    difficulty: "Intro",
    practiceTip:
      "Move the cursor slowly through the BP scale in the evening; the 3:1 tritave replaces the octave. Compare with BP Morning Meditation and JI evening scenes for tuning color.",
  },
  {
    id: "bp_noon_exploration",
    label: "BP · Noon Exploration",
    description:
      "Bohlen–Pierce grid with warm pad and glass ping — 32tel wash for tritave (3:1) exploration; non-octave harmony for midday discovery alongside JI and EDO noon scenes.",
    gridTuning: "bp",
    dronePreset: "warm_pad",
    particlePreset: "glass_ping",
    quantizeMacroId: "32-wash",
    quantizeBpm: 96,
    mood: "Exploratory",
    tags: ["BP", "exploration", "non-octave", "warm", "wash"],
    difficulty: "Intro",
    practiceTip:
      "Explore the BP scale at noon; the 3:1 tritave replaces the octave. Compare with JI · Noon Exploration and EDO noon scenes to hear how non-octave tuning changes the feel of the same groove.",
  },
  {
    id: "ji_midnight_wash",
    label: "JI · Midnight Wash",
    description:
      "Just Intonation grid with warm pad and a slow 16tel wash — low tempo for late-night exploration; pure ratios and gentle swells.",
    gridTuning: "ji",
    dronePreset: "warm_pad",
    particlePreset: "crystal_bowl",
    quantizeMacroId: "16-wash",
    quantizeBpm: 72,
    mood: "Calm",
    tags: ["JI", "wash", "midnight", "meditative"],
    difficulty: "Intro",
    practiceTip:
      "Let the cursor drift slowly through JI steps; the 16-wash grid and crystal bowl support relaxed late-night listening.",
  },
  {
    id: "ji_dawn_wash",
    label: "JI · Dawn Wash",
    description:
      "Just Intonation grid with warm pad and a gentle 16tel wash — early-morning tempo; pure ratios and soft swells as the day begins.",
    gridTuning: "ji",
    dronePreset: "warm_pad",
    particlePreset: "shimmer",
    quantizeMacroId: "16-wash",
    quantizeBpm: 76,
    mood: "Calm",
    tags: ["JI", "wash", "dawn", "meditative"],
    difficulty: "Intro",
    practiceTip:
      "Start the day in JI: move the cursor slowly through pure ratios; shimmer and 16-wash support a gentle dawn session.",
  },
];
