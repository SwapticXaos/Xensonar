import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { SavedMelodicSampleMeta } from './melodicSampleLibrary';
import { getMelodicSoundDisplayLabel } from './melodicSoundRegistry';
import {
  cloneMelodicPatternLinkMap,
  cloneMelodicPatternVariantMap,
  resolveVariantNotes,
} from './melodicProjectLibrary';
import {
  commitMelodicPatternStores,
  createLinkedPatternLink,
  createSelfPatternLink,
  type MelodicPatternLinkMap,
  type MelodicPatternStores,
  type MelodicPatternVariantMap,
} from './melodicPatternStoreContract';
import {
  applyLoopTrackPatternPreset,
  composerTrackById,
  defaultLoopTrackPatternPreset,
  noteStartUnit,
  syncLoopNoteToState,
  type LoopComposerState,
  type LoopTrackPatternPreset,
} from './loopDrumDomain';
import type { LoopTrackInstrumentPreset } from './melodicSoundRegistry';

type MutateLoopComposer = (updater: (draft: LoopComposerState) => void, statusMessage?: string, options?: { history?: boolean }) => void;

type StoreSyncArgs = {
  loopComposer: LoopComposerState;
  stores?: MelodicPatternStores;
  loopPatternVariantsRef: MutableRefObject<MelodicPatternVariantMap>;
  loopPatternLinksRef: MutableRefObject<MelodicPatternLinkMap>;
  setLoopPatternVariants: Dispatch<SetStateAction<MelodicPatternVariantMap>>;
  setLoopPatternLinks: Dispatch<SetStateAction<MelodicPatternLinkMap>>;
};

export function freezeTrackPatternVariantsFromVisibleAction(args: StoreSyncArgs & { trackId: string }): MelodicPatternStores {
  const baseStores = args.stores ?? {
    variants: args.loopPatternVariantsRef.current,
    links: args.loopPatternLinksRef.current,
  };
  const trackLinks = baseStores.links[args.trackId] ?? createLinkedPatternLink();
  const needsFreeze = trackLinks.patternA !== 'patternA' || trackLinks.patternB !== 'patternB' || trackLinks.patternC !== 'patternC';
  if (!needsFreeze) return baseStores;

  const nextVariants = cloneMelodicPatternVariantMap(baseStores.variants);
  const nextLinks = cloneMelodicPatternLinkMap(baseStores.links);
  const visibleNotes = args.loopComposer.notes
    .filter((note) => note.trackId === args.trackId)
    .map((note) => ({ ...note }));

  nextVariants[args.trackId] = {
    patternA: visibleNotes.map((note) => ({ ...note })),
    patternB: visibleNotes.map((note) => ({ ...note })),
    patternC: visibleNotes.map((note) => ({ ...note })),
  };
  nextLinks[args.trackId] = createSelfPatternLink();
  return commitMelodicPatternStores({
    stores: { variants: nextVariants, links: nextLinks },
    patternVariantsRef: args.loopPatternVariantsRef,
    patternLinksRef: args.loopPatternLinksRef,
    setLoopPatternVariants: args.setLoopPatternVariants,
    setLoopPatternLinks: args.setLoopPatternLinks,
  });
}

export function applyTrackPatternPresetAction(args: {
  trackId: string;
  patternPresetId: LoopTrackPatternPreset;
  loopComposer: LoopComposerState;
  stores: MelodicPatternStores;
  mutateLoopComposer: MutateLoopComposer;
}) {
  args.mutateLoopComposer((draft) => {
    const track = draft.tracks.find((entry) => entry.id === args.trackId);
    if (!track) return;
    track.patternPresetId = args.patternPresetId;
    track.enabled = true;
    draft.notes = draft.notes.filter((note) => note.trackId !== args.trackId);
    const resolvedNotes = resolveVariantNotes(args.stores.variants, args.stores.links, args.trackId, args.patternPresetId)
      .map((note) => syncLoopNoteToState(draft, { ...note, trackId: args.trackId }));
    draft.notes.push(...resolvedNotes);
    draft.notes.sort((a, b) => noteStartUnit(draft, a) - noteStartUnit(draft, b));
    if (!draft.activeTrackIds.includes(args.trackId)) draft.activeTrackIds.push(args.trackId);
    draft.selectedTrackId = args.trackId;
    draft.selectedNoteId = draft.notes.find((note) => note.trackId === args.trackId)?.id ?? null;
  }, `Muster für ${composerTrackById(args.loopComposer, args.trackId)?.label ?? args.trackId} gesetzt.`);
}

