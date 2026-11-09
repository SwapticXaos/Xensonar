#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const fail = (message) => failures.push(message);
const failures = [];

const auditPath = 'validation/contracts/xensonar/input/appGlobalEventMonitorShapeAudit.ts';
const appPath = 'src/App.tsx';
const browserInputBoundaryPath = 'src/features/xensonar/input/useAppGlobalBrowserInputCallsiteBoundary.ts';
const drumConfigCallsiteBoundaryPath = 'src/features/xensonar/drumConfig/useAppDrumConfigCallsiteBoundary.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const hookFiles = {
  drumPlaylistRevisionBridge: 'src/features/xensonar/drumPattern/useDrumPlaylistRevisionBridge.ts',
  transientMonitorTicker: 'src/features/xensonar/diagnostics/useTransientMonitorTicker.ts',
  audioBurstMarkerHotkey: 'src/features/xensonar/diagnostics/useAudioBurstMarkerHotkey.ts',
  globalScrollCapture: 'src/features/xensonar/input/useGlobalScrollCapture.ts',
  globalArrowCapture: 'src/features/xensonar/input/useGlobalArrowCapture.ts',
  gameInputBridge: 'src/features/xensonar/input/useGameInputBridge.ts',
};

const expectedKeys = Object.keys(hookFiles);
const expectedCalls = {
  drumPlaylistRevisionBridge: 'useAppDrumConfigCallsiteBoundary({',
  transientMonitorTicker: 'useTransientMonitorTicker({ transientRuntimeRef, setTransientRuntimeMonitor });',
  audioBurstMarkerHotkey: 'useAudioBurstMarkerHotkey({ audioBurstRuntime, room, audioCtx, audioEventIntakeMonitorRef });',
  globalScrollCapture: 'useAppGlobalBrowserInputCallsiteBoundary({ gameInputActive, resonanceInputActive, keyRef });',
  globalArrowCapture: 'useAppGlobalBrowserInputCallsiteBoundary({ gameInputActive, resonanceInputActive, keyRef });',
  gameInputBridge: 'useAppGlobalBrowserInputCallsiteBoundary({ gameInputActive, resonanceInputActive, keyRef });',
};

const app = exists(appPath) ? read(appPath) : '';
const audit = exists(auditPath) ? read(auditPath) : '';
const pkg = JSON.parse(read(pkgPath));
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const hookText = Object.fromEntries(Object.entries(hookFiles).map(([key, file]) => [key, exists(file) ? read(file) : '']));
const appLines = app.split(/\r?\n/).length;

const forbiddenAuditTokens = [
  'new AudioContext',
  'connect(',
  '.start(',
  '.stop(',
  'setTargetAtTime',
  'linearRampToValueAtTime',
  'importXensonarPackageStationFile',
  'prepareMelodicWorkspaceArchiveDownload',
  'dispatchEvent(new CustomEvent',
];

