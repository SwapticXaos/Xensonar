import type { PracticeGoal } from "../../domain/practiceGoals";

type PracticeGoalsStripProps = {
  goals: readonly PracticeGoal[];
  /**
   * Called when the user selects a practice goal.
   * The caller decides whether to start from a curated world
   * or from the first matching scene.
   */
  onGoalClick: (goal: PracticeGoal) => void;
  className?: string;
};

export function PracticeGoalsStrip({ goals, onGoalClick, className }: PracticeGoalsStripProps) {
  if (goals.length === 0) return null;

  return (
    <div className={className ?? "hidden md:flex items-center gap-1"}>
      <span className="text-[10px] uppercase tracking-widest text-neutral-600 mr-1">Practice goals</span>
      {goals.map((goal) => (
        <button
          key={goal.id}
          type="button"
          onClick={() => onGoalClick(goal)}
          className="rounded border border-purple-700 px-2 py-1 text-[10px] text-purple-100 hover:border-purple-400 hover:bg-purple-500/15 transition-colors"
          title={goal.description}
        >
          {goal.label}
        </button>
      ))}
    </div>
  );
}

