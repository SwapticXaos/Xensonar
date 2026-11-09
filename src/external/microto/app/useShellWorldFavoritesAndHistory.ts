/**
 * Shell HUD: favorites + recent world history + Surprise me handler.
 * Single responsibility: world persistence (favorites, history) and surprise-world ref.
 * Extracted from AppShellHarmonicWorldHud for LOC discipline and optimal program flow (STRUCTURE, Branch C).
 */

import { useCallback, useEffect, useState } from "react";
import type { HarmonicWorld, HarmonicWorldExport } from "../domain/harmonicWorld";
import { worldFromExport } from "../domain/harmonicWorld";
import {
  addFavoriteWorld,
  isFavoriteWorld,
  loadWorldFavorites,
  removeFavoriteWorld,
  saveWorldFavorites,
  WORLD_FAVORITES_STORAGE_KEY,
  type WorldFavorite,
} from "../domain/worldFavorites";
import { loadWorldHistory, type WorldHistoryEntry } from "../domain/worldHistory";
import { useStorageKeyListener } from "../shared/browser/useStorageKeyListener";
import type { EnsureAudio } from "../shared/audio/audioInit";

export type UseShellWorldFavoritesAndHistoryParams = {
  /** When set, ref is updated with handleSurpriseWorld for global shortcut (e.g. Ctrl+Shift+S). */
  surpriseWorldRef?: React.MutableRefObject<(() => void) | null>;
  /** Gallery exports for Surprise me (random pick). */
  gallery: readonly HarmonicWorldExport[];
  onImportWorld?: (data: HarmonicWorldExport) => void;
  onEnableAudio?: EnsureAudio;
  onShowToast?: (message: string, kind?: "success" | "error") => void;
  /** When these change, recent worlds are reloaded from storage. */
  harmonicWorldId?: string | null;
  harmonicWorldGridTuning?: string | null;
  harmonicWorldBaseFreq?: number | null;
};

export type UseShellWorldFavoritesAndHistoryResult = {
  favorites: WorldFavorite[];
  recentWorlds: WorldHistoryEntry[];
  setRecentWorlds: React.Dispatch<React.SetStateAction<WorldHistoryEntry[]>>;
  handleFavoriteWorld: (harmonicWorld: HarmonicWorld) => void;
  handleRemoveFavorite: (fav: WorldFavorite) => void;
  handleJumpToFavorite: (direction: "next" | "prev") => void;
  handlePinRecentToFavorites: (exportData: WorldHistoryEntry) => void;
  handleSurpriseWorld: () => void;
  isFavoriteWorld: (world: HarmonicWorld) => boolean;
};

export function useShellWorldFavoritesAndHistory({
  surpriseWorldRef,
  gallery,
  onImportWorld,
  onEnableAudio,
  onShowToast,
  harmonicWorldId,
  harmonicWorldGridTuning,
  harmonicWorldBaseFreq,
}: UseShellWorldFavoritesAndHistoryParams): UseShellWorldFavoritesAndHistoryResult {
  const [favorites, setFavorites] = useState<WorldFavorite[]>(() => loadWorldFavorites());
  const [, setFavoriteIndex] = useState(0);
  const [recentWorlds, setRecentWorlds] = useState<WorldHistoryEntry[]>(() => loadWorldHistory());

  useEffect(() => {
    setFavorites(loadWorldFavorites());
  }, []);

  useStorageKeyListener(WORLD_FAVORITES_STORAGE_KEY, () => setFavorites(loadWorldFavorites()));

  useEffect(() => {
    setRecentWorlds(loadWorldHistory());
  }, [harmonicWorldId, harmonicWorldGridTuning, harmonicWorldBaseFreq]);

  const handleFavoriteWorld = useCallback(
    (harmonicWorld: HarmonicWorld) => {
      if (isFavoriteWorld(favorites, harmonicWorld)) return;
      setFavorites((current) => {
        const next = addFavoriteWorld(current, harmonicWorld);
        saveWorldFavorites(next);
        return next;
      });
    },
    [favorites],
  );

  const handleRemoveFavorite = useCallback((fav: WorldFavorite) => {
    setFavorites((current) => {
      const next = removeFavoriteWorld(current, fav);
      saveWorldFavorites(next);
      return next;
    });
  }, []);

  const handleJumpToFavorite = useCallback(
    (direction: "next" | "prev") => {
      if (!onImportWorld || favorites.length === 0) return;
      setFavoriteIndex((current) => {
        const count = favorites.length;
        const delta = direction === "next" ? 1 : -1;
        const raw = (current + delta + count) % count;
        const fav = favorites[raw];
        if (fav) onImportWorld(fav);
        return raw;
      });
    },
    [onImportWorld, favorites],
  );

  const handlePinRecentToFavorites = useCallback(
    (exportData: WorldHistoryEntry) => {
      const world = worldFromExport(exportData);
      setFavorites((current) => {
        if (isFavoriteWorld(current, world)) return current;
        const next = addFavoriteWorld(current, world);
        saveWorldFavorites(next);
        return next;
      });
      onShowToast?.("Pinned to favorites", "success");
    },
    [onShowToast],
  );

  const handleSurpriseWorld = useCallback(() => {
    if (!onImportWorld || gallery.length === 0) return;
    const index = Math.floor(Math.random() * gallery.length);
    const world = gallery[index];
    if (!world) return;
    if (onEnableAudio) {
      void onEnableAudio().then(() => onImportWorld(world));
    } else {
      onImportWorld(world);
    }
  }, [onImportWorld, onEnableAudio, gallery]);

  useEffect(() => {
    if (!surpriseWorldRef) return;
    surpriseWorldRef.current = handleSurpriseWorld;
    return () => {
      surpriseWorldRef.current = null;
    };
  }, [surpriseWorldRef, handleSurpriseWorld]);

  const isFavorite = useCallback(
    (world: HarmonicWorld) => isFavoriteWorld(favorites, world),
    [favorites],
  );

  return {
    favorites,
    recentWorlds,
    setRecentWorlds,
    handleFavoriteWorld,
    handleRemoveFavorite,
    handleJumpToFavorite,
    handlePinRecentToFavorites,
    handleSurpriseWorld,
    isFavoriteWorld: isFavorite,
  };
}
