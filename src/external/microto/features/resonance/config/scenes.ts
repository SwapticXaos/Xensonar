/**
 * Resonance scenes: single public API.
 * Data and types → scenesData.ts; helpers → sceneHelpers.ts.
 * All existing imports from "./scenes" or "../config/scenes" continue to work.
 */
export type {
  ResonanceSceneId,
  ResonanceSceneDifficulty,
  ResonanceScene,
} from "./scenesData";
export { RESONANCE_SCENES } from "./scenesData";
export {
  getSceneById,
  getSceneMacro,
  findResonanceSceneForState,
  buildResonanceScenePatch,
} from "./sceneHelpers";
