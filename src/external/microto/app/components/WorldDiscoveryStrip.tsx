/**
 * Shell HUD strip: Gallery, Journeys, and Favorites discovery (vision §5 discoverability).
 * Extracted from AppShellHarmonicWorldHud for LOC discipline and single responsibility (vision §8).
 */

import { exportMatchesWorld, type HarmonicWorld, type HarmonicWorldExport } from "../../domain/harmonicWorld";
import type { WorldFavorite } from "../../domain/worldFavorites";
import type { WorldJourney } from "../../domain/worldGallery";
import { SHELL_SURPRISE_ME_LABEL, SHELL_SURPRISE_SCENE_LABEL } from "../copy";

export type WorldDiscoveryStripProps = {
  gallery: readonly HarmonicWorldExport[];
  journeys: readonly WorldJourney[];
  /** Optional curated subset of journeys that are explicitly training flows. */
  trainingJourneys?: readonly WorldJourney[];
  /** Optional primary training journey chosen for the current world/context. */
  primaryTrainingJourney?: WorldJourney | null;
  favorites: WorldFavorite[];
  harmonicWorld?: HarmonicWorld | null;
  onImportWorld?: (data: HarmonicWorldExport) => void;
  onRemoveFavorite: (fav: WorldFavorite) => void;
  onJumpToFavorite: (direction: "next" | "prev") => void;
  onSurpriseWorld: () => void;
  /** Optional: load a random curated scene and open Synth (vision §3 §5; Ctrl+Shift+R). */
  onSurpriseScene?: () => void;
  onSelectJourney: (journey: WorldJourney) => void;
  /** Optional: quick-start a training journey (uses trainingJourneys when provided). */
  onSelectTrainingJourney?: (journey: WorldJourney) => void;
};

export function WorldDiscoveryStrip({
  gallery,
  journeys,
  trainingJourneys: _trainingJourneys,
  primaryTrainingJourney,
  favorites,
  harmonicWorld,
  onImportWorld,
  onRemoveFavorite,
  onJumpToFavorite,
  onSurpriseWorld,
  onSurpriseScene,
  onSelectJourney,
  onSelectTrainingJourney,
}: WorldDiscoveryStripProps) {
  if (
    !onImportWorld ||
    (gallery.length === 0 && favorites.length === 0 && journeys.length === 0 && !onSurpriseScene)
  ) {
    return null;
  }

  return (
    <div className="mt-1 flex flex-col gap-1">
      {journeys.length > 0 && (
        <div className="flex flex-wrap gap-1 items-center">
          <span className="text-[9px] text-neutral-500 uppercase tracking-widest">Journeys</span>
          {primaryTrainingJourney && onSelectTrainingJourney && (
            <button
              type="button"
              onClick={() => onSelectTrainingJourney(primaryTrainingJourney)}
              className="px-1.5 py-0.5 border border-amber-600 text-[9px] text-amber-200 hover:border-amber-400 hover:bg-amber-500/10"
              title={`Start training journey: ${primaryTrainingJourney.label}`}
            >
              Training flows
            </button>
          )}
          {journeys.map((journey) => (
            <button
              key={journey.id}
              type="button"
              onClick={() => onSelectJourney(journey)}
              className="px-2 py-0.5 border border-neutral-700 text-[10px] text-neutral-300 hover:border-neutral-500 hover:bg-neutral-900"
              title={journey.description}
            >
              {journey.label}
            </button>
          ))}
        </div>
      )}
      {(gallery.length > 0 || onSurpriseScene) && (
        <div className="flex flex-wrap gap-1 items-center">
          <span className="text-[9px] text-neutral-500 uppercase tracking-widest">Gallery</span>
          {gallery.length > 0 && (
            <button
              type="button"
              onClick={onSurpriseWorld}
              className="px-1.5 py-0.5 border border-neutral-700 text-[9px] text-neutral-300 hover:border-amber-400 hover:bg-amber-500/10"
              title="Pick a random world from the gallery"
            >
              {SHELL_SURPRISE_ME_LABEL}
            </button>
          )}
          {onSurpriseScene && (
            <button
              type="button"
              onClick={onSurpriseScene}
              className="px-1.5 py-0.5 border border-neutral-700 text-[9px] text-neutral-300 hover:border-violet-400 hover:bg-violet-500/10"
              title="Pick a random curated scene and open Synth"
            >
              {SHELL_SURPRISE_SCENE_LABEL}
            </button>
          )}
          {gallery.length > 0 && gallery.map((world) => {
            const isActive = !!harmonicWorld && exportMatchesWorld(world, harmonicWorld);
            return (
              <button
                key={world.id ?? world.label ?? world.exportedAt}
                type="button"
                onClick={() => onImportWorld(world)}
                className={`px-2 py-0.5 border text-[10px] ${
                  isActive
                    ? "border-amber-400 text-amber-200 bg-amber-500/20"
                    : "border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:bg-neutral-900"
                }`}
                title={
                  [world.description, world.mood ? `Mood: ${world.mood}` : null]
                    .filter(Boolean)
                    .join(" · ") || undefined
                }
              >
                {world.label ?? world.id ?? "World"}
              </button>
            );
          })}
        </div>
      )}
      {favorites.length > 0 && (
        <div className="flex flex-wrap gap-1 items-center">
          <span className="text-[9px] text-neutral-500 uppercase tracking-widest">Favorites</span>
          <button
            type="button"
            onClick={() => onJumpToFavorite("prev")}
            className="px-1.5 py-0.5 border border-emerald-800 text-[9px] text-emerald-300 hover:border-emerald-500 hover:bg-emerald-900/40"
            title="Previous favorite world"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={() => onJumpToFavorite("next")}
            className="px-1.5 py-0.5 border border-emerald-800 text-[9px] text-emerald-300 hover:border-emerald-500 hover:bg-emerald-900/40"
            title="Next favorite world"
          >
            ▶
          </button>
          {favorites.map((world) => {
            const isActive = !!harmonicWorld && exportMatchesWorld(world, harmonicWorld);
            return (
              <div
                key={`${world.id ?? world.label ?? world.exportedAt}-fav`}
                className="flex items-center gap-1"
              >
                <button
                  type="button"
                  onClick={() => onImportWorld(world)}
                  className={`px-2 py-0.5 border text-[10px] ${
                    isActive
                      ? "border-amber-400 text-amber-200 bg-amber-500/20"
                      : "border-emerald-700 text-emerald-200 hover:border-emerald-500 hover:bg-emerald-900/40"
                  }`}
                  title={
                    [world.description, world.mood ? `Mood: ${world.mood}` : null]
                      .filter(Boolean)
                      .join(" · ") || undefined
                  }
                >
                  {world.label ?? world.id ?? "World"}
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveFavorite(world)}
                  className="px-1 py-0.5 border border-emerald-800 text-[9px] text-emerald-300 hover:border-emerald-500 hover:bg-emerald-900/60"
                  title="Remove favorite"
                  aria-label="Remove favorite world"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
