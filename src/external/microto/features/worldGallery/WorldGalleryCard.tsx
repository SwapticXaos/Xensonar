/**
 * Presentational card for one gallery world: label, mood, intensity, journeys,
 * favorite, tags, note. Single responsibility (vision §6 §8; STRUCTURE).
 */

import type { Room } from "../../app/roomRegistry";
import { getRoomRegistryEntry } from "../../app/roomRegistry";
import type { HarmonicWorld } from "../../domain/harmonicWorld";
import type { PracticeGoalId } from "../../domain/practiceGoals";
import { getPracticeGoalsForScene } from "../harmonicWorldSpine";
import type { ResonanceSceneId } from "../resonance/config/scenes";
import { getTrainingFlowsForScene } from "../../domain/trainingFlows";
import {
  getJourneysForWorldId,
  getJourneyProgressForWorld,
  getRecommendedRoomsForWorld,
} from "../harmonicWorldSpine";
import type { WorldFavorite } from "../../domain/worldFavorites";
import { isFavoriteWorld } from "../../domain/worldFavorites";
import type { GalleryWorld } from "./WorldGalleryRoom";

function getWorldIntensity(world: HarmonicWorld): string | null {
  return world.profile?.intensity ?? null;
}

function getWorldIntensityBadgeClass(intensity: string | null): string {
  if (!intensity) return "border-neutral-600 bg-neutral-800/90 text-neutral-300";
  switch (intensity) {
    case "light":
      return "border-emerald-500/80 bg-emerald-500/10 text-emerald-200";
    case "balanced":
      return "border-sky-500/80 bg-sky-500/10 text-sky-200";
    case "dense":
      return "border-fuchsia-500/80 bg-fuchsia-500/10 text-fuchsia-200";
    default:
      return "border-neutral-600 bg-neutral-800/90 text-neutral-300";
  }
}

export type WorldGalleryCardProps = {
  galleryWorld: GalleryWorld;
  harmonicWorld?: HarmonicWorld;
  favorites: WorldFavorite[];
  editingNoteId: string | null;
  onSelectResonanceScene?: (sceneId: ResonanceSceneId) => void;
  onSelectRoom: (room: Room) => void;
  onPreviewWorldTone?: (world: HarmonicWorld) => void;
  onToggleFavorite: (world: HarmonicWorld) => void;
  setMoodFilter: (mood: string | null) => void;
  setTagFilter: (tag: string | null) => void;
  setPracticeGoalFilter: (goalId: PracticeGoalId | null) => void;
  setEditingNoteId: (id: string | null) => void;
  setWorldNoteAndBumpVersion: (world: HarmonicWorld, text: string) => void;
};

