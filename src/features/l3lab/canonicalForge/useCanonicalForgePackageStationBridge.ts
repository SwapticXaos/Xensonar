import { useEffect,useMemo } from 'react';
import type { WorkspacePackageImportMode } from '../../../core/systemMemory/packageCore';
import { usePackageImportLauncher } from '../../../core/systemMemory/usePackageImportLauncher';
import { registerXensonarPackageStationHandler,type PreparedWorkspacePackageDownload,type WorkspacePackageDownloadPrepareArgs } from '../../../core/systemMemory/xensonarPackageStationBridge';
import type { MaterialEntry } from '../materialLibrary';
import type { LoopComposerState } from './loopDrumDomain';
import type { SavedMelodicProject } from './melodicProjectLibrary';
import { readMelodicWorkspaceExternalPackageContentSummary } from './melodicWorkspaceArchiveActions';
import type { SavedMelodicSampleMeta } from './melodicSampleLibrary';
import { useCanonicalForgeProjectLibrary } from './projectLibrary';
import { getCanonicalForgeSession } from './session';
import { exportWorkspaceBrowserStorageArchivePayload } from './melodicWorkspaceBrowserStoragePackage';
import { useForgeProjectLibrary } from '../spectralForge/projectLibrary';
import { useCustomStampLibrary } from '../spectralForge/customStampLibrary';
import { useDrumConfigLibrary } from '../../xensonar/drumConfigLibrary';
import { loadResidentConstellations } from '../../topology/residentConstellations';
import { readPersistedRootFollowBank } from '../../xensonar/material/rootFollowBankStorage';

export function useCanonicalForgePackageStationBridge(args: {
  exportMelodicWorkspaceArchive: () => Promise<void> | void;
  importMelodicWorkspaceArchive: (file: File, mode: WorkspacePackageImportMode) => Promise<void> | void;
  prepareMelodicWorkspaceArchiveDownload: (downloadArgs?: WorkspacePackageDownloadPrepareArgs) => Promise<PreparedWorkspacePackageDownload | void> | PreparedWorkspacePackageDownload | void;
  loopComposer: LoopComposerState;
  savedMelodicProjects: SavedMelodicProject[];
  melodicSampleEntries: SavedMelodicSampleMeta[];
  materialEntries: MaterialEntry[];
}) {
  const {
    exportMelodicWorkspaceArchive,
    importMelodicWorkspaceArchive,
    prepareMelodicWorkspaceArchiveDownload,
    loopComposer,
    savedMelodicProjects,
    melodicSampleEntries,
    materialEntries,
  } = args;

  const savedSpectralForgeWorkspaceCount = useCanonicalForgeProjectLibrary((snapshot) => snapshot.entries.length);
  const spectralForgeProjectCount = useForgeProjectLibrary((snapshot) => snapshot.entries.length);
  const spectralForgeStampCount = useCustomStampLibrary((snapshot) => snapshot.entries.length);
  const drumConfigCount = useDrumConfigLibrary((snapshot) => snapshot.entries.length);

  const {
    inputRef: melodicWorkspaceImportInputRef,
    requestImport: requestMelodicWorkspaceImport,
    handleFileInputChange: handleMelodicWorkspaceArchiveImportInput,
  } = usePackageImportLauncher({
    onImportFile: async ({ file, mode }) => {
      await importMelodicWorkspaceArchive(file, mode);
    },
  });

  const hasWorkspacePackageContent = useMemo(() => {
    const hasCurrentLoopNotes = loopComposer.notes.length > 0;
    const hasSavedProjects = savedMelodicProjects.length > 0;
    const hasSamples = melodicSampleEntries.length > 0;
    const hasMaterial = materialEntries.length > 0;
    const externalLibraries = readMelodicWorkspaceExternalPackageContentSummary();
    const hasCurrentSpectralForgeWorkspace = getCanonicalForgeSession() != null;
    const hasRootFollow = readPersistedRootFollowBank().memberIds.length > 0;
    const hasResidentConstellations = loadResidentConstellations().length > 0;
    const hasPackagedBrowserState = exportWorkspaceBrowserStorageArchivePayload().entries.length > 0;
    return hasCurrentLoopNotes || hasSavedProjects || hasSamples || hasMaterial || externalLibraries.hasContent
      || savedSpectralForgeWorkspaceCount > 0 || spectralForgeProjectCount > 0 || spectralForgeStampCount > 0
      || drumConfigCount > 0 || hasCurrentSpectralForgeWorkspace || hasRootFollow || hasResidentConstellations
      || hasPackagedBrowserState;
  }, [
    loopComposer.notes.length, savedMelodicProjects.length, melodicSampleEntries.length, materialEntries.length,
    savedSpectralForgeWorkspaceCount, spectralForgeProjectCount, spectralForgeStampCount, drumConfigCount,
  ]);

  useEffect(() => registerXensonarPackageStationHandler({
    importWorkspacePackageFile: (file: File, mode: WorkspacePackageImportMode) => importMelodicWorkspaceArchive(file, mode),
    prepareWorkspacePackageDownload: (downloadArgs) => prepareMelodicWorkspaceArchiveDownload(downloadArgs),
    exportWorkspacePackage: () => { void exportMelodicWorkspaceArchive(); },
    hasWorkspacePackageContent: () => hasWorkspacePackageContent,
  }), [exportMelodicWorkspaceArchive, prepareMelodicWorkspaceArchiveDownload, hasWorkspacePackageContent, importMelodicWorkspaceArchive]);

  return {
    melodicWorkspaceImportInputRef,
    requestMelodicWorkspaceImport,
    handleMelodicWorkspaceArchiveImportInput,
    hasWorkspacePackageContent,
  };
}
