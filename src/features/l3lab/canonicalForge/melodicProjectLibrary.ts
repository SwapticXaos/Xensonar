import {
  buildLoopComposerDemoState,
  buildTrackPatternNotes,
  cloneLoopComposerState,
  createEmptyLoopComposer,
  noteStartUnit,
  type LoopComposerState,
  type LoopNoteEvent,
  type LoopTrackPatternPreset,
} from './loopDrumDomain';

export type MelodicPatternVariantMap = Record<string, Record<LoopTrackPatternPreset, LoopNoteEvent[]>>;
export type MelodicPatternLinkMap = Record<string, Record<LoopTrackPatternPreset, LoopTrackPatternPreset>>;

export type SavedMelodicProject = {
  id: string;
  name: string;
  composer: LoopComposerState;
  patternVariants: MelodicPatternVariantMap;
  patternLinks: MelodicPatternLinkMap;
  origin?: 'browserLocal' | 'importedPackage' | 'merged';
  sourcePackageId?: string | null;
  syncState?: 'localOnly' | 'imported' | 'modifiedSinceImport' | 'exported';
  contentHash?: string | null;
};

export type MelodicProjectChoice = {
  id: string;
  name: string;
  builtIn: boolean;
  project: SavedMelodicProject;
};

const STORAGE_KEY = 'xensonar-melodic-loop-projects-v1';
export const RANDOM_DEMO_MELODIC_PROJECT_ID = 'builtin-random-demo-preset';
export const RANDOM_DEMO_MELODIC_PROJECT_NAME = 'Random Demo Preset';
const PATTERNS: LoopTrackPatternPreset[] = ['patternA', 'patternB', 'patternC'];

function cloneNotes(notes: LoopNoteEvent[]) {
  return notes.map((note) => ({ ...note }));
}

export function cloneMelodicPatternVariantMap(map: MelodicPatternVariantMap): MelodicPatternVariantMap {
  return Object.fromEntries(
    Object.entries(map).map(([trackId, presets]) => [
      trackId,
      Object.fromEntries(PATTERNS.map((patternId) => [patternId, cloneNotes(presets[patternId] ?? [])])) as Record<LoopTrackPatternPreset, LoopNoteEvent[]>,
    ]),
  ) as MelodicPatternVariantMap;
}

export function cloneMelodicPatternLinkMap(map: MelodicPatternLinkMap): MelodicPatternLinkMap {
  return Object.fromEntries(
    Object.entries(map).map(([trackId, presets]) => [
      trackId,
      {
        patternA: presets.patternA ?? 'patternA',
        patternB: presets.patternB ?? 'patternA',
        patternC: presets.patternC ?? 'patternA',
      },
    ]),
  ) as MelodicPatternLinkMap;
}

function sortNotes(state: LoopComposerState, notes: LoopNoteEvent[]) {
  return [...notes].sort((a, b) => noteStartUnit(state, a) - noteStartUnit(state, b));
}

export function createSelfPatternLink() {
  return { patternA: 'patternA', patternB: 'patternB', patternC: 'patternC' } as const;
}

export function createLinkedPatternLink() {
  return { patternA: 'patternA', patternB: 'patternA', patternC: 'patternA' } as const;
}

export function createSelfPatternLinksForTracks(trackIds: string[]): MelodicPatternLinkMap {
  return Object.fromEntries(
    trackIds.map((trackId) => [trackId, createSelfPatternLink()]),
  ) as MelodicPatternLinkMap;
}

export function createLinkedScratchPatternLinks(trackIds: string[]): MelodicPatternLinkMap {
  return Object.fromEntries(
    trackIds.map((trackId) => [trackId, createLinkedPatternLink()]),
  ) as MelodicPatternLinkMap;
}