export function WorldGalleryCard({
  galleryWorld,
  harmonicWorld,
  favorites,
  editingNoteId,
  onSelectResonanceScene,
  onSelectRoom,
  onPreviewWorldTone,
  onToggleFavorite,
  setMoodFilter,
  setTagFilter,
  setPracticeGoalFilter,
  setEditingNoteId,
  setWorldNoteAndBumpVersion,
}: WorldGalleryCardProps) {
  const { scene, world, summary, note } = galleryWorld;
  const isActive = Boolean(harmonicWorld && scene.id === harmonicWorld.id);
  const intensity = getWorldIntensity(world);
  const recommendedRooms = getRecommendedRoomsForWorld(world);
  const favorite = isFavoriteWorld(favorites, world);
  const journeysForWorld = getJourneysForWorldId(world.id);
  const primaryJourney = journeysForWorld[0] ?? null;
  const primaryJourneyProgress =
    primaryJourney != null ? getJourneyProgressForWorld(primaryJourney, world.id ?? null) : null;
  const trainingFlowsForScene = getTrainingFlowsForScene(scene.id);
  const practiceGoalsForScene = getPracticeGoalsForScene(scene.id);

  return (
    <button
      type="button"
      onClick={() => {
        if (onSelectResonanceScene) {
          onSelectResonanceScene(scene.id);
        }
        onSelectRoom("RESONANCE");
      }}
      className={`flex flex-col items-stretch border px-2 py-2 text-left text-[11px] transition-colors ${
        isActive
          ? "border-emerald-400 bg-emerald-500/10"
          : "border-neutral-800 bg-neutral-950/60 hover:border-neutral-600 hover:bg-neutral-900"
      }`}
    >
      <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-widest text-neutral-500">World</span>
        {(scene.mood ?? world.mood) && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMoodFilter(scene.mood ?? world.mood ?? null);
            }}
            className="rounded border border-neutral-600 bg-neutral-800/90 px-1.5 py-0.5 text-[9px] text-neutral-300 transition-colors hover:border-amber-400 hover:text-amber-100"
          >
            {scene.mood ?? world.mood}
          </button>
        )}
        {intensity && (
          <span
            className={`rounded border px-1.5 py-0.5 text-[9px] uppercase tracking-widest ${getWorldIntensityBadgeClass(
              intensity,
            )}`}
          >
            {intensity}
          </span>
        )}
        {scene.difficulty && (
          <span className="rounded border border-emerald-400/70 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-emerald-200">
            {scene.difficulty}
          </span>
        )}
        {primaryJourney && primaryJourneyProgress && (
          <span className="rounded border border-emerald-500/60 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] text-emerald-100">
            Step {primaryJourneyProgress.index + 1} of {primaryJourneyProgress.total}
          </span>
        )}
        {recommendedRooms.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-1 py-0.5 text-[9px] text-emerald-200">
              For:
            </span>
            {recommendedRooms.map((roomId) => {
              const entry = getRoomRegistryEntry(roomId);
              return (
                <button
                  key={roomId}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onSelectResonanceScene) {
                      onSelectResonanceScene(scene.id);
                    }
                    onSelectRoom(roomId);
                  }}
                  className="rounded border border-emerald-500/70 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] text-emerald-100 transition-colors hover:border-emerald-300 hover:bg-emerald-500/20"
                >
                  {entry.label}
                </button>
              );
            })}
          </div>
        )}
        {onPreviewWorldTone && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onPreviewWorldTone(world);
            }}
            className="rounded border border-emerald-700 bg-emerald-500/5 px-1.5 py-0.5 text-[9px] text-emerald-200 transition-colors hover:border-emerald-500 hover:bg-emerald-500/15"
            title="Play a short preview tone for this world"
          >
            Preview
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleFavorite(world);
          }}
          title={favorite ? "Remove from favorites" : "Add to favorites"}
          className={`ml-auto rounded px-1.5 py-0.5 text-[10px] border ${
            favorite
              ? "border-amber-400 bg-amber-500/20 text-amber-100"
              : "border-neutral-700 bg-neutral-900/80 text-neutral-300 hover:border-amber-400 hover:text-amber-100"
          }`}
        >
          {favorite ? "★ Favorite" : "☆ Favorite"}
        </button>
      </div>
      <div className="font-semibold text-neutral-100 mb-0.5">{scene.label}</div>
      {scene.description && (
        <div className="text-neutral-300 mb-0.5 line-clamp-2">{scene.description}</div>
      )}
      {summary && (
        <div className="text-[10px] text-neutral-400 mb-0.5">{summary}</div>
      )}
      {scene.practiceTip && (
        <div className="text-[10px] text-violet-300/90 italic mb-0.5 line-clamp-2">
          {scene.practiceTip}
        </div>
      )}
      {trainingFlowsForScene.length > 0 && (
        <div className="mb-0.5 flex flex-wrap items-center gap-1">
          <span className="text-[9px] text-neutral-500">Training flows:</span>
          {trainingFlowsForScene.map((flow) => (
            <span
              key={flow.id}
              className="rounded border border-sky-600/70 bg-sky-500/10 px-1.5 py-0.5 text-[9px] text-sky-200"
            >
              {flow.label}
            </span>
          ))}
        </div>
      )}
      {practiceGoalsForScene.length > 0 && (
        <div className="mb-0.5 flex flex-wrap items-center gap-1">
          <span className="text-[9px] text-neutral-500">Practice goals:</span>
          {practiceGoalsForScene.map((goal) => (
            <button
              key={goal.id}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setPracticeGoalFilter(goal.id);
              }}
              className="rounded border border-purple-500/70 bg-purple-500/10 px-1.5 py-0.5 text-[9px] text-purple-100 transition-colors hover:border-purple-400 hover:bg-purple-500/20"
              title={goal.description}
            >
              {goal.label}
            </button>
          ))}
        </div>
      )}
      <div className="mt-auto">
        {world.tags.length > 0 && (
          <div className="mb-1 flex flex-wrap gap-1">
            {world.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setTagFilter(tag);
                }}
                className="rounded-sm border border-neutral-700 bg-neutral-900/80 px-1.5 py-0.5 text-[9px] text-neutral-200 transition-colors hover:border-neutral-500 hover:bg-neutral-800"
              >
                {tag}
              </button>
            ))}
          </div>
        )}
        <div className="space-y-1">
          {note && (
            <div className="text-[10px] text-neutral-400 italic line-clamp-3">{note}</div>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setEditingNoteId(scene.id);
            }}
            className="rounded border border-neutral-700 bg-neutral-900/80 px-1.5 py-0.5 text-[9px] text-neutral-300 transition-colors hover:border-neutral-500 hover:bg-neutral-800"
          >
            {note ? "Edit world note" : "Add world note"}
          </button>
          {editingNoteId === scene.id && (
            <textarea
              value={note}
              onChange={(e) => {
                setWorldNoteAndBumpVersion(world, e.target.value);
              }}
              rows={2}
              className="w-full bg-black/60 border border-neutral-800 text-[10px] text-neutral-200 rounded-sm px-1.5 py-1 resize-y min-h-[40px] focus:outline-none focus:border-neutral-500"
              placeholder="Jot down ideas or setlist notes for this world…"
            />
          )}
        </div>
      </div>
    </button>
  );
}
