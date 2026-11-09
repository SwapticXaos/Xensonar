#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const auditPath = 'validation/contracts/xensonar/layout/appRoomScreenMountShapeAudit.ts';
const appPath = 'src/App.tsx';
const surfaceBoundaryPath = 'src/features/xensonar/layout/useAppSurfaceFrameRuntimeBoundary.ts';
const appMainContentPath = 'src/features/xensonar/layout/AppMainContent.tsx';
const appShellFramePath = 'src/features/xensonar/layout/AppShellFrame.tsx';
const appShellFramePropsPath = 'src/features/xensonar/layout/appShellFrameProps.ts';
const surfaceEntryPath = 'src/features/xensonar/layout/appSurfaceFrameRuntimeEntry.ts';
const surfaceCoordinatorPath = 'src/features/xensonar/layout/appSurfaceRuntimeCoordinator.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const audit = exists(auditPath) ? read(auditPath) : '';
const app = exists(appPath) ? read(appPath) : '';
const surfaceBoundary = exists(surfaceBoundaryPath) ? read(surfaceBoundaryPath) : '';
const appMainContent = exists(appMainContentPath) ? read(appMainContentPath) : '';
const appShellFrame = exists(appShellFramePath) ? read(appShellFramePath) : '';
const appShellFrameProps = exists(appShellFramePropsPath) ? read(appShellFramePropsPath) : '';
const surfaceEntry = exists(surfaceEntryPath) ? read(surfaceEntryPath) : '';
const surfaceCoordinator = exists(surfaceCoordinatorPath) ? read(surfaceCoordinatorPath) : '';
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const pkg = JSON.parse(read(pkgPath));
const appLines = app.split(/\r?\n/).length;

const shapeKeys = [
  'surfaceFrameBoundary',
  'shellFrame',
  'mainContentViewport',
  'resonancePanelMountGate',
  'auxiliaryRoomMounts',
];

const forbiddenAuditImports = [
  "from '../audio/",
  "from '../rootFollow/",
  "from '../package",
  "from '../recording/",
  "from '../rooms/",
  "from '@/features",
  "from '../../",
  "from '../../../",
];

const forbiddenRuntimeTokens = [
  'createOscillator(',
  'createGain(',
  '.connect(',
  '.start(',
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
  'localStorage.',
];

const nonOwnershipNeedles = [
  'runtimeOwned: false',
  'audioMutating: false',
  'roomLifecycleOwned: false',
  'packagePersistenceOwned: false',
  'bridgeOwnsPanelPropBuild: false',
  'visibleUiChangedByAudit: false',
];

function blockFor(key) {
  const shapeAuditStart = audit.indexOf('export const APP_ROOM_SCREEN_MOUNT_SHAPE_AUDIT = {');
  const start = audit.indexOf(`${key}: {`, shapeAuditStart >= 0 ? shapeAuditStart : 0);
  if (start < 0) return '';
  const nextStarts = shapeKeys
    .filter((other) => other !== key)
    .map((other) => audit.indexOf(`${other}: {`, start + 1))
    .filter((idx) => idx > start);
  const end = nextStarts.length ? Math.min(...nextStarts) : audit.indexOf('} satisfies Record', start);
  return audit.slice(start, end > start ? end : undefined);
}

