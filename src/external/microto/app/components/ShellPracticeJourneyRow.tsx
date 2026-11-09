/**
 * Shell row: active journey (prev/next), training flows, practice goals,
 * next-in-goal, and try-similar actions. Single responsibility: practice
 * and discovery navigation in the shell (vision §5 discoverability).
 * When onEnableAudio is provided, scene/goal actions enable audio first (zero-friction).
 */

import type { Room } from "../roomRegistry";
import type { WorldJourney } from "../../domain/worldGallery";
import type { PracticeGoal } from "../../domain/practiceGoals";
import type { TrainingFlow } from "../../domain/trainingFlows";
import type { ResonanceScene } from "../../features/resonance/config/scenes";
import type { HarmonicWorldExport } from "../../domain/harmonicWorld";
import type { JourneyProgress } from "../../features/harmonicWorldSpine";
import type { EnsureAudio } from "../../shared/audio/audioInit";
import type { LaunchContext } from "../../features/runtime/launch";
import {
  launchPracticeGoal,
  launchScene,
  launchTrainingFlow,
  launchRandomPracticeGoal,
  launchRandomTrainingFlow,
  launchJourneyStep,
} from "../../features/runtime/launch";

export type ShellPracticeJourneyRowProps = {
  activeJourney: WorldJourney | null;
  activeJourneyProgress: JourneyProgress | null;
  /** Training flows that include the current world/scene. */
  trainingFlowsForWorld: TrainingFlow[];
  practiceGoalsForScene: PracticeGoal[];
  nextInGoal: { goal: PracticeGoal; nextScene: ResonanceScene } | null;
  /** Optional: first practice goal for the current scene (for ladder label). */
  primaryPracticeGoal: PracticeGoal | null;
  similarScene: ResonanceScene | null;
  trySimilarLabel: string;
  /** Optional: Surprise similar — load random scene in same mood/tuning (vision §5; Ctrl+Shift+T). */
  onSurpriseSimilar?: () => void;
  surpriseSimilarLabel?: string;
  onImportWorld?: (data: HarmonicWorldExport) => void;
  onSelectResonanceScene?: (sceneId: ResonanceScene["id"]) => void;
  onSelectRoom: (room: Room) => void;
  /** Optional: current harmonic world id, for journey step navigation. */
  currentWorldId?: string | null;
  /** Optional: enable audio before scene/goal load (vision §5 zero-friction). */
  onEnableAudio?: EnsureAudio;
};

