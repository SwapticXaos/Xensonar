/**
 * Shell HUD: "Explore by tag" quick-start row — one click loads a random scene with that tag.
 * Vision §3 exploratory content; §5 discoverability; extends catalog without new backend.
 */

import type { ResonanceSceneId } from "../../features/resonance/config/scenes";
import {
  filterScenes,
  getTagsWithSceneCount,
  pickRandomScene,
} from "../../features/resonance/config/sceneCatalog";
import { RESONANCE_SCENES } from "../../features/resonance/config/scenes";
import { WELCOME_EXPLORE_BY_TAG_LABEL } from "../copy";
import type { EnsureAudio } from "../../shared/audio/audioInit";

export type ExploreByTagStripProps = {
  onSelectResonanceScene?: (sceneId: ResonanceSceneId) => void;
  /** Optional: enable audio before loading (vision §5 zero-friction). */
  onEnableAudio?: EnsureAudio;
  /** Optional: highlight the tag of the current scene (e.g. when current scene has this tag). */
  currentSceneTag?: string | null;
  /** Max number of tag pills to show (default 6). */
  maxTags?: number;
};

export function ExploreByTagStrip({
  onSelectResonanceScene,
  onEnableAudio,
  currentSceneTag,
  maxTags = 6,
}: ExploreByTagStripProps) {
  if (!onSelectResonanceScene) return null;

  const tagsWithCount = getTagsWithSceneCount().slice(0, maxTags);
  if (tagsWithCount.length === 0) return null;

  const runSelect = (sceneId: ResonanceSceneId) => {
    if (onEnableAudio) {
      void onEnableAudio().then(() => onSelectResonanceScene(sceneId));
    } else {
      onSelectResonanceScene(sceneId);
    }
  };

  const handleTagClick = (tag: string) => {
    const candidates = filterScenes({ tag });
    const pool = candidates.length > 0 ? candidates : [...RESONANCE_SCENES];
    const picked = pickRandomScene(pool);
    if (picked) runSelect(picked.id);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-widest text-neutral-500 shrink-0">
        {WELCOME_EXPLORE_BY_TAG_LABEL}
      </span>
      {tagsWithCount.map(({ tag, count }) => (
        <button
          key={tag}
          type="button"
          onClick={() => handleTagClick(tag)}
          className={`px-2 py-0.5 border text-[10px] tracking-wide transition-colors ${
            currentSceneTag === tag
              ? "border-violet-400/80 text-violet-200 bg-violet-500/10"
              : "border-neutral-700 text-neutral-300 hover:border-violet-500/60 hover:bg-violet-500/10 hover:text-violet-200"
          }`}
          title={`Load a random scene tagged "${tag}" (${count} available)`}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
