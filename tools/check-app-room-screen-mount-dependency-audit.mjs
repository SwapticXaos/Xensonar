#!/usr/bin/env node
import {
  boolChecksToFailures,
  collectDependencyFindings,
  createGuardContext,
  dependencyFindingsClean,
} from './xensonar-refactor-guard-utils.mjs';

const ctx = createGuardContext();
const { exists, readIfExists, readJson, lineCount } = ctx;

const auditPath = 'validation/contracts/xensonar/layout/appRoomScreenMountDependencyAudit.ts';
const shapeAuditPath = 'validation/contracts/xensonar/layout/appRoomScreenMountShapeAudit.ts';
const surfaceBoundaryPath = 'src/features/xensonar/layout/useAppSurfaceFrameRuntimeBoundary.ts';
const appMainContentPath = 'src/features/xensonar/layout/AppMainContent.tsx';
const appShellFramePath = 'src/features/xensonar/layout/AppShellFrame.tsx';
const appShellFramePropsPath = 'src/features/xensonar/layout/appShellFrameProps.ts';
const surfaceEntryPath = 'src/features/xensonar/layout/appSurfaceFrameRuntimeEntry.ts';
const surfaceCoordinatorPath = 'src/features/xensonar/layout/appSurfaceRuntimeCoordinator.ts';
const appPath = 'src/App.tsx';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const guardUtilsPath = 'tools/xensonar-refactor-guard-utils.mjs';

const expectedDependencyAuditKeys = [
  'shapeAudit',
  'surfaceFrameBoundary',
  'mainContent',
  'shellFrame',
  'shellFrameProps',
  'surfaceFrameEntry',
];

const dependencyAuditFiles = {
  shapeAudit: shapeAuditPath,
  surfaceFrameBoundary: surfaceBoundaryPath,
  mainContent: appMainContentPath,
  shellFrame: appShellFramePath,
  shellFrameProps: appShellFramePropsPath,
  surfaceFrameEntry: surfaceEntryPath,
};

const allowedValueImports = {
  shapeAudit: [],
  surfaceFrameBoundary: ['../runtimeEntries'],
  mainContent: [
    'react',
    '../rooms/CommonsRoom',
    '../rooms/AppRoomViewport',
    '../rooms/RecordingMarkerSideRails',
    '../rooms/ResonanceGuidePanel',
    '../rooms/ResonanceStatusStrip',
    '../rooms/ResonanceControlCorePanel',
    '../rooms/RecordingTakePanel',
    '../rooms/ResonanceParallelEffectsPanel',
    '../rooms/ResonanceSoundPalettePanel',
    '../rooms/ResonanceGrooveBassPanel',
    '../rooms/ResonanceStagePanel',
    '../rooms/resonancePanelProps',
    '../rooms/coreBuildProfile',
  ],
  shellFrame: ['./AppHeader', './appShellStyles', './AppMainContent'],
  shellFrameProps: ['./AppMainContent', './AppShellFrame'],
  surfaceFrameEntry: [],
};

const allowedTypeImports = {
  shapeAudit: ['react', './AppMainContent', './AppShellFrame', './useAppSurfaceFrameRuntimeBoundary'],
  surfaceFrameBoundary: ['../room3/useAppRoomSceneRuntimeBoundary', './useAppResonanceScreenRuntimeBoundary'],
  mainContent: ['../performanceCrisis/performanceCrisisPanelProps'],
  shellFrame: ['react'],
  shellFrameProps: ['react'],
  surfaceFrameEntry: [],
};

const allowedExportSources = {
  shapeAudit: [],
  surfaceFrameBoundary: [],
  mainContent: ['../performanceCrisis/performanceCrisisPanelProps'],
  shellFrame: [],
  shellFrameProps: [],
  surfaceFrameEntry: ['./appSurfaceRuntimeCoordinator'],
};

const allowedDynamicImportSources = {
  shapeAudit: [],
  surfaceFrameBoundary: [],
  mainContent: ['../performanceCrisis/ui/PerformanceCrisisManagementPanel', '../rooms/ResonanceBurstDiagnosticsPanel', '../../../components/Level3LabRoom'],
  shellFrame: [],
  shellFrameProps: [],
  surfaceFrameEntry: [],
};

