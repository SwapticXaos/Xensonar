/**
 * Shell HUD: "Start by mood" quick-start row — one click loads a random scene for that mood.
 * Vision §5 discoverability; extends scene catalog without new backend (vision §1 §3).
 */

import type { ResonanceSceneId } from "../../features/resonance/config/scenes";
import {
  filterScenes,
  getMoodsWithSceneCount,
  pickRandomScene,
} from "../../features/resonance/config/sceneCatalog";
import { RESONANCE_SCENES } from "../../features/resonance/config/scenes";
import { SHELL_SURPRISE_ME_LABEL, WELCOME_START_BY_MOOD_LABEL } from "../copy";
import type { EnsureAudio } from "../../shared/audio/audioInit";

export type StartByMoodStripProps = {
  onSelectResonanceScene?: (sceneId: ResonanceSceneId) => void;
  /** Optional: enable audio before loading (vision §5 zero-friction). */
  onEnableAudio?: EnsureAudio;
  /** Optional: highlight the mood of the current scene. */
  currentSceneMood?: string | null;
};

export function StartByMoodStrip({
  onSelectResonanceScene,
  onEnableAudio,
  currentSceneMood,
}: StartByMoodStripProps) {
  if (!onSelectResonanceScene) return null;

  const moodsWithCount = getMoodsWithSceneCount();
  if (moodsWithCount.length === 0) return null;

  const runSelect = (sceneId: ResonanceSceneId) => {
    if (onEnableAudio) {
      void onEnableAudio().then(() => onSelectResonanceScene(sceneId));
    } else {
      onSelectResonanceScene(sceneId);
    }
  };

  const handleMoodClick = (mood: string) => {
    const candidates = filterScenes({ mood });
    const pool = candidates.length > 0 ? candidates : [...RESONANCE_SCENES];
    const picked = pickRandomScene(pool);
    if (picked) runSelect(picked.id);
  };

  const handleSurpriseMe = () => {
    const picked = pickRandomScene(RESONANCE_SCENES);
    if (picked) runSelect(picked.id);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-widest text-neutral-500 shrink-0">
        {WELCOME_START_BY_MOOD_LABEL}
      </span>
      <button
        type="button"
        onClick={handleSurpriseMe}
        className="px-2 py-0.5 border border-cyan-700/80 text-cyan-200 bg-cyan-500/10 text-[10px] tracking-wide hover:border-cyan-500 hover:bg-cyan-500/20 transition-colors"
        title="Load a random world from the full catalog"
      >
        {SHELL_SURPRISE_ME_LABEL}
      </button>
      {moodsWithCount.map(({ mood, count }) => (
        <button
          key={mood}
          type="button"
          onClick={() => handleMoodClick(mood)}
          className={`px-2 py-0.5 border text-[10px] tracking-wide transition-colors ${
            currentSceneMood === mood
              ? "border-amber-400/80 text-amber-200 bg-amber-500/10"
              : "border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:bg-neutral-900 hover:text-neutral-100"
          }`}
          title={`Load a random ${mood.toLowerCase()} world (${count} available)`}
        >
          {mood}
        </button>
      ))}
    </div>
  );
}
