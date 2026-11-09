import { useState } from 'react';
import type { SavedMelodicSampleMeta } from './melodicSampleLibrary';
import type { SavedMelodicProject } from './melodicProjectLibrary';
import { useCanonicalForgeLibraryPatternProjectLifecycle } from './useCanonicalForgeLibraryPatternProjectLifecycle';
import { useCanonicalForgeMelodicSampleLibraryLifecycle } from './useCanonicalForgeMelodicSampleLibraryLifecycle';
import { useCanonicalForgeLibrarySelectionDraftLifecycle } from './useCanonicalForgeLibrarySelectionDraftLifecycle';

export function useCanonicalForgeLibraryUiState(initialProjectName: string) {
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [selectedStampId, setSelectedStampId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState(() => initialProjectName);
  const [customStampName, setCustomStampName] = useState('');
  const [materialRenameDraft, setMaterialRenameDraft] = useState('');

  return {
    selectedMaterialId, setSelectedMaterialId, selectedStampId, setSelectedStampId,
    projectName, setProjectName, customStampName, setCustomStampName, materialRenameDraft, setMaterialRenameDraft,
  };
}

export function useCanonicalForgeLibraryLifecycle(args: {
  loopPatternVariants: unknown;
  loopPatternVariantsRef: { current: unknown };
  loopPatternLinks: unknown;
  loopPatternLinksRef: { current: unknown };
  savedMelodicProjects: SavedMelodicProject[];
  setMelodicSampleEntries: (entries: SavedMelodicSampleMeta[]) => void;
  setStatus: (status: string) => void;
  selectedMaterialId: string | null;
  materialEntries: { id: string }[];
  setSelectedMaterialId: (id: string | null) => void;
  selectedStampId: string | null;
  customStampEntries: { id: string }[];
  setSelectedStampId: (id: string | null) => void;
  materialExportName: string;
  setProjectName: (name: string) => void;
  selectedCustomStampName: string | null | undefined;
  projectName: string;
  setCustomStampName: (name: string) => void;
  selectedMaterialName: string | null | undefined;
  setMaterialRenameDraft: (name: string) => void;
}): void {
  useCanonicalForgeLibraryPatternProjectLifecycle({
    loopPatternVariants: args.loopPatternVariants,
    loopPatternVariantsRef: args.loopPatternVariantsRef,
    loopPatternLinks: args.loopPatternLinks,
    loopPatternLinksRef: args.loopPatternLinksRef,
    savedMelodicProjects: args.savedMelodicProjects,
  });

  useCanonicalForgeMelodicSampleLibraryLifecycle({
    setMelodicSampleEntries: args.setMelodicSampleEntries,
    setStatus: args.setStatus,
  });

  useCanonicalForgeLibrarySelectionDraftLifecycle({
    selectedMaterialId: args.selectedMaterialId,
    materialEntries: args.materialEntries,
    setSelectedMaterialId: args.setSelectedMaterialId,
    selectedStampId: args.selectedStampId,
    customStampEntries: args.customStampEntries,
    setSelectedStampId: args.setSelectedStampId,
    materialExportName: args.materialExportName,
    setProjectName: args.setProjectName,
    selectedCustomStampName: args.selectedCustomStampName,
    projectName: args.projectName,
    setCustomStampName: args.setCustomStampName,
    selectedMaterialName: args.selectedMaterialName,
    setMaterialRenameDraft: args.setMaterialRenameDraft,
  });
}
