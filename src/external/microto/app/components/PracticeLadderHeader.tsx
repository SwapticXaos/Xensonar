import type { PracticeGoal } from "../../domain/practiceGoals";
import type { ResonanceScene } from "../../features/resonance/config/scenes";
import type { LaunchContext } from "../../features/runtime/launch";
import { launchScene } from "../../features/runtime/launch";
import { harmonicWorldSpineApi } from "../../features/harmonicWorldSpineApi";

export type PracticeLadderEntry = {
  goal: PracticeGoal;
  nextScene: ResonanceScene;
};

type PracticeLadderHeaderProps = {
  lastPracticeScene: ResonanceScene | null;
  nextPracticeEntry: PracticeLadderEntry | null;
  launchContext: LaunchContext;
};

export function PracticeLadderHeader({
  lastPracticeScene,
  nextPracticeEntry,
  launchContext,
}: PracticeLadderHeaderProps) {
  if (!lastPracticeScene && !nextPracticeEntry) return null;

  const primaryGoal =
    lastPracticeScene != null
      ? harmonicWorldSpineApi.getPracticeGoalsForScene(lastPracticeScene.id)[0] ?? null
      : nextPracticeEntry?.goal ?? null;

  const ladderScenes =
    primaryGoal != null
      ? harmonicWorldSpineApi.getScenesForPracticeGoal(primaryGoal.id)
      : [];

  const currentIndex =
    primaryGoal != null && lastPracticeScene != null
      ? ladderScenes.findIndex((s) => s.id === lastPracticeScene.id)
      : -1;

  const total = ladderScenes.length;

  return (
    <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-neutral-400">
      {lastPracticeScene && (
        <button
          type="button"
          onClick={() => {
            void launchScene(lastPracticeScene.id, launchContext);
          }}
          className="mr-1 rounded border border-emerald-600/80 bg-emerald-500/5 px-2 py-0.5 text-[10px] text-emerald-100 hover:border-emerald-400 hover:bg-emerald-500/15 transition-colors"
          title={lastPracticeScene.description}
        >
          Continue practice: {lastPracticeScene.label}
        </button>
      )}
      {nextPracticeEntry && (
        <button
          type="button"
          onClick={() => {
            void launchScene(nextPracticeEntry.nextScene.id, launchContext);
          }}
          className="rounded border border-amber-600/80 bg-amber-500/5 px-2 py-0.5 text-[10px] text-amber-100 hover:border-amber-400 hover:bg-amber-500/15 transition-colors"
          title={`Next in ${nextPracticeEntry.goal.label}: ${nextPracticeEntry.nextScene.description}`}
        >
          Next in {nextPracticeEntry.goal.label}
          {currentIndex >= 0 && total > 0 ? ` · Step ${currentIndex + 1} of ${total}` : null}
        </button>
      )}
    </div>
  );
}

