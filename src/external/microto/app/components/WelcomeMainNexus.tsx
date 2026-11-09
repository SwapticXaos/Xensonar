/**
 * Welcome view for MAIN/NEXUS: one-click CTA to enable audio and open Synth (vision: zero-friction playability).
 * Room list is data-driven from roomRegistry (single source of truth; vision §5 discoverability).
 * Handlers live in useWelcomeMainNexusHandlers (Branch C; LOC discipline).
 */

import { getRoomsWithPointerHints, getRoomRegistryEntry, type Room, TOP_NAV_ROOMS } from "../roomRegistry";
import {
  ENABLE_AUDIO_OPEN_SYNTH,
  LAST_ROOM_PREFIX,
  RESUME_IN_ROOM,
  WELCOME_POINTER_QUICKSTART,
  WELCOME_START_A_JOURNEY_LABEL,
  WELCOME_START_BY_MOOD_LABEL,
  WELCOME_EXPLORE_BY_TAG_LABEL,
  WELCOME_START_JOURNEY_BUTTON_TITLE,
  WELCOME_SURPRISE_ROOM_LABEL,
  WELCOME_SURPRISE_ROOM_TITLE,
  WELCOME_TOUR_LABEL,
  SHELL_ENTRY_SCENES_LABEL,
} from "../copy";
import type { EnsureAudio } from "../../shared/audio/audioInit";
import { RESONANCE_SCENES } from "../../features/resonance/config/scenes";
import { getTrainingScenes, pickRandomScene } from "../../features/resonance/config/sceneCatalog";
import { getPracticeGoals } from "../../domain/practiceGoals";
import type { HarmonicWorldExport } from "../../domain/harmonicWorld";
import type { ResonanceSceneId } from "../../features/resonance/config/scenes";
import { useWelcomeMainNexusHandlers } from "../useWelcomeMainNexusHandlers";
import { PracticeGoalsStrip } from "./PracticeGoalsStrip";
import { TrainingFlowsStrip } from "./TrainingFlowsStrip";

export type WelcomeMainNexusProps = {
  setRoom: (r: Room) => void;
  initAudio: EnsureAudio;
  onSelectResonanceScene?: (sceneId: ResonanceSceneId) => void;
  /** When provided, practice-goal buttons prefer curated gallery worlds for the goal (spine-driven). */
  onImportWorld?: (data: HarmonicWorldExport) => void;
};