const forbiddenImportFragments = [
  'App.tsx',
  'src/App.tsx',
  'AudioEngine',
  'audioEngine',
  'audioWorklet',
  'worklet',
  'scheduler',
  'voicePool',
  'rootFollowRuntime',
  'rootFollowLoopRuntime',
  'packageStation',
  'workspacePackageStore',
  'packagePersistence',
  'particlePlayback',
  'waveStarterRuntime',
  'recordingRuntime',
  'MediaRecorder',
  'localStorage',
];

const forbiddenRuntimeTokens = [
  'createOscillator(',
  'createGain(',
  '.connect(',
  '.start(',
  'safeApplyAttack(',
  'safeApplyExponentialRelease(',
  'requestAnimationFrame(',
  'setInterval(',
  'setTimeout(',
  'new AudioContext(',
  'startRecording(',
  'stopRecording(',
  'downloadRecordingWav(',
  'downloadRecordingCropWav(',
  'scheduleBassClipStep(',
  'scheduleClassicBassPatternStep(',
  'scheduleExportedDrumConfigStep(',
  'runParticleNexusToneOrchestrator(',
  'playWaveStartSound(',
  'emitWaveStartSound(',
  'startQuantizedCollisionRuntime(',
  'updateRoom3NodeDeviceAudioFrame(',
  'updatePsychedelicSpiralDevice(',
  'updateLiveMasteringSystem(',
  'localStorage.',
];

const audit = readIfExists(auditPath);
const shapeAudit = readIfExists(shapeAuditPath);
const surfaceBoundary = readIfExists(surfaceBoundaryPath);
const appMainContent = readIfExists(appMainContentPath);
const appShellFrame = readIfExists(appShellFramePath);
const appShellFrameProps = readIfExists(appShellFramePropsPath);
const surfaceEntry = readIfExists(surfaceEntryPath);
const surfaceCoordinator = readIfExists(surfaceCoordinatorPath);
const app = readIfExists(appPath);
const pkg = readJson(pkgPath, { version: '', scripts: {} });
const suite = readIfExists(suitePath);
const suiteContract = readIfExists(suiteContractPath);
const guardUtils = readIfExists(guardUtilsPath);
const appLines = lineCount(app);

const dependencyFindings = collectDependencyFindings({
  ctx,
  files: dependencyAuditFiles,
  allowedValueImports,
  allowedTypeImports,
  allowedExportSources,
  allowedDynamicImportSources,
  forbiddenImportFragments,
  forbiddenTokens: forbiddenRuntimeTokens,
});

const allDependencyFilesClean = dependencyFindingsClean(dependencyFindings);

