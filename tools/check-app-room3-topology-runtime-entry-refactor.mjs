#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const app = read('src/App.tsx');
const runtimeHookPath = 'src/features/xensonar/room3/useRoom3TopologyRuntimeEntry.ts';
const stateHookPath = 'src/features/xensonar/room3/useRoom3TopologyUiState.ts';
const runtimeHook = exists(runtimeHookPath) ? read(runtimeHookPath) : '';
const stateHook = exists(stateHookPath) ? read(stateHookPath) : '';
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
  runtimeHookFileExists: exists(runtimeHookPath),
  appUsesRuntimeEntryHook: app.includes('useRoom3TopologyRuntimeEntry({'),
  appNoLongerBuildsTopologyRuntimeEntryInline: !app.includes('buildTopologyRuntimeEntry({'),
  appNoLongerImportsTopologyRuntimeEntryBuilder: !/buildTopologyRuntimeEntry,/.test(app),
  runtimeHookOwnsOnlyRuntimeEntryArgumentBridge: [
    'import { buildTopologyRuntimeEntry } from "../runtimeEntries";',
    'export function useRoom3TopologyRuntimeEntry',
    'room3Topology: Room3TopologyUiState',
    'installationSharedFieldFlags',
    'buildTopologyRuntimeEntry({',
    'residentConfig:',
    'roomSupport:',
    'installationSharedField:',
  ].every((needle) => runtimeHook.includes(needle)),
  runtimeHookDoesNotMoveAudioOrRafRuntime: forbiddenRuntimeMoves.every((needle) => !runtimeHook.includes(needle)),
  appStillOwnsRoom3RuntimeLoopsAndAudioCalls: [
    'advanceMyzelSynthRoom3Runtime({',
    'renderMyzelSynthRoom3RuntimeCanvas({',
    'updateRoom3NodeDeviceAudioFrame({',
    'ensureRefactorTopologyLegacyAudio(',
    'updateRefactorTopologyLegacyAudio(',
  ].every((needle) => app.includes(needle)),
  stateHookExportsInstallationSharedFieldFlags: [
    'export type Room3InstallationSharedFieldFlags',
    'const installationSharedFieldFlags = useMemo<Room3InstallationSharedFieldFlags>',
    'installationSharedFieldActive: myzelEnabled && myzelTopologyMode === "installation"',
    'installationSharedFieldFlags,',
  ].every((needle) => stateHook.includes(needle)),
  appNoLongerDerivesInstallationSharedFieldFlagsInline: [
    'const installResidentsEnabled = installationFieldConfig.residentsEnabled;',
    'const installAttractCursor = installationFieldConfig.nomadAttractors.cursor;',
    'const installAttractOscillatorBall = installationFieldConfig.nomadAttractors.oscillatorBall;',
    'const installationSharedFieldActive = myzelEnabled && myzelTopologyMode === "installation";',
  ].every((needle) => !app.includes(needle)),
  appLineCountUnder6800: appLines < 6800,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  movedScope: [
    'Topology runtime-entry argument assembly',
    'Installation shared-field flag derivation',
    'Room III runtime-entry dependency seam for later runtime extraction',
  ],
  explicitlyNotMoved: [
    'Myzel synth registry and registered device constructors',
    'Room III node-device audio frame runtime',
    'Topology RAF/render loop',
    'Legacy topology audio runtime',
    'Wellenstarter, Root-Follow, Materialspur, package payload',
  ],
  futureSeamsMadeClearer: [
    'A later useRoom3TopologyRuntimeBoundary can replace the runtime-entry hook without scanning App.tsx props',
    'buildTopologyRuntimeEntry no longer leaks its nested argument object into App.tsx',
    'installation shared-field state is a named contract instead of five loose booleans',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