export function ShellPracticeJourneyRow({
  activeJourney,
  activeJourneyProgress,
  trainingFlowsForWorld,
  practiceGoalsForScene,
  nextInGoal,
  primaryPracticeGoal,
  similarScene,
  trySimilarLabel,
  onSurpriseSimilar,
  surpriseSimilarLabel,
  onImportWorld,
  onSelectResonanceScene,
  onSelectRoom,
  currentWorldId,
  onEnableAudio,
}: ShellPracticeJourneyRowProps) {
  const launchContext: LaunchContext = {
    initAudio: onEnableAudio ?? (async () => null),
    setRoom: onSelectRoom,
    onSelectResonanceScene,
    onImportWorld,
  };

  return (
    <>
      {activeJourney && (
        <div className="flex flex-wrap items-center gap-2 text-[9px] text-emerald-300/90 border-l border-emerald-500/40 pl-2">
          <span className="flex flex-wrap items-center gap-1">
            <span>
              Journey: {activeJourney.label} — {activeJourney.description}
            </span>
            {activeJourneyProgress && (
              <span className="rounded border border-emerald-500/60 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] text-emerald-100">
                Step {activeJourneyProgress.index + 1} of {activeJourneyProgress.total}
              </span>
            )}
          </span>
          {currentWorldId && (
            <span className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  void launchJourneyStep(activeJourney, currentWorldId, "prev", launchContext)
                }
                className="px-1.5 py-0.5 border border-emerald-700/80 bg-emerald-900/40 text-[9px] text-emerald-200 hover:border-emerald-500 hover:bg-emerald-800/60"
                title="Previous world in this journey"
              >
                ◀
              </button>
              <button
                type="button"
                onClick={() =>
                  void launchJourneyStep(activeJourney, currentWorldId, "next", launchContext)
                }
                className="px-1.5 py-0.5 border border-emerald-700/80 bg-emerald-900/40 text-[9px] text-emerald-200 hover:border-emerald-500 hover:bg-emerald-800/60"
                title="Next world in this journey"
              >
                ▶
              </button>
            </span>
          )}
        </div>
      )}
      {trainingFlowsForWorld.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[9px] text-sky-300/90 border-l border-sky-500/40 pl-2">
          <span className="text-[9px] uppercase tracking-widest text-sky-400">Training flows</span>
          {trainingFlowsForWorld.map((flow) => (
            <button
              key={flow.id}
              type="button"
              onClick={() => void launchTrainingFlow(flow.id, launchContext)}
              className="px-2 py-0.5 border border-sky-700 bg-sky-500/10 text-[9px] text-sky-100 hover:border-sky-400 hover:bg-sky-500/20"
              title={flow.description}
            >
              Start: {flow.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void launchRandomTrainingFlow(launchContext)}
            className="px-2 py-0.5 border border-sky-700 bg-sky-500/5 text-[9px] text-sky-100 hover:border-sky-400 hover:bg-sky-500/15"
            title="Surprise me with a training flow"
          >
            Surprise flow
          </button>
        </div>
      )}
      {practiceGoalsForScene.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[9px] text-amber-300/90 border-l border-amber-500/40 pl-2">
          <span className="text-[9px] uppercase tracking-widest text-amber-400">Practice goals</span>
          {practiceGoalsForScene.map((goal) => (
            <button
              key={goal.id}
              type="button"
              onClick={() => void launchPracticeGoal(goal.id, launchContext)}
              className="px-2 py-0.5 border border-amber-700 bg-amber-500/10 text-[9px] text-amber-100 hover:border-amber-400 hover:bg-amber-500/20"
              title={goal.description}
            >
              {goal.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void launchRandomPracticeGoal(launchContext)}
            className="px-2 py-0.5 border border-amber-700 bg-amber-500/5 text-[9px] text-amber-100 hover:border-amber-400 hover:bg-amber-500/15"
            title="Surprise me with a practice goal"
          >
            Surprise goal
          </button>
        </div>
      )}
      {nextInGoal && onSelectResonanceScene && (
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[9px] border-l border-emerald-500/40 pl-2">
          <button
            type="button"
            onClick={() => void launchScene(nextInGoal.nextScene.id, launchContext)}
            className="px-2 py-0.5 border border-emerald-700 bg-emerald-500/15 text-emerald-100 hover:border-emerald-400 hover:bg-emerald-500/25 transition-colors"
            title={`Next scene in ${nextInGoal.goal.label}: ${nextInGoal.nextScene.description}`}
          >
            Next in {nextInGoal.goal.label}: {nextInGoal.nextScene.label}
          </button>
          {primaryPracticeGoal && (
            <span className="text-[9px] text-emerald-300/90">
              Ladder: {primaryPracticeGoal.label}
            </span>
          )}
        </div>
      )}
      {(similarScene || onSurpriseSimilar) && (onSelectResonanceScene || onSurpriseSimilar) && (
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[9px] border-l border-violet-500/40 pl-2">
          {similarScene && onSelectResonanceScene && (
            <button
              type="button"
              onClick={() => void launchScene(similarScene.id, launchContext)}
              className="px-2 py-0.5 border border-violet-700 bg-violet-500/15 text-violet-100 hover:border-violet-400 hover:bg-violet-500/25 transition-colors"
              title={`Similar scene (same mood or tuning): ${similarScene.description}`}
            >
              {trySimilarLabel}: {similarScene.label}
            </button>
          )}
          {onSurpriseSimilar && surpriseSimilarLabel && (
            <button
              type="button"
              onClick={onSurpriseSimilar}
              className="px-2 py-0.5 border border-amber-700 bg-amber-500/15 text-amber-100 hover:border-amber-400 hover:bg-amber-500/25 transition-colors"
              title="Load a random scene in the same mood or tuning family (Ctrl+Shift+T)"
            >
              {surpriseSimilarLabel}
            </button>
          )}
        </div>
      )}
    </>
  );
}