export function toggleLoopTrackEnabledAction(args: {
  trackId: string;
  loopPatternVariantsRef: MutableRefObject<MelodicPatternVariantMap>;
  loopPatternLinksRef: MutableRefObject<MelodicPatternLinkMap>;
  mutateLoopComposer: MutateLoopComposer;
}) {
  args.mutateLoopComposer((draft) => {
    const track = draft.tracks.find((entry) => entry.id === args.trackId);
    if (!track) return;
    track.enabled = !track.enabled;
    if (!draft.activeTrackIds.includes(args.trackId)) draft.activeTrackIds.push(args.trackId);
    if (track.enabled && !draft.notes.some((note) => note.trackId === args.trackId)) {
      const nextPattern = track.patternPresetId ?? defaultLoopTrackPatternPreset(args.trackId);
      const restoredNotes = resolveVariantNotes(args.loopPatternVariantsRef.current, args.loopPatternLinksRef.current, args.trackId, nextPattern)
        .map((note) => syncLoopNoteToState(draft, { ...note, trackId: args.trackId }));
      draft.notes.push(...restoredNotes);
      draft.notes.sort((a, b) => noteStartUnit(draft, a) - noteStartUnit(draft, b));
      return;
    }
    draft.selectedTrackId = args.trackId;
    draft.selectedNoteId = draft.notes.find((note) => note.trackId === args.trackId)?.id ?? null;
  }, undefined);
}

export function onlyYouTrackAction(args: {
  trackId: string;
  loopComposer: LoopComposerState;
  loopPatternVariantsRef: MutableRefObject<MelodicPatternVariantMap>;
  loopPatternLinksRef: MutableRefObject<MelodicPatternLinkMap>;
  mutateLoopComposer: MutateLoopComposer;
}) {
  args.mutateLoopComposer((draft) => {
    let targetFound = false;
    draft.tracks.forEach((track) => {
      const shouldEnable = track.id === args.trackId;
      track.enabled = shouldEnable;
      if (shouldEnable) {
        targetFound = true;
        if (!draft.notes.some((note) => note.trackId === args.trackId)) {
          const nextPattern = track.patternPresetId ?? defaultLoopTrackPatternPreset(args.trackId);
          const restoredNotes = resolveVariantNotes(args.loopPatternVariantsRef.current, args.loopPatternLinksRef.current, args.trackId, nextPattern)
            .map((note) => syncLoopNoteToState(draft, { ...note, trackId: args.trackId }));
          draft.notes.push(...restoredNotes);
          draft.notes.sort((a, b) => noteStartUnit(draft, a) - noteStartUnit(draft, b));
        }
      }
    });
    if (!targetFound) return;
    if (!draft.activeTrackIds.includes(args.trackId)) draft.activeTrackIds.push(args.trackId);
    draft.selectedTrackId = args.trackId;
    draft.selectedNoteId = draft.notes.find((note) => note.trackId === args.trackId)?.id ?? null;
  }, `${composerTrackById(args.loopComposer, args.trackId)?.label ?? args.trackId}: nur diese Spur aktiv.`, { history: false });
}


export function resetTrackPatternAction(args: {
  trackId: string;
  loopComposer: LoopComposerState;
  mutateLoopComposer: MutateLoopComposer;
  patternPresetId?: LoopTrackPatternPreset;
}) {
  args.mutateLoopComposer((draft) => {
    const nextPattern = args.patternPresetId ?? draft.tracks.find((track) => track.id === args.trackId)?.patternPresetId ?? defaultLoopTrackPatternPreset(args.trackId);
    applyLoopTrackPatternPreset(draft, args.trackId, nextPattern);
  }, `Instrument ${Math.max(1, args.loopComposer.tracks.findIndex((track) => track.id === args.trackId) + 1)} auf Muster zurückgesetzt.`);
}

export function setLoopTrackInstrumentPresetAction(args: {
  trackId: string;
  preset: LoopTrackInstrumentPreset;
  melodicSampleEntries: SavedMelodicSampleMeta[];
  loopComposer: LoopComposerState;
  mutateLoopComposer: MutateLoopComposer;
  previewTrackInstrumentSelection: (trackId: string, preset: LoopTrackInstrumentPreset) => Promise<void> | void;
}) {
  const label = getMelodicSoundDisplayLabel(args.preset, args.melodicSampleEntries);
  args.mutateLoopComposer((draft) => {
    const track = draft.tracks.find((entry) => entry.id === args.trackId);
    if (track) {
      track.instrumentPreset = args.preset;
      track.enabled = true;
    }
    draft.selectedTrackId = args.trackId;
    if (!draft.activeTrackIds.includes(args.trackId)) draft.activeTrackIds.push(args.trackId);
  }, `${composerTrackById(args.loopComposer, args.trackId)?.label ?? args.trackId}: ${label}.`);
  void args.previewTrackInstrumentSelection(args.trackId, args.preset);
}