export function WelcomeMainNexus({ setRoom, initAudio, onSelectResonanceScene, onImportWorld }: WelcomeMainNexusProps) {
  const {
    handleStart,
    handleStartScene,
    handleStartPracticeGoal,
    handleStartByMood,
    handleStartByTag,
    handleStartTrainingFlow,
    handleSurprisePracticeGoal,
    handleSurpriseTrainingFlow,
    handleResumeLastRoom,
    handleSurpriseRoom,
    handleStartJourney,
    startableJourneys,
    nextPracticeEntry,
    lastPracticeGoal,
    lastPracticeGoalScenes,
    lastRoom,
    moods,
    tagsWithCount,
    trainingFlows,
    entryScenesForNewPlayer,
  } = useWelcomeMainNexusHandlers({ setRoom, initAudio, onSelectResonanceScene, onImportWorld });

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 text-center">
      <h2 className="text-xl font-bold tracking-widest text-neutral-200 mb-2">XENSONAR</h2>
      <p className="text-neutral-400 text-sm mb-6 max-w-md">
        Microtonal synthesizer — cursor-driven pitch, harmonic systems, and playable rooms.
      </p>
      <button
        type="button"
        onClick={handleStart}
        className="mb-6 px-6 py-3 rounded bg-amber-500/25 border border-amber-400/50 text-amber-200 text-sm font-medium hover:bg-amber-500/35 transition-colors"
      >
        {ENABLE_AUDIO_OPEN_SYNTH}
      </button>
      {lastRoom && (
        <div className="mb-4 flex flex-wrap items-center justify-center gap-2 text-[11px]">
          <span className="text-neutral-500">
            {LAST_ROOM_PREFIX} <span className="text-neutral-300">{getRoomRegistryEntry(lastRoom).label}</span>
          </span>
          <button
            type="button"
            onClick={handleResumeLastRoom}
            className="px-3 py-1.5 rounded border border-emerald-600/60 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25 transition-colors"
          >
            {RESUME_IN_ROOM}
          </button>
        </div>
      )}
      <p className="text-neutral-500 text-xs mb-2">
        Or use the bar above to enable audio, then pick a room or browse harmonic worlds.
      </p>
      <p className="text-neutral-500 text-xs mb-3">
        Rooms are different playable spaces in the same instrument world.{" "}
        <span className="text-neutral-300">{WELCOME_TOUR_LABEL}</span>
      </p>
      <p className="text-neutral-500 text-[11px] mb-4 max-w-lg">
        {WELCOME_POINTER_QUICKSTART}
      </p>
      {onSelectResonanceScene && nextPracticeEntry && (
        <div className="mb-4 flex flex-col items-center gap-2">
          <p className="text-neutral-400 text-[11px] font-medium">Continue practice</p>
          <button
            type="button"
            onClick={() => handleStartScene(nextPracticeEntry.nextScene.id)}
            className="w-full max-w-xs text-left border border-emerald-700/80 bg-emerald-900/60 hover:border-emerald-400/80 hover:bg-emerald-500/25 transition-colors px-3 py-2 rounded"
            title="Jump to the next scene in your practice goals."
          >
            <div className="flex items-center justify-between gap-2 mb-0.5 flex-wrap">
              <span className="text-neutral-100 text-[11px] font-medium">
                {nextPracticeEntry.nextScene.label}
              </span>
              <span className="flex items-center gap-1.5">
                {nextPracticeEntry.nextScene.mood && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-400/40 uppercase tracking-wider">
                    {nextPracticeEntry.nextScene.mood}
                  </span>
                )}
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest">
                  {nextPracticeEntry.nextScene.gridTuning}
                </span>
              </span>
            </div>
            <p className="text-[10px] text-emerald-200/90 italic line-clamp-2">
              Next in&nbsp;
              <span className="font-semibold">{nextPracticeEntry.goal.label}</span>
              &nbsp;practice goal.
            </p>
          </button>
        </div>
      )}
      {onSelectResonanceScene && lastPracticeGoal && lastPracticeGoalScenes.length > 0 && (
        <div className="mb-4 flex flex-col items-center gap-1">
          <p className="text-neutral-400 text-[11px]">
            Review ladder for{" "}
            <span className="text-neutral-200 font-medium">{lastPracticeGoal.label}</span>
          </p>
          <div className="flex flex-wrap justify-center gap-2 max-w-xl">
            {lastPracticeGoalScenes.slice(0, 4).map((scene) => (
              <button
                key={scene.id}
                type="button"
                onClick={() => handleStartScene(scene.id)}
                className="px-3 py-1.5 rounded border border-emerald-700/70 bg-emerald-900/40 hover:border-emerald-400/80 hover:bg-emerald-500/20 transition-colors text-[10px] text-left"
                title={scene.practiceTip ?? scene.description}
              >
                <span className="text-neutral-100 block">{scene.label}</span>
                <span className="text-neutral-500 uppercase tracking-widest text-[9px]">
                  {scene.gridTuning}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="mt-2 mb-3 flex flex-wrap justify-center gap-2 text-[11px]">
        <button
          type="button"
          onClick={handleSurpriseRoom}
          title={WELCOME_SURPRISE_ROOM_TITLE}
          className="px-3 py-1.5 rounded border border-violet-600/70 bg-violet-900/40 text-violet-200 hover:border-violet-400 hover:bg-violet-500/20 hover:text-violet-100 transition-colors"
        >
          {WELCOME_SURPRISE_ROOM_LABEL}
        </button>
        <button
          type="button"
          onClick={() => setRoom("WORLDGALLERY")}
          className="px-3 py-1.5 rounded border border-neutral-700 bg-neutral-900/80 text-neutral-200 hover:border-amber-400 hover:bg-amber-500/10 hover:text-amber-100 transition-colors"
        >
          Open Harmonic World Gallery
        </button>
      </div>
      {startableJourneys.length > 0 && (
        <div className="mt-3 mb-2 flex flex-col items-center gap-2">
          <p className="text-neutral-400 text-[11px] font-medium">{WELCOME_START_A_JOURNEY_LABEL}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {startableJourneys.map((journey) => (
              <button
                key={journey.id}
                type="button"
                onClick={() => handleStartJourney(journey)}
                title={WELCOME_START_JOURNEY_BUTTON_TITLE}
                className="px-3 py-2 rounded border border-teal-700/80 bg-teal-900/50 text-teal-100 text-left hover:border-teal-400/80 hover:bg-teal-500/20 transition-colors max-w-[16rem]"
              >
                <span className="text-[11px] font-medium block">{journey.label}</span>
                {journey.description && (
                  <span className="text-[10px] text-teal-200/80 line-clamp-2 mt-0.5 block">
                    {journey.description}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
      {onSelectResonanceScene && (
        <div className="mt-3 mb-4 flex flex-col items-center gap-3">
          <div className="flex flex-col items-center gap-2">
            <p className="text-neutral-400 text-[11px] font-medium">Start a practice goal</p>
            <PracticeGoalsStrip
              goals={getPracticeGoals()}
              onGoalClick={(goal) => handleStartPracticeGoal(goal.id)}
            />
          </div>
          {trainingFlows.length > 0 && (
            <div className="flex flex-col items-center gap-1">
              <p className="text-neutral-400 text-[11px] font-medium">Explore a training flow</p>
              <TrainingFlowsStrip
                flows={trainingFlows}
                onFlowClick={(flow) => handleStartTrainingFlow(flow.id)}
                onSurpriseFlowClick={handleSurpriseTrainingFlow}
                className="flex flex-wrap items-center justify-center gap-1"
              />
            </div>
          )}
        </div>
      )}
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-neutral-400 text-[11px] max-w-3xl">
        {TOP_NAV_ROOMS.map((entry) => {
          const isContentRoom = entry.id !== "MAIN" && entry.id !== "NEXUS";
          const handleRoomClick = () => {
            if (isContentRoom) {
              void initAudio().then((ctx) => {
                if (ctx) setRoom(entry.id);
              });
            } else {
              setRoom(entry.id);
            }
          };
          return (
            <li key={entry.id} className="flex flex-col items-center">
              <button
                type="button"
                onClick={handleRoomClick}
                title={isContentRoom ? `Enable audio and go to ${entry.label}` : (entry.intentLabel ?? entry.label)}
                className="text-neutral-300 hover:text-amber-400/90 underline decoration-dotted"
              >
                {entry.label}
              </button>
              {entry.intentLabel && (
                <span className="mt-0.5 text-[10px] text-neutral-500">{entry.intentLabel}</span>
              )}
            </li>
          );
        })}
      </ul>
      {onSelectResonanceScene && (
        <div className="mt-6 max-w-3xl text-left text-[11px] text-neutral-400">
          {/* Spine-backed calm/intro entry lane: reuse the same entry-scenes policy as the shell HUD. */}
          {entryScenesForNewPlayer.length > 0 && (
            <div className="mb-4">
              <p className="text-neutral-300 font-medium mb-2">{SHELL_ENTRY_SCENES_LABEL}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {entryScenesForNewPlayer.map((scene) => (
                  <button
                    key={scene.id}
                    type="button"
                    onClick={() => handleStartScene(scene.id)}
                    className="text-left border border-emerald-700/70 bg-emerald-900/40 hover:border-emerald-400/80 hover:bg-emerald-500/15 transition-colors px-3 py-2 rounded"
                  >
                    <div className="flex items-center justify-between gap-2 mb-0.5 flex-wrap">
                      <span className="text-neutral-100">{scene.label}</span>
                      <span className="flex items-center gap-1.5">
                        {scene.mood && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-400/40 uppercase tracking-wider">
                            {scene.mood}
                          </span>
                        )}
                        <span className="text-[10px] text-neutral-500 uppercase tracking-widest">
                          {scene.gridTuning}
                        </span>
                      </span>
                    </div>
                    {scene.practiceTip && (
                      <p className="text-[10px] text-emerald-200/90 italic mb-0.5 line-clamp-2">
                        {scene.practiceTip}
                      </p>
                    )}
                    {!scene.practiceTip && (
                      <p className="text-[10px] text-neutral-400">
                        Gentle starting orbit tagged for calm, Intro-level exploration.
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Beginner-friendly entry lane: surface a small curated set of Intro scenes first, using the same
              spine-backed entry policy as the shell HUD (entryScenesForNewPlayer). */}
          {entryScenesForNewPlayer.length > 0 && (
            <div className="mb-4">
              <p className="text-neutral-300 font-medium mb-2">Start here — Intro worlds</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {entryScenesForNewPlayer.slice(0, 3).map((scene) => (
                    <button
                      key={scene.id}
                      type="button"
                      onClick={() => handleStartScene(scene.id)}
                      className="text-left border border-emerald-700/70 bg-emerald-900/40 hover:border-emerald-400/80 hover:bg-emerald-500/15 transition-colors px-3 py-2 rounded"
                    >
                      <div className="flex items-center justify-between gap-2 mb-0.5 flex-wrap">
                        <span className="text-neutral-100">{scene.label}</span>
                        <span className="flex items-center gap-1.5">
                          {scene.mood && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-400/40 uppercase tracking-wider">
                              {scene.mood}
                            </span>
                          )}
                          <span className="text-[10px] text-neutral-500 uppercase tracking-widest">
                            {scene.gridTuning}
                          </span>
                        </span>
                      </div>
                      {scene.practiceTip && (
                        <p className="text-[10px] text-emerald-200/90 italic mb-0.5 line-clamp-2">
                          {scene.practiceTip}
                        </p>
                      )}
                      {!scene.practiceTip && (
                        <p className="text-[10px] text-neutral-400">
                          Gentle starting orbit tagged as Intro difficulty.
                        </p>
                      )}
                    </button>
                  ))}
              </div>
            </div>
          )}
          {/* Training lane: curated training worlds for motion/tuning practice. */}
          {getTrainingScenes(3).length > 0 && (
            <div className="mb-4">
              <p className="text-neutral-300 font-medium mb-2">Train here — Practice worlds</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {getTrainingScenes(3).map((scene) => (
                  <button
                    key={scene.id}
                    type="button"
                    onClick={() => handleStartScene(scene.id)}
                    className="text-left border border-sky-700/70 bg-sky-900/40 hover:border-sky-400/80 hover:bg-sky-500/15 transition-colors px-3 py-2 rounded"
                  >
                    <div className="flex items-center justify-between gap-2 mb-0.5 flex-wrap">
                      <span className="text-neutral-100">{scene.label}</span>
                      <span className="flex items-center gap-1.5">
                        {scene.mood && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-100 border border-sky-400/40 uppercase tracking-wider">
                            {scene.mood}
                          </span>
                        )}
                        <span className="text-[10px] text-neutral-500 uppercase tracking-widest">
                          {scene.gridTuning}
                        </span>
                      </span>
                    </div>
                    {scene.practiceTip && (
                      <p className="text-[10px] text-sky-100/90 italic mb-0.5 line-clamp-2">
                        {scene.practiceTip}
                      </p>
                    )}
                    {!scene.practiceTip && (
                      <p className="text-[10px] text-neutral-400">
                        Curated training orbit tuned for clear practice and motion rooms.
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Practice goals lane: high-level goals that map to curated scene sets. */}
          {getPracticeGoals().length > 0 && (
            <div className="mb-4">
              <p className="text-neutral-300 font-medium mb-2">Practice goals</p>
              <div className="flex flex-wrap gap-2">
                {getPracticeGoals().map((goal) => (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => handleStartPracticeGoal(goal.id)}
                    className="px-3 py-1.5 rounded border border-purple-700/70 bg-purple-900/40 hover:border-purple-400/80 hover:bg-purple-500/20 hover:text-purple-50 transition-colors text-[10px] text-neutral-100"
                    title={goal.description}
                  >
                    {goal.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleSurprisePracticeGoal}
                  className="px-3 py-1.5 rounded border border-purple-700/70 bg-purple-900/20 hover:border-purple-400/80 hover:bg-purple-500/25 hover:text-purple-50 transition-colors text-[10px] text-neutral-100"
                  title="Let XENSONAR pick a practice goal for you"
                >
                  Surprise goal
                </button>
              </div>
            </div>
          )}
          {trainingFlows.length > 0 && (
            <div className="mb-4">
              <p className="text-neutral-300 font-medium mb-2">Training flows</p>
              <div className="flex flex-wrap gap-2">
                {trainingFlows.map((flow) => (
                  <button
                    key={flow.id}
                    type="button"
                    onClick={() => handleStartTrainingFlow(flow.id)}
                    className="px-3 py-2 rounded border border-sky-700/70 bg-sky-900/40 hover:border-sky-400/80 hover:bg-sky-500/20 hover:text-sky-50 transition-colors text-left max-w-[18rem]"
                    title={flow.description}
                  >
                    <span className="text-[11px] font-medium text-neutral-50 block">{flow.label}</span>
                    <span className="text-[10px] text-sky-100/85 line-clamp-2 mt-0.5 block">
                      {flow.description}
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleSurpriseTrainingFlow}
                  className="px-3 py-1.5 rounded border border-sky-700/70 bg-sky-900/20 hover:border-sky-400/80 hover:bg-sky-500/25 hover:text-sky-50 transition-colors text-[10px]"
                  title="Let XENSONAR pick a training flow for you"
                >
                  Surprise flow
                </button>
              </div>
            </div>
          )}
          {moods.length > 0 && (
            <div className="mb-3">
              <p className="text-neutral-300 font-medium mb-2">{WELCOME_START_BY_MOOD_LABEL}</p>
              <div className="flex flex-wrap gap-2">
                {moods.map((mood) => (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => handleStartByMood(mood)}
                    className="px-3 py-1.5 rounded border border-neutral-600 bg-neutral-800/60 text-neutral-200 hover:border-amber-400/70 hover:bg-amber-500/15 hover:text-amber-100 transition-colors text-[10px] uppercase tracking-wider"
                    title={`Start in a random world with "${mood}" mood`}
                  >
                    {mood}
                  </button>
                ))}
              </div>
            </div>
          )}
          {tagsWithCount.length > 0 && (
            <div className="mb-3">
              <p className="text-neutral-300 font-medium mb-2">{WELCOME_EXPLORE_BY_TAG_LABEL}</p>
              <div className="flex flex-wrap gap-2">
                {tagsWithCount.slice(0, 8).map(({ tag, count }) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleStartByTag(tag)}
                    className="px-3 py-1.5 rounded border border-neutral-600 bg-neutral-800/60 text-neutral-200 hover:border-violet-400/70 hover:bg-violet-500/15 hover:text-violet-100 transition-colors text-[10px]"
                    title={`Start in a random scene tagged "${tag}" (${count} available)`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-neutral-300 font-medium">Harmonic worlds — quick start scenes</p>
            <button
              type="button"
              onClick={() => {
                const next = pickRandomScene(RESONANCE_SCENES);
                if (!next) return;
                handleStartScene(next.id);
              }}
              className="px-2 py-1 border border-neutral-700 text-[10px] rounded hover:border-amber-400 hover:text-amber-200 transition-colors"
              title="Pick a random harmonic world and start directly in the synth."
            >
              Surprise world
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {RESONANCE_SCENES.map((scene) => (
              <button
                key={scene.id}
                type="button"
                onClick={() => handleStartScene(scene.id)}
                className="text-left border border-neutral-700/80 bg-black/40 hover:border-amber-400/70 hover:bg-amber-500/10 transition-colors px-3 py-2 rounded"
              >
                <div className="flex items-center justify-between gap-2 mb-0.5 flex-wrap">
                  <span className="text-neutral-100">{scene.label}</span>
                  <span className="flex items-center gap-1.5">
                    {scene.mood && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-400/40 uppercase tracking-wider">
                        {scene.mood}
                      </span>
                    )}
                    <span className="text-[10px] text-neutral-500 uppercase tracking-widest">
                      {scene.gridTuning}
                    </span>
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400">{scene.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="mt-6 max-w-3xl text-left text-[11px] text-neutral-400">
        <p className="mb-2 text-neutral-300 font-medium">Room map — pointer-first ideas</p>
        <ul className="grid gap-y-1 gap-x-6 sm:grid-cols-2">
          {getRoomsWithPointerHints().map((entry) => (
            <li key={entry.id} className="mb-0.5">
              <span className="text-neutral-200 font-semibold">{entry.label}:</span>{" "}
              <span>{entry.pointerHint}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
