#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const auditPath = 'src/features/xensonar/layout/appRoomSceneRuntimeSourceReadinessAudit.ts';
const boundaryPath = 'src/features/xensonar/room3/useAppRoomSceneRuntimeBoundary.ts';
const argsBuilderPath = 'src/features/xensonar/layout/appRoomSceneRuntimeArgsBuilder.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const app = exists(appPath) ? read(appPath) : '';
const audit = exists(auditPath) ? read(auditPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const argsBuilder = exists(argsBuilderPath) ? read(argsBuilderPath) : '';
const monolithMap = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

const appLines = app.split(/\r?\n/).length;
const auditLines = audit.split(/\r?\n/).length;
const boundaryLines = boundary.split(/\r?\n/).length;

const roomScenesStart = app.indexOf('const appRoomSceneRuntimeSource = buildAppRoomSceneRuntimeSource({');
const surfaceStart = roomScenesStart >= 0 ? app.indexOf('\n  const appRoomScenes = useAppRoomSceneRuntimeBoundary(appRoomSceneRuntimeSource);', roomScenesStart) : -1;
const roomScenesBlock = roomScenesStart >= 0 && surfaceStart > roomScenesStart ? app.slice(roomScenesStart, surfaceStart) : '';

const blockForAppGroup = (_groupName) => roomScenesBlock;

const topologyBlock = blockForAppGroup('topologyScene');
const installationBlock = blockForAppGroup('installationScene');
const viewportBlock = blockForAppGroup('viewportScene');

const readinessGroups = {
  roomSceneContracts: {
    appBlock: roomScenesBlock,
    appKeys: ['room3Topology', 'room3RuntimeEntry'],
    injectedKeys: [
      'room3Topology.myceliumSnapshotRef.current',
      'room3Topology.room3TimbreStateRef.current',
      'room3RuntimeEntry.handleTopologyCanvasMouseDown',
      'room3RuntimeEntry.toggleInstallResidents',
    ],
  },
  topologyHandoffScene: {
    appBlock: topologyBlock,
    appKeys: [
      'freqFromY',
      'selectedLoopHandoffProfile',
      'selectedLoopMaterial',
      'summarizeHandoffProfile',
      'setFamilyRequestedActive',
      'setRoom',
      'activeMyzelRootHz',
    ],
    injectedKeys: [
      'room3BodyMaterial',
      'room3MaterialLabel',
      'primedY',
      'primedSource',
      'activeMyzelPostFxGroupSummary',
      'activeMyzelPostFxGroupReceivesFrom',
      'activeMyzelPostFxGroupKeepsStableBy',
    ],
  },
  topologyRuntimeScene: {
    appBlock: topologyBlock,
    appKeys: [
      'setMyzelModeAndPower',
      'toggleMyzelEnabled',
      'resetMyzelTopologyNodes',
    ],
    injectedKeys: [
      'myzelTopologyMode',
      'myzelEnabled',
      'systemState',
      'topologyCanvasRef',
      'handleTopologyCanvasMouseDown',
      'handleTopologyCanvasMouseMove',
      'handleTopologyCanvasMouseUp',
      'handleTopologyCanvasContextMenu',
      'tParams',
      'setTParams',
      'myzelPostFxGroup',
      'setMyzelPostFxGroup',
      'myzelPostFxEnabled',
      'setMyzelPostFxEnabled',
      'myzelFollowForgeHandoff',
      'setMyzelFollowForgeHandoff',
      'myzelPostFxDepth',
      'setMyzelPostFxDepth',
      'myzelPostFxParallel',
      'setMyzelPostFxParallel',
    ],
  },
  installationDeviceScene: {
    appBlock: installationBlock,
    appKeys: [
      'particleSoundsMuted',
      'onNodalDeviceEnabledChange',
      'onNodalDeviceAmountChange',
      'onNodalDeviceTargetChange',
    ],
    injectedKeys: [
      'myzelPattern',
      'setMyzelPattern',
      'myzelBallMode',
      'setMyzelBallMode',
      'myzelNodeMode',
      'setMyzelNodeMode',
      'myzelStep16ths',
      'setMyzelStep16ths',
      'myzelDriveEnabled',
      'setMyzelDriveEnabled',
      'room3BodyEnabledState',
      'setRoom3BodyEnabled',
      'setMyzelInterpreterMix',
      'setMyzelCentralColorMixer',
      'nodalDeviceMatrix',
      'setRoom3BodyControls',
      'myzelInterpreterMix',
      'myzelCentralColorMixer',
      'room3BodyControls',
      'setMyzelInstallationMix',
      'myzelInstallationMix',
      'installationFieldConfig',
    ],
  },
  installationResidentScene: {
    appBlock: installationBlock,
    appKeys: [
      'previewPendingCustomResident',
      'selectedResidentNode',
      'residentBaseHz',
      'residentAddFrequencyHz',
    ],
    injectedKeys: [
      'toggleInstallNomadAttractor',
      'toggleInstallResidents',
      'setInstallResidentVolumeLevel',
      'setInstallResidentSystemValue',
      'setInstallResidentModeValue',
      'toggleInstallResidentWaveExcitation',
      'toggleInstallResidentBallCoupling',
      'setInstallParticleSoundMode',
      'setInstallResidentSoundPreset',
      'setInstallResidentElasticPitch',
      'customResidentSoundPreset',
      'customResidentElasticPitch',
      'setCustomResidentSoundPreset',
      'setCustomResidentElasticPitch',
      'setResidentAddFrequencySlider',
      'addInstallationResident',
      'residentConstellationName',
      'setResidentConstellationName',
      'savedResidentConstellations',
      'saveCurrentResidentConstellation',
      'loadResidentConstellation',
      'deleteResidentConstellation',
    ],
  },
  viewportXenpolarScene: {
    appBlock: viewportBlock,
    appKeys: [
      'familyRequestedActive',
      'installationSharedFieldController',
      'xenpolarView',
      'setXenpolarView',
      'resonanzwandererStatus',
      'resonanzwandererBusy',
      'resonanzwandererCanExport',
      'handleResonanzwandererExportToXensonar',
      'handleResonanzwandererExportToSpectralForge',
      'handleResonanzwandererExportToSyntheticForge',
    ],
    injectedKeys: [],
  },
  viewportGameArenaScene: {
    appBlock: viewportBlock,
    appKeys: [
      'gameActive',
      'gameHud',
      'gameCanvasRef',
      'arenaSeedStatus',
      'handleArenaSeedExport',
      'startGameRun',
      'returnToXensonarHauptraum',
    ],
    injectedKeys: [],
  },
  viewportSpectralForgeEntryScene: {
    appBlock: viewportBlock,
    appKeys: [
      'externalAudioUploadFile',
      'externalAudioUploadOrigin',
      'entryScrollIntent',
      'onExternalAudioUploadConsumed',
      'onEntryScrollIntentConsumed',
    ],
    injectedKeys: [],
  },
};

const groupNames = Object.keys(readinessGroups);
const blockForAuditGroup = (group) => {
  const start = audit.indexOf(`${group}: {`);
  if (start < 0) return '';
  const starts = groupNames
    .filter((other) => other !== group)
    .map((other) => audit.indexOf(`${other}: {`, start + 1))
    .filter((idx) => idx > start);
  const end = starts.length ? Math.min(...starts) : audit.indexOf('} as const satisfies Record', start);
  return audit.slice(start, end > start ? end : undefined);
};

const forbiddenRuntimeTokens = [
  'createOscillator(',
  'createGain(',
  '.connect(',
  '.start(',
  'requestAnimationFrame(',
  'setInterval(',
  'setTimeout(',
  'new AudioContext(',
  'advanceMyzelSynthRoom3Runtime({',
  'renderMyzelSynthRoom3RuntimeCanvas({',
  'updateRoom3NodeDeviceAudioFrame({',
  'ensureRefactorTopologyLegacyAudio(',
  'updateRefactorTopologyLegacyAudio(',
  'localStorage.',
  '.current =',
  '.current=',
];

const groupCoverage = Object.fromEntries(Object.entries(readinessGroups).map(([group, spec]) => {
  const auditBlock = blockForAuditGroup(group);
  return [group, {
    appBlockExists: spec.appBlock.length > 0,
    auditBlockExists: auditBlock.length > 0,
    appKeysVisibleInCurrentApp: spec.appKeys.every((key) => spec.appBlock.includes(key)),
    appKeysDeclaredInAudit: spec.appKeys.every((key) => auditBlock.includes(`'${key}'`)),
    boundaryInjectedKeysDeclaredInAudit: spec.injectedKeys.every((key) => auditBlock.includes(`'${key}'`)),
    nonOwnershipFlagsPresent: [
      'sourceOwnerStillApp: true',
      'readinessOnly: true',
      'mayExtractBeforeDedicatedBuilder: false',
      'ownsRuntime: false',
      'mutatesAudio: false',
      'ownsRoomLifecycle: false',
      'ownsPackagePersistence: false',
    ].every((needle) => auditBlock.includes(needle)),
  }];
}));

const allAppKeys = Object.values(readinessGroups).flatMap((entry) => entry.appKeys);
const duplicateAppKeys = allAppKeys.filter((key, index) => allAppKeys.indexOf(key) !== index);

const checks = {
  expectedFilesExist: [
    appPath,
    auditPath,
    boundaryPath,
    argsBuilderPath,
    monolithMapPath,
    pkgPath,
    suitePath,
    suiteContractPath,
  ].every(exists),
  packageVersionAtLeast161: /^3\.2\.91\.6\.9\.(16[1-9]|1[7-9][0-9]|[2-9][0-9]{2,})$/.test(String(pkg.version || '')),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-room-scene-runtime-source-readiness-audit'] ===
    'node tools/check-app-room-scene-runtime-source-readiness-audit.mjs',
  roomSceneBoundaryStillCalledFromApp:
    app.includes('const appRoomSceneRuntimeSource = buildAppRoomSceneRuntimeSource({') &&
    app.includes('const appRoomScenes = useAppRoomSceneRuntimeBoundary(appRoomSceneRuntimeSource);') &&
    roomScenesBlock.includes('handoffScene: {') &&
    roomScenesBlock.includes('deviceScene: {') &&
    roomScenesBlock.includes('spectralForgeEntryScene: {'),
  roomSceneSourceBuilderProbeIntroduced:
    exists('src/features/xensonar/layout/appRoomSceneRuntimeSourceBuilder.ts') &&
    app.includes('buildAppRoomSceneRuntimeSource({') &&
    !exists('src/features/xensonar/room3/useAppRoomSceneRuntimeAssembly.ts'),
  auditDeclaresManifestAndGroups: [
    'APP_ROOM_SCENE_RUNTIME_SOURCE_READINESS_GROUP_KEYS',
    'APP_ROOM_SCENE_RUNTIME_SOURCE_READINESS_AUDIT',
    'APP_ROOM_SCENE_RUNTIME_SOURCE_READINESS_AUDIT_MANIFEST',
    'APP_ROOM_SCENE_RUNTIME_SOURCE_READINESS_AUDIT_PROBE',
    "cleanupKind: 'app-room-scene-runtime-source-readiness-audit'",
    'appStillOwnsRoomSceneSourceComposition: true',
    'auditOnly: false',
    'dedicatedRoomSceneSourceBuilderIntroduced: true',
    "nextAllowedStepAfterAudit: 'buildAppRoomSceneRuntimeSource'",
  ].every((needle) => audit.includes(needle)),
  readinessGroupsCoverExpectedKeys:
    Object.values(groupCoverage).every((entry) =>
      entry.appBlockExists &&
      entry.auditBlockExists &&
      entry.appKeysVisibleInCurrentApp &&
      entry.appKeysDeclaredInAudit &&
      entry.boundaryInjectedKeysDeclaredInAudit &&
      entry.nonOwnershipFlagsPresent,
    ) && duplicateAppKeys.length === 0,
  boundaryExportsRoomSceneReadinessAudit:
    boundary.includes("from '../layout/appRoomSceneRuntimeSourceReadinessAudit'") &&
    boundary.includes('APP_ROOM_SCENE_RUNTIME_SOURCE_READINESS_AUDIT') &&
    boundary.includes('APP_ROOM_SCENE_RUNTIME_SOURCE_READINESS_AUDIT_MANIFEST') &&
    boundary.includes('APP_ROOM_SCENE_RUNTIME_SOURCE_READINESS_GROUP_KEYS'),
  boundaryStillOwnsExistingRuntimeArgsBridge:
    boundary.includes('buildAppRoomSceneRuntimeEntry(buildAppRoomSceneRuntimeArgsBuilder({') &&
    boundary.includes('topologySnapshot: room3Topology.myceliumSnapshotRef.current') &&
    boundary.includes('handleTopologyCanvasMouseDown: room3RuntimeEntry.handleTopologyCanvasMouseDown') &&
    boundary.includes('toggleInstallResidents: room3RuntimeEntry.toggleInstallResidents') &&
    boundary.includes('viewportScene,'),
  argsBuilderStillOnlyFlattensSceneRuntimeArgs:
    argsBuilder.includes('export function buildAppRoomSceneRuntimeArgsBuilder(') &&
    argsBuilder.includes('room3MaterialLabel: input.topologyScene.room3TimbreState.materialLabel') &&
    argsBuilder.includes('selectedResidentLabel: input.installationScene.selectedResidentNode?.label ?? null') &&
    argsBuilder.includes('viewportScene: {') &&
    forbiddenRuntimeTokens.every((needle) => !argsBuilder.includes(needle)),
  auditDoesNotMoveRuntimeOrMutation:
    forbiddenRuntimeTokens.every((needle) => !audit.includes(needle)) &&
    !audit.includes('import ') &&
    !audit.includes('export function') &&
    !audit.includes('useMemo') &&
    !audit.includes('React'),
  monolithMapAcknowledgesAuditComplete:
    monolithMap.includes("status: 'source-builder-probed'") &&
    monolithMap.includes("splitTarget: 'room-scene-runtime-source-builder-probe'") &&
    (
      monolithMap.includes("firstSafeMove: 'room-screen-surface-mount-source-readiness-audit'") ||
      monolithMap.includes("firstSafeMove: 'surface-frame-mount-source-builder-probe'") ||
      monolithMap.includes("firstSafeMove: 'global-input-and-metronome-source-readiness-audit'")
    ),
  sanitySuiteIncludesGuard:
    suite.includes('Room scene runtime source readiness audit') &&
    suite.includes('xensonar:check-app-room-scene-runtime-source-readiness-audit'),
  sanitySuiteContractIncludesGuard:
    suiteContract.includes('xensonar:check-app-room-scene-runtime-source-readiness-audit'),
  appLineCountStableForAuditPatch: appLines <= 5525,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  auditLines,
  boundaryLines,
  groupCoverage,
  duplicateAppKeys,
  role: 'RoomScenes source-readiness map only; no Room III runtime, viewport lifecycle, or SpectralForge handoff behavior moved',
  nextAllowedStep: 'room-scene-runtime-source-builder-probe',
  explicitlyNotMoved: [
    'Room III topology runtime-entry actions',
    'topology canvas handlers',
    'installation nodal device handlers',
    'resident constellation actions',
    'Xenpolar/Resonanzwanderer export handlers',
    'SpectralForge entry upload and scroll-intent consumers',
  ],
  checks,
  failures,
};

if (failures.length) {
  console.error('[check-app-room-scene-runtime-source-readiness-audit] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log('[check-app-room-scene-runtime-source-readiness-audit] ok');
console.log(JSON.stringify(report, null, 2));
