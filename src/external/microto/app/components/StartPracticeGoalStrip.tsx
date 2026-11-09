/**
 * Shell HUD: "Start a goal" quick-start row — one click loads the first scene of a practice goal.
 * Vision §3 training flows; §5 discoverability; extends practice goals without new backend.
 */
import type { ResonanceSceneId } from "../../features/resonance/config/scenes";
import type { HarmonicWorldExport } from "../../domain/harmonicWorld";
import { getPracticeGoals, type PracticeGoalId } from "../../domain/practiceGoals";
import type { Room } from "../roomRegistry";
import { SHELL_START_A_GOAL_LABEL, SHELL_SURPRISE_GOAL_LABEL } from "../copy";
import type { EnsureAudio } from "../../shared/audio/audioInit";
import type { LaunchContext } from "../../features/runtime/launch";
import { launchPracticeGoal, launchRandomPracticeGoal } from "../../features/runtime/launch";

export type StartPracticeGoalStripProps = {
  onSelectResonanceScene?: (sceneId: ResonanceSceneId) => void;
  onSelectRoom: (room: Room) => void;
  /** When provided, prefer loading the goal's gallery world (if any) for richer preset. */
  onImportWorld?: (data: HarmonicWorldExport) => void;
  /** Optional: enable audio before loading (vision §5 zero-friction). */
  onEnableAudio?: EnsureAudio;
};

export function StartPracticeGoalStrip({
  onSelectResonanceScene,
  onSelectRoom,
  onImportWorld,
  onEnableAudio,
}: StartPracticeGoalStripProps) {
  if (!onSelectResonanceScene) return null;

  const goals = getPracticeGoals();
  if (goals.length === 0) return null;

  const launchContext: LaunchContext = {
    initAudio: onEnableAudio ?? (async () => null),
    setRoom: onSelectRoom,
    onSelectResonanceScene,
    onImportWorld,
  };

  const handleSurpriseGoalClick = () => {
    void launchRandomPracticeGoal(launchContext);
  };

  const handleGoalClick = (goalId: PracticeGoalId) => {
    void launchPracticeGoal(goalId, launchContext);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-widest text-neutral-500 shrink-0">
        {SHELL_START_A_GOAL_LABEL}
      </span>
      {goals.map((goal) => (
        <button
          key={goal.id}
          type="button"
          onClick={() => handleGoalClick(goal.id)}
          className="px-2 py-0.5 border border-violet-700/80 text-violet-200 bg-violet-500/10 text-[10px] tracking-wide hover:border-violet-500 hover:bg-violet-500/20 transition-colors"
          title={goal.description}
        >
          {goal.label}
        </button>
      ))}
      <button
        type="button"
        onClick={handleSurpriseGoalClick}
        className="px-2 py-0.5 border border-purple-700/80 text-purple-200 bg-purple-500/10 text-[10px] tracking-wide hover:border-purple-500 hover:bg-purple-500/20 transition-colors"
        title="Let XENSONAR pick a practice goal for you"
      >
        {SHELL_SURPRISE_GOAL_LABEL}
      </button>
    </div>
  );
}
