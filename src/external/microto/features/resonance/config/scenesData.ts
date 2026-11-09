/**
 * Resonance scene catalog: RESONANCE_SCENES array only.
 * Split into part1/part2a/part2b/part2c/part2d for LOC discipline (STRUCTURE); types in scenesDataTypes.ts; helpers in sceneHelpers.ts.
 */
import type { ResonanceScene } from "./scenesDataTypes";
import { RESONANCE_SCENES_PART1 } from "./scenesDataPart1";
import { RESONANCE_SCENES_PART2A } from "./scenesDataPart2a";
import { RESONANCE_SCENES_PART2B } from "./scenesDataPart2b";
import { RESONANCE_SCENES_PART2C } from "./scenesDataPart2c";
import { RESONANCE_SCENES_PART2D } from "./scenesDataPart2d";

export type { ResonanceSceneId, ResonanceSceneDifficulty, ResonanceScene } from "./scenesDataTypes";

export const RESONANCE_SCENES: ResonanceScene[] = [
  ...RESONANCE_SCENES_PART1,
  ...RESONANCE_SCENES_PART2A,
  ...RESONANCE_SCENES_PART2B,
  ...RESONANCE_SCENES_PART2C,
  ...RESONANCE_SCENES_PART2D,
];
