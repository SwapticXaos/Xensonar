import type { AudioSourceAsset } from '../spectralForge/audio/AudioImporter';
import type { SpectralData, StampData } from '../spectralForge/audio/SpectralData';
import { deleteCustomStamp, renameCustomStamp, saveCustomStamp } from '../spectralForge/customStampLibrary';
import { deleteCanonicalForgeProject, renameCanonicalForgeProject, saveCanonicalForgeProject } from './projectLibrary';
import type { CanonicalForgeProjectSnapshot } from './projectLibraryTypes';
import { deleteMaterialEntry, updateMaterialEntry, type MaterialEntry } from '../materialLibrary';
import { cloneDrumComputerState, cloneGrooveMachineConfig, cloneLoopComposerState } from './loopDrumDomain';
import { cloneStampData } from './spectralWorkspaceUtils';

export type BuildCanonicalForgeProjectSnapshotArgs = {
  materialExport: CanonicalForgeProjectSnapshot['materialExport'];
  sourceAsset: AudioSourceAsset | null;
  spectralData: SpectralData;
  sourceView: CanonicalForgeProjectSnapshot['sourceView'];
  secondaryView: CanonicalForgeProjectSnapshot['secondaryView'];
  viewBlend: number;
  activeTool: CanonicalForgeProjectSnapshot['activeTool'];
  toolSettings: CanonicalForgeProjectSnapshot['toolSettings'];
  synthMode: CanonicalForgeProjectSnapshot['synthMode'];
  waveformMix: CanonicalForgeProjectSnapshot['waveformMix'];
  stampPresetId: string;
  stampData: StampData | null;
  stampScaleX: number;
  stampScaleY: number;
  stampRotation: number;
  stampFlipX: boolean;
  stampFlipY: boolean;
  selectionStartSec: number;
  selectionDurationSec: number;
  selectionDirty: boolean;
  detailSelectionStartSec: number;
  detailSelectionDurationSec: number;
  detailSelectionDirty: boolean;
  detailViewportStartSec: number;
  detailViewportDurationSec: number;
  detailZoom: number;
  detailOffset: number;
  auditionView: NonNullable<CanonicalForgeProjectSnapshot['auditionView']>;
  auditionBlendAmount: number;
  selectedProjectId: string | null;
  sourcePreviewMode: CanonicalForgeProjectSnapshot['sourcePreviewMode'];
  activeWorkspace: NonNullable<CanonicalForgeProjectSnapshot['activeWorkspace']>;
  logicView: NonNullable<CanonicalForgeProjectSnapshot['logicView']>;
  grooveMachine: CanonicalForgeProjectSnapshot['grooveMachine'];
  drumComputer: NonNullable<CanonicalForgeProjectSnapshot['drumComputer']>;
  loopComposer: CanonicalForgeProjectSnapshot['loopComposer'];
  selectedLoopNoteIds: string[];
  autoZoomOnDenseOverlap: boolean;
  lockTrackEditing: boolean;
  chordVoicing: NonNullable<CanonicalForgeProjectSnapshot['chordVoicing']>;
  chordStrumSteps: number;
  chordVelocitySlope: number;
};

export function buildCanonicalForgeProjectSnapshot(args: BuildCanonicalForgeProjectSnapshotArgs): CanonicalForgeProjectSnapshot {
  return {
    materialExport: { ...args.materialExport, guideMarkers: [...args.materialExport.guideMarkers] },
    sourceAsset: args.sourceAsset ? { ...args.sourceAsset } : null,
    spectralSnapshot: args.spectralData.cloneData(),
    sourceView: args.sourceView,
    secondaryView: args.secondaryView,
    viewBlend: args.viewBlend,
    activeTool: args.activeTool,
    toolSettings: { ...args.toolSettings },
    synthMode: args.synthMode,
    waveformMix: { ...args.waveformMix },
    stampPresetId: args.stampPresetId,
    stampData: cloneStampData(args.stampData),
    stampScaleX: args.stampScaleX,
    stampScaleY: args.stampScaleY,
    stampRotation: args.stampRotation,
    stampFlipX: args.stampFlipX,
    stampFlipY: args.stampFlipY,
    selectionStartSec: args.selectionStartSec,
    selectionDurationSec: args.selectionDurationSec,
    selectionDirty: args.selectionDirty,
    detailSelectionStartSec: args.detailSelectionStartSec,
    detailSelectionDurationSec: args.detailSelectionDurationSec,
    detailSelectionDirty: args.detailSelectionDirty,
    detailViewportStartSec: args.detailViewportStartSec,
    detailViewportDurationSec: args.detailViewportDurationSec,
    detailZoom: args.detailZoom,
    detailOffset: args.detailOffset,
    auditionView: args.auditionView,
    auditionBlendAmount: args.auditionBlendAmount,
    selectedProjectId: args.selectedProjectId,
    sourcePreviewMode: args.sourcePreviewMode,
    activeWorkspace: args.activeWorkspace,
    logicView: args.logicView,
    grooveMachine: cloneGrooveMachineConfig(args.grooveMachine),
    drumComputer: cloneDrumComputerState(args.drumComputer),
    loopComposer: cloneLoopComposerState(args.loopComposer),
    selectedLoopNoteIds: [...args.selectedLoopNoteIds],
    autoZoomOnDenseOverlap: args.autoZoomOnDenseOverlap,
    lockTrackEditing: args.lockTrackEditing,
    chordVoicing: args.chordVoicing,
    chordStrumSteps: args.chordStrumSteps,
    chordVelocitySlope: args.chordVelocitySlope,
  };
}

