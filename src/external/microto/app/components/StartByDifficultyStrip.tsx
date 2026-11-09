/**
 * Shell HUD: "Start by level" quick-start row — one click loads a random scene at that difficulty.
 * Vision §5 discoverability; §3 practice-oriented flows; extends scene catalog without new backend.
 */

import type { ResonanceSceneId, ResonanceSceneDifficulty } from "../../features/resonance/config/scenes";
import {
  filterScenes,
  getDifficultiesWithSceneCount,
  pickRandomScene,
} from "../../features/resonance/config/sceneCatalog";
import { RESONANCE_SCENES } from "../../features/resonance/config/scenes";
import { getSceneById } from "../../features/harmonicWorldSpine";
import { WELCOME_START_BY_DIFFICULTY_LABEL } from "../copy";
import type { EnsureAudio } from "../../shared/audio/audioInit";

export type StartByDifficultyStripProps = {
  onSelectResonanceScene?: (sceneId: ResonanceSceneId) => void;
  /** Optional: enable audio before loading (vision §5 zero-friction). */
  onEnableAudio?: EnsureAudio;
  /** Optional: highlight the difficulty of the current scene. */
  currentSceneId?: ResonanceSceneId | null;
};

export function StartByDifficultyStrip({
  onSelectResonanceScene,
  onEnableAudio,
  currentSceneId,
}: StartByDifficultyStripProps) {
  if (!onSelectResonanceScene) return null;

  const difficultiesWithCount = getDifficultiesWithSceneCount();
  if (difficultiesWithCount.length === 0) return null;

  const currentScene = currentSceneId ? getSceneById(currentSceneId) : null;
  const currentDifficulty = currentScene?.difficulty ?? null;

  const handleDifficultyClick = (difficulty: ResonanceSceneDifficulty) => {
    const candidates = filterScenes({ difficulty });
    const pool = candidates.length > 0 ? candidates : [...RESONANCE_SCENES];
    const picked = pickRandomScene(pool);
    if (!picked) return;
    if (onEnableAudio) {
      void onEnableAudio().then(() => onSelectResonanceScene(picked.id));
    } else {
      onSelectResonanceScene(picked.id);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-widest text-neutral-500 shrink-0">
        {WELCOME_START_BY_DIFFICULTY_LABEL}
      </span>
      {difficultiesWithCount.map(({ difficulty, count }) => (
        <button
          key={difficulty}
          type="button"
          onClick={() => handleDifficultyClick(difficulty)}
          className={`px-2 py-0.5 border text-[10px] tracking-wide transition-colors ${
            currentDifficulty === difficulty
              ? "border-emerald-400/80 text-emerald-200 bg-emerald-500/10"
              : "border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:bg-neutral-900 hover:text-neutral-100"
          }`}
          title={`Load a random ${difficulty.toLowerCase()} scene (${count} available)`}
        >
          {difficulty}
          {count > 0 && (
            <span className="ml-1 text-[9px] opacity-80 tabular-nums">({count})</span>
          )}
        </button>
      ))}
    </div>
  );
}
