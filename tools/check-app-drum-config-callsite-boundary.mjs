#!/usr/bin/env node
import {
  assertAllMarkers,
  boolChecksToFailures,
  createGuardContext,
} from './xensonar-refactor-guard-utils.mjs';

const ctx = createGuardContext();
const { exists, readIfExists, readJson, lineCount } = ctx;
const failures = [];
const fail = (message) => failures.push(message);

const appPath = 'src/App.tsx';
const boundaryPath = 'src/features/xensonar/drumConfig/useAppDrumConfigCallsiteBoundary.ts';
const drumConfigBridgePath = 'src/features/xensonar/drumConfig/useAppDrumConfigBridge.ts';
const playlistRevisionPath = 'src/features/xensonar/drumPattern/useDrumPlaylistRevisionBridge.ts';
const shapePath = 'validation/contracts/xensonar/input/appGlobalEventMonitorShapeAudit.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

for (const rel of [appPath, boundaryPath, drumConfigBridgePath, playlistRevisionPath, shapePath, pkgPath, suitePath, suiteContractPath]) {
  if (!exists(rel)) fail(`missing required file ${rel}`);
}

const app = readIfExists(appPath, '');
const boundary = readIfExists(boundaryPath, '');
const drumConfigBridge = readIfExists(drumConfigBridgePath, '');
const playlistRevision = readIfExists(playlistRevisionPath, '');
const shape = readIfExists(shapePath, '');
const pkg = readJson(pkgPath, { version: '', scripts: {} });
const suite = readIfExists(suitePath, '');
const suiteContract = readIfExists(suiteContractPath, '');

const wrapperCallNeedle = 'useAppDrumConfigCallsiteBoundary({';
const directDrumConfigCallNeedle = 'useAppDrumConfigBridge({';
const directPlaylistCallNeedle = 'useDrumPlaylistRevisionBridge();';

assertAllMarkers(boundary, [
  'APP_DRUM_CONFIG_CALLSITE_BOUNDARY_CONTRACT',
  "patch: '3.2.91.6.9.136_app_drum_config_callsite_boundary'",
  "scope: 'callsite-boundary-only'",
  'preservesHookOrder: true',
  'wrapsAppDrumConfigBridge: true',
  'wrapsDrumPlaylistRevisionBridge: true',
  'wrapsDrumPlaybackScheduling: false',
  'wrapsPackagePersistence: false',
  'wrapsPatternMutation: false',
  'runtimeOwned: false',
  'audioMutating: false',
  'drumSchedulingOwned: false',
  'playlistMutationOwned: false',
  'packagePersistenceOwned: false',
  'visibleUiChangedByBoundary: false',
], fail, 'drum config callsite boundary');

const hookOrder = [
  boundary.indexOf('const drumConfigBridge = useAppDrumConfigBridge(args);'),
  boundary.indexOf('useDrumPlaylistRevisionBridge();'),
];
if (!hookOrder.every((index) => index >= 0) || !(hookOrder[0] < hookOrder[1])) {
  fail('boundary must preserve previous hook order: drum config bridge before playlist revision bridge');
}

for (const forbidden of [
  'scheduleClassicBassPatternStep',
  'scheduleExportedDrumConfigStep',
  'schedulePsyBassStep',
  'scheduleRhythmForgeDrumStep',
  'scheduleRhythmForgeBassStep',
  'scheduleBassClipStep',
  'importXensonarPackageStationFile',
  'prepareMelodicWorkspaceArchiveDownload',
  'createOscillator(',
  'createGain(',
  '.connect(',
  '.start(',
  '.stop(',
  'downloadRecordingWav',
  'useAudioContext',
]) {
  if (boundary.includes(forbidden)) fail(`boundary must not include forbidden token ${forbidden}`);
}

const checks = {
  packageVersionAtLeast136: /^3\.2\.91\.6\.9\.(13[6-9]|1[4-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-drum-config-callsite-boundary'] ===
    'node tools/check-app-drum-config-callsite-boundary.mjs',
  appImportsBoundary:
    app.includes('useAppDrumConfigCallsiteBoundary') &&
    app.includes('./features/xensonar/drumConfig/useAppDrumConfigCallsiteBoundary'),
  appUsesWrapperCall:
    app.includes(wrapperCallNeedle) &&
    app.includes('drumConfigId: nParamsUI.drumConfigId') &&
    app.includes('drumConfigMode: nParamsUI.drumConfigMode') &&
    app.includes('nexusParamsRef') &&
    app.includes('updateNParams'),
  appDoesNotImportDirectHooks:
    !app.includes('./features/xensonar/drumConfig/useAppDrumConfigBridge') &&
    !app.includes('./features/xensonar/drumPattern/useDrumPlaylistRevisionBridge'),
  appDoesNotDirectlyInvokeMovedHooks:
    !app.includes(directDrumConfigCallNeedle) &&
    !app.includes(directPlaylistCallNeedle),
  appStillOwnsRenameAndRemoveActions:
    app.includes('const renameSelectedDrumConfig = async () =>') &&
    app.includes('renameSelectedDrumConfigAction({ selectedExportedDrumConfig })') &&
    app.includes('const removeSelectedDrumConfig = async () =>') &&
    app.includes('removeSelectedDrumConfigAction({'),
  appStillUsesSelectedAndExportedDrumConfig:
    app.includes('exportedDrumConfigs') &&
    app.includes('selectedExportedDrumConfig') &&
    app.includes('scheduleExportedDrumConfigStep({ drumMachine, entry: selectedExportedDrumConfig'),
  originalHooksStillOwnImplementation:
    drumConfigBridge.includes('useDrumConfigLibraryState(drumConfigId)') &&
    drumConfigBridge.includes('applyDrumConfigModeFallback') &&
    playlistRevision.includes('listenDrumPatternPlaylistUpdated') &&
    playlistRevision.includes("window.addEventListener('storage'"),
  shapeAuditMentionsMovedCallsite:
    shape.includes('APP_DRUM_CONFIG_CALLSITE_BOUNDARY_PROBE') &&
    shape.includes('useAppDrumConfigCallsiteBoundary({ drumConfigId: nParamsUI.drumConfigId'),
  sanitySuiteListsGuard:
    suite.includes('Drum config callsite boundary') &&
    suite.includes('xensonar:check-app-drum-config-callsite-boundary'),
  sanitySuiteContractListsGuard: suiteContract.includes('xensonar:check-app-drum-config-callsite-boundary'),
  appLineCountReasonable: lineCount(app) < 5500,
};

for (const failure of boolChecksToFailures(checks)) fail(failure);

const report = {
  ok: failures.length === 0,
  appLines: lineCount(app),
  boundaryLines: lineCount(boundary),
  wrappedHooks: ['useAppDrumConfigBridge', 'useDrumPlaylistRevisionBridge'],
  explicitlyNotWrapped: [
    'drum playback scheduling',
    'drum pattern mutation',
    'package station persistence',
    'bass pattern scheduling',
    'audio runtime or WebAudio graph',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
