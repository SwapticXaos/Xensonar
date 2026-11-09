import { useEffect } from 'react';

export function useCanonicalForgeLibrarySelectionDraftLifecycle(args: {
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
  const {
    selectedMaterialId,
    materialEntries,
    setSelectedMaterialId,
    selectedStampId,
    customStampEntries,
    setSelectedStampId,
    materialExportName,
    setProjectName,
    selectedCustomStampName,
    projectName,
    setCustomStampName,
    selectedMaterialName,
    setMaterialRenameDraft,
  } = args;

  useEffect(() => {
    if (!selectedMaterialId && materialEntries.length > 0) setSelectedMaterialId(materialEntries[0].id);
  }, [materialEntries, selectedMaterialId, setSelectedMaterialId]);

  useEffect(() => {
    if (!selectedStampId && customStampEntries.length > 0) setSelectedStampId(customStampEntries[0].id);
  }, [customStampEntries, selectedStampId, setSelectedStampId]);

  useEffect(() => {
    setProjectName(materialExportName);
  }, [materialExportName, setProjectName]);

  useEffect(() => {
    setCustomStampName(selectedCustomStampName ?? `${projectName || 'forge2'}-stamp`);
  }, [selectedCustomStampName, projectName, setCustomStampName]);

  useEffect(() => {
    setMaterialRenameDraft(selectedMaterialName ?? materialExportName);
  }, [selectedMaterialName, materialExportName, setMaterialRenameDraft]);
}