const hookAudioMutationRegex = /connect\(|\.start\(|\.stop\(|safeApplyAttack|safeApplyExponentialRelease|setTargetAtTime|linearRampToValueAtTime|scheduleClassicBassPatternStep|scheduleExportedDrumConfigStep|scheduleBassClipStep/;

if (!exists(auditPath)) fail(`missing ${auditPath}`);
for (const [key, file] of Object.entries(hookFiles)) {
  if (!exists(file)) fail(`missing hook file for ${key}: ${file}`);
  if (!audit.includes(key)) fail(`shape audit missing key ${key}`);
  if (!audit.includes(file)) fail(`shape audit missing file path ${file}`);
  if (!audit.includes(expectedCalls[key])) fail(`shape audit missing App callsite for ${key}`);
  if (!app.includes(expectedCalls[key])) fail(`App.tsx missing expected hook callsite ${expectedCalls[key]}`);
}

for (const marker of [
  'APP_GLOBAL_EVENT_MONITOR_SHAPE_KEYS',
  'AppGlobalEventMonitorShapeAuditEntry',
  'APP_GLOBAL_EVENT_MONITOR_SHAPE_AUDIT',
  'APP_GLOBAL_BROWSER_INPUT_CALLSITE_BOUNDARY_PROBE',
  'APP_GLOBAL_EVENT_MONITOR_SHAPE_REVIEW_PROBE',
  "patch: '3.2.91.6.9.121_app_global_event_monitor_shape_review'",
  'appStillOwnsMusicalHotkeyBody: true',
  'runtimeOwned: false',
  'audioMutating: false',
  'packagePersistenceOwned: false',
]) {
  if (!audit.includes(marker)) fail(`shape audit missing marker ${marker}`);
}

if (!audit.includes("'drumPlaylistRevisionBridge'")) fail('shape keys missing drumPlaylistRevisionBridge literal');
if (!audit.includes("'globalArrowCapture'")) fail('shape keys missing globalArrowCapture literal');
if (!audit.includes("'gameInputBridge'")) fail('shape keys missing gameInputBridge literal');

for (const token of forbiddenAuditTokens) {
  if (audit.includes(token)) fail(`shape audit must stay descriptive and must not contain token ${token}`);
}

const hookChecks = {
  drumPlaylistRevisionBridgeOwnsStorageRefreshOnly:
    hookText.drumPlaylistRevisionBridge.includes('listenDrumPatternPlaylistUpdated') &&
    hookText.drumPlaylistRevisionBridge.includes("window.addEventListener('storage'") &&
    !hookText.drumPlaylistRevisionBridge.includes('schedule'),
  transientMonitorTickerReadsSnapshotOnly:
    hookText.transientMonitorTicker.includes('getSnapshot()') &&
    !hookText.transientMonitorTicker.includes('admitVoice(') &&
    !hookText.transientMonitorTicker.includes('beginEvent('),
  audioBurstMarkerBackspaceDiagnosticsOnly:
    hookText.audioBurstMarkerHotkey.includes("event.key !== 'Backspace'") &&
    hookText.audioBurstMarkerHotkey.includes('recordMarker') &&
    !hookText.audioBurstMarkerHotkey.includes('playWaveStartSound'),
  scrollCapturePreventsBrowserScrollOnly:
    hookText.globalScrollCapture.includes("window.addEventListener('wheel'") &&
    hookText.globalScrollCapture.includes('isWheelScrollAllowedTarget') &&
    !hookText.globalScrollCapture.includes('commitResonanceCursorY'),
  arrowCapturePreventsDefaultOnly:
    hookText.globalArrowCapture.includes('event.preventDefault()') &&
    hookText.globalArrowCapture.includes('resonanceInputActive') &&
    !hookText.globalArrowCapture.includes('commitResonanceCursorY'),
  gameInputBridgeTouchesOnlyGameKeyState:
    hookText.gameInputBridge.includes('applyGameKeyState(event, true') &&
    hookText.gameInputBridge.includes('applyGameKeyState(event, false') &&
    !hookText.gameInputBridge.includes('playWaveStartSound'),
};
for (const [name, ok] of Object.entries(hookChecks)) if (!ok) fail(name);

for (const [key, content] of Object.entries(hookText)) {
  if (hookAudioMutationRegex.test(content)) fail(`${key} must not construct/connect/schedule audio playback`);
}

const appStillOwnsResonanceHotkeyMusicalBody =
  app.includes('const handleResonanceKeyDown = (event: KeyboardEvent) =>') &&
  (app.includes('runEnterWaveHotkeyGesture(buildNexusRippleGestureRuntime())') || app.includes('handleResonanceKeyDown'));
if (!appStillOwnsResonanceHotkeyMusicalBody) fail('App.tsx must still own the full resonance hotkey musical body');

const appStillOwnsArrowMotionRaf =
  app.includes('if (nexusArrowRef.current.left)') &&
  app.includes('commitResonanceCursorY(nexusRefs.current.cursorY, { syncHud: true, primeSource: "resonance" });');
if (!appStillOwnsArrowMotionRaf) fail('App.tsx must still own arrow RAF cursor motion');

if (!pkg.scripts['xensonar:check-app-global-event-monitor-shape-review']) fail('package.json missing xensonar:check-app-global-event-monitor-shape-review');
if (!suite.includes('Global event monitor shape review') || !suite.includes('xensonar:check-app-global-event-monitor-shape-review')) {
  fail('refactor sanity suite missing global event monitor shape review guard');
}
if (!suiteContract.includes('xensonar:check-app-global-event-monitor-shape-review')) {
  fail('refactor sanity suite contract missing global event monitor shape review guard');
}
if (!/^3\.2\.91\.6\.9\.(12[1-9]|1[3-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version)) fail(`package version must be at least 3.2.91.6.9.121, found ${pkg.version}`);
if (appLines > 5590) fail(`App.tsx line count unexpectedly high for shape-review-only patch: ${appLines}`);

const report = {
  ok: failures.length === 0,
  appLines,
  auditedKeys: expectedKeys,
  hookLines: Object.fromEntries(Object.entries(hookText).map(([key, text]) => [key, text.split(/\r?\n/).length])),
  shapeReview: {
    role: 'static review of global event monitor hooks before deciding whether this area deserves dependency or contract cleanup',
    keepsAppHookInvocation: true,
    keepsAppMusicalHotkeyBody: appStillOwnsResonanceHotkeyMusicalBody,
    keepsArrowMotionRafInApp: appStillOwnsArrowMotionRaf,
    createsBridgeOrIndex: false,
  },
  explicitlyNotMoved: [
    'No global event hook callsite was moved out of App.tsx',
    'No resonance hotkey musical command body was moved',
    'No arrow RAF cursor motion was moved',
    'No audio, Root-Follow, Wellenstarter, Partikel, Drum/Bass, package, recording, Room III, or visible UI behavior changed',
  ],
  checks: hookChecks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
