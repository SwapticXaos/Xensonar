#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const app = read('src/App.tsx');
const screenBoundaryPath = 'src/features/xensonar/layout/useAppResonanceScreenRuntimeBoundary.ts';
const surfaceBoundaryPath = 'src/features/xensonar/layout/useAppSurfaceFrameRuntimeBoundary.ts';
const screenBoundary = exists(screenBoundaryPath) ? read(screenBoundaryPath) : '';
const surfaceBoundary = exists(surfaceBoundaryPath) ? read(surfaceBoundaryPath) : '';
const appLines = app.split(/\r?\n/).length;

const forbiddenRuntimeMoves = [
  'createOscillator(',
  'createGain(',
  '.connect(',
  '.start(',
  'safeApplyAttack(',
  'safeApplyExponentialRelease(',
  'playWaveStartSound(',
  'emitWaveStartSound(',
  'scheduleBassClipStep(',
  'scheduleClassicBassPatternStep(',
  'scheduleExportedDrumConfigStep(',
  'startQuantizedCollisionRuntime(',
  'updateRoom3NodeDeviceAudioFrame(',
  'advanceMyzelSynthRoom3Runtime(',
  'renderMyzelSynthRoom3RuntimeCanvas(',
];

const checks = {
  screenBoundaryFileExists: exists(screenBoundaryPath),
  surfaceBoundaryFileExists: exists(surfaceBoundaryPath),
  appUsesResonanceScreenRuntimeBoundary: app.includes('const resonanceScreenRuntime = useAppResonanceScreenRuntimeBoundary({'),
  appUsesSurfaceFrameRuntimeBoundaryWithGroupedContracts: [
    'const appShellFrameProps = useAppSurfaceFrameRuntimeBoundary({',
    'resonanceScreen: resonanceScreenRuntime,',
    'roomScenes: appRoomScenes,',
    'performanceCrisisPanelProps,',
  ].every((needle) => app.includes(needle)),
  appNoLongerImportsScreenRuntimeEntry: !/buildAppResonanceScreenRuntimeEntry,/.test(app),
  appNoLongerImportsSurfaceFrameRuntimeEntry: !/buildAppSurfaceFrameRuntimeEntry,/.test(app),
  appNoLongerImportsAuxPanelRuntimeArgsBuilder: !app.includes('./features/xensonar/layout/appResonanceAuxPanelRuntimeArgs'),
  appNoLongerOwnsAuxPanelRuntimeArgsVariable: !app.includes('const appResonanceAuxPanelRuntimeArgs ='),
  appNoLongerDestructuresScreenRuntimePropsAtTopLevel: !app.includes('appHeaderProps,\n    resonanceStatusStripProps'),
  appNoLongerDestructuresRoomSceneRuntimePropsAtTopLevel: !app.includes('topologyPanelProps,\n    mainRoomProps'),
  screenBoundaryOwnsAuxAndScreenBridge: [
    'export function useAppResonanceScreenRuntimeBoundary',
    'buildAppResonanceAuxPanelRuntimeArgs(auxPanels)',
    'buildAppResonanceScreenRuntimeEntry({',
    'chrome,',
    '...appResonanceAuxPanelRuntimeArgs',
  ].every((needle) => screenBoundary.includes(needle)),
  screenBoundaryKeepsAuxPanelInputTyped: [
    'BuildAppResonanceScreenRuntimePropsArgs',
    'BuildAppResonanceAuxPanelRuntimeArgsInput',
    'AppResonanceScreenCorePanelArgs',
  ].every((needle) => screenBoundary.includes(needle)),
  surfaceBoundaryOwnsFinalShellBridge: [
    'export function useAppSurfaceFrameRuntimeBoundary',
    'resonanceScreen: AppResonanceScreenRuntimeBoundary',
    'roomScenes: AppRoomSceneRuntimeBoundary',
    'buildAppSurfaceFrameRuntimeEntry({',
    '...resonanceScreen,',
    '...roomScenes,',
  ].every((needle) => surfaceBoundary.includes(needle)),
  boundariesDoNotMoveAudioOrRafRuntime: forbiddenRuntimeMoves.every((needle) => !screenBoundary.includes(needle) && !surfaceBoundary.includes(needle)),
  appStillOwnsResonanceCorePanelArgumentData: [
    'nexusActive,',
    'resonanceInputIndicator,',
    'commitResonanceCursorY,',
    'spawnNexusRipple,',
    'previewWavePresetSelection,',
  ].every((needle) => app.includes(needle)),
  appStillOwnsRoomSceneInputData: [
    'const appRoomScenes = useAppRoomSceneRuntimeBoundary({',
    'topologyScene: {',
    'installationScene: {',
    'viewportScene: {',
  ].every((needle) => app.includes(needle)),
  appLineCountUnder6650: appLines < 6650,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  movedScope: [
    'Resonance screen runtime-entry argument assembly',
    'Aux panel flattening from parallel/groove/recording/burst props into the resonance panel runtime contract',
    'Surface-frame shell assembly from grouped resonanceScreen + roomScenes contracts',
  ],
  explicitlyNotMoved: [
    'Resonance panel core data and setters',
    'Room-scene input data',
    'Wellenstarter, Bass/Drum scheduling, Room III audio, Root-Follow, Materialspur',
  ],
  futureSeamsMadeClearer: [
    'A later screen-panel boundary can consume one resonanceScreen core contract plus one auxPanels contract',
    'The final AppShellFrame handoff now depends on grouped screen/scene contracts instead of many top-level prop variables',
    'A future App.tsx split can move screen and scene branches independently before touching audio/runtime loops',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
