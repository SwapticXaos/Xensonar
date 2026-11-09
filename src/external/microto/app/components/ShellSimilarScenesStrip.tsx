/**
 * Shell row: "Similar scenes" — clickable chips for scenes in the same mood/tuning family (vision §5 discoverability).
 * Uses getSimilarScenes (by mood + tuning). Complements "Surprise similar" (random one) with deterministic suggestions.
 * Zero-friction: optional onEnableAudio before selecting (same as Surprise me / Suggested next).
 */

import type { ResonanceScene, ResonanceSceneId } from "../../features/resonance/config/scenes";
import type { Room } from "../roomRegistry";
import type { EnsureAudio } from "../../shared/audio/audioInit";
import { SHELL_SIMILAR_SCENES_LABEL } from "../copy";

export type ShellSimilarScenesStripProps = {
  /** Up to 4 similar scenes (same mood/tuning); exclude current from caller. */
  scenes: ResonanceScene[];
  onSelectResonanceScene?: (sceneId: ResonanceSceneId) => void;
  onSelectRoom: (room: Room) => void;
  /** Optional: enable audio before loading (vision §5 zero-friction). */
  onEnableAudio?: EnsureAudio;
};

export function ShellSimilarScenesStrip({
  scenes,
  onSelectResonanceScene,
  onSelectRoom,
  onEnableAudio,
}: ShellSimilarScenesStripProps) {
  if (scenes.length === 0 || !onSelectResonanceScene) return null;

  const handleSelect = (sceneId: ResonanceSceneId) => {
    if (onEnableAudio) {
      void onEnableAudio().then(() => {
        onSelectResonanceScene(sceneId);
        onSelectRoom("RESONANCE");
      });
    } else {
      onSelectResonanceScene(sceneId);
      onSelectRoom("RESONANCE");
    }
  };

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5">
      <span className="text-[9px] text-amber-600/90 uppercase tracking-widest mr-1 font-medium">
        {SHELL_SIMILAR_SCENES_LABEL}
      </span>
      {scenes.map((scene) => (
        <button
          key={scene.id}
          type="button"
          onClick={() => handleSelect(scene.id)}
          className="px-2 py-0.5 border border-amber-700/70 text-[10px] text-amber-200/95 hover:border-amber-500 hover:bg-amber-500/20 transition-colors rounded"
          title={scene.description ? `${scene.label} — ${scene.description}` : scene.label}
        >
          {scene.label}
        </button>
      ))}
    </div>
  );
}
