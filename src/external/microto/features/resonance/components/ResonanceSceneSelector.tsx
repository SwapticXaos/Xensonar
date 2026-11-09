import { type FC, useMemo, useState } from "react";

import type { ResonanceState } from "../config/state";
import type { DronePreset } from "../config/types";
import {
  RESONANCE_SCENES,
  findResonanceSceneForState,
  buildResonanceScenePatch,
  type ResonanceScene,
  type ResonanceSceneDifficulty,
} from "../config/scenes";
import {
  filterScenes,
  getIntroScenes,
  getSceneDifficulties,
  getMoodsWithSceneCount,
  getSceneTags,
  getTrainingScenes,
  pickRandomScene,
} from "../config/sceneCatalog";
import { getTrainingFlowsForScene } from "../../../domain/trainingFlows";

type ResonanceSceneSelectorProps = {
  nParamsUI: ResonanceState;
  updateNParams: (partial: Partial<ResonanceState>) => void;
  setDronePreset: (preset: DronePreset) => void;
};

export const ResonanceSceneSelector: FC<ResonanceSceneSelectorProps> = ({ nParamsUI, updateNParams, setDronePreset }) => {
  const activeScene = findResonanceSceneForState(nParamsUI);

  const [moodFilter, setMoodFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<ResonanceSceneDifficulty | null>(null);

  const availableMoods = useMemo(() => getMoodsWithSceneCount().map((m) => m.mood), []);

  const availableTags = useMemo(() => getSceneTags(), []);

  const activeTrainingFlows = useMemo(
    () => (activeScene ? getTrainingFlowsForScene(activeScene.id) : []),
    [activeScene],
  );

  const filteredScenes = useMemo(
    () => filterScenes({ mood: moodFilter, tag: tagFilter, difficulty: difficultyFilter }),
    [moodFilter, tagFilter, difficultyFilter],
  );

  const handleApplyScene = (sceneId: ResonanceScene["id"]) => {
    const scene = RESONANCE_SCENES.find((s) => s.id === sceneId);
    if (!scene) return;

    const patch = buildResonanceScenePatch(scene, nParamsUI);

    updateNParams(patch);
    setDronePreset(scene.dronePreset);
  };

  const handleSurpriseScene = () => {
    const scenesForCurrentTuning = RESONANCE_SCENES.filter(
      (scene) => scene.gridTuning === nParamsUI.gridTuning,
    );
    const pool = scenesForCurrentTuning.length > 0 ? scenesForCurrentTuning : RESONANCE_SCENES;
    const next = pickRandomScene(pool);
    if (!next) return;
    handleApplyScene(next.id);
  };

  const handleSurpriseIntroScene = () => {
    const intros = getIntroScenes();
    const pool = intros.length > 0 ? intros : RESONANCE_SCENES;
    const next = pickRandomScene(pool);
    if (!next) return;
    handleApplyScene(next.id);
  };

  const handleSurpriseTrainingScene = () => {
    const training = getTrainingScenes();
    const pool = training.length > 0 ? training : RESONANCE_SCENES;
    const next = pickRandomScene(pool);
    if (!next) return;
    handleApplyScene(next.id);
  };

  const handleSurpriseSceneByMood = () => {
    if (moodFilter) {
      const basePool = filterScenes({ mood: moodFilter, tag: null, difficulty: null });
      const pool = basePool.length > 0 ? basePool : RESONANCE_SCENES;
      const next = pickRandomScene(pool);
      if (!next) return;
      handleApplyScene(next.id);
      return;
    }
    handleSurpriseScene();
  };

  const handleSurpriseSceneByFilters = () => {
    const basePool = filterScenes({ mood: moodFilter, tag: tagFilter, difficulty: difficultyFilter });
    const pool = basePool.length > 0 ? basePool : RESONANCE_SCENES;
    const next = pickRandomScene(pool);
    if (!next) return;
    handleApplyScene(next.id);
  };

  return (
    <div className="border border-neutral-800 bg-black/50 p-3 rounded text-xs space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-neutral-300 font-semibold">Scenes</div>
          <div className="text-neutral-500 text-[11px]">
            One-click harmonic worlds: tuning, groove &amp; timbre presets.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleSurpriseIntroScene}
              className="px-2 py-1 text-[11px] border border-emerald-600/80 text-emerald-200 hover:border-emerald-400 hover:text-emerald-100 transition-colors rounded"
              title="Pick a random Intro scene as a gentle starting world."
            >
              Intro surprise
            </button>
            <button
              type="button"
              onClick={handleSurpriseTrainingScene}
              className="px-2 py-1 text-[11px] border border-sky-600/80 text-sky-200 hover:border-sky-400 hover:text-sky-100 transition-colors rounded"
              title="Pick a random Training scene for practice-oriented worlds."
            >
              Training surprise
            </button>
          </div>
          <button
            type="button"
            onClick={handleSurpriseScene}
            className="px-2 py-1 text-[11px] border border-neutral-700 text-neutral-200 hover:border-amber-400 hover:text-amber-200 transition-colors rounded"
            title="Pick a random scene (biased toward the current grid tuning)."
          >
            Surprise scene
          </button>
        </div>
      </div>
      {availableMoods.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 justify-between border border-neutral-800/70 rounded px-2 py-1 bg-black/40">
          <div className="flex flex-wrap items-center gap-1 text-[10px] text-neutral-400">
            <span className="uppercase tracking-wide text-neutral-500">Mood</span>
            <button
              type="button"
              onClick={() => setMoodFilter(null)}
              className={`px-1.5 py-0.5 rounded border text-[9px] ${
                moodFilter === null
                  ? "border-amber-400/80 bg-amber-500/15 text-amber-200"
                  : "border-neutral-700/80 bg-neutral-900/80 text-neutral-300 hover:border-amber-400/70 hover:text-amber-200"
              }`}
            >
              All
            </button>
            {availableMoods.map((mood) => (
              <button
                key={mood}
                type="button"
                onClick={() => setMoodFilter(mood)}
                className={`px-1.5 py-0.5 rounded border text-[9px] ${
                  moodFilter === mood
                    ? "border-amber-400/80 bg-amber-500/15 text-amber-200"
                    : "border-neutral-700/80 bg-neutral-900/80 text-neutral-300 hover:border-amber-400/70 hover:text-amber-200"
                }`}
              >
                {mood}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleSurpriseSceneByMood}
            className="px-2 py-0.5 text-[10px] border border-neutral-700 text-neutral-200 hover:border-amber-400 hover:text-amber-200 transition-colors rounded"
            title={
              moodFilter
                ? `Pick a random scene with mood "${moodFilter}".`
                : "Pick a random scene (biased toward the current grid tuning)."
            }
          >
            Surprise by mood
          </button>
        </div>
      )}
      {availableTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 justify-between border border-neutral-800/70 rounded px-2 py-1 bg-black/40">
          <div className="flex flex-wrap items-center gap-1 text-[10px] text-neutral-400">
            <span className="uppercase tracking-wide text-neutral-500">Tag</span>
            <button
              type="button"
              onClick={() => setTagFilter(null)}
              className={`px-1.5 py-0.5 rounded border text-[9px] ${
                tagFilter === null
                  ? "border-emerald-400/80 bg-emerald-500/15 text-emerald-200"
                  : "border-neutral-700/80 bg-neutral-900/80 text-neutral-300 hover:border-emerald-400/70 hover:text-emerald-200"
              }`}
            >
              All
            </button>
            {availableTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setTagFilter(tag)}
                className={`px-1.5 py-0.5 rounded border text-[9px] ${
                  tagFilter === tag
                    ? "border-emerald-400/80 bg-emerald-500/15 text-emerald-200"
                    : "border-neutral-700/80 bg-neutral-900/80 text-neutral-300 hover:border-emerald-400/70 hover:text-emerald-200"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
      {getSceneDifficulties().length > 0 && (
        <div className="flex flex-wrap items-center gap-1 justify-between border border-neutral-800/70 rounded px-2 py-1 bg-black/40">
          <div className="flex flex-wrap items-center gap-1 text-[10px] text-neutral-400">
            <span className="uppercase tracking-wide text-neutral-500">Difficulty</span>
            <button
              type="button"
              onClick={() => setDifficultyFilter(null)}
              className={`px-1.5 py-0.5 rounded border text-[9px] ${
                difficultyFilter === null
                  ? "border-emerald-400/80 bg-emerald-500/15 text-emerald-200"
                  : "border-neutral-700/80 bg-neutral-900/80 text-neutral-300 hover:border-emerald-400/70 hover:text-emerald-200"
              }`}
            >
              All
            </button>
            {getSceneDifficulties().map((difficulty) => (
              <button
                key={difficulty}
                type="button"
                onClick={() => setDifficultyFilter(difficulty)}
                className={`px-1.5 py-0.5 rounded border text-[9px] ${
                  difficultyFilter === difficulty
                    ? "border-emerald-400/80 bg-emerald-500/15 text-emerald-200"
                    : "border-neutral-700/80 bg-neutral-900/80 text-neutral-300 hover:border-emerald-400/70 hover:text-emerald-200"
                }`}
              >
                {difficulty}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleSurpriseSceneByFilters}
            className="px-2 py-0.5 text-[10px] border border-neutral-700 text-neutral-200 hover:border-emerald-400 hover:text-emerald-200 transition-colors rounded"
            title="Pick a random scene from the current mood/tag/difficulty slice, or from the full catalog when the slice is empty."
          >
            Surprise in view
          </button>
        </div>
      )}
      <div className="grid gap-1 sm:grid-cols-3">
        {filteredScenes.map((scene) => {
          const isActive = activeScene?.id === scene.id;
          return (
            <button
              key={scene.id}
              type="button"
              onClick={() => handleApplyScene(scene.id)}
              className={`text-left px-2 py-1 rounded transition-colors ${
                isActive
                  ? "border border-amber-400/80 bg-amber-500/15"
                  : "border border-neutral-700/70 hover:border-amber-400/70 hover:bg-amber-500/10"
              }`}
              >
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-neutral-200 text-[11px] font-semibold truncate">{scene.label}</span>
                {scene.mood && (
                  <span className="rounded border border-neutral-600 bg-neutral-800/90 px-1.5 py-0.5 text-[9px] text-neutral-400 shrink-0">
                    {scene.mood}
                  </span>
                )}
                {scene.difficulty && (
                  <span className="rounded border border-emerald-400/70 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-emerald-200 shrink-0">
                    {scene.difficulty}
                  </span>
                )}
              </div>
              <div className="text-neutral-500 text-[10px] line-clamp-2">{scene.description}</div>
            </button>
          );
        })}
      </div>
      <div className="text-[10px] text-neutral-500">
        Scene:&nbsp;
        <span className="text-neutral-200">
          {activeScene ? activeScene.label : "Custom"}
        </span>
        {" · "}
        <span className="text-neutral-200">{nParamsUI.gridTuning.toUpperCase()}</span>,{" "}
        <span className="text-neutral-200">{Math.round(nParamsUI.quantizeBpm)} BPM</span>
      </div>
      {activeScene && (
        <div className="mt-1 space-y-0.5">
          {activeScene.practiceTip && (
            <div className="text-[10px] text-violet-300/90 italic">
              {activeScene.practiceTip}
            </div>
          )}
          {activeScene.tags && activeScene.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {activeScene.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded border border-neutral-700 bg-neutral-900/80 px-1.5 py-0.5 text-[9px] text-neutral-200"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {activeTrainingFlows.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[10px] text-neutral-500">Training flows:</span>
              {activeTrainingFlows.map((flow) => (
                <span
                  key={flow.id}
                  className="rounded border border-sky-600/70 bg-sky-500/10 px-1.5 py-0.5 text-[9px] text-sky-200"
                >
                  {flow.label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

