import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { SavedMelodicSampleMeta } from './melodicSampleLibrary';
import type { LoopTrackInstrumentPreset } from './melodicSoundRegistry';
import type { MutateLoopComposer } from './canonicalMelodicComposerStateController';
import type { LoopComposerState, LoopTrackPatternPreset } from './loopDrumDomain';
import type { MelodicPatternLinkMap, MelodicPatternVariantMap } from './melodicProjectLibrary';
import {
  applyTrackPatternPresetAction,
  freezeTrackPatternVariantsFromVisibleAction,
  onlyYouTrackAction,
  resetTrackPatternAction,
  setLoopTrackInstrumentPresetAction,
  toggleLoopTrackEnabledAction,
} from './melodicPatternVariantController';

export function createCanonicalMelodicTrackActionController(args: {
  loopComposer: LoopComposerState;
  melodicSampleEntries: SavedMelodicSampleMeta[];
  loopPatternVariantsRef: MutableRefObject<MelodicPatternVariantMap>;
  loopPatternLinksRef: MutableRefObject<MelodicPatternLinkMap>;
  setLoopPatternVariants: Dispatch<SetStateAction<MelodicPatternVariantMap>>;
  setLoopPatternLinks: Dispatch<SetStateAction<MelodicPatternLinkMap>>;
  mutateLoopComposer: MutateLoopComposer;
  previewTrackInstrumentSelection: (trackId: string, preset: LoopTrackInstrumentPreset) => Promise<void> | void;
}) {
  const freezeTrackPatternVariantsFromVisible = (trackId: string, stores?: { variants: MelodicPatternVariantMap; links: MelodicPatternLinkMap }) => (
    freezeTrackPatternVariantsFromVisibleAction({
      trackId,
      loopComposer: args.loopComposer,
      stores,
      loopPatternVariantsRef: args.loopPatternVariantsRef,
      loopPatternLinksRef: args.loopPatternLinksRef,
      setLoopPatternVariants: args.setLoopPatternVariants,
      setLoopPatternLinks: args.setLoopPatternLinks,
    })
  );

  const resetTrackPattern = (trackId: string, patternPresetId?: LoopTrackPatternPreset) => {
    resetTrackPatternAction({
      trackId,
      patternPresetId,
      loopComposer: args.loopComposer,
      mutateLoopComposer: args.mutateLoopComposer,
    });
  };

  const applyTrackPatternPreset = (trackId: string, patternPresetId: LoopTrackPatternPreset) => {
    const preparedStores = freezeTrackPatternVariantsFromVisible(trackId);
    applyTrackPatternPresetAction({
      trackId,
      patternPresetId,
      loopComposer: args.loopComposer,
      stores: preparedStores,
      mutateLoopComposer: args.mutateLoopComposer,
    });
  };

  const setLoopTrackInstrumentPreset = (trackId: string, preset: LoopTrackInstrumentPreset) => {
    setLoopTrackInstrumentPresetAction({
      trackId,
      preset,
      melodicSampleEntries: args.melodicSampleEntries,
      loopComposer: args.loopComposer,
      mutateLoopComposer: args.mutateLoopComposer,
      previewTrackInstrumentSelection: args.previewTrackInstrumentSelection,
    });
  };

  const toggleLoopTrackEnabled = (trackId: string) => {
    toggleLoopTrackEnabledAction({
      trackId,
      loopPatternVariantsRef: args.loopPatternVariantsRef,
      loopPatternLinksRef: args.loopPatternLinksRef,
      mutateLoopComposer: args.mutateLoopComposer,
    });
  };

  const onlyYouTrack = (trackId: string) => {
    onlyYouTrackAction({
      trackId,
      loopComposer: args.loopComposer,
      loopPatternVariantsRef: args.loopPatternVariantsRef,
      loopPatternLinksRef: args.loopPatternLinksRef,
      mutateLoopComposer: args.mutateLoopComposer,
    });
  };

  return {
    freezeTrackPatternVariantsFromVisible,
    resetTrackPattern,
    applyTrackPatternPreset,
    setLoopTrackInstrumentPreset,
    toggleLoopTrackEnabled,
    onlyYouTrack,
  };
}
