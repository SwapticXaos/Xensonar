#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const failures = [];
const fail = (message) => failures.push(message);

const shapePath = 'validation/contracts/xensonar/input/appGlobalEventMonitorShapeAudit.ts';
const depPath = 'validation/contracts/xensonar/input/appGlobalEventMonitorDependencyAudit.ts';
const appPath = 'src/App.tsx';
const browserInputBoundaryPath = 'src/features/xensonar/input/useAppGlobalBrowserInputCallsiteBoundary.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const expectedKeys = [
  'drumPlaylistRevisionBridge',
  'transientMonitorTicker',
  'audioBurstMarkerHotkey',
  'globalScrollCapture',
  'globalArrowCapture',
  'gameInputBridge',
];

const expectedInputContracts = {
  drumPlaylistRevisionBridge: 'drum-playlist-revision-refresh-input',
  transientMonitorTicker: 'transient-monitor-diagnostics-input',
  audioBurstMarkerHotkey: 'audio-burst-marker-diagnostics-input',
  globalScrollCapture: 'global-scroll-containment-input',
  globalArrowCapture: 'global-arrow-containment-input',
  gameInputBridge: 'extras-game-key-state-input',
};

const expectedOutputContracts = {
  drumPlaylistRevisionBridge: 'react-revision-bump-output',
  transientMonitorTicker: 'transient-monitor-snapshot-output',
  audioBurstMarkerHotkey: 'audio-burst-marker-output',
  globalScrollCapture: 'browser-scroll-containment-output',
  globalArrowCapture: 'browser-arrow-containment-output',
  gameInputBridge: 'game-key-ref-mutation-output',
};

const expectedCalls = {
  drumPlaylistRevisionBridge: 'useAppDrumConfigCallsiteBoundary({',
  transientMonitorTicker: 'useTransientMonitorTicker({ transientRuntimeRef, setTransientRuntimeMonitor });',
  audioBurstMarkerHotkey: 'useAudioBurstMarkerHotkey({ audioBurstRuntime, room, audioCtx, audioEventIntakeMonitorRef });',
  globalScrollCapture: 'useAppGlobalBrowserInputCallsiteBoundary({ gameInputActive, resonanceInputActive, keyRef });',
  globalArrowCapture: 'useAppGlobalBrowserInputCallsiteBoundary({ gameInputActive, resonanceInputActive, keyRef });',
  gameInputBridge: 'useAppGlobalBrowserInputCallsiteBoundary({ gameInputActive, resonanceInputActive, keyRef });',
};

const hookFiles = {
  drumPlaylistRevisionBridge: 'src/features/xensonar/drumPattern/useDrumPlaylistRevisionBridge.ts',
  transientMonitorTicker: 'src/features/xensonar/diagnostics/useTransientMonitorTicker.ts',
  audioBurstMarkerHotkey: 'src/features/xensonar/diagnostics/useAudioBurstMarkerHotkey.ts',
  globalScrollCapture: 'src/features/xensonar/input/useGlobalScrollCapture.ts',
  globalArrowCapture: 'src/features/xensonar/input/useGlobalArrowCapture.ts',
  gameInputBridge: 'src/features/xensonar/input/useGameInputBridge.ts',
};

for (const rel of [shapePath, depPath, appPath, pkgPath, suitePath, suiteContractPath, browserInputBoundaryPath, ...Object.values(hookFiles)]) {
  if (!exists(rel)) fail(`missing required file ${rel}`);
}

