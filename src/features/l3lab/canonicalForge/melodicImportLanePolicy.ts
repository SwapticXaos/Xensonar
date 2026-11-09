import type { LoopComposerState } from './loopDrumDomain';
import { isLoopImportTrackId } from './loopImportExportContracts';

export type MelodicImportLaneFamily = 'material' | 'carrier-field';

export type MelodicImportLanePlacement = {
  trackId: string;
  color: string;
  pendingPitchAnchor: boolean;
};

export const MELODIC_IMPORT_PRIMARY_PINK = '#ec4899';
export const LEGACY_CARRIER_IMPORT_PINK = '#f472b6';
export const MELODIC_IMPORT_PENDING_ANCHOR_HINT = 'draggen oder klicken um auf Rasterstufe zu ankern.';

const MATERIAL_TRACK_PREFIX = 'material-base';
const CARRIER_TRACK_PREFIX = 'carrier-integral-pink';

function randomLaneSuffix() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {}
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isReservedImportPink(color: string | null | undefined): boolean {
  const normalized = String(color ?? '').trim().toLowerCase();
  return normalized === MELODIC_IMPORT_PRIMARY_PINK || normalized === LEGACY_CARRIER_IMPORT_PINK;
}

export function hasPrimaryPinkImportLane(state: Pick<LoopComposerState, 'tracks' | 'notes'>): boolean {
  const liveImportTrackIds = new Set(
    state.notes.filter((note) => isLoopImportTrackId(note.trackId)).map((note) => note.trackId),
  );
  return state.tracks.some((track) => liveImportTrackIds.has(track.id) && isReservedImportPink(track.color));
}

export function countLiveImportLanes(state: Pick<LoopComposerState, 'tracks' | 'notes'>): number {
  const liveImportTrackIds = new Set(
    state.notes.filter((note) => isLoopImportTrackId(note.trackId)).map((note) => note.trackId),
  );
  return liveImportTrackIds.size;
}

export function createMelodicImportLanePlacement(
  family: MelodicImportLaneFamily,
  color = MELODIC_IMPORT_PRIMARY_PINK,
): MelodicImportLanePlacement {
  const prefix = family === 'carrier-field' ? CARRIER_TRACK_PREFIX : MATERIAL_TRACK_PREFIX;
  return {
    trackId: `${prefix}:${randomLaneSuffix()}`,
    color,
    pendingPitchAnchor: true,
  };
}

export function pruneEmptyDynamicImportTracks(draft: LoopComposerState) {
  const liveTrackIds = new Set(draft.notes.map((note) => note.trackId));
  const removed = new Set(
    draft.tracks
      .filter((track) => isLoopImportTrackId(track.id) && track.id.includes(':') && !liveTrackIds.has(track.id))
      .map((track) => track.id),
  );
  if (!removed.size) return;
  draft.tracks = draft.tracks.filter((track) => !removed.has(track.id));
  draft.activeTrackIds = draft.activeTrackIds.filter((trackId) => !removed.has(trackId));
  if (removed.has(draft.selectedTrackId)) {
    draft.selectedTrackId = draft.tracks[0]?.id ?? 'bass';
  }
}

export const MELODIC_IMPORT_SECONDARY_COLOR_DEFAULTS = [
  '#22d3ee',
  '#a3e635',
  '#f59e0b',
  '#8b5cf6',
  '#14b8a6',
  '#ef4444',
] as const;

export function suggestNextImportLaneColor(state: Pick<LoopComposerState, 'tracks' | 'notes'>): string {
  const used = new Set(state.tracks.map((track) => track.color.toLowerCase()));
  return MELODIC_IMPORT_SECONDARY_COLOR_DEFAULTS.find((color) => !used.has(color.toLowerCase()))
    ?? MELODIC_IMPORT_SECONDARY_COLOR_DEFAULTS[countLiveImportLanes(state) % MELODIC_IMPORT_SECONDARY_COLOR_DEFAULTS.length]
    ?? '#22d3ee';
}
