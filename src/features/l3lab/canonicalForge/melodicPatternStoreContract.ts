import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { cloneLoopComposerState, type LoopComposerState } from './loopDrumDomain';
import {
  cloneMelodicPatternLinkMap,
  cloneMelodicPatternVariantMap,
  createGeneratedPatternVariantsFromComposer,
  createSelfPatternLinksForTracks,
  type MelodicPatternLinkMap,
  type MelodicPatternVariantMap,
} from './melodicProjectLibrary';

export type { MelodicPatternLinkMap, MelodicPatternVariantMap } from './melodicProjectLibrary';

export type MelodicPatternStores = {
  variants: MelodicPatternVariantMap;
  links: MelodicPatternLinkMap;
};

export type LoopComposerWorkspaceSnapshot = {
  composer: LoopComposerState;
  patternVariants: MelodicPatternVariantMap;
  patternLinks: MelodicPatternLinkMap;
  selectedMelodicProjectId: string;
};

export type MelodicPatternStoreRefs = {
  patternVariantsRef: MutableRefObject<MelodicPatternVariantMap>;
  patternLinksRef: MutableRefObject<MelodicPatternLinkMap>;
};

export type MelodicPatternStoreSetters = {
  setLoopPatternVariants: Dispatch<SetStateAction<MelodicPatternVariantMap>>;
  setLoopPatternLinks: Dispatch<SetStateAction<MelodicPatternLinkMap>>;
};

export {
  createLinkedPatternLink,
  createSelfPatternLink,
  createSelfPatternLinksForTracks,
} from './melodicProjectLibrary';

export function readMelodicPatternStores(args: MelodicPatternStoreRefs): MelodicPatternStores {
  return {
    variants: args.patternVariantsRef.current,
    links: args.patternLinksRef.current,
  };
}

export function cloneMelodicPatternStores(stores: MelodicPatternStores): MelodicPatternStores {
  return {
    variants: cloneMelodicPatternVariantMap(stores.variants),
    links: cloneMelodicPatternLinkMap(stores.links),
  };
}

export function commitMelodicPatternStores(args: MelodicPatternStoreRefs & MelodicPatternStoreSetters & { stores: MelodicPatternStores }): MelodicPatternStores {
  args.patternVariantsRef.current = args.stores.variants;
  args.patternLinksRef.current = args.stores.links;
  args.setLoopPatternVariants(args.stores.variants);
  args.setLoopPatternLinks(args.stores.links);
  return args.stores;
}

export function createGeneratedMelodicPatternStoresFromComposer(composer: LoopComposerState): MelodicPatternStores {
  return {
    variants: createGeneratedPatternVariantsFromComposer(composer),
    links: createSelfPatternLinksForTracks(composer.tracks.map((track) => track.id)),
  };
}

export function cloneLoopComposerWorkspaceSnapshot(snapshot: LoopComposerWorkspaceSnapshot): LoopComposerWorkspaceSnapshot {
  return {
    composer: cloneLoopComposerState(snapshot.composer),
    patternVariants: cloneMelodicPatternVariantMap(snapshot.patternVariants),
    patternLinks: cloneMelodicPatternLinkMap(snapshot.patternLinks),
    selectedMelodicProjectId: snapshot.selectedMelodicProjectId,
  };
}

export function createLoopComposerWorkspaceSnapshot(args: LoopComposerWorkspaceSnapshot): LoopComposerWorkspaceSnapshot {
  return cloneLoopComposerWorkspaceSnapshot(args);
}
