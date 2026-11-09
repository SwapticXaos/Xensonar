import type { Room } from "../../app/roomRegistry";
import type { HarmonicWorld } from "../../domain/harmonicWorld";
import type { PracticeGoalId } from "../../domain/practiceGoals";
import type { ResonanceSceneId } from "../resonance/config/scenes";
import type { WorldFavorite } from "../../domain/worldFavorites";
import type { GalleryWorld } from "./WorldGalleryRoom";
import { WorldGalleryCard } from "./WorldGalleryCard";

type WorldGalleryGridProps = {
  worlds: GalleryWorld[];
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

export function WorldGalleryGrid({
  worlds,
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
}: WorldGalleryGridProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {worlds.map((galleryWorld) => (
        <WorldGalleryCard
          key={galleryWorld.scene.id}
          galleryWorld={galleryWorld}
          harmonicWorld={harmonicWorld}
          favorites={favorites}
          editingNoteId={editingNoteId}
          onSelectResonanceScene={onSelectResonanceScene}
          onSelectRoom={onSelectRoom}
          onPreviewWorldTone={onPreviewWorldTone}
          onToggleFavorite={onToggleFavorite}
          setMoodFilter={setMoodFilter}
          setTagFilter={setTagFilter}
          setPracticeGoalFilter={setPracticeGoalFilter}
          setEditingNoteId={setEditingNoteId}
          setWorldNoteAndBumpVersion={setWorldNoteAndBumpVersion}
        />
      ))}
    </div>
  );
}
