import { loadForgeProjectIntoWorkspace } from './projectHydrationActions';
import {
  buildCanonicalForgeProjectSnapshot,
  removeForgeProjectFromLibrary,
  renameForgeProjectInLibrary,
  saveForgeProjectToLibrary,
  type BuildCanonicalForgeProjectSnapshotArgs,
} from './workspaceLibraryActions';

export function createCanonicalWorkspacePersistenceController(args: {
  buildProjectSnapshotArgs: BuildCanonicalForgeProjectSnapshotArgs;
  syncProjectMaterialToXensonar: (projectId: string, projectLabel: string) => Promise<void>;
  selectedProjectId: string | null;
  projectName: string;
  fallbackProjectName: string;
  materialRole: BuildCanonicalForgeProjectSnapshotArgs['materialExport']['role'];
  setSelectedProjectId: (projectId: string | null) => void;
  setProjectName: (projectName: string) => void;
  setBusy: (busy: boolean) => void;
  setStatus: (status: string) => void;
  loadProjectIntoWorkspaceArgs: Omit<Parameters<typeof loadForgeProjectIntoWorkspace>[0], 'id'>;
}) {
  function buildProjectSnapshot() {
    return buildCanonicalForgeProjectSnapshot(args.buildProjectSnapshotArgs);
  }

  async function saveProject(overwrite = false) {
    return saveForgeProjectToLibrary({
      overwrite,
      selectedProjectId: args.selectedProjectId,
      projectName: args.projectName,
      fallbackProjectName: args.fallbackProjectName,
      snapshot: buildProjectSnapshot(),
      materialRole: args.materialRole,
      syncProjectMaterialToXensonar: args.syncProjectMaterialToXensonar,
      setSelectedProjectId: args.setSelectedProjectId,
      setProjectName: args.setProjectName,
      setBusy: args.setBusy,
      setStatus: args.setStatus,
    });
  }

  async function loadProject(id: string) {
    return loadForgeProjectIntoWorkspace({
      id,
      ...args.loadProjectIntoWorkspaceArgs,
    });
  }

  async function removeProject() {
    return removeForgeProjectFromLibrary({
      selectedProjectId: args.selectedProjectId,
      setSelectedProjectId: args.setSelectedProjectId,
      setBusy: args.setBusy,
      setStatus: args.setStatus,
    });
  }

  async function renameProject() {
    return renameForgeProjectInLibrary({
      selectedProjectId: args.selectedProjectId,
      projectName: args.projectName,
      setProjectName: args.setProjectName,
      setBusy: args.setBusy,
      setStatus: args.setStatus,
    });
  }

  return {
    buildProjectSnapshot,
    saveProject,
    loadProject,
    removeProject,
    renameProject,
  };
}
