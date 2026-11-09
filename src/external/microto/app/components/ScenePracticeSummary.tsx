import type { FC } from "react";
import {
  RESONANCE_SCENES,
  type ResonanceSceneId,
  type ResonanceSceneDifficulty,
} from "../../features/resonance/config/scenes";

type ScenePracticeSummaryProps = {
  /** Optional active Resonance scene identifier. When absent or unknown, nothing is rendered. */
  sceneId?: ResonanceSceneId;
  /** Optional scene position in catalog (e.g. "12/69") for next/prev discoverability (vision §5). */
  scenePosition?: string;
  className?: string;
};

function renderDifficultyLabel(difficulty: ResonanceSceneDifficulty): string {
  switch (difficulty) {
    case "Intro":
      return "Intro";
    case "Intermediate":
      return "Intermediate";
    case "Advanced":
      return "Advanced";
    default:
      return difficulty;
  }
}

/**
 * Compact scene-aware guidance block for the shell HUD.
 *
 * Surfaces:
 * - Scene label + mood badge
 * - Optional tags
 * - One-line practice tip
 *
 * This keeps scene-level guidance reusable between the shell HUD and
 * future room surfaces without each caller having to re-implement lookups.
 */
export const ScenePracticeSummary: FC<ScenePracticeSummaryProps> = ({
  sceneId,
  scenePosition,
  className = "",
}) => {
  if (!sceneId) return null;
  const scene = RESONANCE_SCENES.find((s) => s.id === sceneId);
  if (!scene) return null;

  const { label, mood, tags, practiceTip, difficulty } = scene;
  if (!practiceTip && !mood && !difficulty && (!tags || tags.length === 0) && !scenePosition) {
    return null;
  }

  return (
    <div
      className={`flex flex-wrap items-baseline gap-1.5 text-[9px] text-neutral-300 ${className}`}
      title="Scene guidance · mood, tags, and practice tip"
    >
      <span className="uppercase tracking-widest text-neutral-500">Scene</span>
      {scenePosition && (
        <span className="tabular-nums text-neutral-400" title="Position in catalog (Ctrl+Shift+↑/↓ to change)">
          {scenePosition}
        </span>
      )}
      <span className="text-neutral-100">{label}</span>
      {difficulty && (
        <span className="rounded border border-emerald-400/70 bg-emerald-500/15 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-emerald-100">
          {renderDifficultyLabel(difficulty)}
        </span>
      )}
      {mood && (
        <span className="rounded border border-violet-400/60 bg-violet-500/15 px-1.5 py-0.5 text-[9px] text-violet-100">
          {mood}
        </span>
      )}
      {tags && tags.length > 0 && (
        <span className="flex flex-wrap gap-1">
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded border border-violet-500/40 bg-violet-500/10 px-1 py-0.5 text-[9px] text-violet-100"
            >
              {tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="text-[9px] text-neutral-500">+{tags.length - 3}</span>
          )}
        </span>
      )}
      {practiceTip && (
        <span className="border-l-2 border-violet-500/50 pl-2 text-[9px] text-violet-200/90 italic">
          Tip: {practiceTip}
        </span>
      )}
    </div>
  );
};

