#!/usr/bin/env node
import {
  assertAllMarkers,
  assertRequiredTokensByKey,
  boolChecksToFailures,
  collectDependencyFindings,
  createGuardContext,
  dependencyFindingsClean,
} from './xensonar-refactor-guard-utils.mjs';

const ctx = createGuardContext();
const { exists, readIfExists, readJson, lineCount } = ctx;
const failures = [];
const fail = (message) => failures.push(message);

const auditPath = 'validation/contracts/xensonar/input/appGlobalEventMonitorDependencyAudit.ts';
const shapeAuditPath = 'validation/contracts/xensonar/input/appGlobalEventMonitorShapeAudit.ts';
const appPath = 'src/App.tsx';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const guardUtilsPath = 'tools/xensonar-refactor-guard-utils.mjs';
const browserInputBoundaryPath = 'src/features/xensonar/input/useAppGlobalBrowserInputCallsiteBoundary.ts';

const hookFiles = {
  drumPlaylistRevisionBridge: 'src/features/xensonar/drumPattern/useDrumPlaylistRevisionBridge.ts',
  transientMonitorTicker: 'src/features/xensonar/diagnostics/useTransientMonitorTicker.ts',
  audioBurstMarkerHotkey: 'src/features/xensonar/diagnostics/useAudioBurstMarkerHotkey.ts',
  globalScrollCapture: 'src/features/xensonar/input/useGlobalScrollCapture.ts',
  globalArrowCapture: 'src/features/xensonar/input/useGlobalArrowCapture.ts',
  gameInputBridge: 'src/features/xensonar/input/useGameInputBridge.ts',
};

const allowedValueImports = {
  drumPlaylistRevisionBridge: ['react', '../drumPatternPlaylistEventContract'],
  transientMonitorTicker: ['react'],
  audioBurstMarkerHotkey: ['react'],
  globalScrollCapture: ['react', '../rooms/resonanceInputRouting'],
  globalArrowCapture: ['react', '../resonanceKeyboard', '../rooms/resonanceInputRouting'],
  gameInputBridge: ['react', '../resonanceKeyboard', '../rooms/resonanceInputRouting'],
};

const allowedTypeImports = {
  drumPlaylistRevisionBridge: [],
  transientMonitorTicker: ['../../resonance/transientRuntime'],
  audioBurstMarkerHotkey: ['./burstDiagnosticsRuntime', '../../soundLibrary/audioEventIntake', '../domain/runtimeTypes'],
  globalScrollCapture: [],
  globalArrowCapture: [],
  gameInputBridge: [],
};

const allowedHookTokens = {
  drumPlaylistRevisionBridge: [
    'listenDrumPatternPlaylistUpdated',
    'window.addEventListener',
    'window.removeEventListener',
    'storage',
    'setDrumPlaylistRevision',
  ],
  transientMonitorTicker: [
    'window.setInterval',
    'window.clearInterval',
    'transientRuntimeRef.current.getSnapshot()',
    'setTransientRuntimeMonitor',
  ],
  audioBurstMarkerHotkey: [
    'window.addEventListener',
    'window.removeEventListener',
    'audioCtx?.currentTime',
    'audioEventIntakeMonitorRef.current',
    'audioBurstRuntime.recordMarker',
  ],
  globalScrollCapture: [
    'window.addEventListener',
    'window.removeEventListener',
    'event.preventDefault()',
    'isWheelScrollAllowedTarget',
  ],
  globalArrowCapture: [
    'window.addEventListener',
    'window.removeEventListener',
    'event.preventDefault()',
    'isEditableTarget',
    'isForgeHotkeyTarget',
  ],
  gameInputBridge: [
    'window.addEventListener',
    'window.removeEventListener',
    'applyGameKeyState(event, true',
    'applyGameKeyState(event, false',
    'isEditableTarget',
    'isForgeHotkeyTarget',
  ],
};

const forbiddenImportFragments = [
  'App.tsx',
  'src/App.tsx',
  'AudioEngine',
  'audioEngine',
  'audioWorklet',
  'worklet',
  'voicePool',
  'rootFollowRuntime',
  'rootFollowLoopRuntime',
  'packageStation',
  'workspacePackageStore',
  'packagePersistence',
  'recordingRuntime',
  'MediaRecorder',
  'particlePlayback',
  'waveStarterRuntime',
];

