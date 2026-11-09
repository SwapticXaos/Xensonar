/**
 * Filter state and derived world list for World Gallery.
 * Extracted from WorldGalleryRoom to simplify the room component and keep filter logic in one place (STRUCTURE, vision §8).
 */

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { Room } from "../../app/roomRegistry";
import type { ResonanceScene } from "../resonance/config/scenes";
import type { HarmonicWorld } from "../../domain/harmonicWorld";
import { exportMatchesWorld } from "../../domain/harmonicWorld";
import type { WorldFavorite } from "../../domain/worldFavorites";
import {
  getJourneysForWorldId,
  getRecommendedRoomsForWorld,
  getScenesForPracticeGoal,
} from "../harmonicWorldSpine";
import { getTrainingWorldJourneys } from "../harmonicWorldSpine";
import type { PracticeGoalId } from "../../domain/practiceGoals";

export type GalleryWorldItem = {
  scene: ResonanceScene;
  world: HarmonicWorld;
  summary: string;
  note: string;
};

export type WorldGalleryFiltersResult = {
  worlds: GalleryWorldItem[];
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
  galleryTags: string[];
  roomFilterOptions: Room[];
  hasActiveFilters: boolean;
  onClearFilters: () => void;
};

function getWorldJourneys(world: HarmonicWorld) {
  return getJourneysForWorldId(world.id);
}

export function useWorldGalleryFilters(
  allWorlds: GalleryWorldItem[],
  favorites: WorldFavorite[],
): WorldGalleryFiltersResult {
  const [moodFilter, setMoodFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [intensityFilter, setIntensityFilter] = useState<string | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null);
  const [journeyFilter, setJourneyFilter] = useState<string | null>(null);
  const [practiceGoalFilter, setPracticeGoalFilter] = useState<PracticeGoalId | null>(null);
  const [roomFilterRooms, setRoomFilterRooms] = useState<Room[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [trainingOnly, setTrainingOnly] = useState(false);

  const trainingJourneys = useMemo(() => getTrainingWorldJourneys(), []);
  const trainingJourneyIds = useMemo(
    () => new Set(trainingJourneys.map((j) => j.id)),
    [trainingJourneys],
  );

  const galleryTags = useMemo(() => {
    const tags = new Set<string>();
    for (const { world } of allWorlds) {
      for (const tag of world.tags) {
        const trimmed = tag.trim();
        if (trimmed) tags.add(trimmed);
      }
    }
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [allWorlds]);

  const roomFilterOptions: Room[] = useMemo(() => {
    const rooms = new Set<Room>();
    for (const { world } of allWorlds) {
      for (const roomId of getRecommendedRoomsForWorld(world)) {
        rooms.add(roomId);
      }
    }
    return Array.from(rooms).sort((a, b) => a.localeCompare(b));
  }, [allWorlds]);

  const worlds = useMemo(() => {
    if (
      !moodFilter &&
      !tagFilter &&
      !intensityFilter &&
      !difficultyFilter &&
      !practiceGoalFilter &&
      !favoritesOnly &&
      !journeyFilter &&
      !trainingOnly &&
      roomFilterRooms.length === 0
    ) {
      return allWorlds;
    }
    return allWorlds.filter(({ scene, world }) => {
      const mood = scene.mood ?? world.mood ?? null;
      if (moodFilter && mood !== moodFilter) return false;
      if (tagFilter && !world.tags.includes(tagFilter)) return false;
      if (intensityFilter && world.profile?.intensity !== intensityFilter) return false;
      if (journeyFilter) {
        const journeys = getWorldJourneys(world);
        if (!journeys.some((j) => j.id === journeyFilter)) return false;
      }
      if (trainingOnly) {
        const journeysForWorld = getWorldJourneys(world);
        if (!journeysForWorld.some((j) => trainingJourneyIds.has(j.id))) return false;
      }
      if (roomFilterRooms.length > 0) {
        const rooms = getRecommendedRoomsForWorld(world);
        if (!rooms.some((roomId) => roomFilterRooms.includes(roomId))) return false;
      }
      if (favoritesOnly && !favorites.some((fav) => exportMatchesWorld(fav, world))) return false;
      if (difficultyFilter && scene.difficulty !== difficultyFilter) return false;
      if (practiceGoalFilter) {
        const goalScenes = getScenesForPracticeGoal(practiceGoalFilter);
        if (!goalScenes.some((goalScene) => goalScene.id === scene.id)) return false;
      }
      return true;
    });
  }, [
    allWorlds,
    moodFilter,
    tagFilter,
    intensityFilter,
    difficultyFilter,
    journeyFilter,
    roomFilterRooms,
    favoritesOnly,
    trainingOnly,
    favorites,
    practiceGoalFilter,
    trainingJourneyIds,
  ]);

  const hasActiveFilters = !!(
    moodFilter ||
    tagFilter ||
    intensityFilter ||
    journeyFilter ||
    difficultyFilter ||
    practiceGoalFilter
  );

  const onClearFilters = () => {
    setMoodFilter(null);
    setTagFilter(null);
    setIntensityFilter(null);
    setDifficultyFilter(null);
    setJourneyFilter(null);
    setPracticeGoalFilter(null);
    setRoomFilterRooms([]);
    setTrainingOnly(false);
    setFavoritesOnly(false);
  };

  return {
    worlds,
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
    galleryTags,
    roomFilterOptions,
    hasActiveFilters,
    onClearFilters,
  };
}
