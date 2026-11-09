import { type HarmonicWorld, type HarmonicWorldExport, exportHarmonicWorld, exportMatchesWorld } from "./harmonicWorld";

const STORAGE_KEY = "xensonar.worldFavorites.v1";
export const WORLD_FAVORITES_STORAGE_KEY = STORAGE_KEY;

type StoredFavorite = HarmonicWorldExport;

function safeParse(json: string | null): StoredFavorite[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed as StoredFavorite[];
  } catch {
    return [];
  }
}

function safeStringify(favs: StoredFavorite[]): string {
  try {
    return JSON.stringify(favs);
  } catch {
    return "[]";
  }
}

export function loadWorldFavorites(): StoredFavorite[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return safeParse(raw);
}

export function saveWorldFavorites(favs: StoredFavorite[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, safeStringify(favs));
}

export function isFavoriteWorld(favs: StoredFavorite[], world: HarmonicWorld): boolean {
  return favs.some((fav) => exportMatchesWorld(fav, world));
}

export function addFavoriteWorld(current: StoredFavorite[], world: HarmonicWorld): StoredFavorite[] {
  const exportData = exportHarmonicWorld(world);

  const exists = current.some((fav) => {
    if (fav.id && exportData.id && fav.id === exportData.id) {
      return true;
    }
    return (
      fav.gridTuning === exportData.gridTuning &&
      Math.abs(fav.baseFreq - exportData.baseFreq) < 0.0001 &&
      fav.quantizeOn === exportData.quantizeOn &&
      fav.quantizeSubdivision === exportData.quantizeSubdivision &&
      Math.abs(fav.quantizeBpm - exportData.quantizeBpm) < 0.0001
    );
  });

  if (exists) return current;

  return [exportData, ...current].slice(0, 24);
}

export type WorldFavorite = StoredFavorite;

export function removeFavoriteWorld(current: StoredFavorite[], target: StoredFavorite): StoredFavorite[] {
  if (!target.exportedAt) return current;
  return current.filter((fav) => fav.exportedAt !== target.exportedAt);
}