const forbiddenMutationTokens = [
  'createOscillator(',
  'createGain(',
  '.connect(',
  '.start(',
  '.stop(',
  'safeApplyAttack(',
  'safeApplyExponentialRelease(',
  'setTargetAtTime(',
  'linearRampToValueAtTime(',
  'scheduleClassicBassPatternStep(',
  'scheduleExportedDrumConfigStep(',
  'scheduleBassClipStep(',
  'runParticleNexusToneOrchestrator(',
  'playWaveStartSound(',
  'emitWaveStartSound(',
  'startQuantizedCollisionRuntime(',
  'updateRoom3NodeDeviceAudioFrame(',
  'startRecording(',
  'stopRecording(',
  'downloadRecordingWav(',
  'downloadRecordingCropWav(',
  'importXensonarPackageStationFile(',
  'prepareMelodicWorkspaceArchiveDownload(',
];

for (const rel of [auditPath, shapeAuditPath, appPath, pkgPath, suitePath, suiteContractPath, guardUtilsPath,
  browserInputBoundaryPath, ...Object.values(hookFiles)]) {
  if (!exists(rel)) fail(`missing required file ${rel}`);
}

const audit = readIfExists(auditPath);
const shapeAudit = readIfExists(shapeAuditPath);
const app = readIfExists(appPath);
const pkg = readJson(pkgPath, { version: '', scripts: {} });
const suite = readIfExists(suitePath);
const suiteContract = readIfExists(suiteContractPath);
const guardUtils = readIfExists(guardUtilsPath);
const appLines = lineCount(app);
const hookText = Object.fromEntries(Object.entries(hookFiles).map(([key, file]) => [key, readIfExists(file)]));

const dependencyFindings = collectDependencyFindings({
  ctx,
  files: hookFiles,
  allowedValueImports,
  allowedTypeImports,
  forbiddenImportFragments,
  forbiddenTokens: forbiddenMutationTokens,
  extraFinding: ({ key, content }) => ({
    unauthorizedBrowserTimer:
      key !== 'transientMonitorTicker' &&
      (content.includes('window.setInterval') || content.includes('window.setTimeout') || content.includes('requestAnimationFrame(')),
    unauthorizedAudioClockRead: key !== 'audioBurstMarkerHotkey' && content.includes('currentTime'),
  }),
});

const dependencyFilesClean = dependencyFindingsClean(dependencyFindings, (finding) =>
  !finding.unauthorizedBrowserTimer &&
  !finding.unauthorizedAudioClockRead
);

const expectedKeys = Object.keys(hookFiles);
for (const [key, file] of Object.entries(hookFiles)) {
  if (!exists(file)) fail(`missing hook file ${file}`);
  if (!audit.includes(`${key}: {`)) fail(`dependency audit missing key block ${key}`);
  if (!audit.includes(file)) fail(`dependency audit missing file ${file}`);
  if (!shapeAudit.includes(key)) fail(`shape audit missing key ${key}`);
}

assertAllMarkers(audit, [
  'APP_GLOBAL_EVENT_MONITOR_DEPENDENCY_AUDIT_FORBIDDEN_IMPORT_FAMILIES',
  'APP_GLOBAL_EVENT_MONITOR_DEPENDENCY_AUDIT_FORBIDDEN_MUTATION_TOKENS',
  'APP_GLOBAL_EVENT_MONITOR_DEPENDENCY_AUDIT',
  'APP_GLOBAL_EVENT_MONITOR_DEPENDENCY_AUDIT_PROBE',
  "patch: '3.2.91.6.9.122_app_global_event_monitor_dependency_audit'",
  'appStillOwnsMusicalHotkeyBody: true',
  'appStillOwnsArrowMotionRaf: true',
  'mayImportApp: false',
  'mayImportAudioEngine: false',
  'mayImportWorkletRuntime: false',
  'mayImportPackagePersistence: false',
  'mayImportRecordingRuntime: false',
  'runtimeOwned: false',
  'audioMutating: false',
], fail, 'dependency audit');

assertRequiredTokensByKey(hookText, allowedHookTokens, fail, 'allowed observation');

