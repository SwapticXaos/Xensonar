/**
 * Resonance scene catalog (part 2b of 2): 17 scenes. Combined with part2a and part2c in scenesData.ts. Types in scenesDataTypes.ts.
 */
import type { ResonanceScene } from "./scenesDataTypes";

export const RESONANCE_SCENES_PART2B: ResonanceScene[] = [
  {
    id: "ji_evening_wash",
    label: "JI · Evening Wash",
    description:
      "Just Intonation grid with warm pad and a soft 16tel wash — evening tempo; pure ratios and gentle swells as the day winds down.",
    gridTuning: "ji",
    dronePreset: "warm_pad",
    particlePreset: "crystal_bowl",
    quantizeMacroId: "16-wash",
    quantizeBpm: 74,
    mood: "Calm",
    tags: ["JI", "wash", "evening", "meditative"],
    difficulty: "Intro",
    practiceTip:
      "Wind down in JI: slow cursor movement through pure ratios; crystal bowl and 16-wash support a reflective evening session.",
  },
  {
    id: "ji_noon_wash",
    label: "JI · Noon Wash",
    description:
      "Just Intonation grid with warm pad and a clear 16tel wash — midday tempo; pure ratios and steady swells for focused noon exploration.",
    gridTuning: "ji",
    dronePreset: "warm_pad",
    particlePreset: "shimmer",
    quantizeMacroId: "16-wash",
    quantizeBpm: 80,
    mood: "Calm",
    tags: ["JI", "wash", "noon", "meditative"],
    difficulty: "Intro",
    practiceTip:
      "Midday JI: move the cursor through pure ratios; shimmer and 16-wash support clear, focused listening at a steady tempo.",
  },
  {
    id: "ji_morning_wash",
    label: "JI · Morning Wash",
    description:
      "Just Intonation grid with warm pad and a gentle 16tel wash — morning tempo; pure ratios and soft swells for early exploration.",
    gridTuning: "ji",
    dronePreset: "warm_pad",
    particlePreset: "crystal_bowl",
    quantizeMacroId: "16-wash",
    quantizeBpm: 78,
    mood: "Calm",
    tags: ["JI", "wash", "morning", "meditative"],
    difficulty: "Intro",
    practiceTip:
      "Morning JI: move the cursor slowly through pure ratios; crystal bowl and 16-wash support a gentle start to the day.",
  },
  {
    id: "ji_afternoon_wash",
    label: "JI · Afternoon Wash",
    description:
      "Just Intonation grid with warm pad and a steady 16tel wash — afternoon tempo; pure ratios and clear swells for focused exploration.",
    gridTuning: "ji",
    dronePreset: "warm_pad",
    particlePreset: "shimmer",
    quantizeMacroId: "16-wash",
    quantizeBpm: 82,
    mood: "Calm",
    tags: ["JI", "wash", "afternoon", "meditative"],
    difficulty: "Intro",
    practiceTip:
      "Afternoon JI: move the cursor through pure ratios; shimmer and 16-wash support steady, focused listening.",
  },
  {
    id: "ji_twilight_wash",
    label: "JI · Twilight Wash",
    description:
      "Just Intonation grid with warm pad and a soft 16tel wash — twilight tempo; pure ratios and gentle swells for wind-down exploration.",
    gridTuning: "ji",
    dronePreset: "warm_pad",
    particlePreset: "crystal_bowl",
    quantizeMacroId: "16-wash",
    quantizeBpm: 74,
    mood: "Calm",
    tags: ["JI", "wash", "twilight", "meditative"],
    difficulty: "Intro",
    practiceTip:
      "Twilight JI: move the cursor slowly through pure ratios; crystal bowl and 16-wash support a calm close to the day.",
  },
  {
    id: "ji_dusk_wash",
    label: "JI · Dusk Wash",
    description:
      "Just Intonation grid with warm pad and a gentle 16tel wash — dusk tempo; pure ratios and soft swells for late-day exploration.",
    gridTuning: "ji",
    dronePreset: "warm_pad",
    particlePreset: "crystal_bowl",
    quantizeMacroId: "16-wash",
    quantizeBpm: 76,
    mood: "Calm",
    tags: ["JI", "wash", "dusk", "meditative"],
    difficulty: "Intro",
    practiceTip:
      "Dusk JI: move the cursor slowly through pure ratios; crystal bowl and 16-wash support a reflective transition into evening.",
  },
  {
    id: "ji_night_wash",
    label: "JI · Night Wash",
    description:
      "Just Intonation grid with warm pad and a soft 16tel wash — night tempo; pure ratios and gentle swells for late-night exploration.",
    gridTuning: "ji",
    dronePreset: "warm_pad",
    particlePreset: "crystal_bowl",
    quantizeMacroId: "16-wash",
    quantizeBpm: 72,
    mood: "Calm",
    tags: ["JI", "wash", "night", "meditative"],
    difficulty: "Intro",
    practiceTip:
      "Night JI: move the cursor slowly through pure ratios; crystal bowl and 16-wash support a quiet, reflective session.",
  },
  {
    id: "ji_pre_dawn_wash",
    label: "JI · Pre-Dawn Wash",
    description:
      "Just Intonation grid with warm pad and a gentle 16tel wash — pre-dawn tempo; pure ratios and soft swells for early-morning exploration.",
    gridTuning: "ji",
    dronePreset: "warm_pad",
    particlePreset: "crystal_bowl",
    quantizeMacroId: "16-wash",
    quantizeBpm: 68,
    mood: "Calm",
    tags: ["JI", "wash", "pre-dawn", "meditative"],
    difficulty: "Intro",
    practiceTip:
      "Pre-dawn JI: move the cursor slowly through pure ratios; crystal bowl and 16-wash support a quiet transition into the day.",
  },
  {
    id: "ji_first_light_wash",
    label: "JI · First Light Wash",
    description:
      "Just Intonation grid with warm pad and a soft 16tel wash — first light tempo; pure ratios and gentle swells as the day begins.",
    gridTuning: "ji",
    dronePreset: "warm_pad",
    particlePreset: "crystal_bowl",
    quantizeMacroId: "16-wash",
    quantizeBpm: 70,
    mood: "Calm",
    tags: ["JI", "wash", "first-light", "meditative"],
    difficulty: "Intro",
    practiceTip:
      "First light JI: move the cursor slowly through pure ratios; crystal bowl and 16-wash support a gentle start to the day.",
  },
  {
    id: "ji_starlight_wash",
    label: "JI · Starlight Wash",
    description:
      "Just Intonation grid with warm pad and a soft 16tel wash — starlight tempo; pure ratios and gentle swells for late-night exploration under a quiet sky.",
    gridTuning: "ji",
    dronePreset: "warm_pad",
    particlePreset: "crystal_bowl",
    quantizeMacroId: "16-wash",
    quantizeBpm: 66,
    mood: "Calm",
    tags: ["JI", "wash", "starlight", "meditative"],
    difficulty: "Intro",
    practiceTip:
      "Starlight JI: move the cursor slowly through pure ratios; crystal bowl and 16-wash support a reflective late-night session.",
  },
  {
    id: "ji_moonlight_wash",
    label: "JI · Moonlight Wash",
    description:
      "Just Intonation grid with warm pad and a soft 16tel wash — moonlight tempo; pure ratios and gentle swells for evening exploration.",
    gridTuning: "ji",
    dronePreset: "warm_pad",
    particlePreset: "crystal_bowl",
    quantizeMacroId: "16-wash",
    quantizeBpm: 64,
    mood: "Calm",
    tags: ["JI", "wash", "moonlight", "meditative"],
    difficulty: "Intro",
    practiceTip:
      "Moonlight JI: move the cursor slowly through pure ratios; crystal bowl and 16-wash support a calm evening session.",
  },
  {
    id: "ji_aurora_wash",
    label: "JI · Aurora Wash",
    description:
      "Just Intonation grid with warm pad and a soft 16tel wash — aurora tempo; pure ratios and gentle swells for pre-dawn or polar-hour exploration.",
    gridTuning: "ji",
    dronePreset: "warm_pad",
    particlePreset: "crystal_bowl",
    quantizeMacroId: "16-wash",
    quantizeBpm: 62,
    mood: "Calm",
    tags: ["JI", "wash", "aurora", "meditative"],
    difficulty: "Intro",
    practiceTip:
      "Aurora JI: move the cursor slowly through pure ratios; crystal bowl and 16-wash support a reflective pre-dawn session.",
  },
  {
    id: "ji_daybreak_wash",
    label: "JI · Daybreak Wash",
    description:
      "Just Intonation grid with warm pad and a soft 16tel wash — daybreak tempo; pure ratios and gentle swells as the horizon brightens.",
    gridTuning: "ji",
    dronePreset: "warm_pad",
    particlePreset: "crystal_bowl",
    quantizeMacroId: "16-wash",
    quantizeBpm: 60,
    mood: "Calm",
    tags: ["JI", "wash", "daybreak", "meditative"],
    difficulty: "Intro",
    practiceTip:
      "Daybreak JI: move the cursor slowly through pure ratios; crystal bowl and 16-wash support a gentle transition into the day.",
  },
  {
    id: "ji_sunrise_wash",
    label: "JI · Sunrise Wash",
    description:
      "Just Intonation grid with warm pad and a soft 16tel wash — sunrise tempo; pure ratios and gentle swells as the day begins.",
    gridTuning: "ji",
    dronePreset: "warm_pad",
    particlePreset: "crystal_bowl",
    quantizeMacroId: "16-wash",
    quantizeBpm: 58,
    mood: "Calm",
    tags: ["JI", "wash", "sunrise", "meditative"],
    difficulty: "Intro",
    practiceTip:
      "Sunrise JI: move the cursor slowly through pure ratios; crystal bowl and 16-wash support a calm morning start.",
  },
  {
    id: "ji_midday_wash",
    label: "JI · Midday Wash",
    description:
      "Just Intonation grid with warm pad and a soft 16tel wash — midday tempo; pure ratios and gentle swells at the height of the day.",
    gridTuning: "ji",
    dronePreset: "warm_pad",
    particlePreset: "crystal_bowl",
    quantizeMacroId: "16-wash",
    quantizeBpm: 66,
    mood: "Calm",
    tags: ["JI", "wash", "midday", "meditative"],
    difficulty: "Intro",
    practiceTip:
      "Midday JI: move the cursor slowly through pure ratios; crystal bowl and 16-wash support a centered midday session.",
  },
  {
    id: "ji_golden_hour_wash",
    label: "JI · Golden Hour Wash",
    description:
      "Just Intonation grid with warm pad and a soft 16tel wash — golden hour tempo; pure ratios and gentle swells as the light softens.",
    gridTuning: "ji",
    dronePreset: "warm_pad",
    particlePreset: "crystal_bowl",
    quantizeMacroId: "16-wash",
    quantizeBpm: 64,
    mood: "Calm",
    tags: ["JI", "wash", "golden-hour", "meditative"],
    difficulty: "Intro",
    practiceTip:
      "Golden hour JI: move the cursor slowly through pure ratios; crystal bowl and 16-wash support a warm transition into evening.",
  },
  {
    id: "ji_blue_hour_wash",
    label: "JI · Blue Hour Wash",
    description:
      "Just Intonation grid with warm pad and a soft 16tel wash — blue hour tempo; pure ratios and gentle swells as day meets night.",
    gridTuning: "ji",
    dronePreset: "warm_pad",
    particlePreset: "crystal_bowl",
    quantizeMacroId: "16-wash",
    quantizeBpm: 60,
    mood: "Calm",
    tags: ["JI", "wash", "blue-hour", "meditative"],
    difficulty: "Intro",
    practiceTip:
      "Blue hour JI: move the cursor slowly through pure ratios; crystal bowl and 16-wash support a reflective transition into night.",
  },
  {
    id: "ji_silver_hour_wash",
    label: "JI · Silver Hour Wash",
    description:
      "Just Intonation grid with warm pad and a soft 16tel wash — silver hour tempo; pure ratios and gentle swells between day and night.",
    gridTuning: "ji",
    dronePreset: "warm_pad",
    particlePreset: "crystal_bowl",
    quantizeMacroId: "16-wash",
    quantizeBpm: 62,
    mood: "Calm",
    tags: ["JI", "wash", "silver-hour", "meditative"],
    difficulty: "Intro",
    practiceTip:
      "Silver hour JI: move the cursor slowly through pure ratios; crystal bowl and 16-wash support a calm transition.",
  },
];
