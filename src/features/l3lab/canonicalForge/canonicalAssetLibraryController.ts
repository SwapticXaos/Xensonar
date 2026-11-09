import type { MutableRefObject } from 'react';
import type { StampData } from '../spectralForge/audio/SpectralData';
import type { MaterialEntry } from '../materialLibrary';
import { previewMaterial as previewForgeMaterial } from './previewControllers';
import {
  loadSelectedCustomStamp,
  removeCustomStampFromLibrary,
  removeMaterialDatabaseEntry,
  renameCustomStampInLibrary,
  renameMaterialDatabaseEntry,
  saveCurrentStampToLibrary,
} from './workspaceLibraryActions';

export function createCanonicalAssetLibraryController(args: {
  audioPreviewRef: MutableRefObject<HTMLAudioElement | null>;
  selectedStampId: string | null;
  customStampName: string;
  projectName: string;
  stampData: StampData | null;
  selectedCustomStamp: { id: string; name: string; stamp: StampData } | null;
  selectedMaterial: MaterialEntry | null;
  materialRenameDraft: string;
  materialRole: MaterialEntry['role'];
  setSelectedStampId: (stampId: string | null) => void;
  setCustomStampName: (name: string) => void;
  setActiveTool: (tool: 'stamp') => void;
  setStampPresetId: (stampId: string) => void;
  setMaterialRenameDraft: (name: string) => void;
  setSelectedMaterialId: (materialId: string | null) => void;
  setBusy: (busy: boolean) => void;
  setStatus: (status: string) => void;
  loadStampForPlacement: (stamp: StampData, options?: { status?: string; loadedFromMode?: 'positive' | 'erase' }) => void;
}) {
  function previewMaterial(blobUrl: string) {
    previewForgeMaterial({ audioPreviewRef: args.audioPreviewRef }, blobUrl);
  }

  async function renameCurrentCustomStamp() {
    return renameCustomStampInLibrary({
      selectedStampId: args.selectedStampId,
      customStampName: args.customStampName,
      setCustomStampName: args.setCustomStampName,
      setBusy: args.setBusy,
      setStatus: args.setStatus,
    });
  }

  async function saveCurrentStampToLibraryAction(overwrite = false) {
    return saveCurrentStampToLibrary({
      overwrite,
      selectedStampId: args.selectedStampId,
      customStampName: args.customStampName,
      projectName: args.projectName,
      stampData: args.stampData,
      setSelectedStampId: args.setSelectedStampId,
      setBusy: args.setBusy,
      setStatus: args.setStatus,
    });
  }

  function loadCustomStampFromLibrary() {
    return loadSelectedCustomStamp({
      selectedCustomStamp: args.selectedCustomStamp,
      loadStampForPlacement: args.loadStampForPlacement,
      setStampPresetId: args.setStampPresetId,
      setActiveTool: args.setActiveTool,
    });
  }

  async function removeCustomStampFromLibraryAction() {
    return removeCustomStampFromLibrary({
      selectedStampId: args.selectedStampId,
      setSelectedStampId: args.setSelectedStampId,
      setBusy: args.setBusy,
      setStatus: args.setStatus,
    });
  }

  async function renameSelectedMaterial() {
    return renameMaterialDatabaseEntry({
      selectedMaterial: args.selectedMaterial,
      materialRenameDraft: args.materialRenameDraft,
      materialRole: args.materialRole,
      setMaterialRenameDraft: args.setMaterialRenameDraft,
      setBusy: args.setBusy,
      setStatus: args.setStatus,
    });
  }

  async function removeSelectedMaterial() {
    return removeMaterialDatabaseEntry({
      selectedMaterial: args.selectedMaterial,
      setSelectedMaterialId: args.setSelectedMaterialId,
      setBusy: args.setBusy,
      setStatus: args.setStatus,
    });
  }

  return {
    previewMaterial,
    renameCurrentCustomStamp,
    saveCurrentStampToLibraryAction,
    loadCustomStampFromLibrary,
    removeCustomStampFromLibraryAction,
    renameSelectedMaterial,
    removeSelectedMaterial,
  };
}
