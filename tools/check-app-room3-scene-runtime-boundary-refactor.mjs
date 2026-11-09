#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const app = read('src/App.tsx');
const boundaryPath = 'src/features/xensonar/room3/useAppRoomSceneRuntimeBoundary.ts';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const appLines = app.split(/\r?\n/).length;

const forbiddenRuntimeMoves = [
  'advanceMyzelSynthRoom3Runtime({',
  'renderMyzelSynthRoom3RuntimeCanvas({',
  'updateRoom3NodeDeviceAudioFrame({',
  'ensureMyzelSynthRegisteredAudioDevices(',
  'ensureRefactorTopologyLegacyAudio(',
  'updateRefactorTopologyLegacyAudio(',
  'createOscillator(',
  'createGain(',
  'connect(',
  '.start(',
  'safeApplyAttack(',
  'safeApplyExponentialRelease(',
  'linearRampToValueAtTime(',
  'setTargetAtTime(',
];

const checks = {
  boundaryHookFileExists: exists(boundaryPath),
  appUsesRoomSceneRuntimeBoundary: app.includes('useAppRoomSceneRuntimeBoundary(appRoomSceneRuntimeSource);') || app.includes('useAppRoomSceneRuntimeBoundary({'),
  appNoLongerImportsRoomSceneArgsBuilder: !app.includes('appRoomSceneRuntimeArgsBuilder'),
  appNoLongerImportsRoomSceneRuntimeEntry: !/buildAppRoomSceneRuntimeEntry,/.test(app),
  appNoLongerOwnsRoomSceneRuntimeArgsVariable: !app.includes('const appRoomSceneRuntimeArgs ='),
  appPassesRoom3RuntimeEntryAsOneContract: app.includes('const room3RuntimeEntry = useRoom3TopologyRuntimeEntry({') && app.includes('room3RuntimeEntry,'),
  boundaryOwnsSceneArgumentBridge: [
    'export function useAppRoomSceneRuntimeBoundary',
    'buildAppRoomSceneRuntimeEntry(buildAppRoomSceneRuntimeArgsBuilder({',
    'room3Topology: Room3TopologyUiState',
    'room3RuntimeEntry: Room3RuntimeEntry',
    'topologyScene:',
    'installationScene:',
    'viewportScene,',
  ].every((needle) => boundary.includes(needle)),
  boundaryUsesRoom3StateContractInsteadOfLooseAppProps: [
    'topologySnapshot: room3Topology.myceliumSnapshotRef.current',
    'room3BodyEnabled: room3Topology.room3BodyEnabled',
    'room3BodyMaterial: room3Topology.room3BodyControls.material',
    'installationFieldConfig: room3Topology.installationFieldConfig',
    'savedResidentConstellations: room3Topology.savedResidentConstellations',
  ].every((needle) => boundary.includes(needle)),
  boundaryUsesRuntimeEntryContractForTopologyAndInstallationActions: [
    'handleTopologyCanvasMouseDown: room3RuntimeEntry.handleTopologyCanvasMouseDown',
    'toggleInstallResidents: room3RuntimeEntry.toggleInstallResidents',
    'saveCurrentResidentConstellation: room3RuntimeEntry.saveCurrentResidentConstellation',
    'deleteResidentConstellation: room3RuntimeEntry.deleteResidentConstellation',
  ].every((needle) => boundary.includes(needle)),
  boundaryDoesNotMoveAudioOrRafRuntime: forbiddenRuntimeMoves.every((needle) => !boundary.includes(needle)),
  appStillOwnsRoom3RuntimeLoopsAndAudioCalls: [
    'advanceMyzelSynthRoom3Runtime({',
    'renderMyzelSynthRoom3RuntimeCanvas({',
    'updateRoom3NodeDeviceAudioFrame({',
    'ensureRefactorTopologyLegacyAudio(',
    'updateRefactorTopologyLegacyAudio(',
  ].every((needle) => app.includes(needle)),
  appLineCountUnder6725: appLines < 6725,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  movedScope: [
    'Room scene runtime-entry argument assembly',
    'Topology/installation/viewport scene prop marshalling',
    'Room3 UI-state and topology-runtime-entry contract composition for shell rendering',
  ],
  explicitlyNotMoved: [
    'Myzel synth registry and registered device constructors',
    'Room III node-device audio frame runtime',
    'Topology RAF/render loop',
    'Legacy topology audio runtime',
    'Wellenstarter, Root-Follow, Materialspur, package payload',
  ],
  futureSeamsMadeClearer: [
    'A later Room III runtime boundary can receive one room3Topology + one room3RuntimeEntry contract',
    'Scene prop assembly no longer obscures App.tsx bottom-level orchestration',
    'Viewport scene remains explicit so Xenpolar/SpectralForge handoffs are not silently mixed into Room III audio boundaries',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