export function createGeneratedPatternVariantsFromComposer(composer: LoopComposerState): MelodicPatternVariantMap {
  return Object.fromEntries(
    composer.tracks.map((track) => [
      track.id,
      Object.fromEntries(
        PATTERNS.map((patternId) => [patternId, sortNotes(composer, buildTrackPatternNotes(track.id, patternId, composer))]),
      ) as Record<LoopTrackPatternPreset, LoopNoteEvent[]>,
    ]),
  ) as MelodicPatternVariantMap;
}

export function createLinkedScratchVariantsFromComposer(composer: LoopComposerState): MelodicPatternVariantMap {
  return Object.fromEntries(
    composer.tracks.map((track) => {
      const notes = sortNotes(composer, composer.notes.filter((note) => note.trackId === track.id));
      return [
        track.id,
        {
          patternA: cloneNotes(notes),
          patternB: cloneNotes(notes),
          patternC: cloneNotes(notes),
        },
      ];
    }),
  ) as MelodicPatternVariantMap;
}

export function resolvePatternSource(
  links: MelodicPatternLinkMap,
  trackId: string,
  patternId: LoopTrackPatternPreset,
): LoopTrackPatternPreset {
  return links[trackId]?.[patternId] ?? patternId;
}

export function resolveVariantNotes(
  variants: MelodicPatternVariantMap,
  links: MelodicPatternLinkMap,
  trackId: string,
  patternId: LoopTrackPatternPreset,
): LoopNoteEvent[] {
  const sourcePattern = resolvePatternSource(links, trackId, patternId);
  return cloneNotes(variants[trackId]?.[sourcePattern] ?? variants[trackId]?.[patternId] ?? []);
}

export function applyPatternVariantsToComposer(
  composer: LoopComposerState,
  variants: MelodicPatternVariantMap,
  links: MelodicPatternLinkMap,
): LoopComposerState {
  const next = cloneLoopComposerState(composer);
  const resolvedNotes = next.tracks.flatMap((track) => resolveVariantNotes(variants, links, track.id, track.patternPresetId ?? 'patternA'));
  next.notes = sortNotes(next, resolvedNotes);
  next.selectedNoteId = next.notes.find((note) => note.trackId === next.selectedTrackId)?.id ?? next.notes[0]?.id ?? null;
  next.activeTrackIds = next.tracks.filter((track) => track.enabled).map((track) => track.id);
  return next;
}

function noteSignature(state: LoopComposerState, notes: LoopNoteEvent[]) {
  return JSON.stringify(sortNotes(state, notes));
}

export function syncPatternStoresAfterComposerMutation(args: {
  previousComposer: LoopComposerState;
  nextComposer: LoopComposerState;
  variants: MelodicPatternVariantMap;
  links: MelodicPatternLinkMap;
}) {
  const { previousComposer, nextComposer, variants, links } = args;
  const nextVariants = cloneMelodicPatternVariantMap(variants);
  const nextLinks = cloneMelodicPatternLinkMap(links);

  nextComposer.tracks.forEach((track) => {
    const trackId = track.id;
    const currentPattern = track.patternPresetId ?? 'patternA';
    const previousNotes = previousComposer.notes.filter((note) => note.trackId === trackId);
    const visibleNotes = nextComposer.notes.filter((note) => note.trackId === trackId);
    const changed = noteSignature(previousComposer, previousNotes) !== noteSignature(nextComposer, visibleNotes);

    nextVariants[trackId] = nextVariants[trackId] ?? { patternA: [], patternB: [], patternC: [] };
    nextLinks[trackId] = nextLinks[trackId] ?? createLinkedPatternLink();

    const firstNonABranch = changed && currentPattern !== 'patternA' && nextLinks[trackId][currentPattern] !== currentPattern;
    if (firstNonABranch) {
      const frozenPatternABase = cloneNotes(nextVariants[trackId].patternA ?? []);
      (['patternB', 'patternC'] as LoopTrackPatternPreset[]).forEach((patternId) => {
        if (patternId === currentPattern) return;
        if (nextLinks[trackId][patternId] === 'patternA') {
          nextLinks[trackId][patternId] = patternId;
          nextVariants[trackId][patternId] = cloneNotes(frozenPatternABase);
        }
      });
      nextLinks[trackId][currentPattern] = currentPattern;
    }

    PATTERNS.forEach((patternId) => {
      if ((nextLinks[trackId]?.[patternId] ?? patternId) === currentPattern) {
        nextVariants[trackId][patternId] = cloneNotes(visibleNotes);
      }
    });
  });

  return { variants: nextVariants, links: nextLinks };
}


