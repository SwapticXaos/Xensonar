/**
 * Shell row: "Suggested next" — 2–3 one-click chips to load a suggested next world (vision §5 discoverability).
 * Uses getSuggestedNextScenes (next in goal, next in training flow, similar scene).
 * When onEnableAudio is provided, calls it before selecting (zero-friction like Surprise me / Next-in-goal shortcut).
 */

import type { ResonanceSceneId } from "../../features/resonance/config/scenes";
import type { Room } from "../roomRegistry";
import type { SuggestedNextEntry } from "../../features/harmonicWorldSpine";
import type { EnsureAudio } from "../../shared/audio/audioInit";

export type ShellSuggestedNextRowProps = {
  suggested: SuggestedNextEntry[];
  onSelectResonanceScene?: (sceneId: ResonanceSceneId) => void;
  onSelectRoom: (room: Room) => void;
  label: string;
  /** Optional: enable audio before loading (vision §5 zero-friction). */
  onEnableAudio?: EnsureAudio;
};

export function ShellSuggestedNextRow({
  suggested,
  onSelectResonanceScene,
  onSelectRoom,
  label,
  onEnableAudio,
}: ShellSuggestedNextRowProps) {
  if (suggested.length === 0 || !onSelectResonanceScene) return null;

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
    <div className="mt-1 flex flex-wrap items-center gap-1">
      <span className="text-[9px] text-neutral-500 uppercase tracking-widest mr-1">
        {label}
      </span>
      {suggested.map((entry) => (
        <button
          key={entry.id}
          type="button"
          onClick={() => handleSelect(entry.id)}
          className="px-2 py-0.5 border border-violet-700/80 text-[10px] text-violet-200 hover:border-violet-500 hover:bg-violet-500/15 transition-colors rounded"
          title={entry.hint ? `${entry.label} (${entry.hint})` : entry.label}
        >
          {entry.label}
        </button>
      ))}
    </div>
  );
}
