#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const shapeAuditPath = 'validation/contracts/xensonar/layout/appRoomScreenMountShapeAudit.ts';
const dependencyAuditPath = 'validation/contracts/xensonar/layout/appRoomScreenMountDependencyAudit.ts';
const surfaceBoundaryPath = 'src/features/xensonar/layout/useAppSurfaceFrameRuntimeBoundary.ts';
const appMainContentPath = 'src/features/xensonar/layout/AppMainContent.tsx';
const appShellFramePath = 'src/features/xensonar/layout/AppShellFrame.tsx';
const appShellFramePropsPath = 'src/features/xensonar/layout/appShellFrameProps.ts';
const appPath = 'src/App.tsx';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const shapeAudit = exists(shapeAuditPath) ? read(shapeAuditPath) : '';
const dependencyAudit = exists(dependencyAuditPath) ? read(dependencyAuditPath) : '';
const surfaceBoundary = exists(surfaceBoundaryPath) ? read(surfaceBoundaryPath) : '';
const appMainContent = exists(appMainContentPath) ? read(appMainContentPath) : '';
const appShellFrame = exists(appShellFramePath) ? read(appShellFramePath) : '';
const appShellFrameProps = exists(appShellFramePropsPath) ? read(appShellFramePropsPath) : '';
const app = exists(appPath) ? read(appPath) : '';
const pkg = JSON.parse(read(pkgPath));
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const appLines = app.split(/\r?\n/).length;

const expectedKeys = [
  'surfaceFrameBoundary',
  'shellFrame',
  'mainContentViewport',
  'resonancePanelMountGate',
  'auxiliaryRoomMounts',
];

const inputContracts = [
  'AppRoomScreenMountInputContractMap.surfaceFrameBoundary',
  'AppRoomScreenMountInputContractMap.shellFrame',
  'AppRoomScreenMountInputContractMap.mainContentViewport',
  'AppRoomScreenMountInputContractMap.resonancePanelMountGate',
  'AppRoomScreenMountInputContractMap.auxiliaryRoomMounts',
];

const outputContracts = [
  'AppSurfaceFrameRuntimeBoundary',
  'AppShellFrameProps',
  'AppRoomViewportMount',
  'ResonancePanelMountGate',
  'AuxiliaryRoomMounts',
];

const composers = [
  'useAppSurfaceFrameRuntimeBoundary composes resonanceScreen, roomScenes, room, and performanceCrisisPanelProps',
  'AppShellFrame renders AppHeader plus AppMainContent only',
  'AppMainContent keeps AppRoomViewport active-room rendering at the surface layer',
  'AppMainContent keeps shouldRenderResonancePanels(room) as a mount gate only',
  'AppMainContent keeps COMMONS direct mount and L3LAB lazy keepalive mount semantics unchanged',
];

