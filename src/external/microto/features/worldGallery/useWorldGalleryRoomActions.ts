import * as React from 'react';
/**
 * World Gallery room action handlers: toggle favorite, surprise world, start journey.
 * Extracted from WorldGalleryRoom for LOC discipline and single responsibility (STRUCTURE, vision §6 §8).
 */

import type { HarmonicWorld } from "../../domain/harmonicWorld";
import { exportMatchesWorld } from "../../domain/harmonicWorld";
import {
  addFavoriteWorld,
  removeFavoriteWorld,
  saveWorldFavorites,
  type WorldFavorite,
} from "../../domain/worldFavorites";
import type { WorldJourney } from "../../domain/worldGallery";
import { getEntryWorldForJourney } from "../harmonicWorldSpine";
import type { ResonanceSceneId } from "../resonance/config/scenes";
import type { GalleryWorldItem } from "./useWorldGalleryFilters";

export type WorldGalleryRoomActionsParams = {
  onSelectResonanceScene?: (sceneId: ResonanceSceneId) => void;
  onImportWorld?: (data: import("../../domain/harmonicWorld").HarmonicWorldExport) => void;
  onSelectRoom: (room: import("../../app/roomRegistry").Room) => void;
  allWorlds: GalleryWorldItem[];
  worlds: GalleryWorldItem[];
  setFavorites: React.Dispatch<React.SetStateAction<WorldFavorite[]>>;
};

export function useWorldGalleryRoomActions({
  onSelectResonanceScene,
  onImportWorld,
  onSelectRoom,
  allWorlds,
  worlds,
  setFavorites,
}: WorldGalleryRoomActionsParams) {
  const toggleFavorite = (world: HarmonicWorld) => {
    setFavorites((current) => {
      const existing = current.find((fav) => exportMatchesWorld(fav, world));
      if (existing) {
        const next = removeFavoriteWorld(current, existing);
        saveWorldFavorites(next);
        return next;
      }
      const next = addFavoriteWorld(current, world);
      saveWorldFavorites(next);
      return next;
    });
  };

  const handleSurpriseWorld = () => {
    if (!onSelectResonanceScene || allWorlds.length === 0) return;
    const index = Math.floor(Math.random() * allWorlds.length);
    const choice = allWorlds[index];
    if (!choice) return;
    onSelectResonanceScene(choice.scene.id);
    onSelectRoom("RESONANCE");
  };

  const handleSurpriseFromFilters = () => {
    if (!onSelectResonanceScene || worlds.length === 0) return;
    const index = Math.floor(Math.random() * worlds.length);
    const choice = worlds[index];
    if (!choice) return;
    onSelectResonanceScene(choice.scene.id);
    onSelectRoom("RESONANCE");
  };

  const handleStartJourney = (journey: WorldJourney) => {
    if (!onImportWorld) return;
    const entry = getEntryWorldForJourney(journey);
    if (!entry) return;
    onImportWorld(entry);
    onSelectRoom("RESONANCE");
  };

  return { toggleFavorite, handleSurpriseWorld, handleSurpriseFromFilters, handleStartJourney };
}
