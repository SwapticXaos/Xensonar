import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { WorkspacePackageDownloadPrepareArgs } from '../../../core/systemMemory/xensonarPackageStationBridge';
import type { CanonicalForgeWorkspace, CanonicalLogicView } from './sessionTypes';
import type { SavedMelodicSampleMeta } from './melodicSampleLibrary';
import {
  applyPatternVariantsToComposer,
  cloneMelodicPatternLinkMap,
  cloneMelodicPatternVariantMap,
  createScratchMelodicComposer,
  createUserMelodicProjectName,
  type SavedMelodicProject,
} from './melodicProjectLibrary';
import {
  cloneMelodicPatternStores,
  commitMelodicPatternStores,
  createLoopComposerWorkspaceSnapshot,
  readMelodicPatternStores,
  type LoopComposerWorkspaceSnapshot,
  type MelodicPatternLinkMap,
  type MelodicPatternStores,
  type MelodicPatternVariantMap,
} from './melodicPatternStoreContract';
import {
  exportMelodicWorkspaceArchiveAction,
  hashProjectPayload,
  importMelodicWorkspaceArchiveAction,
  prepareMelodicWorkspaceArchiveDownloadAction,
} from './melodicWorkspaceArchiveActions';
import type { WorkspacePackageImportMode } from '../../../core/systemMemory/packageCore';
import { cloneLoopComposerState, type LoopComposerState } from './loopDrumDomain';

export type MelodicProjectChoiceLike = {
  id: string;
  name: string;
  builtIn: boolean;
  project: SavedMelodicProject;
};

