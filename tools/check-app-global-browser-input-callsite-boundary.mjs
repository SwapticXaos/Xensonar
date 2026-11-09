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
const boundaryPath = 'src/features/xensonar/input/useAppGlobalBrowserInputCallsiteBoundary.ts';
const shapePath = 'validation/contracts/xensonar/input/appGlobalEventMonitorShapeAudit.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const hookFiles = {
  globalScrollCapture: 'src/features/xensonar/input/useGlobalScrollCapture.ts',
  globalArrowCapture: 'src/features/xensonar/input/useGlobalArrowCapture.ts',
  gameInputBridge: 'src/features/xensonar/input/useGameInputBridge.ts',
};

for (const rel of [appPath, boundaryPath, shapePath, pkgPath, suitePath, suiteContractPath, ...Object.values(hookFiles)]) {
  if (!exists(rel)) fail(`missing required file ${rel}`);
}

const app = readIfExists(appPath, '');
const boundary = readIfExists(boundaryPath, '');
const lowRiskHook = readIfExists('src/features/xensonar/input/useAppGlobalInputLowRiskBoundary.ts', '');
const shape = readIfExists(shapePath, '');
const pkg = readJson(pkgPath, { version: '', scripts: {} });
const suite = readIfExists(suitePath, '');
const suiteContract = readIfExists(suiteContractPath, '');

const directCalls = [
  'useGlobalScrollCapture();',
  'useGlobalArrowCapture({ gameInputActive, resonanceInputActive });',
  'useGameInputBridge({ gameInputActive, keyRef });',
];
const wrapperCall = 'useAppGlobalBrowserInputCallsiteBoundary(';
const oldExpandedWrapperCall = 'useAppGlobalBrowserInputCallsiteBoundary({';
const normalizedWrapperCall = 'useAppGlobalBrowserInputCallsiteBoundary(appGlobalInputLowRiskCallsites.globalBrowserInput);';

assertAllMarkers(boundary, [
  'APP_GLOBAL_BROWSER_INPUT_CALLSITE_BOUNDARY_CONTRACT',
  "patch: '3.2.91.6.9.132_app_global_browser_input_callsite_boundary'",
  "scope: 'callsite-boundary-only'",
  'preservesHookOrder: true',
  'browserInputContainmentOnly: true',
  'wrapsGlobalScrollCapture: true',
  'wrapsGlobalArrowCapture: true',
  'wrapsGameInputBridge: true',
  'wrapsDiagnosticsHooks: false',
  'wrapsResonanceMusicalKeyGate: false',
  'runtimeOwned: false',
  'audioMutating: false',
  'musicalCommandOwned: false',
  'packagePersistenceOwned: false',
], fail, 'global browser input callsite boundary');

const hookOrder = [
  boundary.indexOf('useGlobalScrollCapture();'),
  boundary.indexOf('useGlobalArrowCapture({ gameInputActive, resonanceInputActive });'),
  boundary.indexOf('useGameInputBridge({ gameInputActive, keyRef });'),
];
if (!hookOrder.every((index) => index >= 0) || !(hookOrder[0] < hookOrder[1] && hookOrder[1] < hookOrder[2])) {
  fail('boundary must call scroll -> arrow -> game hooks in the preserved order');
}

for (const forbidden of [
  'useDrumPlaylistRevisionBridge',
  'useTransientMonitorTicker',
  'useAudioBurstMarkerHotkey',
  'useResonanceKeyCaptureGate',
  'useResonanceInputIndicator',
  'useStableRhythmMetronomePulse',
  'runResonanceKeyboardInputRouter',
  'runEnterWaveHotkeyGesture',
  'createOscillator(',
  'createGain(',
  '.connect(',
  '.start(',
  '.stop(',
  'scheduleClassicBassPatternStep',
  'scheduleExportedDrumConfigStep',
  'importXensonarPackageStationFile',
  'downloadRecordingWav',
]) {
  if (boundary.includes(forbidden)) fail(`boundary must not include forbidden token ${forbidden}`);
}

