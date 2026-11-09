#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const builderPath = 'src/features/xensonar/layout/appRoomSceneRuntimeSourceBuilder.ts';
const typesPath = 'src/features/xensonar/layout/appRoomSceneRuntimeSourceTypes.ts';
const auditPath = 'src/features/xensonar/layout/appRoomSceneRuntimeSourceReadinessAudit.ts';
const boundaryPath = 'src/features/xensonar/room3/useAppRoomSceneRuntimeBoundary.ts';
const argsBuilderPath = 'src/features/xensonar/layout/appRoomSceneRuntimeArgsBuilder.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const app = exists(appPath) ? read(appPath) : '';
const builder = exists(builderPath) ? read(builderPath) : '';
const types = exists(typesPath) ? read(typesPath) : '';
const audit = exists(auditPath) ? read(auditPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const argsBuilder = exists(argsBuilderPath) ? read(argsBuilderPath) : '';
const monolithMap = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

const appLines = app.split(/\r?\n/).length;
const builderLines = builder.split(/\r?\n/).length;

const sourceStart = app.indexOf('const appRoomSceneRuntimeSource = buildAppRoomSceneRuntimeSource({');
const appRoomScenesStart = app.indexOf('const appRoomScenes = useAppRoomSceneRuntimeBoundary(appRoomSceneRuntimeSource);', sourceStart);
const sourceBlock = sourceStart >= 0 && appRoomScenesStart > sourceStart ? app.slice(sourceStart, appRoomScenesStart) : '';

const blocks = {
  contracts: ['contracts: {', 'room3Topology', 'room3RuntimeEntry'],
  topologyHandoff: ['handoffScene: {', 'freqFromY', 'selectedLoopHandoffProfile', 'selectedLoopMaterial', 'summarizeHandoffProfile', 'setFamilyRequestedActive', 'setRoom', 'activeMyzelRootHz'],
  topologyRuntime: ['runtimeScene: {', 'setMyzelModeAndPower', 'toggleMyzelEnabled', 'resetMyzelTopologyNodes'],
  installationDevice: ['deviceScene: {', 'particleSoundsMuted: nParamsUI.particleMute', 'onNodalDeviceEnabledChange: handleNodalDeviceEnabledChange', 'onNodalDeviceAmountChange: handleNodalDeviceAmountChange', 'onNodalDeviceTargetChange: handleNodalDeviceTargetChange'],
  installationResident: ['residentScene: {', 'previewPendingCustomResident', 'selectedResidentNode', 'residentBaseHz', 'residentAddFrequencyHz'],
  viewportXenpolar: ['xenpolarScene: {', 'familyRequestedActive', 'installationSharedFieldController', 'xenpolarView', 'setXenpolarView', 'resonanzwandererStatus', 'resonanzwandererBusy', 'resonanzwandererCanExport', 'handleResonanzwandererExportToXensonar', 'handleResonanzwandererExportToSpectralForge', 'handleResonanzwandererExportToSyntheticForge'],
  viewportGameArena: ['gameArenaScene: {', 'gameActive', 'gameHud', 'gameCanvasRef', 'arenaSeedStatus', 'handleArenaSeedExport', 'startGameRun', 'returnToXensonarHauptraum'],
  viewportSpectralForgeEntry: ['spectralForgeEntryScene: {', 'externalAudioUploadFile: spectralForgeEntryUploadState.spectralForgeExternalAudioFile', 'externalAudioUploadOrigin: spectralForgeEntryUploadState.spectralForgeExternalAudioOrigin', 'entryScrollIntent: spectralForgeEntryUploadState.spectralForgeEntryScrollIntent', 'onExternalAudioUploadConsumed', 'onEntryScrollIntentConsumed'],
};

const forbiddenRuntimeTokens = [
  'createOscillator(', 'createGain(', '.connect(', '.start(', 'requestAnimationFrame(', 'setInterval(', 'setTimeout(',
  'new AudioContext(', 'advanceMyzelSynthRoom3Runtime({', 'renderMyzelSynthRoom3RuntimeCanvas({',
  'updateRoom3NodeDeviceAudioFrame({', 'ensureRefactorTopologyLegacyAudio(', 'updateRefactorTopologyLegacyAudio(',
  'handleTopologyCanvasMouseDown(', 'toggleInstallResidents(', 'saveCurrentResidentConstellation(',
  'handleResonanzwandererExportToXensonar(', 'handleResonanzwandererExportToSpectralForge(',
  'handleResonanzwandererExportToSyntheticForge(', 'handleArenaSeedExport(', 'startGameRun(', 'returnToXensonarHauptraum(',
  'setSpectralForgeExternalAudioFile(', 'setSpectralForgeEntryScrollIntent(', 'localStorage.', '.current =', '.current=',
];

const typeContractRequiredMarkers = [
  'BuildAppRoomSceneRuntimeSourceInput',
  'AppRoomSceneRuntimeContractSourceArgs',
  'AppRoomSceneTopologyHandoffSourceArgs',
  'AppRoomSceneTopologyRuntimeSourceArgs',
  'AppRoomSceneInstallationDeviceSourceArgs',
  'AppRoomSceneInstallationResidentSourceArgs',
  'AppRoomSceneViewportXenpolarSourceArgs',
  'AppRoomSceneViewportGameArenaSourceArgs',
  'AppRoomSceneViewportSpectralForgeEntrySourceArgs',
];

const builderRequiredMarkers = [
  'APP_ROOM_SCENE_RUNTIME_SOURCE_BUILDER_PROBE',
  'export function buildAppRoomSceneRuntimeSource({',
  'room3Topology: contracts.room3Topology',
  'room3RuntimeEntry: contracts.room3RuntimeEntry',
  '...topology.handoffScene',
  '...topology.runtimeScene',
  '...installation.deviceScene',
  '...installation.residentScene',
  '...viewport.xenpolarScene',
  '...viewport.gameArenaScene',
  '...viewport.spectralForgeEntryScene',
  'satisfies UseAppRoomSceneRuntimeBoundaryArgs',
];

const checks = {
  expectedFilesExist: [appPath, builderPath, typesPath, auditPath, boundaryPath, argsBuilderPath, monolithMapPath, pkgPath, suitePath, suiteContractPath].every(exists),
  packageVersionAtLeast162: /^3\.2\.91\.6\.9\.(16[2-9]|1[7-9][0-9]|[2-9][0-9]{2,})$/.test(String(pkg.version || '')),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-room-scene-runtime-source-builder-probe'] ===
    'node tools/check-app-room-scene-runtime-source-builder-probe.mjs',
  appUsesRoomSceneRuntimeSourceBuilder:
    app.includes('import { buildAppRoomSceneRuntimeSource } from "./features/xensonar/layout/appRoomSceneRuntimeSourceBuilder";') &&
    app.includes('const appRoomSceneRuntimeSource = buildAppRoomSceneRuntimeSource({') &&
    app.includes('const appRoomScenes = useAppRoomSceneRuntimeBoundary(appRoomSceneRuntimeSource);'),
  appSourceGroupsAreExplicitAndComplete:
    Object.values(blocks).every((needles) => needles.every((needle) => sourceBlock.includes(needle))),
  appSourceGroupsRemainInExpectedOrder:
    ['contracts: {', 'topology: {', 'handoffScene: {', 'runtimeScene: {', 'installation: {', 'deviceScene: {', 'residentScene: {', 'viewport: {', 'xenpolarScene: {', 'gameArenaScene: {', 'spectralForgeEntryScene: {']
      .every((needle) => sourceBlock.includes(needle)) &&
    sourceBlock.indexOf('contracts: {') < sourceBlock.indexOf('topology: {') &&
    sourceBlock.indexOf('topology: {') < sourceBlock.indexOf('installation: {') &&
    sourceBlock.indexOf('installation: {') < sourceBlock.indexOf('viewport: {'),
  typeContractDeclaresSourceGroupTypes:
    typeContractRequiredMarkers.every((needle) => types.includes(needle)) &&
    types.includes("import type { UseAppRoomSceneRuntimeBoundaryArgs } from '../room3/useAppRoomSceneRuntimeBoundary';"),
  builderDeclaresOnlyRuntimeProbeAndFlattening:
    builderRequiredMarkers.every((needle) => builder.includes(needle)) &&
    builder.includes("from './appRoomSceneRuntimeSourceTypes'"),
  builderImportsOnlyTypeContractAndReadinessAudit:
    builder.includes("import type { UseAppRoomSceneRuntimeBoundaryArgs } from '../room3/useAppRoomSceneRuntimeBoundary';") &&
    builder.includes("import type { BuildAppRoomSceneRuntimeSourceInput } from './appRoomSceneRuntimeSourceTypes';") &&
    builder.includes("from './appRoomSceneRuntimeSourceReadinessAudit'") &&
    !builder.includes('React') && !builder.includes('useMemo'),
  builderDoesNotExecuteRuntimeOrMutateRefs:
    forbiddenRuntimeTokens.every((needle) => !builder.includes(needle)),
  boundaryStillOwnsRuntimeEntryArgsBridge:
    boundary.includes('buildAppRoomSceneRuntimeEntry(buildAppRoomSceneRuntimeArgsBuilder({') &&
    boundary.includes('topologySnapshot: room3Topology.myceliumSnapshotRef.current') &&
    boundary.includes('handleTopologyCanvasMouseDown: room3RuntimeEntry.handleTopologyCanvasMouseDown') &&
    boundary.includes('toggleInstallResidents: room3RuntimeEntry.toggleInstallResidents') &&
    boundary.includes('viewportScene,'),
  argsBuilderStillOnlyFlattensSceneRuntimeArgs:
    argsBuilder.includes('export function buildAppRoomSceneRuntimeArgsBuilder(') &&
    argsBuilder.includes('room3MaterialLabel: input.topologyScene.room3TimbreState.materialLabel') &&
    argsBuilder.includes('selectedResidentLabel: input.installationScene.selectedResidentNode?.label ?? null') &&
    forbiddenRuntimeTokens.every((needle) => !argsBuilder.includes(needle)),
  readinessAuditAcknowledgesBuilderProbe:
    audit.includes('APP_ROOM_SCENE_RUNTIME_SOURCE_READINESS_AUDIT_MANIFEST') &&
    audit.includes('auditOnly: false') &&
    audit.includes('dedicatedRoomSceneSourceBuilderIntroduced: true') &&
    audit.includes("sourceBuilderProbeIntroducedIn: '3.2.91.6.9.162'") &&
    audit.includes("nextAllowedStepAfterAudit: 'buildAppRoomSceneRuntimeSource'"),
  monolithMapAcknowledgesBuilderProbe:
    monolithMap.includes("status: 'source-builder-probed'") &&
    monolithMap.includes('buildAppRoomSceneRuntimeSource plus useAppRoomSceneRuntimeBoundary') &&
    (
      (monolithMap.includes("currentPatchRole: 'RoomScenes source-builder probe complete; no Room III runtime extraction'") &&
        monolithMap.includes("firstSafeMove: 'room-screen-surface-mount-source-readiness-audit'")) ||
      (monolithMap.includes("currentPatchRole: 'Surface frame mount source-readiness audit complete; no room lifecycle or viewport mount extraction'") &&
        monolithMap.includes("firstSafeMove: 'surface-frame-mount-source-builder-probe'")) ||
      (monolithMap.includes("currentPatchRole: 'Surface frame mount source-builder probe complete; no room lifecycle or viewport mount extraction'") &&
        monolithMap.includes("firstSafeMove: 'global-input-and-metronome-source-readiness-audit'"))
    ),
  sanitySuiteIncludesGuard:
    suite.includes('Room scene runtime source builder probe') &&
    suite.includes('xensonar:check-app-room-scene-runtime-source-builder-probe'),
  sanitySuiteContractIncludesGuard:
    suiteContract.includes('xensonar:check-app-room-scene-runtime-source-builder-probe'),
  oldFlatBoundaryObjectNoLongerDirectlyCalled:
    !app.includes('const appRoomScenes = useAppRoomSceneRuntimeBoundary({'),
  lineCountEnvelope: appLines <= 5525 && builderLines <= 180,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  builderLines,
  groupedSources: Object.keys(blocks),
  role: 'RoomScenes source builder probe only; no Room III runtime, viewport lifecycle, or SpectralForge handoff behavior moved',
  explicitlyNotMoved: [
    'Room III topology runtime-entry actions',
    'topology canvas event handlers',
    'installation nodal-device and resident action bodies',
    'Xenpolar/Resonanzwanderer export handlers',
    'SpectralForge entry upload and scroll-intent consumers',
  ],
  checks,
  failures,
};

if (failures.length) {
  console.error('[check-app-room-scene-runtime-source-builder-probe] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log('[check-app-room-scene-runtime-source-builder-probe] ok');
console.log(JSON.stringify(report, null, 2));