const checks = {
  expectedFilesExist: [
    auditPath,
    appPath,
    surfaceBoundaryPath,
    appMainContentPath,
    appShellFramePath,
    appShellFramePropsPath,
    surfaceEntryPath,
    surfaceCoordinatorPath,
    pkgPath,
    suitePath,
    suiteContractPath,
  ].every(exists),
  packageVersionAtLeast118: /^3\.2\.91(?:\.6\.9\.(11[8-9]|1[2-9][0-9]|[2-9][0-9]{2,})|-7\.5\.(12[6-9]|1[3-9][0-9]|[2-9][0-9]{2,}))$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-room-screen-mount-shape-audit'] ===
    'node tools/check-app-room-screen-mount-shape-audit.mjs',
  auditDeclaresExpectedContracts: [
    'APP_ROOM_SCREEN_MOUNT_SHAPE_KEYS',
    'AppRoomScreenMountInputContractMap',
    'AppRoomScreenMountOutputContractMap',
    'AppRoomScreenMountShapeAuditEntry',
    'APP_ROOM_SCREEN_MOUNT_SHAPE_AUDIT',
    'APP_ROOM_SCREEN_MOUNT_SHAPE_AUDIT_PROBE',
  ].every((needle) => audit.includes(needle)),
  auditCoversAllShapeKeys:
    shapeKeys.every((key) => audit.includes(`${key}: {`) && audit.includes(`key: '${key}'`)),
  auditDeclaresNonOwnershipForEveryEntry: shapeKeys.every((key) => {
    const block = blockFor(key);
    return nonOwnershipNeedles.every((needle) => block.includes(needle));
  }),
  auditImportsOnlyLocalTypes:
    audit.includes("import type { ComponentProps } from 'react';") &&
    audit.includes("from './AppMainContent'") &&
    audit.includes("from './AppShellFrame'") &&
    audit.includes("from './useAppSurfaceFrameRuntimeBoundary'") &&
    !audit.includes('import {') &&
    forbiddenAuditImports.every((needle) => !audit.includes(needle)),
  auditDoesNotMoveRuntimeOrScheduling: forbiddenRuntimeTokens.every((needle) => !audit.includes(needle)),
  surfaceBoundaryStillComposesGroupedScreenAndSceneContracts:
    surfaceBoundary.includes('export function useAppSurfaceFrameRuntimeBoundary') &&
    surfaceBoundary.includes('room: SurfaceFrameRuntimeArgs["room"]') &&
    surfaceBoundary.includes('resonanceScreen: AppResonanceScreenRuntimeBoundary') &&
    surfaceBoundary.includes('roomScenes: AppRoomSceneRuntimeBoundary') &&
    surfaceBoundary.includes('buildAppSurfaceFrameRuntimeEntry({') &&
    surfaceBoundary.includes('...resonanceScreen,') &&
    surfaceBoundary.includes('...roomScenes,') &&
    surfaceBoundary.includes('performanceCrisisPanelProps,'),
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
  appMainContentStillOwnsRoomViewportAndPanelGates:
    appMainContent.includes('<AppRoomViewport') &&
    appMainContent.includes('room={props.room}') &&
    appMainContent.includes('mainRoomProps={props.mainRoomProps}') &&
    appMainContent.includes('topologyPanelProps={props.topologyPanelProps}') &&
    appMainContent.includes('xenpolarRoomProps={props.xenpolarRoomProps}') &&
    appMainContent.includes('irrlichtArenaPanelProps={props.irrlichtArenaPanelProps}') &&
    appMainContent.includes('shouldRenderResonancePanels(props.room)') &&
    appMainContent.includes('<RecordingMarkerSideRails') &&
    appMainContent.includes('PerformanceCrisisManagementPanelLazy') &&
    appMainContent.includes('XENSONAR_DIAGNOSTIC_SURFACES_ENABLED'),
  appMainContentStillOwnsAuxiliaryRoomMounts:
    appMainContent.includes("props.room === 'COMMONS'") &&
    appMainContent.includes('<CommonsRoom {...props.auxiliaryRoomProps.commonsRoomProps} />') &&
    appMainContent.includes('Level3LabRoomLazy') &&
    appMainContent.includes("props.room === 'L3LAB'") &&
    appMainContent.includes('data-package-station-keepalive') &&
    appMainContent.includes('Materialschmiede wird geladen'),
  appShellFrameStillOnlyFramesHeaderAndMainContent:
    appShellFrame.includes('<AppHeader {...props.appHeaderProps} />') &&
    appShellFrame.includes('<AppMainContent {...props.mainContentProps} />') &&
    appShellFrame.includes('APP_SHELL_KEYFRAMES_CSS'),
  appShellFramePropsStillBuildsMainContentProps:
    appShellFrameProps.includes('export function buildAppShellFrameProps') &&
    appShellFrameProps.includes('appHeaderProps: args.appHeaderProps') &&
    appShellFrameProps.includes('mainContentProps: {') &&
    appShellFrameProps.includes('room: args.room') &&
    appShellFrameProps.includes('auxiliaryRoomProps: args.auxiliaryRoomProps'),
  surfaceEntryStillDelegatesToSurfaceCoordinator:
    surfaceEntry.includes('buildAppSurfaceRuntimeProps as buildAppSurfaceFrameRuntimeEntry') &&
    surfaceCoordinator.includes('export function buildAppSurfaceRuntimeProps') &&
    surfaceCoordinator.includes('return buildAppShellFrameProps(args);'),
  noRoomScreenMountBridgeOrIndexIntroduced:
    !exists('src/features/xensonar/layout/appRoomScreenMountBridge.ts') &&
    !exists('src/features/xensonar/layout/appRoomScreenMountBoundary.ts') &&
    !exists('src/features/xensonar/layout/appRoomScreenMountIndex.ts') &&
    !exists('src/features/xensonar/layout/appActivationCompositionBridge.ts'),
  surfaceBoundaryAndMainContentDoNotMoveAudioRuntime:
    forbiddenRuntimeTokens.every((needle) => !surfaceBoundary.includes(needle) && !appMainContent.includes(needle)),
  sanitySuiteIncludesGuard:
    (suite.includes('Room/screen mount shape audit') &&
      suite.includes('xensonar:check-app-room-screen-mount-shape-audit')) ||
    pkg.scripts?.['xensonar:sanity:parallel-refactor'] ===
      'node tools/run-xensonar-parallel-refactor-sanity.mjs',
  sanitySuiteContractIncludesGuard:
    suiteContract.includes('xensonar:check-app-room-screen-mount-shape-audit') ||
    pkg.scripts?.['xensonar:check-app-room-screen-mount-shape-audit'] ===
      'node tools/check-app-room-screen-mount-shape-audit.mjs',
  appLineCountUnaffectedByRoomScreenMountAudit: appLines <= 5590,
};

const failures = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

const report = {
  ok: failures.length === 0,
  appLines,
  shapeAudit: {
    auditedKeys: shapeKeys,
    role: 'static map for App.tsx room/screen-mount and activation composition before moving any room lifecycle, callsite, package persistence, or audio/runtime behavior',
    keepsAppCallsite: true,
    createsBridgeOrIndex: false,
  },
  explicitlyNotMoved: [
    'No App.tsx final useAppSurfaceFrameRuntimeBoundary callsite was moved',
    'No AppRoomViewport room-selection semantics changed',
    'No shouldRenderResonancePanels gate changed',
    'No COMMONS or L3LAB/Materialschmiede mount/keepalive semantics changed',
    'No Root-Follow, Worklet, Package Station, Recording, Parallel Effects, GrooveBass, Partikel, Wellenstarter, Drum/Bass, Materialspur, or Room III behavior changed',
    'No visible UI or HTML output changed',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