const checks = {
  packageVersionAtLeast132: /^3\.2\.91\.6\.9\.(13[2-9]|1[4-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-global-browser-input-callsite-boundary'] ===
    'node tools/check-app-global-browser-input-callsite-boundary.mjs',
  appImportsBoundary:
    (app.includes('useAppGlobalBrowserInputCallsiteBoundary') && app.includes('./features/xensonar/input/useAppGlobalBrowserInputCallsiteBoundary')) ||
    (app.includes('useAppGlobalInputLowRiskBrowserBoundary') && lowRiskHook.includes('useAppGlobalBrowserInputCallsiteBoundary(boundary.globalBrowserInput);')),
  appUsesExactlyOneWrapperCall:
    (((app.split(oldExpandedWrapperCall).length - 1 === 1) || app.includes(normalizedWrapperCall)) &&
      (app.includes('appGlobalInputAndMetronomeSource.globalBrowserContainment.keyRef') || app.includes('appGlobalInputLowRiskCallsites.globalBrowserInput'))) ||
    (app.includes('useAppGlobalInputLowRiskBrowserBoundary(appGlobalInputLowRiskBoundary);') &&
      lowRiskHook.includes('useAppGlobalBrowserInputCallsiteBoundary(boundary.globalBrowserInput);')),
  appDoesNotImportDirectBrowserInputHooks:
    !app.includes('./features/xensonar/input/useGlobalScrollCapture') &&
    !app.includes('./features/xensonar/input/useGlobalArrowCapture') &&
    !app.includes('./features/xensonar/input/useGameInputBridge'),
  appDoesNotDirectlyInvokeBrowserInputHooks: directCalls.every((call) => !app.includes(call)),
  appStillOwnsDiagnosticsHookCallsites:
    app.includes('useAppDrumConfigCallsiteBoundary({') &&
    app.includes('useTransientMonitorTicker({ transientRuntimeRef, setTransientRuntimeMonitor });') &&
    app.includes('useAudioBurstMarkerHotkey({ audioBurstRuntime, room, audioCtx, audioEventIntakeMonitorRef });'),
  appStillOwnsResonanceHotkeyBody: app.includes('const handleResonanceKeyDown = (event: KeyboardEvent) =>'),
  arrowMotionRafBoundaryStillPresent:
    (app.includes('if (nexusArrowRef.current.left)') &&
      (app.includes('commitResonanceCursorY(nexusRefs.current.cursorY, { syncHud: true, primeSource: "resonance" });') ||
      app.includes('arrowMotionRafSource.actions.commitCursorY(nexusRefs.current.cursorY, { syncHud: true, primeSource: "resonance" });'))) ||
    app.includes('useAppResonanceArrowMotionRaf({'), 
  shapeAuditMentionsBoundaryProbe:
    shape.includes('APP_GLOBAL_BROWSER_INPUT_CALLSITE_BOUNDARY_PROBE') &&
    shape.includes('useAppGlobalBrowserInputCallsiteBoundary({ gameInputActive, resonanceInputActive, keyRef });'),
  sanitySuiteListsGuard:
    suite.includes('Global browser input callsite boundary') &&
    suite.includes('xensonar:check-app-global-browser-input-callsite-boundary'),
  sanitySuiteContractListsGuard: suiteContract.includes('xensonar:check-app-global-browser-input-callsite-boundary'),
  appLineCountReasonable: lineCount(app) <= 5625,
};

for (const failure of boolChecksToFailures(checks)) fail(failure);

const report = {
  ok: failures.length === 0,
  appLines: lineCount(app),
  boundaryLines: lineCount(boundary),
  wrappedHooks: Object.keys(hookFiles),
  explicitlyNotWrapped: [
    'drumPlaylistRevisionBridge',
    'transientMonitorTicker',
    'audioBurstMarkerHotkey',
    'resonanceKeyCaptureGate',
    'stableRhythmMetronomePulse',
    'resonanceInputIndicator',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