const forbiddenRuntimeMoves = [
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

const checks = {
  expectedFilesExist: [
    shapeAuditPath,
    dependencyAuditPath,
    surfaceBoundaryPath,
    appMainContentPath,
    appShellFramePath,
    appShellFramePropsPath,
    appPath,
    pkgPath,
    suitePath,
    suiteContractPath,
  ].every(exists),
  packageVersionAtLeast120: /^3\.2\.91\.6\.9\.(12[0-9]|1[3-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-room-screen-mount-contract-cleanup'] ===
    'node tools/check-app-room-screen-mount-contract-cleanup.mjs',
  shapeAuditDeclaresBuildOrder:
    shapeAudit.includes('APP_ROOM_SCREEN_MOUNT_CONTRACT_BUILD_ORDER') &&
    expectedKeys.every((key) => shapeAudit.includes(`'${key}'`)),
  shapeAuditDeclaresInputAndOutputMaps:
    shapeAudit.includes('AppRoomScreenMountInputContractMap') &&
    shapeAudit.includes('AppRoomScreenMountOutputContractMap') &&
    shapeAudit.includes('surfaceFrameBoundary: {') &&
    shapeAudit.includes('shellFrame: ComponentProps<typeof AppShellFrame>') &&
    shapeAudit.includes('mainContentViewport: Pick<') &&
    shapeAudit.includes('auxiliaryRoomMounts: Pick<'),
  shapeAuditDeclaresContractNames:
    shapeAudit.includes('AppRoomScreenMountInputContractName') &&
    shapeAudit.includes('AppRoomScreenMountOutputContractName') &&
    inputContracts.every((name) => shapeAudit.includes(`'${name}'`)) &&
    outputContracts.every((name) => shapeAudit.includes(`'${name}'`)),
  shapeAuditDeclaresContractEntries:
    shapeAudit.includes('AppRoomScreenMountContractEntry') &&
    shapeAudit.includes('APP_ROOM_SCREEN_MOUNT_CONTRACT') &&
    expectedKeys.every((key) => shapeAudit.includes(`${key}: {`) || shapeAudit.includes(`key: '${key}'`)) &&
    composers.every((composer) => shapeAudit.includes(`composer: '${composer}'`)),
  contractExplicitlyKeepsAppCallsiteOwnershipAndNonOwnership:
    (shapeAudit.match(/callsiteOwnedByApp: true/g) || []).length >= expectedKeys.length &&
    (shapeAudit.match(/runtimeOwned: false/g) || []).length >= expectedKeys.length + 1 &&
    (shapeAudit.match(/audioMutating: false/g) || []).length >= expectedKeys.length + 1 &&
    (shapeAudit.match(/roomLifecycleOwned: false/g) || []).length >= expectedKeys.length + 1 &&
    (shapeAudit.match(/packagePersistenceOwned: false/g) || []).length >= expectedKeys.length + 1 &&
    (shapeAudit.match(/visibleUiChangedByContract: false/g) || []).length >= expectedKeys.length,
  shapeAuditEntriesReferenceContract:
    expectedKeys.every((key) =>
      shapeAudit.includes(`contract: '${key}'`) &&
      shapeAudit.includes(`outputContract: '${key}'`),
    ),
  contractProbePresent:
    shapeAudit.includes('APP_ROOM_SCREEN_MOUNT_CONTRACT_CLEANUP_PROBE') &&
    shapeAudit.includes('readonly buildOrder: typeof APP_ROOM_SCREEN_MOUNT_CONTRACT_BUILD_ORDER') &&
    shapeAudit.includes('readonly inputs: AppRoomScreenMountInputContractMap') &&
    shapeAudit.includes('readonly outputs: AppRoomScreenMountOutputContractMap') &&
    shapeAudit.includes('readonly contract: typeof APP_ROOM_SCREEN_MOUNT_CONTRACT') &&
    shapeAudit.includes("readonly dependencyAudit: 'appRoomScreenMountDependencyAudit'"),
  dependencyAuditStillPresentAndNarrow:
    dependencyAudit.includes('APP_ROOM_SCREEN_MOUNT_DEPENDENCY_AUDIT') &&
    dependencyAudit.includes('APP_ROOM_SCREEN_MOUNT_DEPENDENCY_AUDIT_FORBIDDEN_IMPORT_FAMILIES') &&
    dependencyAudit.includes('no final surface callsite ownership') &&
    dependencyAudit.includes('no room-selection or package keepalive ownership'),
  surfaceBoundaryStillOnlyComposesScreenAndSceneGroups:
    surfaceBoundary.includes('export function useAppSurfaceFrameRuntimeBoundary') &&
    surfaceBoundary.includes('buildAppSurfaceFrameRuntimeEntry({') &&
    surfaceBoundary.includes('...resonanceScreen,') &&
    surfaceBoundary.includes('room,') &&
    surfaceBoundary.includes('...roomScenes,') &&
    surfaceBoundary.includes('performanceCrisisPanelProps,') &&
    !surfaceBoundary.includes('shouldRenderResonancePanels') &&
    !surfaceBoundary.includes('AppRoomViewport'),
  mainContentStillOwnsViewportGateAndAuxMounts:
    appMainContent.includes('<AppRoomViewport') &&
    appMainContent.includes('shouldRenderResonancePanels(props.room)') &&
    appMainContent.includes("props.room === 'COMMONS'") &&
    appMainContent.includes('Level3LabRoomLazy') &&
    appMainContent.includes('data-package-station-keepalive'),
  shellFrameStillOnlyFramesHeaderAndMainContent:
    appShellFrame.includes('<AppHeader {...props.appHeaderProps} />') &&
    appShellFrame.includes('<AppMainContent {...props.mainContentProps} />') &&
    !appShellFrame.includes('shouldRenderResonancePanels') &&
    !appShellFrame.includes('AppRoomViewport'),
  shellFramePropsStillOnlyBuildsFrameProps:
    appShellFrameProps.includes('export function buildAppShellFrameProps') &&
    appShellFrameProps.includes('appHeaderProps: args.appHeaderProps') &&
    appShellFrameProps.includes('mainContentProps: {') &&
    appShellFrameProps.includes('room: args.room') &&
    appShellFrameProps.includes('auxiliaryRoomProps: args.auxiliaryRoomProps'),
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
    app.includes('return <AppShellFrame {...appShellFrameProps} />;') &&
    (app.match(/useAppSurfaceFrameRuntimeBoundary\(/g) || []).length === 1,
  noRoomScreenMountBridgeOrIndexIntroduced:
    !exists('src/features/xensonar/layout/appRoomScreenMountBridge.ts') &&
    !exists('src/features/xensonar/layout/appRoomScreenMountBoundary.ts') &&
    !exists('src/features/xensonar/layout/appRoomScreenMountIndex.ts') &&
    !exists('src/features/xensonar/layout/appActivationCompositionBridge.ts') &&
    !exists('src/features/xensonar/layout/useAppRoomScreenMountBridge.ts'),
  shapeAuditDoesNotMoveRuntimeOrScheduling: forbiddenRuntimeMoves.every((needle) => !shapeAudit.includes(needle)),
  guardListedInSanitySuiteContract:
    suiteContract.includes('xensonar:check-app-room-screen-mount-contract-cleanup'),
  guardListedInRefactorSuiteRunner:
    suite.includes('Room/screen mount contract cleanup') &&
    suite.includes('xensonar:check-app-room-screen-mount-contract-cleanup'),
  appLineCountUnaffectedByRoomScreenMountContractCleanup: appLines <= 5590,
};

const failures = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

const report = {
  ok: failures.length === 0,
  appLines,
  contractCleanup: {
    shapeAudit: 'appRoomScreenMountShapeAudit',
    buildOrder: 'APP_ROOM_SCREEN_MOUNT_CONTRACT_BUILD_ORDER',
    inputMap: 'AppRoomScreenMountInputContractMap',
    outputMap: 'AppRoomScreenMountOutputContractMap',
    contract: 'APP_ROOM_SCREEN_MOUNT_CONTRACT',
    probe: 'APP_ROOM_SCREEN_MOUNT_CONTRACT_CLEANUP_PROBE',
  },
  strategy: {
    researchGrounding: [
      'Branch by Abstraction: keep the live callsite while adding a seam',
      'Architecture Fitness Functions: keep the guard focused on import direction and non-ownership',
      'React custom hooks: keep composition declarative without moving effects or runtime ownership',
    ],
  },
  movedScope: [
    'Added a room/screen mount contract build order and contract map',
    'Connected the existing shape audit entries to explicit contract keys',
    'Added a contract cleanup guard for the room/screen mount layer',
  ],
  explicitlyNotMoved: [
    'No App.tsx final useAppSurfaceFrameRuntimeBoundary callsite was moved',
    'No AppRoomViewport room selection changed',
    'No shouldRenderResonancePanels gate changed',
    'No COMMONS or L3LAB/Materialschmiede mount/keepalive semantics changed',
    'No Surface Coordinator, Room Scene, Root-Follow, Worklet, Package Station, Recording, Parallel Effects, GrooveBass, Partikel, Wellenstarter, Drum/Bass, Materialspur, or Room III behavior changed',
    'No visible UI or HTML output changed',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
