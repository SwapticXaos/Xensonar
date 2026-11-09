import { cloneBassClipAsWorkcopy, normalizeBassClip, type BassClip } from './bassPatternEvents';

export const BASS_CLIP_LIBRARY_STORAGE_KEY = 'xensonar-bass-clip-library-v1';
export const BASS_CLIP_LIBRARY_EVENT = 'xensonar:bass-clip-library-updated';

export interface BassClipLibraryState {
  clips: BassClip[];
  order: string[];
}

const emptyState = (): BassClipLibraryState => ({ clips: [], order: [] });

function emitBassClipLibraryUpdated() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(BASS_CLIP_LIBRARY_EVENT));
}

function sanitizeState(value: unknown): BassClipLibraryState {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<BassClipLibraryState>;
  const rawClips = Array.isArray(raw.clips) ? raw.clips : [];
  const clips = rawClips
    .filter((clip): clip is BassClip => !!clip && typeof clip === 'object' && typeof (clip as BassClip).id === 'string')
    .map((clip) => normalizeBassClip(clip));
  const clipIds = new Set(clips.map((clip) => clip.id));
  const rawOrder = Array.isArray(raw.order) ? raw.order : [];
  const order = [...rawOrder.filter((id): id is string => typeof id === 'string' && clipIds.has(id)), ...clips.map((clip) => clip.id).filter((id) => !rawOrder.includes(id))];
  return { clips, order };
}

export function readBassClipLibraryState(): BassClipLibraryState {
  if (typeof window === 'undefined') return emptyState();
  try {
    const raw = window.localStorage.getItem(BASS_CLIP_LIBRARY_STORAGE_KEY);
    if (!raw) return emptyState();
    return sanitizeState(JSON.parse(raw));
  } catch {
    return emptyState();
  }
}

export function writeBassClipLibraryState(state: BassClipLibraryState) {
  if (typeof window === 'undefined') return sanitizeState(state);
  const next = sanitizeState(state);
  window.localStorage.setItem(BASS_CLIP_LIBRARY_STORAGE_KEY, JSON.stringify(next));
  emitBassClipLibraryUpdated();
  return next;
}

export function resolveBassClipLibraryClips(state = readBassClipLibraryState()) {
  const byId = new Map(state.clips.map((clip) => [clip.id, clip]));
  return state.order.map((id) => byId.get(id)).filter((clip): clip is BassClip => !!clip);
}

export function readBassClipById(id: string): BassClip | null {
  if (!id) return null;
  return resolveBassClipLibraryClips().find((clip) => clip.id === id) ?? null;
}

export function saveBassClipWorkcopy(clip: BassClip, name?: string) {
  const state = readBassClipLibraryState();
  const workcopy = cloneBassClipAsWorkcopy(clip, name);
  return writeBassClipLibraryState({
    clips: [...state.clips, workcopy],
    order: [...state.order.filter((id) => id !== workcopy.id), workcopy.id],
  }).clips.find((entry) => entry.id === workcopy.id) ?? workcopy;
}

export function updateBassClip(clip: BassClip) {
  const state = readBassClipLibraryState();
  const normalized = normalizeBassClip(clip);
  const exists = state.clips.some((entry) => entry.id === normalized.id);
  return writeBassClipLibraryState({
    clips: exists ? state.clips.map((entry) => entry.id === normalized.id ? normalized : entry) : [...state.clips, normalized],
    order: state.order.includes(normalized.id) ? state.order : [...state.order, normalized.id],
  });
}

export function renameBassClip(id: string, name: string) {
  const state = readBassClipLibraryState();
  const trimmed = name.trim();
  if (!id || !trimmed) return state;
  return writeBassClipLibraryState({
    ...state,
    clips: state.clips.map((clip) => clip.id === id ? { ...clip, name: trimmed } : clip),
  });
}

export function removeBassClip(id: string) {
  const state = readBassClipLibraryState();
  return writeBassClipLibraryState({
    clips: state.clips.filter((clip) => clip.id !== id),
    order: state.order.filter((entryId) => entryId !== id),
  });
}

export function moveBassClip(args: { draggedId: string; targetId: string; operation: 'swap' | 'insert-before' | 'insert-after' }) {
  const state = readBassClipLibraryState();
  const order = state.order.filter((id) => state.clips.some((clip) => clip.id === id));
  const from = order.indexOf(args.draggedId);
  const to = order.indexOf(args.targetId);
  if (from < 0 || to < 0 || args.draggedId === args.targetId) return state;
  const next = [...order];
  if (args.operation === 'swap') {
    [next[from], next[to]] = [next[to], next[from]];
  } else {
    const [dragged] = next.splice(from, 1);
    const targetIndex = next.indexOf(args.targetId);
    const insertIndex = targetIndex < 0 ? next.length : args.operation === 'insert-after' ? targetIndex + 1 : targetIndex;
    next.splice(insertIndex, 0, dragged);
  }
  return writeBassClipLibraryState({ ...state, order: next });
}
