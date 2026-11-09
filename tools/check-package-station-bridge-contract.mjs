import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const fail = (msg) => {
  console.error(`[package-station-bridge] ${msg}`);
  process.exit(1);
};

const header = read('src/features/xensonar/layout/AppHeader.tsx');
const packageStationControl = read('src/features/xensonar/layout/PackageStationControl.tsx');
const shellProps = read('src/features/xensonar/layout/appShellProps.ts');
const bridge = read('src/core/systemMemory/xensonarPackageStationBridge.ts');
const canonical = read('src/features/l3lab/canonicalForge/CanonicalForgeRoom.tsx');
const canonicalPackageStationBridge = read('src/features/l3lab/canonicalForge/useCanonicalForgePackageStationBridge.ts');
const packageRow = read('src/components/systemMemory/PackageActionRow.tsx');
const melodicHeader = read('src/features/l3lab/canonicalForge/MelodicWorkspaceHeader.tsx');
const appMainContent = read('src/features/xensonar/layout/AppMainContent.tsx');
const auxiliaryRoomProps = read('src/features/xensonar/rooms/auxiliaryRoomProps.ts');
const level3LabRoom = read('src/features/xensonar/rooms/Level3LabRoom.tsx');

if (!header.includes('PackageStationControl')) fail('AppHeader must mount the Paketstation control.');
if (!packageStationControl.includes('Paketstation')) fail('PackageStationControl must expose the Paketstation button.');
if (!packageStationControl.includes('PackageStationBracket side="left"') || !packageStationControl.includes('PackageStationBracket side="right"')) fail('Paketstation must be framed by mirrored blue bracket glyphs on both sides.');
if (!packageStationControl.includes('PackageUploadIcon') || !packageStationControl.includes('PackageDownloadIcon')) fail('Paketstation upload/download buttons must use explicit package transfer icons.');
if (packageStationControl.includes('>⬆<') || packageStationControl.includes('>⬇<')) fail('Paketstation must not rely on ambiguous single-character arrow buttons.');
if (!packageStationControl.includes('WorkspacePackageImportModeDialog')) fail('Global Paketstation must own the visible import mode dialog.');
if (!packageStationControl.includes('type="file"') || !packageStationControl.includes('fileInputRef')) fail('Global Paketstation must own a visible-DOM file input for user-gesture upload.');
if (!packageStationControl.includes('readXensonarPackageStationHasContent')) fail('Paketstation upload must decide whether the visible mode dialog can be skipped.');
if (!packageStationControl.includes('importXensonarPackageStationFile(file, pendingImportModeRef.current)')) fail('Paketstation file input must pass the selected file and mode into the bridge data port.');
if (!packageStationControl.includes('prepareXensonarPackageStationDownload')) fail('Paketstation download must use the bridge data port through the two-phase prepare contract.');
if (!packageStationControl.includes('waitForHandlerMs')) fail('Paketstation download must wait briefly for the hidden canonical data port before declaring failure.');
if (packageStationControl.includes('Bitte erneut vorbereiten')) fail('Paketstation must not ask the user to retry while the keepalive contract should activate the data port automatically.');
if (packageStationControl.includes('Paketstation braucht zuerst die Materialschmiede')) fail('Paketstation must not tell the user to open Materialschmiede before download; the keepalive data port must be used.');
if (packageStationControl.includes('onOpenMaterialschmiede?.();\n        return;')) fail('Paketstation download must not force a room switch when the prepare data port is still loading.');
if (!packageStationControl.includes('href={preparedDownload.url}') || !packageStationControl.includes('download={buildDownloadAliasFilename(preparedDownload)}')) fail('Paketstation download must render a real manual save link using the prepared blob URL and the current human filename alias.');
if (!packageStationControl.includes('Download-Alias') || !packageStationControl.includes('WORKSPACE_PACKAGE_DEFAULT_TITLE') || !packageStationControl.includes('normalizeWorkspacePackageTitle(packageTitle)')) fail('Paketstation must expose an editable human filename alias between preparation and manual save.');
if (!packageStationControl.includes('buildPreparedJsonPackageDownloadAliasFilename')) fail('Paketstation must retitle the prepared download filename without rebuilding the package payload.');
if (packageStationControl.includes('retitle-download') || packageStationControl.includes('packageLabel: normalizedTitle') || packageStationControl.includes('Paket konnte nicht mit dem geänderten Titel vorbereitet werden')) fail('Paketstation must not prepare the full package a second time merely because the human filename alias changed.');
if (header.includes('onRequestPackageStationUpload') || header.includes('onRequestPackageStationDownload')) fail('AppHeader must not own global package upload/download callbacks; PackageStationControl owns the visible upload flow.');
if (shellProps.includes('requestXensonarPackageStationAction') || shellProps.includes('onRequestPackageStationUpload') || shellProps.includes('onRequestPackageStationDownload')) fail('App shell props must not route global package actions through stale hidden upload callbacks.');
if (shellProps.includes('openMaterialschmiede(args.setRoom);\n      }')) fail('Package station must not force a room switch when no handler is mounted.');
if (!bridge.includes('importWorkspacePackageFile') || !bridge.includes('exportWorkspacePackage') || !bridge.includes('prepareWorkspacePackageDownload')) fail('Package station bridge must expose data-port operations and the two-phase package preparation port, not hidden upload UI requests.');
if (!bridge.includes('waitForXensonarPackageStationHandlerReady') || !bridge.includes('handlerReadyWaiters')) fail('Package station bridge must expose bounded handler readiness waiting for lazy keepalive mount.');
if (!bridge.includes('waitForXensonarPackageStationHandlerReady') || !bridge.includes('handlerReadyWaiters')) fail('Package station bridge must expose bounded handler readiness waiting for the 8.79 hidden keepalive mount.');
if (bridge.includes('XENSONAR_PACKAGE_STATION_HANDLER_REQUEST_EVENT') || bridge.includes('requestXensonarPackageStationHandlerReady')) fail('Package station must not invent a second handler-request event; the 8.79 hidden keepalive mount is the data-port source.');
if (bridge.includes('requestWorkspacePackageUpload') || bridge.includes("XensonarPackageStationAction = 'upload'")) fail('Package station bridge must not route upload through hidden UI actions.');
if (!bridge.includes('let pendingAction: XensonarPackageStationAction | null = null')) fail('Package station bridge must keep a bounded single pending download action, not an unbounded queue.');
if (!bridge.includes('handlerStack') || !bridge.includes('getActiveHandler()')) fail('Package station bridge must retain a bounded handler stack so hidden/visible package ports do not unregister each other.');
if (!auxiliaryRoomProps.includes('packageStationKeepAlive: true') || !appMainContent.includes('data-package-station-keepalive') || !appMainContent.includes('Level3LabRoomLazy') || !appMainContent.includes('XENSONAR_MATERIALSCHMIEDE_ENABLED')) fail('Package station needs the 8.79 hidden lazy Materialschmiede keepalive data port instead of forcing a room switch.');
if (!level3LabRoom.includes('packageStationKeepAlive') || !level3LabRoom.includes("mode === 'canonical' || packageStationKeepAlive")) fail('Level3LabRoom must keep the canonical package data port mounted for header Paketstation actions.');
if (!canonical.includes('useCanonicalForgePackageStationBridge')) fail('CanonicalForgeRoom must mount the workspace package-station bridge hook.');
if (!canonicalPackageStationBridge.includes('registerXensonarPackageStationHandler')) fail('useCanonicalForgePackageStationBridge must register the workspace package station handler.');
if (!canonicalPackageStationBridge.includes('importWorkspacePackageFile: (file: File, mode: WorkspacePackageImportMode) => importMelodicWorkspaceArchive(file, mode)')) fail('Canonical package station bridge must register data import, not hidden upload UI.');
if (!canonicalPackageStationBridge.includes('prepareWorkspacePackageDownload: (downloadArgs) => prepareMelodicWorkspaceArchiveDownload(downloadArgs)')) fail('Canonical package station bridge must register two-phase package preparation as a titled data port.');
if (!canonicalPackageStationBridge.includes('useCanonicalForgeProjectLibrary') || !canonicalPackageStationBridge.includes('useForgeProjectLibrary') || !canonicalPackageStationBridge.includes('useCustomStampLibrary') || !canonicalPackageStationBridge.includes('useDrumConfigLibrary')) fail('Package content detection must include all persisted SpectralForge workspace/project/stamp and Drum libraries.');
if (!canonicalPackageStationBridge.includes('exportWorkspaceBrowserStorageArchivePayload') || !canonicalPackageStationBridge.includes('readPersistedRootFollowBank') || !canonicalPackageStationBridge.includes('loadResidentConstellations')) fail('Package content detection must include browser-persisted package domains before choosing destructive replace directly.');
if (!canonicalPackageStationBridge.includes('materialEntries.length > 0')) fail('Package content detection must treat every material entry as package content, not only legacy melodic-importable material.');
if (!canonical.includes(`exportMelodicWorkspaceArchive,
    prepareMelodicWorkspaceArchiveDownload,
    importMelodicWorkspaceArchive`)) fail('CanonicalForgeRoom must destructure prepareMelodicWorkspaceArchiveDownload from the workspace controller before registering the package station data port.');
if (!canonicalPackageStationBridge.includes('exportWorkspacePackage: () => { void exportMelodicWorkspaceArchive(); }')) fail('Canonical package station bridge must keep legacy package export as a data port.');
if (canonical.includes('packageStationImportModePickerOpen') || canonical.includes('setPackageStationImportModePickerOpen(true)')) fail('Global Paketstation import mode dialog must not live in hidden CanonicalForgeRoom keepalive UI.');
if (packageRow.includes('Paket ergänzen')) fail('PackageActionRow must not expose the duplicated direct Paket ergänzen button.');
if (!packageRow.includes('WorkspacePackageImportModeDialog')) fail('PackageActionRow must expose the shared import mode dialog.');
if (!packageRow.includes("onImport('replace')")) fail('PackageActionRow must skip the dialog and import directly when no local content exists.');
if (!melodicHeader.includes('hasWorkspacePackageContent={hasWorkspacePackageContent}')) fail('MelodicWorkspaceHeader must pass content state to PackageActionRow.');

console.log('[package-station-bridge] OK');
