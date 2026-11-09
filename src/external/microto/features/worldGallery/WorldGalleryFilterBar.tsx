/**
 * Presentational filter bar for World Gallery: mood, tag, intensity, room,
 * journey, practice goal, difficulty, training only, favorites only.
 * Single responsibility: filter UI (vision §8 clearer modules; LOC discipline).
 */

import type { Dispatch, SetStateAction } from "react";
import type { Room } from "../../app/roomRegistry";
import { getRoomRegistryEntry } from "../../app/roomRegistry";
import type { WorldJourney } from "../../domain/worldGallery";
import { getPracticeGoals, type PracticeGoalId } from "../../domain/practiceGoals";

export type WorldGalleryFilterBarProps = {
  moods: readonly string[];
  galleryTags: readonly string[];
  roomFilterOptions: readonly Room[];
  journeys: readonly WorldJourney[];
  trainingJourneys: readonly WorldJourney[];
  favoritesCount: number;
  moodFilter: string | null;
  setMoodFilter: (v: string | null) => void;
  tagFilter: string | null;
  setTagFilter: (v: string | null) => void;
  intensityFilter: string | null;
  setIntensityFilter: (v: string | null) => void;
  difficultyFilter: string | null;
  setDifficultyFilter: (v: string | null) => void;
  journeyFilter: string | null;
  setJourneyFilter: (v: string | null) => void;
  practiceGoalFilter: PracticeGoalId | null;
  setPracticeGoalFilter: (v: PracticeGoalId | null) => void;
  roomFilterRooms: Room[];
  setRoomFilterRooms: Dispatch<SetStateAction<Room[]>>;
  favoritesOnly: boolean;
  setFavoritesOnly: (v: boolean) => void;
  trainingOnly: boolean;
  setTrainingOnly: (v: boolean) => void;
  onSurpriseFromFilters: () => void;
  surpriseDisabled: boolean;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  journeyLabelForId: (id: string) => string | undefined;
};

const pillActive = "border-amber-500/80 bg-amber-500/20 text-amber-200";
const pillInactive = "border-neutral-600 text-neutral-400 hover:border-neutral-500 hover:text-neutral-300";
const pillActiveEmerald = "border-emerald-500/80 bg-emerald-500/20 text-emerald-200";
const pillActivePurple = "border-purple-500/80 bg-purple-500/20 text-purple-100";