export function createMelodicProjectWorkspaceController(args: {
  melodicProjectChoices: MelodicProjectChoiceLike[];
  selectedMelodicProjectId: string;
  savedMelodicProjects: SavedMelodicProject[];
  melodicSampleEntries: SavedMelodicSampleMeta[];
  loopComposer: LoopComposerState;
  loopPatternVariantsRef: MutableRefObject<MelodicPatternVariantMap>;
  loopPatternLinksRef: MutableRefObject<MelodicPatternLinkMap>;
  pushLoopComposerUndo: (snapshot: LoopComposerWorkspaceSnapshot) => void;
  syncVisiblePatternStores: () => MelodicPatternStores;
  applyLogicView: (nextView: CanonicalLogicView) => void;
  setLoopComposer: Dispatch<SetStateAction<LoopComposerState>>;
  setLoopPatternVariants: Dispatch<SetStateAction<MelodicPatternVariantMap>>;
  setLoopPatternLinks: Dispatch<SetStateAction<MelodicPatternLinkMap>>;
  setSelectedMelodicProjectId: Dispatch<SetStateAction<string>>;
  setSelectedLoopNoteIds: Dispatch<SetStateAction<string[]>>;
  setSavedMelodicProjects: Dispatch<SetStateAction<SavedMelodicProject[]>>;
  setMelodicSampleEntries: Dispatch<SetStateAction<SavedMelodicSampleMeta[]>>;
  setActiveWorkspace: Dispatch<SetStateAction<CanonicalForgeWorkspace>>;
  setStatus: (status: string) => void;
}) {
  function loadMelodicProject(projectId: string) {
    if (!projectId) {
      args.setSelectedMelodicProjectId('');
      return;
    }
    const choice = args.melodicProjectChoices.find((entry) => entry.id === projectId);
    if (!choice) return;
    const currentStores = readMelodicPatternStores({
      patternVariantsRef: args.loopPatternVariantsRef,
      patternLinksRef: args.loopPatternLinksRef,
    });
    args.pushLoopComposerUndo(createLoopComposerWorkspaceSnapshot({
      composer: args.loopComposer,
      patternVariants: currentStores.variants,
      patternLinks: currentStores.links,
      selectedMelodicProjectId: args.selectedMelodicProjectId,
    }));
    const restoredComposer = applyPatternVariantsToComposer(choice.project.composer, choice.project.patternVariants, choice.project.patternLinks);
    const restoredStores = cloneMelodicPatternStores({ variants: choice.project.patternVariants, links: choice.project.patternLinks });
    args.setLoopComposer(restoredComposer);
    commitMelodicPatternStores({
      stores: restoredStores,
      patternVariantsRef: args.loopPatternVariantsRef,
      patternLinksRef: args.loopPatternLinksRef,
      setLoopPatternVariants: args.setLoopPatternVariants,
      setLoopPatternLinks: args.setLoopPatternLinks,
    });
    args.setSelectedMelodicProjectId(choice.id);
    args.setSelectedLoopNoteIds(restoredComposer.selectedNoteId ? [restoredComposer.selectedNoteId] : []);
    args.setStatus(`${choice.name} geladen.`);
  }

  function composeMelodicFromScratch() {
    const currentStores = readMelodicPatternStores({
      patternVariantsRef: args.loopPatternVariantsRef,
      patternLinksRef: args.loopPatternLinksRef,
    });
    args.pushLoopComposerUndo(createLoopComposerWorkspaceSnapshot({
      composer: args.loopComposer,
      patternVariants: currentStores.variants,
      patternLinks: currentStores.links,
      selectedMelodicProjectId: args.selectedMelodicProjectId,
    }));
    const scratchProject = createScratchMelodicComposer(args.loopComposer);
    args.setLoopComposer(scratchProject.composer);
    commitMelodicPatternStores({
      stores: { variants: scratchProject.patternVariants, links: scratchProject.patternLinks },
      patternVariantsRef: args.loopPatternVariantsRef,
      patternLinksRef: args.loopPatternLinksRef,
      setLoopPatternVariants: args.setLoopPatternVariants,
      setLoopPatternLinks: args.setLoopPatternLinks,
    });
    args.setSelectedMelodicProjectId('');
    args.setSelectedLoopNoteIds([]);
    args.setStatus('Melodic Forge geleert. Muster A, B und C starten jetzt gemeinsam und verzweigen erst beim Bearbeiten.');
  }

  function saveMelodicProject() {
    const synced = args.syncVisiblePatternStores();
    const existing = args.savedMelodicProjects.find((entry) => entry.id === args.selectedMelodicProjectId);
    const nextId = existing?.id ?? `melodic-project-${Date.now()}`;
    const nextName = existing?.name ?? createUserMelodicProjectName(args.savedMelodicProjects);
    const project: SavedMelodicProject = {
      id: nextId,
      name: nextName,
      composer: cloneLoopComposerState(args.loopComposer),
      patternVariants: cloneMelodicPatternVariantMap(synced.variants),
      patternLinks: cloneMelodicPatternLinkMap(synced.links),
      origin: existing?.origin ?? 'browserLocal',
      sourcePackageId: existing?.sourcePackageId ?? null,
      syncState: existing?.origin === 'importedPackage' ? 'modifiedSinceImport' : 'localOnly',
      contentHash: hashProjectPayload({ composer: args.loopComposer, patternVariants: synced.variants, patternLinks: synced.links }),
    };
    args.setSavedMelodicProjects((state) => {
      const withoutCurrent = state.filter((entry) => entry.id !== nextId);
      return [...withoutCurrent, project].sort((a, b) => a.name.localeCompare(b.name));
    });
    args.setSelectedMelodicProjectId(nextId);
    args.setStatus(`${nextName} in Presets & Projekte gespeichert.`);
  }

  function deleteMelodicProject() {
    const existing = args.savedMelodicProjects.find((entry) => entry.id === args.selectedMelodicProjectId);
    if (!existing) return;
    args.setSavedMelodicProjects((state) => state.filter((entry) => entry.id !== existing.id));
    args.setSelectedMelodicProjectId('');
    args.setStatus(`${existing.name} aus Presets & Projekte entfernt.`);
  }

  async function exportMelodicWorkspaceArchive() {
    const synced = args.syncVisiblePatternStores();
    const selectedProjectName = args.melodicProjectChoices.find((entry) => entry.id === args.selectedMelodicProjectId)?.name ?? 'Aktuelle Arbeitskopie';
    const { statusMessage } = await exportMelodicWorkspaceArchiveAction({
      selectedProjectName,
      loopComposer: args.loopComposer,
      patternVariants: synced.variants,
      patternLinks: synced.links,
      savedMelodicProjects: args.savedMelodicProjects,
      melodicSampleEntries: args.melodicSampleEntries,
    });
    args.setStatus(statusMessage);
  }

  async function prepareMelodicWorkspaceArchiveDownload(downloadArgs?: WorkspacePackageDownloadPrepareArgs) {
    const synced = args.syncVisiblePatternStores();
    const selectedProjectName = args.melodicProjectChoices.find((entry) => entry.id === args.selectedMelodicProjectId)?.name ?? 'Aktuelle Arbeitskopie';
    args.setStatus('Workspace-Paket wird vorbereitet …');
    const result = await prepareMelodicWorkspaceArchiveDownloadAction({
      selectedProjectName,
      packageLabel: downloadArgs?.packageLabel,
      loopComposer: args.loopComposer,
      patternVariants: synced.variants,
      patternLinks: synced.links,
      savedMelodicProjects: args.savedMelodicProjects,
      melodicSampleEntries: args.melodicSampleEntries,
    });
    args.setStatus(`${result.statusMessage} Speichern-Link ist bereit.`);
    return result;
  }

  async function importMelodicWorkspaceArchive(file: File, mode: WorkspacePackageImportMode) {
    try {
      const result = await importMelodicWorkspaceArchiveAction({
        file,
        mode,
        savedMelodicProjects: args.savedMelodicProjects,
      });
      args.setMelodicSampleEntries(result.refreshedSamples);
      if (result.mode === 'replace' || result.mode === 'differential') {
        if (result.mode === 'replace') {
          args.setSavedMelodicProjects(result.importedProjects);
        } else {
          args.setSavedMelodicProjects((state) => {
            const importedById = new Map(result.importedProjects.map((project) => [project.id, project] as const));
            const kept = state.filter((project) => !importedById.has(project.id));
            return [...kept, ...result.importedProjects].sort((a, b) => a.name.localeCompare(b.name));
          });
        }
        args.setLoopComposer(result.workspaceComposer);
        commitMelodicPatternStores({
          stores: { variants: result.workspaceVariants, links: result.workspaceLinks },
          patternVariantsRef: args.loopPatternVariantsRef,
          patternLinksRef: args.loopPatternLinksRef,
          setLoopPatternVariants: args.setLoopPatternVariants,
          setLoopPatternLinks: args.setLoopPatternLinks,
        });
        args.setSelectedMelodicProjectId('');
        args.setSelectedLoopNoteIds(result.workspaceComposer.selectedNoteId ? [result.workspaceComposer.selectedNoteId] : []);
        args.setActiveWorkspace('microtonal-logic');
        args.applyLogicView('melodic');
      } else {
        args.setSavedMelodicProjects((state) => [...state, ...result.importedProjects].sort((a, b) => a.name.localeCompare(b.name)));
      }
      args.setStatus(result.statusMessage);
    } catch (error) {
      console.error('[xensonar][workspace-archive][import]', error);
      args.setStatus(error instanceof Error ? `Workspace-Paket konnte nicht geladen werden: ${error.message}` : 'Workspace-Paket konnte nicht geladen werden.');
    }
  }

  return {
    loadMelodicProject,
    composeMelodicFromScratch,
    saveMelodicProject,
    deleteMelodicProject,
    exportMelodicWorkspaceArchive,
    prepareMelodicWorkspaceArchiveDownload,
    importMelodicWorkspaceArchive,
  };
}