const checks = {
  expectedFilesExist: [auditPath, shapeAuditPath, appPath, pkgPath, suitePath, suiteContractPath, guardUtilsPath,
  browserInputBoundaryPath, ...Object.values(hookFiles)].every(exists),
  packageVersionAtLeast122: /^3\.2\.91\.6\.9\.(12[2-9]|1[3-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-global-event-monitor-dependency-audit'] ===
    'node tools/check-app-global-event-monitor-dependency-audit.mjs',
  dependencyAuditUsesSharedGuardUtils:
    readIfExists('tools/check-app-global-event-monitor-dependency-audit.mjs').includes("from './xensonar-refactor-guard-utils.mjs'") &&
    guardUtils.includes('collectDependencyFindings') &&
    guardUtils.includes('dependencyFindingsClean'),
  dependencyAuditFilesMatchAllowlist: dependencyFilesClean,
  auditReferencesShapeAudit:
    audit.includes("from './appGlobalEventMonitorShapeAudit'") &&
    audit.includes('APP_GLOBAL_EVENT_MONITOR_SHAPE_AUDIT') &&
    audit.includes('APP_GLOBAL_EVENT_MONITOR_SHAPE_KEYS'),
  appStillOwnsHookInvocation:
    app.includes('useAppDrumConfigCallsiteBoundary({') &&
    app.includes('useTransientMonitorTicker({ transientRuntimeRef, setTransientRuntimeMonitor });') &&
    app.includes('useAudioBurstMarkerHotkey({ audioBurstRuntime, room, audioCtx, audioEventIntakeMonitorRef });') &&
    app.includes('useAppGlobalBrowserInputCallsiteBoundary({ gameInputActive, resonanceInputActive, keyRef });') &&
    !app.includes('useGlobalScrollCapture();') &&
    !app.includes('useGlobalArrowCapture({ gameInputActive, resonanceInputActive });') &&
    !app.includes('useGameInputBridge({ gameInputActive, keyRef });'),
  appStillOwnsResonanceHotkeyMusicalBody:
    app.includes('const handleResonanceKeyDown = (event: KeyboardEvent) =>') &&
    app.includes('runEnterWaveHotkeyGesture(buildNexusRippleGestureRuntime())'),
  appStillOwnsArrowMotionRaf:
    app.includes('if (nexusArrowRef.current.left)') &&
    app.includes('commitResonanceCursorY(nexusRefs.current.cursorY, { syncHud: true, primeSource: "resonance" });'),
  noGlobalEventMonitorBridgeOrIndexIntroduced:
    !exists('src/features/xensonar/input/appGlobalEventMonitorBridge.ts') &&
    !exists('src/features/xensonar/input/appGlobalEventMonitorIndex.ts') &&
    !exists('src/features/xensonar/input/useAppGlobalEventMonitorBridge.ts') &&
    !exists('src/features/xensonar/input/appInputContainmentBridge.ts'),
  dependencyGuardListedInSanitySuiteContract:
    suiteContract.includes('xensonar:check-app-global-event-monitor-dependency-audit'),
  dependencyGuardListedInRefactorSuiteRunner:
    suite.includes('Global event monitor dependency audit') &&
    suite.includes('xensonar:check-app-global-event-monitor-dependency-audit'),
  appLineCountUnaffectedByDependencyAudit: appLines <= 5590,
};

for (const failure of boolChecksToFailures(checks)) fail(failure);

const report = {
  ok: failures.length === 0,
  appLines,
  auditedKeys: expectedKeys,
  dependencyAudit: {
    role: 'dependency audit for global browser/input monitor hooks without moving App.tsx hook invocation',
    dependencyFindings,
    dependencyFilesClean,
    sharedGuardUtils: 'Import/export/dynamic-import extraction and dependency finding collection are delegated to xensonar-refactor-guard-utils.mjs.',
    allowedSpecialCases: {
      transientMonitorTicker: 'window.setInterval is allowed only for diagnostics snapshot copying',
      audioBurstMarkerHotkey: 'audioCtx?.currentTime is allowed only as read-only burst marker context',
      globalArrowCapture: 'event.preventDefault is browser-scroll containment only, not cursor movement',
    },
  },
  movedScope: [
    'Kept the global-event-monitor dependency audit behavior but moved generic dependency scanning into shared guard utils',
    'Kept a static dependency audit for global event monitor hooks',
    'Kept the guard registered in the refactor sanity suite and contract checker',
  ],
  explicitlyNotMoved: [
    'No global event hook callsite was moved out of App.tsx',
    'No resonance hotkey musical command body was moved',
    'No arrow RAF cursor motion was moved',
    'No audio, Root-Follow, Wellenstarter, Partikel, Drum/Bass, package, recording, Room III, or visible UI behavior changed',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
