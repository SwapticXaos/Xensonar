import type { PreparedJsonPackageDownload, WorkspacePackageImportMode } from './packageCore';
import { normalizeWorkspacePackageTitle } from './workspacePackageTitle';
import type { MelodicPatternLinkMap } from '../../features/l3lab/canonicalForge/melodicProjectLibrary';

export type XensonarPackageStationAction = 'download';

export type WorkspacePackageDownloadPrepareArgs = {
  packageLabel?: string;
};

export type PreparedWorkspacePackageDownload = {
  download: PreparedJsonPackageDownload;
  statusMessage?: string;
};

export type XensonarPackageStationBridgeHandler = {
  importWorkspacePackageFile: (file: File, mode: WorkspacePackageImportMode) => Promise<void> | void;
  prepareWorkspacePackageDownload?: (args?: WorkspacePackageDownloadPrepareArgs) => Promise<PreparedWorkspacePackageDownload | void> | PreparedWorkspacePackageDownload | void;
  exportWorkspacePackage: () => Promise<void> | void;
  hasWorkspacePackageContent: () => boolean;
};

const handlerStack: XensonarPackageStationBridgeHandler[] = [];
const handlerReadyWaiters: Array<(handler: XensonarPackageStationBridgeHandler) => void> = [];
let pendingAction: XensonarPackageStationAction | null = null;
let pendingImport: { file: File; mode: WorkspacePackageImportMode } | null = null;


function getActiveHandler() {
  return handlerStack.length ? handlerStack[handlerStack.length - 1] : null;
}

async function prepareFallbackWorkspacePackageDownload(reason: string, args?: WorkspacePackageDownloadPrepareArgs): Promise<PreparedWorkspacePackageDownload> {
  const packageLabel = normalizeWorkspacePackageTitle(args?.packageLabel);
  const [loopDomain, projectLibrary, archiveActions] = await Promise.all([
    import('../../features/l3lab/canonicalForge/loopDrumDomain'),
    import('../../features/l3lab/canonicalForge/melodicProjectLibrary'),
    import('../../features/l3lab/canonicalForge/melodicWorkspaceArchiveActions'),
  ]);
  const loopComposer = loopDomain.createEmptyLoopComposer();
  const patternVariants = projectLibrary.createGeneratedPatternVariantsFromComposer(loopComposer);
  const patternLinks: MelodicPatternLinkMap = Object.fromEntries(
    loopComposer.tracks.map((track) => [
      track.id,
      { patternA: 'patternA', patternB: 'patternB', patternC: 'patternC' },
    ]),
  ) as MelodicPatternLinkMap;
  const prepared = await archiveActions.prepareMelodicWorkspaceArchiveDownloadAction({
    selectedProjectName: 'Xensonar Paketstation Snapshot',
    packageLabel,
    loopComposer,
    patternVariants,
    patternLinks,
    savedMelodicProjects: [],
    melodicSampleEntries: [],
  });
  const suffix = reason ? ` · Reservepfad: ${reason}` : ' · Reservepfad aktiv';
  return {
    download: prepared.download,
    statusMessage: `${prepared.statusMessage}${suffix}`,
  };
}

function notifyHandlerReady(handler: XensonarPackageStationBridgeHandler) {
  if (!handlerReadyWaiters.length) return;
  const waiters = handlerReadyWaiters.splice(0, handlerReadyWaiters.length);
  for (const resolve of waiters) resolve(handler);
}

export function waitForXensonarPackageStationHandlerReady(timeoutMs = 1800): Promise<XensonarPackageStationBridgeHandler | null> {
  const activeHandler = getActiveHandler();
  if (activeHandler) return Promise.resolve(activeHandler);
  return new Promise((resolve) => {
    let waiter: ((handler: XensonarPackageStationBridgeHandler) => void) | null = null;
    const timeout = window.setTimeout(() => {
      if (waiter) {
        const index = handlerReadyWaiters.indexOf(waiter);
        if (index >= 0) handlerReadyWaiters.splice(index, 1);
      }
      resolve(getActiveHandler());
    }, Math.max(0, timeoutMs));
    waiter = (handler: XensonarPackageStationBridgeHandler) => {
      window.clearTimeout(timeout);
      resolve(handler);
    };
    handlerReadyWaiters.push(waiter);
  });
}

function runAction(handler: XensonarPackageStationBridgeHandler, action: XensonarPackageStationAction) {
  if (action === 'download') {
    void handler.exportWorkspacePackage();
  }
}

function drainPendingAction(handler: XensonarPackageStationBridgeHandler) {
  const action = pendingAction;
  if (!action) return;
  pendingAction = null;
  window.setTimeout(() => {
    if (getActiveHandler() === handler) runAction(handler, action);
  }, 40);
}

function drainPendingImport(handler: XensonarPackageStationBridgeHandler) {
  const pending = pendingImport;
  if (!pending) return;
  pendingImport = null;
  window.setTimeout(() => {
    if (getActiveHandler() === handler) {
      void handler.importWorkspacePackageFile(pending.file, pending.mode);
    }
  }, 40);
}

export function registerXensonarPackageStationHandler(handler: XensonarPackageStationBridgeHandler) {
  const existingIndex = handlerStack.indexOf(handler);
  if (existingIndex >= 0) handlerStack.splice(existingIndex, 1);
  handlerStack.push(handler);
  notifyHandlerReady(handler);
  drainPendingAction(handler);
  drainPendingImport(handler);
  return () => {
    const index = handlerStack.indexOf(handler);
    if (index >= 0) handlerStack.splice(index, 1);
  };
}

export function requestXensonarPackageStationDownload() {
  const activeHandler = getActiveHandler();
  if (activeHandler) {
    void activeHandler.exportWorkspacePackage();
    return true;
  }
  pendingAction = 'download';
  return false;
}

export async function prepareXensonarPackageStationDownload(options?: { waitForHandlerMs?: number; packageLabel?: string }) {
  const prepareArgs: WorkspacePackageDownloadPrepareArgs = { packageLabel: normalizeWorkspacePackageTitle(options?.packageLabel) };
  let activeHandler = getActiveHandler();
  if (!activeHandler) {
    activeHandler = await waitForXensonarPackageStationHandlerReady(options?.waitForHandlerMs ?? 2500);
  }
  if (activeHandler?.prepareWorkspacePackageDownload) {
    const prepared = await activeHandler.prepareWorkspacePackageDownload(prepareArgs);
    if (prepared?.download) return prepared;
  }
  return prepareFallbackWorkspacePackageDownload(activeHandler ? 'Handler lieferte keinen vorbereiteten Download' : 'Canonical-Datenport war nicht rechtzeitig registriert', prepareArgs);
}

export function importXensonarPackageStationFile(file: File, mode: WorkspacePackageImportMode) {
  const activeHandler = getActiveHandler();
  if (!activeHandler) {
    pendingImport = { file, mode };
    return false;
  }
  void activeHandler.importWorkspacePackageFile(file, mode);
  return true;
}

export function readXensonarPackageStationHasContent() {
  return getActiveHandler()?.hasWorkspacePackageContent() ?? null;
}

export const WORKSPACE_PACKAGE_DEFAULT_EMPTY_IMPORT_MODE: WorkspacePackageImportMode = 'replace';

export function clearPendingXensonarPackageStationAction() {
  pendingAction = null;
  pendingImport = null;
}