export function createRandomDemoMelodicComposer(bars: number): LoopComposerState {
  return buildLoopComposerDemoState(bars, undefined, 'oriental');
}

export function createBuiltInMelodicProjects(bars: number): MelodicProjectChoice[] {
  const composer = createRandomDemoMelodicComposer(bars);
  const randomDemoPreset: SavedMelodicProject = {
    id: RANDOM_DEMO_MELODIC_PROJECT_ID,
    name: RANDOM_DEMO_MELODIC_PROJECT_NAME,
    composer,
    patternVariants: createGeneratedPatternVariantsFromComposer(composer),
    patternLinks: createSelfPatternLinksForTracks(composer.tracks.map((track) => track.id)),
  };
  return [{
    id: randomDemoPreset.id,
    name: randomDemoPreset.name,
    builtIn: true,
    project: randomDemoPreset,
  }];
}

export function createScratchMelodicComposer(baseComposer: LoopComposerState): SavedMelodicProject {
  const composer = cloneLoopComposerState(baseComposer);
  composer.notes = [];
  composer.selectedNoteId = null;
  composer.compositionPresetId = 'jazz';
  composer.tracks = composer.tracks.map((track) => ({ ...track, patternPresetId: 'patternA' }));
  composer.selectedTrackId = composer.tracks[0]?.id ?? composer.selectedTrackId;
  composer.activeTrackIds = composer.tracks.filter((track) => track.enabled).map((track) => track.id);
  return {
    id: 'scratch',
    name: 'Scratch',
    composer,
    patternVariants: createLinkedScratchVariantsFromComposer(composer),
    patternLinks: createLinkedScratchPatternLinks(composer.tracks.map((track) => track.id)),
  };
}

export function createDefaultScratchProject(bars: number): SavedMelodicProject {
  const composer = createEmptyLoopComposer(bars);
  return createScratchMelodicComposer(composer);
}

export function loadSavedMelodicProjects(): SavedMelodicProject[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedMelodicProject[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => ({
        id: String(entry.id),
        name: String(entry.name || 'Projekt'),
        composer: cloneLoopComposerState(entry.composer),
        patternVariants: cloneMelodicPatternVariantMap(entry.patternVariants ?? createLinkedScratchVariantsFromComposer(entry.composer)),
        patternLinks: cloneMelodicPatternLinkMap(entry.patternLinks ?? createLinkedScratchPatternLinks(entry.composer.tracks.map((track) => track.id))),
        origin: entry.origin ?? 'browserLocal',
        sourcePackageId: entry.sourcePackageId ?? null,
        syncState: entry.syncState ?? 'localOnly',
        contentHash: entry.contentHash ?? null,
      }))
      .filter((entry) => Boolean(entry.id));
  } catch (error) {
    console.warn('[xensonar][melodic-project-library][load]', error);
    return [];
  }
}

export function persistSavedMelodicProjects(projects: SavedMelodicProject[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (error) {
    console.warn('[xensonar][melodic-project-library][save]', error);
  }
}

export function createUserMelodicProjectName(existingProjects: SavedMelodicProject[]) {
  let index = 1;
  const taken = new Set(existingProjects.map((entry) => entry.name));
  while (taken.has(`Projekt ${index}`)) index += 1;
  return `Projekt ${index}`;
}