const shape = exists(shapePath) ? read(shapePath) : '';
const dep = exists(depPath) ? read(depPath) : '';
const app = exists(appPath) ? read(appPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const appLines = app.split(/\r?\n/).length;

for (const marker of [
  'APP_GLOBAL_EVENT_MONITOR_CONTRACT_BUILD_ORDER',
  'AppGlobalEventMonitorInputContractName',
  'AppGlobalEventMonitorOutputContractName',
  'AppGlobalEventMonitorInputContractMap',
  'AppGlobalEventMonitorOutputContractMap',
  'AppGlobalEventMonitorContractEntry',
  'APP_GLOBAL_EVENT_MONITOR_INPUT_CONTRACTS',
  'APP_GLOBAL_EVENT_MONITOR_OUTPUT_CONTRACTS',
  'APP_GLOBAL_EVENT_MONITOR_CONTRACT',
  'APP_GLOBAL_EVENT_MONITOR_CONTRACT_CLEANUP_PROBE',
  "patch: '3.2.91.6.9.123_app_global_event_monitor_contract_cleanup'",
  'scope: \'contract-cleanup-only\'',
  'createsBridgeOrIndex: false',
  'runtimeOwned: false',
  'audioMutating: false',
  'packagePersistenceOwned: false',
]) {
  if (!shape.includes(marker)) fail(`shape audit missing contract-cleanup marker ${marker}`);
}

if (!shape.includes('APP_GLOBAL_EVENT_MONITOR_CONTRACT_BUILD_ORDER = APP_GLOBAL_EVENT_MONITOR_SHAPE_KEYS')) {
  fail('contract build order must reuse APP_GLOBAL_EVENT_MONITOR_SHAPE_KEYS');
}

for (const key of expectedKeys) {
  if (!shape.includes(`${key}: '`)) fail(`contract maps missing ${key} entry`);
  if (!shape.includes(`key: '${key}'`)) fail(`contract entry missing key literal ${key}`);
  if (!shape.includes(`APP_GLOBAL_EVENT_MONITOR_SHAPE_AUDIT.${key}.hookName`)) fail(`contract entry ${key} must derive hookName from shape audit`);
  if (!shape.includes(`APP_GLOBAL_EVENT_MONITOR_SHAPE_AUDIT.${key}.file`)) fail(`contract entry ${key} must derive file from shape audit`);
  if (!shape.includes(`APP_GLOBAL_EVENT_MONITOR_INPUT_CONTRACTS.${key}`)) fail(`contract entry ${key} must derive input contract from central input map`);
  if (!shape.includes(`APP_GLOBAL_EVENT_MONITOR_OUTPUT_CONTRACTS.${key}`)) fail(`contract entry ${key} must derive output contract from central output map`);
  if (!shape.includes(expectedInputContracts[key])) fail(`shape audit missing input contract literal for ${key}: ${expectedInputContracts[key]}`);
  if (!shape.includes(expectedOutputContracts[key])) fail(`shape audit missing output contract literal for ${key}: ${expectedOutputContracts[key]}`);
  if (!dep.includes(key)) fail(`dependency audit must still mention ${key}`);
  if (!app.includes(expectedCalls[key])) fail(`App.tsx must still invoke ${key} hook at original callsite`);
}

const contractSlice = shape.slice(shape.indexOf('export const APP_GLOBAL_EVENT_MONITOR_CONTRACT ='));
for (const forbiddenToken of [
  'createOscillator(',
  'createGain(',
  '.connect(',
  '.start(',
  '.stop(',
  'playWaveStartSound(',
  'runParticleNexusToneOrchestrator(',
  'importXensonarPackageStationFile(',
  'downloadRecordingWav(',
]) {
  if (contractSlice.includes(forbiddenToken)) fail(`contract cleanup must stay descriptive and must not include ${forbiddenToken}`);
}

const expectedBooleanContracts = {
  transientMonitorTicker: ['diagnosticsOnly: true', 'browserEventContainmentOnly: false'],
  audioBurstMarkerHotkey: ['diagnosticsOnly: true', 'browserEventContainmentOnly: false'],
  globalScrollCapture: ['browserEventContainmentOnly: true', 'diagnosticsOnly: false'],
  globalArrowCapture: ['browserEventContainmentOnly: true', 'diagnosticsOnly: false'],
};
for (const [key, tokens] of Object.entries(expectedBooleanContracts)) {
  const entryStart = contractSlice.indexOf(`${key}: {`);
  const entryEnd = contractSlice.indexOf('\n  },', entryStart);
  const entry = entryStart >= 0 && entryEnd >= 0 ? contractSlice.slice(entryStart, entryEnd) : '';
  if (!entry) fail(`missing contract entry body for ${key}`);
  for (const token of tokens) if (!entry.includes(token)) fail(`${key} contract missing ${token}`);
}

const noBridgeOrIndex =
  !exists('src/features/xensonar/input/appGlobalEventMonitorBridge.ts') &&
  !exists('src/features/xensonar/input/appGlobalEventMonitorIndex.ts') &&
  !exists('src/features/xensonar/input/useAppGlobalEventMonitorBridge.ts') &&
  !exists('src/features/xensonar/input/appInputContainmentBridge.ts') &&
  !exists('src/features/xensonar/input/appGlobalEventMonitorContractIndex.ts');

const checks = {
  packageVersionAtLeast123: /^3\.2\.91\.6\.9\.(12[3-9]|1[3-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-global-event-monitor-contract-cleanup'] ===
    'node tools/check-app-global-event-monitor-contract-cleanup.mjs',
  guardListedInSanitySuite:
    suite.includes('Global event monitor contract cleanup') &&
    suite.includes('xensonar:check-app-global-event-monitor-contract-cleanup'),
  guardListedInSanitySuiteContract: suiteContract.includes('xensonar:check-app-global-event-monitor-contract-cleanup'),
  dependencyAuditStillRegistered: suite.includes('xensonar:check-app-global-event-monitor-dependency-audit') && suiteContract.includes('xensonar:check-app-global-event-monitor-dependency-audit'),
  shapeReviewStillRegistered: suite.includes('xensonar:check-app-global-event-monitor-shape-review') && suiteContract.includes('xensonar:check-app-global-event-monitor-shape-review'),
  appStillOwnsHookInvocation: Object.values(expectedCalls).every((call) => app.includes(call)),
  appStillOwnsResonanceHotkeyMusicalBody:
    app.includes('const handleResonanceKeyDown = (event: KeyboardEvent) =>') &&
    app.includes('runEnterWaveHotkeyGesture(buildNexusRippleGestureRuntime())'),
  appStillOwnsArrowMotionRaf:
    app.includes('if (nexusArrowRef.current.left)') &&
    app.includes('commitResonanceCursorY(nexusRefs.current.cursorY, { syncHud: true, primeSource: "resonance" });'),
  noBridgeOrIndexIntroduced: noBridgeOrIndex,
  appLineCountUnaffectedByContractCleanup: appLines <= 5590,
};

for (const [name, ok] of Object.entries(checks)) if (!ok) fail(name);

const report = {
  ok: failures.length === 0,
  appLines,
  version: pkg.version,
  auditedKeys: expectedKeys,
  inputContracts: expectedInputContracts,
  outputContracts: expectedOutputContracts,
  contractCleanup: {
    role: 'central contract map for the six global event monitor hooks without moving App.tsx invocation',
    keepsAppHookInvocation: true,
    keepsMusicalHotkeyBodyInApp: true,
    keepsArrowMotionRafInApp: true,
    createsBridgeOrIndex: false,
    runtimeOwned: false,
    audioMutating: false,
    packagePersistenceOwned: false,
  },
  explicitlyNotMoved: [
    'No global event hook callsite was moved out of App.tsx',
    'No hook implementation was changed',
    'No resonance hotkey musical command body was moved',
    'No arrow RAF cursor motion was moved',
    'No audio, Root-Follow, Wellenstarter, Partikel, Drum/Bass, package, recording, Room III, or visible UI behavior changed',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