type CommonActionArgs = {
  setBusy: (busy: boolean) => void;
  setStatus: (status: string) => void;
};

export async function saveForgeProjectToLibrary(args: CommonActionArgs & {
  overwrite?: boolean;
  selectedProjectId: string | null;
  projectName: string;
  fallbackProjectName: string;
  snapshot: CanonicalForgeProjectSnapshot;
  materialRole: CanonicalForgeProjectSnapshot['materialExport']['role'];
  syncProjectMaterialToXensonar: (projectId: string, projectLabel: string) => Promise<void>;
  setSelectedProjectId: (projectId: string | null) => void;
  setProjectName: (projectName: string) => void;
}) {
  const {
    overwrite = false,
    selectedProjectId,
    projectName,
    fallbackProjectName,
    snapshot,
    materialRole,
    syncProjectMaterialToXensonar,
    setSelectedProjectId,
    setProjectName,
    setBusy,
    setStatus,
  } = args;
  setBusy(true);
  try {
    const meta = await saveCanonicalForgeProject({
      id: overwrite ? (selectedProjectId ?? undefined) : undefined,
      name: projectName || fallbackProjectName,
      snapshot,
    });
    setSelectedProjectId(meta.id);
    setProjectName(meta.name);
    if (materialRole === 'loop') {
      try {
        await syncProjectMaterialToXensonar(meta.id, meta.name);
        setStatus(`Forge-2-Projekt gespeichert und Materialspur aktualisiert: ${meta.name}`);
      } catch (syncError) {
        console.error('[xensonar][forge2][project-material-sync]', syncError);
        setStatus(`Forge-2-Projekt gespeichert, aber Materialspur-Sync fehlgeschlagen: ${meta.name}`);
      }
    } else {
      setStatus(`Forge-2-Projekt gespeichert: ${meta.name}`);
    }
  } catch (error) {
    console.error(error);
    setStatus('Forge-2-Projekt konnte nicht gespeichert werden.');
  } finally {
    setBusy(false);
  }
}

export async function removeForgeProjectFromLibrary(args: CommonActionArgs & {
  selectedProjectId: string | null;
  setSelectedProjectId: (projectId: string | null) => void;
}) {
  const { selectedProjectId, setSelectedProjectId, setBusy, setStatus } = args;
  if (!selectedProjectId) return;
  setBusy(true);
  try {
    await deleteCanonicalForgeProject(selectedProjectId);
    setSelectedProjectId(null);
    setStatus('Forge-2-Projekt gelöscht.');
  } catch (error) {
    console.error(error);
    setStatus('Forge-2-Projekt konnte nicht gelöscht werden.');
  } finally {
    setBusy(false);
  }
}

export async function renameForgeProjectInLibrary(args: CommonActionArgs & {
  selectedProjectId: string | null;
  projectName: string;
  setProjectName: (projectName: string) => void;
}) {
  const { selectedProjectId, projectName, setProjectName, setBusy, setStatus } = args;
  if (!selectedProjectId) return;
  setBusy(true);
  try {
    const meta = await renameCanonicalForgeProject(selectedProjectId, projectName);
    setProjectName(meta.name);
    setStatus(`Forge-2-Projekt umbenannt: ${meta.name}`);
  } catch (error) {
    console.error(error);
    setStatus('Forge-2-Projekt konnte nicht umbenannt werden.');
  } finally {
    setBusy(false);
  }
}