export function WorldGalleryFilterBar({
  moods,
  galleryTags,
  roomFilterOptions,
  journeys,
  trainingJourneys,
  favoritesCount,
  moodFilter,
  setMoodFilter,
  tagFilter,
  setTagFilter,
  intensityFilter,
  setIntensityFilter,
  difficultyFilter,
  setDifficultyFilter,
  journeyFilter,
  setJourneyFilter,
  practiceGoalFilter,
  setPracticeGoalFilter,
  roomFilterRooms,
  setRoomFilterRooms,
  favoritesOnly,
  setFavoritesOnly,
  trainingOnly,
  setTrainingOnly,
  onSurpriseFromFilters,
  surpriseDisabled,
  onClearFilters,
  hasActiveFilters,
  journeyLabelForId,
}: WorldGalleryFilterBarProps) {
  const practiceGoals = getPracticeGoals();

  return (
    <div className="mb-3 space-y-1.5">
      {moods.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-neutral-500">Filter by mood</span>
          <button
            type="button"
            onClick={() => setMoodFilter(null)}
            className={`rounded border px-2 py-1 text-[10px] transition-colors ${moodFilter === null ? pillActive : pillInactive}`}
          >
            All
          </button>
          {moods.map((mood) => (
            <button
              key={mood}
              type="button"
              onClick={() => setMoodFilter(mood)}
              className={`rounded border px-2 py-1 text-[10px] transition-colors ${moodFilter === mood ? pillActive : pillInactive}`}
            >
              {mood}
            </button>
          ))}
        </div>
      )}
      {galleryTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-neutral-500">Filter by tag</span>
          <button
            type="button"
            onClick={() => setTagFilter(null)}
            className={`rounded border px-2 py-1 text-[10px] transition-colors ${tagFilter === null ? pillActive : pillInactive}`}
          >
            All
          </button>
          {galleryTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setTagFilter(tag)}
              className={`rounded border px-2 py-1 text-[10px] transition-colors ${tagFilter === tag ? pillActive : pillInactive}`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest text-neutral-500">Filter by intensity</span>
        <button
          type="button"
          onClick={() => setIntensityFilter(null)}
          className={`rounded border px-2 py-1 text-[10px] transition-colors ${intensityFilter === null ? pillActiveEmerald : pillInactive}`}
        >
          All
        </button>
        {["light", "balanced", "dense"].map((intensity) => (
          <button
            key={intensity}
            type="button"
            onClick={() => setIntensityFilter(intensity)}
            className={`rounded border px-2 py-1 text-[10px] transition-colors ${intensityFilter === intensity ? pillActiveEmerald : pillInactive}`}
          >
            {intensity}
          </button>
        ))}
      </div>
      {roomFilterOptions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-neutral-500">Filter by room</span>
          <button
            type="button"
            onClick={() => setRoomFilterRooms([])}
            className={`rounded border px-2 py-1 text-[10px] transition-colors ${roomFilterRooms.length === 0 ? pillActiveEmerald : pillInactive}`}
          >
            All
          </button>
          {roomFilterOptions.map((roomId) => (
            <button
              key={roomId}
              type="button"
              onClick={() =>
                setRoomFilterRooms((current) =>
                  current.includes(roomId) ? current.filter((r) => r !== roomId) : [...current, roomId],
                )
              }
              className={`rounded border px-2 py-1 text-[10px] transition-colors ${
                roomFilterRooms.includes(roomId) ? pillActiveEmerald : pillInactive
              }`}
              title={getRoomRegistryEntry(roomId).intentLabel}
            >
              {getRoomRegistryEntry(roomId).label}
            </button>
          ))}
        </div>
      )}
      {journeys.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-neutral-500">Filter by journey</span>
          <button
            type="button"
            onClick={() => setJourneyFilter(null)}
            className={`rounded border px-2 py-1 text-[10px] transition-colors ${journeyFilter === null ? pillActiveEmerald : pillInactive}`}
          >
            All
          </button>
          {journeys.map((journey) => (
            <button
              key={journey.id}
              type="button"
              onClick={() => setJourneyFilter(journey.id)}
              className={`rounded border px-2 py-1 text-[10px] transition-colors ${
                journeyFilter === journey.id ? pillActiveEmerald : pillInactive
              }`}
              title={journey.description}
            >
              {journey.label}
            </button>
          ))}
        </div>
      )}
      {practiceGoals.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-neutral-500">Filter by practice goal</span>
          <button
            type="button"
            onClick={() => setPracticeGoalFilter(null)}
            className={`rounded border px-2 py-1 text-[10px] transition-colors ${practiceGoalFilter === null ? pillActivePurple : pillInactive}`}
          >
            All
          </button>
          {practiceGoals.map((goal) => (
            <button
              key={goal.id}
              type="button"
              onClick={() => setPracticeGoalFilter(goal.id)}
              className={`rounded border px-2 py-1 text-[10px] transition-colors ${
                practiceGoalFilter === goal.id ? pillActivePurple : pillInactive
              }`}
              title={goal.description}
            >
              {goal.label}
            </button>
          ))}
        </div>
      )}
      {trainingJourneys.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-neutral-500">Training worlds</span>
          <button
            type="button"
            onClick={() => setTrainingOnly(false)}
            className={`rounded border px-2 py-1 text-[10px] transition-colors ${
              !trainingOnly ? pillActiveEmerald : pillInactive
            }`}
          >
            All curated worlds
          </button>
          <button
            type="button"
            onClick={() => setTrainingOnly(true)}
            className={`rounded border px-2 py-1 text-[10px] transition-colors ${
              trainingOnly ? pillActiveEmerald : pillInactive
            }`}
            title="Show only worlds that belong to authored training journeys (reference → training orbit → motion rooms)."
          >
            Training journeys only
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest text-neutral-500">Favorites</span>
        <button
          type="button"
          onClick={() => setFavoritesOnly(false)}
          className={`rounded border px-2 py-1 text-[10px] transition-colors ${!favoritesOnly ? pillActive : pillInactive}`}
        >
          All worlds
        </button>
        <button
          type="button"
          onClick={() => setFavoritesOnly(true)}
          className={`rounded border px-2 py-1 text-[10px] transition-colors ${
            favoritesOnly ? pillActive : pillInactive
          }`}
          disabled={favoritesCount === 0}
        >
          Favorites only ({favoritesCount})
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest text-neutral-500">Filter by difficulty</span>
        <button
          type="button"
          onClick={() => setDifficultyFilter(null)}
          className={`rounded border px-2 py-1 text-[10px] transition-colors ${difficultyFilter === null ? pillActiveEmerald : pillInactive}`}
        >
          All
        </button>
        {["Intro", "Intermediate", "Advanced"].map((difficulty) => (
          <button
            key={difficulty}
            type="button"
            onClick={() => setDifficultyFilter(difficulty)}
            className={`rounded border px-2 py-1 text-[10px] transition-colors ${
              difficultyFilter === difficulty ? pillActiveEmerald : pillInactive
            }`}
          >
            {difficulty}
          </button>
        ))}
      </div>
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-neutral-600">Active filters</span>
          <button
            type="button"
            onClick={onSurpriseFromFilters}
            disabled={surpriseDisabled}
            className={`rounded border px-2 py-1 text-[10px] transition-colors ${
              surpriseDisabled
                ? "cursor-not-allowed border-neutral-800 text-neutral-600 bg-neutral-900/60"
                : "border-amber-500/80 bg-amber-500/10 text-amber-200 hover:border-amber-400 hover:bg-amber-500/20"
            }`}
          >
            Surprise in view
          </button>
          {moodFilter && (
            <span className="rounded border border-neutral-700 bg-neutral-950/60 px-2 py-1 text-[10px] text-neutral-300">
              Mood: {moodFilter}
            </span>
          )}
          {tagFilter && (
            <span className="rounded border border-neutral-700 bg-neutral-950/60 px-2 py-1 text-[10px] text-neutral-300">
              Tag: {tagFilter}
            </span>
          )}
          {intensityFilter && (
            <span className="rounded border border-neutral-700 bg-neutral-950/60 px-2 py-1 text-[10px] text-neutral-300">
              Intensity: {intensityFilter}
            </span>
          )}
          {journeyFilter && (
            <span className="rounded border border-neutral-700 bg-neutral-950/60 px-2 py-1 text-[10px] text-neutral-300">
              Journey: {journeyLabelForId(journeyFilter) ?? journeyFilter}
            </span>
          )}
          {difficultyFilter && (
            <span className="rounded border border-neutral-700 bg-neutral-950/60 px-2 py-1 text-[10px] text-neutral-300">
              Difficulty: {difficultyFilter}
            </span>
          )}
          {practiceGoalFilter && (
            <span className="rounded border border-neutral-700 bg-neutral-950/60 px-2 py-1 text-[10px] text-neutral-300">
              Practice: {practiceGoals.find((g) => g.id === practiceGoalFilter)?.label ?? practiceGoalFilter}
            </span>
          )}
          <button
            type="button"
            onClick={onClearFilters}
            className="rounded border border-neutral-600 px-2 py-1 text-[10px] text-neutral-400 transition-colors hover:border-neutral-500 hover:text-neutral-300"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