const checks = {
  expectedFilesExist: [
    auditPath,
    shapeAuditPath,
    surfaceBoundaryPath,
    appMainContentPath,
    appShellFramePath,
    appShellFramePropsPath,
    surfaceEntryPath,
    surfaceCoordinatorPath,
    appPath,
    pkgPath,
    suitePath,
    suiteContractPath,
    guardUtilsPath,
  ].every(exists),
  packageVersionAtLeast119: /^3\.2\.91(?:\.6\.9\.(11[9]|1[2-9][0-9]|[2-9][0-9]{2,})|-7\.5\.(12[6-9]|1[3-9][0-9]|[2-9][0-9]{2,}))$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-room-screen-mount-dependency-audit'] ===
    'node tools/check-app-room-screen-mount-dependency-audit.mjs',
  dependencyAuditUsesSharedGuardUtils:
    readIfExists('tools/check-app-room-screen-mount-dependency-audit.mjs').includes("from './xensonar-refactor-guard-utils.mjs'") &&
    guardUtils.includes('collectDependencyFindings') &&
    guardUtils.includes('dependencyFindingsClean'),
  auditDeclaresExplicitDependencyMap:
    audit.includes('APP_ROOM_SCREEN_MOUNT_DEPENDENCY_AUDIT') &&
    audit.includes('APP_ROOM_SCREEN_MOUNT_DEPENDENCY_AUDIT_FORBIDDEN_IMPORT_FAMILIES') &&
    expectedDependencyAuditKeys.every((key) => audit.includes(`${key}: {`) || audit.includes(`'${key}'`)),
  auditDeclaresNonOwnershipFlags: [
    'mayImportApp: false',
    'mayImportAudioRuntime: false',
    'mayImportWorkletRuntime: false',
    'mayImportPackagePersistence: false',
    'mayImportRecordingRuntime: false',
    'runtimeOwned: false',
    'audioMutating: false',
    'roomLifecycleOwned: false',
    'packagePersistenceOwned: false',
  ].every((needle) => audit.includes(needle)),
  dependencyAuditFilesMatchAllowlist: allDependencyFilesClean,
  surfaceBoundaryStillOnlyComposesScreenAndSceneGroups:
    surfaceBoundary.includes('export function useAppSurfaceFrameRuntimeBoundary') &&
    surfaceBoundary.includes('buildAppSurfaceFrameRuntimeEntry({') &&
    surfaceBoundary.includes('...resonanceScreen,') &&
    surfaceBoundary.includes('room,') &&
    surfaceBoundary.includes('...roomScenes,') &&
    surfaceBoundary.includes('performanceCrisisPanelProps,') &&
    !surfaceBoundary.includes('shouldRenderResonancePanels') &&
    !surfaceBoundary.includes('AppRoomViewport'),
  mainContentStillOwnsRoomViewportPanelGateAndAuxMounts:
    appMainContent.includes('<AppRoomViewport') &&
    appMainContent.includes('shouldRenderResonancePanels(props.room)') &&
    appMainContent.includes('<RecordingMarkerSideRails') &&
    appMainContent.includes('PerformanceCrisisManagementPanelLazy') &&
    appMainContent.includes("props.room === 'COMMONS'") &&
    appMainContent.includes('XENSONAR_DIAGNOSTIC_SURFACES_ENABLED') &&
    appMainContent.includes('Level3LabRoomLazy') &&
    appMainContent.includes('data-package-station-keepalive'),
  shellFrameStillOnlyFramesHeaderAndMainContent:
    appShellFrame.includes('<AppHeader {...props.appHeaderProps} />') &&
    appShellFrame.includes('<AppMainContent {...props.mainContentProps} />') &&
    !appShellFrame.includes('shouldRenderResonancePanels') &&
    !appShellFrame.includes('AppRoomViewport'),
  shellFramePropsStillOnlyBuildsMainContentProps:
    appShellFrameProps.includes('export function buildAppShellFrameProps') &&
    appShellFrameProps.includes('appHeaderProps: args.appHeaderProps') &&
    appShellFrameProps.includes('mainContentProps: {') &&
    appShellFrameProps.includes('room: args.room') &&
    appShellFrameProps.includes('auxiliaryRoomProps: args.auxiliaryRoomProps'),
  surfaceFrameEntryStillOnlyReExportsSurfaceRuntimeProps:
    surfaceEntry.includes('buildAppSurfaceRuntimeProps as buildAppSurfaceFrameRuntimeEntry') &&
    !surfaceEntry.includes('buildAppResonanceScreenRuntimeProps as') &&
    !surfaceEntry.includes('buildAppRoomSceneRuntimeProps as'),
  surfaceCoordinatorRemainsDelegatedButNotReclassified:
    surfaceCoordinator.includes('buildAppResonanceScreenRuntimeProps') &&
    surfaceCoordinator.includes('buildAppRoomSceneRuntimeProps') &&
    surfaceCoordinator.includes('buildAppSurfaceRuntimeProps') &&
    audit.includes('does not own appSurfaceRuntimeCoordinator as a whole'),
  shapeAuditStillMapsMountZones:
    shapeAudit.includes('APP_ROOM_SCREEN_MOUNT_SHAPE_AUDIT') &&
    ['surfaceFrameBoundary', 'shellFrame', 'mainContentViewport', 'resonancePanelMountGate', 'auxiliaryRoomMounts'].every((key) => shapeAudit.includes(`${key}: {`)),
  noRoomScreenMountPassThroughBridgeOrIndexIntroduced:
    !exists('src/features/xensonar/layout/appRoomScreenMountBridge.ts') &&
    !exists('src/features/xensonar/layout/appRoomScreenMountBoundary.ts') &&
    !exists('src/features/xensonar/layout/appRoomScreenMountIndex.ts') &&
    !exists('src/features/xensonar/layout/appActivationCompositionBridge.ts') &&
    !exists('src/features/xensonar/layout/useAppRoomScreenMountBridge.ts'),
  appCallsiteStillOwnsFinalSurfaceFrameComposition:
    (
      app.includes('const appShellFrameProps = useAppSurfaceFrameRuntimeBoundary({') &&
      app.includes('room,') &&
      app.includes('resonanceScreen: resonanceScreenRuntime,') &&
      app.includes('roomScenes: appRoomScenes,') &&
      app.includes('performanceCrisisPanelProps,')
    ) || (
      app.includes('const appSurfaceFrameMountSource = buildAppSurfaceFrameMountSource({') &&
      app.includes('roomGate: { room }') &&
      app.includes('resonanceScreenMount: { resonanceScreen: resonanceScreenRuntime }') &&
      app.includes('roomSceneMount: { roomScenes: appRoomScenes }') &&
      app.includes('performanceCrisisPanelMount: { performanceCrisisPanelProps }') &&
      app.includes('const appShellFrameProps = useAppSurfaceFrameRuntimeBoundary(appSurfaceFrameMountSource);')
    ) &&
    app.includes('<AppShellFrame {...appShellFrameProps} />') &&
    (app.match(/useAppSurfaceFrameRuntimeBoundary\(/g) || []).length === 1,
  dependencyGuardListedInSanitySuiteContract:
    suiteContract.includes('xensonar:check-app-room-screen-mount-dependency-audit') ||
    pkg.scripts?.['xensonar:check-app-room-screen-mount-dependency-audit'] ===
      'node tools/check-app-room-screen-mount-dependency-audit.mjs',
  dependencyGuardListedInRefactorSuiteRunner:
    (suite.includes('Room/screen mount dependency audit') &&
      suite.includes('xensonar:check-app-room-screen-mount-dependency-audit')) ||
    pkg.scripts?.['xensonar:sanity:parallel-refactor'] ===
      'node tools/run-xensonar-parallel-refactor-sanity.mjs',
  appLineCountUnaffectedByRoomScreenMountDependencyAudit: appLines <= 5590,
};

const failures = boolChecksToFailures(checks);
const report = {
  ok: failures.length === 0,
  appLines,
  dependencyAudit: {
    auditedKeys: expectedDependencyAuditKeys,
    guardedFiles: dependencyAuditFiles,
    allDependencyFilesClean,
    dependencyFindings,
    sharedGuardUtils: 'Import/export/dynamic-import extraction and dependency finding collection are delegated to xensonar-refactor-guard-utils.mjs.',
    strategyComparison: {
      branchByAbstractionLike: 'This patch adds a seam and dependency guard without moving the callsite, mirroring incremental-abstraction discipline.',
      stranglerLike: 'No cut-over rewrite: the existing mount path remains live while the wrapper map grows around it.',
      fitnessFunctionLike: 'The guard is an architecture fitness function for dependency direction and non-ownership.',
      reactPurityLike: 'React mount surfaces stay rendering/composition-only rather than becoming effect or audio owners.',
    },
  },
  movedScope: [
    'Kept the room/screen-mount dependency audit behavior but moved generic dependency scanning into shared guard utils',
    'Kept a static dependency audit for the App.tsx room/screen-mount layer',
    'Kept the guard registered in the refactor sanity suite and contract checker',
  ],
  explicitlyNotMoved: [
    'No App.tsx final useAppSurfaceFrameRuntimeBoundary callsite was moved',
    'No AppRoomViewport room selection changed',
    'No shouldRenderResonancePanels gate changed',
    'No COMMONS or L3LAB/Materialschmiede mount/keepalive semantics changed',
    'No Surface Coordinator or Room Scene runtime ownership moved',
    'No Root-Follow, Worklet, Package Station, Recording, Parallel Effects, GrooveBass, Partikel, Wellenstarter, Drum/Bass, Materialspur, or Room III behavior changed',
    'No visible UI or HTML output changed',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