export async function renameCustomStampInLibrary(args: CommonActionArgs & {
  selectedStampId: string | null;
  customStampName: string;
  setCustomStampName: (name: string) => void;
}) {
  const { selectedStampId, customStampName, setCustomStampName, setBusy, setStatus } = args;
  if (!selectedStampId) return;
  setBusy(true);
  try {
    const entry = await renameCustomStamp(selectedStampId, customStampName);
    setCustomStampName(entry.name);
    setStatus(`Custom-Stempel umbenannt: ${entry.name}`);
  } catch (error) {
    console.error(error);
    setStatus('Custom-Stempel konnte nicht umbenannt werden.');
  } finally {
    setBusy(false);
  }
}

export async function saveCurrentStampToLibrary(args: CommonActionArgs & {
  overwrite?: boolean;
  selectedStampId: string | null;
  customStampName: string;
  projectName: string;
  stampData: StampData | null;
  setSelectedStampId: (stampId: string | null) => void;
}) {
  const {
    overwrite = false,
    selectedStampId,
    customStampName,
    projectName,
    stampData,
    setSelectedStampId,
    setBusy,
    setStatus,
  } = args;
  if (!stampData) {
    setStatus('Kein Stempel zum Sichern vorhanden.');
    return;
  }
  setBusy(true);
  try {
    const entry = await saveCustomStamp({
      id: overwrite ? (selectedStampId ?? undefined) : undefined,
      name: customStampName || `${projectName}-stamp`,
      stamp: stampData,
    });
    setSelectedStampId(entry.id);
    setStatus(`Stempel gespeichert: ${entry.name}`);
  } catch (error) {
    console.error(error);
    setStatus('Stempel konnte nicht gespeichert werden.');
  } finally {
    setBusy(false);
  }
}

export function loadSelectedCustomStamp(args: {
  selectedCustomStamp: { id: string; name: string; stamp: StampData } | null;
  loadStampForPlacement: (stamp: StampData, options?: { status?: string; loadedFromMode?: 'positive' | 'erase' }) => void;
  setStampPresetId: (stampId: string) => void;
  setActiveTool: (tool: 'stamp') => void;
}) {
  const { selectedCustomStamp, loadStampForPlacement, setStampPresetId, setActiveTool } = args;
  if (!selectedCustomStamp) return;
  loadStampForPlacement(selectedCustomStamp.stamp, { status: `Custom-Stempel geladen: ${selectedCustomStamp.name}` });
  setStampPresetId(selectedCustomStamp.id);
  setActiveTool('stamp');
}

export async function removeCustomStampFromLibrary(args: CommonActionArgs & {
  selectedStampId: string | null;
  setSelectedStampId: (stampId: string | null) => void;
}) {
  const { selectedStampId, setSelectedStampId, setBusy, setStatus } = args;
  if (!selectedStampId) return;
  setBusy(true);
  try {
    await deleteCustomStamp(selectedStampId);
    setSelectedStampId(null);
    setStatus('Custom-Stempel gelöscht.');
  } catch (error) {
    console.error(error);
    setStatus('Custom-Stempel konnte nicht gelöscht werden.');
  } finally {
    setBusy(false);
  }
}

export async function renameMaterialDatabaseEntry(args: CommonActionArgs & {
  selectedMaterial: MaterialEntry | null;
  materialRenameDraft: string;
  materialRole: MaterialEntry['role'];
  setMaterialRenameDraft: (name: string) => void;
}) {
  const { selectedMaterial, materialRenameDraft, materialRole, setMaterialRenameDraft, setBusy, setStatus } = args;
  if (!selectedMaterial) return;
  setBusy(true);
  try {
    const next = await updateMaterialEntry(selectedMaterial.id, {
      name: materialRenameDraft || selectedMaterial.name,
      role: materialRole,
    });
    setMaterialRenameDraft(next.name);
    setStatus('Materialdatenbank-Eintrag aktualisiert.');
  } catch (error) {
    console.error(error);
    setStatus('Materialdatenbank konnte nicht aktualisiert werden.');
  } finally {
    setBusy(false);
  }
}

export async function removeMaterialDatabaseEntry(args: CommonActionArgs & {
  selectedMaterial: MaterialEntry | null;
  setSelectedMaterialId: (materialId: string | null) => void;
}) {
  const { selectedMaterial, setSelectedMaterialId, setBusy, setStatus } = args;
  if (!selectedMaterial) return;
  setBusy(true);
  try {
    await deleteMaterialEntry(selectedMaterial.id);
    setSelectedMaterialId(null);
    setStatus('Material aus Datenbank gelöscht.');
  } catch (error) {
    console.error(error);
    setStatus('Material konnte nicht gelöscht werden.');
  } finally {
    setBusy(false);
  }
}
