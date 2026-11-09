import { useEffect } from 'react';
import { persistSavedMelodicProjects, type SavedMelodicProject } from './melodicProjectLibrary';

export function useCanonicalForgeLibraryPatternProjectLifecycle(args: {
  loopPatternVariants: unknown;
  loopPatternVariantsRef: { current: unknown };
  loopPatternLinks: unknown;
  loopPatternLinksRef: { current: unknown };
  savedMelodicProjects: SavedMelodicProject[];
}): void {
  const {
    loopPatternVariants,
    loopPatternVariantsRef,
    loopPatternLinks,
    loopPatternLinksRef,
    savedMelodicProjects,
  } = args;

  useEffect(() => {
    loopPatternVariantsRef.current = loopPatternVariants;
  }, [loopPatternVariants, loopPatternVariantsRef]);

  useEffect(() => {
    loopPatternLinksRef.current = loopPatternLinks;
  }, [loopPatternLinks, loopPatternLinksRef]);

  useEffect(() => {
    persistSavedMelodicProjects(savedMelodicProjects);
  }, [savedMelodicProjects]);
}
