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

const auditPath = 'validation/contracts/xensonar/input/appInputMetronomeDependencyAudit.ts';
const shapeAuditPath = 'validation/contracts/xensonar/input/appInputMetronomeShapeAudit.ts';
const appPath = 'src/App.tsx';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const guardUtilsPath = 'tools/xensonar-refactor-guard-utils.mjs';

const hookFiles = {
  stableRhythmMetronomePulse: 'src/features/xensonar/rooms/useStableRhythmMetronomePulse.ts',
  resonanceInputIndicator: 'src/features/xensonar/input/useResonanceInputIndicator.ts',
  resonanceKeyCaptureGate: 'src/features/xensonar/input/useResonanceKeyCaptureGate.ts',
};

const allowedValueImports = {
  stableRhythmMetronomePulse: ['react'],
  resonanceInputIndicator: ['react', '../resonanceKeyboard'],
  resonanceKeyCaptureGate: ['react', '../resonanceKeyboard', '../rooms/resonanceInputRouting'],
};

const allowedTypeImports = {
  stableRhythmMetronomePulse: [],
  resonanceInputIndicator: [],
  resonanceKeyCaptureGate: [],
};

const requiredAllowedTokens = {
  stableRhythmMetronomePulse: [
    'window.setTimeout',
    'window.clearTimeout',
    'setMetronomePulse',
    'audioNowSec',
  ],
  resonanceInputIndicator: [
    'document.activeElement',
    'isEditableTarget(document.activeElement)',
    'window.addEventListener("focusin"',
    'window.addEventListener("focusout"',
    'window.addEventListener("pointerdown"',
  ],
  resonanceKeyCaptureGate: [
    'shouldCaptureResonanceKey(event, nexusParamsRef.current.quantizeOn)',
    'event.preventDefault()',
    'window.addEventListener("keydown", onKeyCapture, true)',
    'window.removeEventListener("keydown", onKeyCapture, true)',
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
  'buildStableRhythmLaneStepPlan(',
  'executeStableRhythmLaneStepPlan(',
  'runEnterWaveHotkeyGesture(',
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

for (const rel of [auditPath, shapeAuditPath, appPath, pkgPath, suitePath, suiteContractPath, guardUtilsPath, ...Object.values(hookFiles)]) {
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
    unauthorizedTimer:
      key !== 'stableRhythmMetronomePulse' &&
      (content.includes('window.setTimeout') || content.includes('window.clearTimeout') || content.includes('window.setInterval') || content.includes('requestAnimationFrame(')),
    unauthorizedPreventDefault: key !== 'resonanceKeyCaptureGate' && content.includes('event.preventDefault()'),
    unauthorizedAudioClockRead: content.includes('currentTime') || content.includes('AudioContext'),
    unauthorizedMusicalCommand:
      content.includes('handleResonanceKeyDown') ||
      content.includes('runEnterWaveHotkeyGesture') ||
      content.includes('commitResonanceCursor') ||
      content.includes('scheduleDrum') ||
      content.includes('scheduleBass'),
  }),
});

const dependencyFilesClean = dependencyFindingsClean(dependencyFindings, (finding) =>
  !finding.unauthorizedTimer &&
  !finding.unauthorizedPreventDefault &&
  !finding.unauthorizedAudioClockRead &&
  !finding.unauthorizedMusicalCommand
);

for (const [key, file] of Object.entries(hookFiles)) {
  if (!exists(file)) fail(`missing hook file ${file}`);
  if (!audit.includes(`${key}: {`)) fail(`dependency audit missing key block ${key}`);
  if (!audit.includes(file)) fail(`dependency audit missing file ${file}`);
  if (!shapeAudit.includes(key)) fail(`shape audit missing key ${key}`);
}

assertAllMarkers(audit, [
  'APP_INPUT_METRONOME_DEPENDENCY_AUDIT_FORBIDDEN_IMPORT_FAMILIES',
  'APP_INPUT_METRONOME_DEPENDENCY_AUDIT_FORBIDDEN_MUTATION_TOKENS',
  'APP_INPUT_METRONOME_DEPENDENCY_AUDIT',
  'APP_INPUT_METRONOME_DEPENDENCY_AUDIT_PROBE',
  "patch: '3.2.91.6.9.125_app_input_metronome_dependency_audit'",
  'appStillOwnsStableRhythmPlanning: true',
  'appStillOwnsResonanceKeyMusicalBody: true',
  'mayImportApp: false',
  'mayImportAudioEngine: false',
  'mayImportWorkletRuntime: false',
  'mayImportPackagePersistence: false',
  'mayImportRecordingRuntime: false',
  'runtimeOwned: false',
  'audioMutating: false',
], fail, 'dependency audit');

assertRequiredTokensByKey(hookText, requiredAllowedTokens, fail, 'allowed containment');

const noBridgeOrIndex = [
  'src/features/xensonar/input/appInputMetronomeBridge.ts',
  'src/features/xensonar/input/useAppInputMetronomeBridge.ts',
  'src/features/xensonar/input/appInputMetronomeIndex.ts',
  'src/features/xensonar/input/appInputContainmentBridge.ts',
  'src/features/xensonar/rooms/appStableRhythmMetronomeBridge.ts',
  'src/features/xensonar/rooms/useStableRhythmMetronomeBridge.ts',
].every((rel) => !exists(rel));

const checks = {
  expectedFilesExist: [auditPath, shapeAuditPath, appPath, pkgPath, suitePath, suiteContractPath, guardUtilsPath, ...Object.values(hookFiles)].every(exists),
  packageVersionAtLeast125: /^3\.2\.91\.6\.9\.(12[5-9]|1[3-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-input-metronome-dependency-audit'] ===
    'node tools/check-app-input-metronome-dependency-audit.mjs',
  dependencyAuditUsesSharedGuardUtils:
    readIfExists('tools/check-app-input-metronome-dependency-audit.mjs').includes("from './xensonar-refactor-guard-utils.mjs'") &&
    guardUtils.includes('collectDependencyFindings') &&
    guardUtils.includes('dependencyFindingsClean'),
  dependencyAuditFilesMatchAllowlist: dependencyFilesClean,
  auditReferencesShapeAudit:
    audit.includes("from './appInputMetronomeShapeAudit'") &&
    audit.includes('APP_INPUT_METRONOME_SHAPE_AUDIT') &&
    audit.includes('APP_INPUT_METRONOME_SHAPE_KEYS'),
  appStillOwnsHookInvocation:
    app.includes('useStableRhythmMetronomePulse();') &&
    app.includes('useResonanceInputIndicator(resonanceInputActive);') &&
    (
      app.includes('useResonanceKeyCaptureGate(appGlobalInputLowRiskCallsites.resonanceKeyCaptureGate);') ||
      app.includes('useAppGlobalInputLowRiskKeyCaptureBoundary({')
    ) &&
    (
      app.includes('appGlobalInputLowRiskCallsites.resonanceKeyCaptureGate') ||
      app.includes('appGlobalInputLowRiskBoundary')
    ),
  appStillOwnsStableRhythmPlanning:
    (app.includes('resolveStableRhythmLaneTimeWindow({') || app.includes('resolveStableRhythmLaneTimeWindow(stableRhythmLaneSchedulerSource.timeWindowArgs)')) &&
    (app.includes('buildStableRhythmLaneStepPlan({') || app.includes('buildStableRhythmLaneStepPlan(buildAppStableRhythmLaneSchedulerStepPlanArgs({')) &&
    (app.includes('executeStableRhythmLaneStepPlan(stationaryPlan, {') || app.includes('executeStableRhythmLaneStepPlan(stationaryPlan, stableRhythmLaneSchedulerActionPort)')) &&
    app.includes('scheduleDrumStep: (plan) => {') &&
    app.includes('scheduleBassStep: (plan) => {'),
  appStillOwnsResonanceKeyMusicalBody:
    app.includes('const handleResonanceKeyDown = (event: KeyboardEvent) =>') &&
    app.includes('runEnterWaveHotkeyGesture(buildNexusRippleGestureRuntime())'),
  noInputMetronomeBridgeOrIndexIntroduced: noBridgeOrIndex,
  dependencyGuardListedInSanitySuiteContract:
    suiteContract.includes('xensonar:check-app-input-metronome-dependency-audit'),
  dependencyGuardListedInRefactorSuiteRunner:
    suite.includes('Input metronome dependency audit') &&
    suite.includes('xensonar:check-app-input-metronome-dependency-audit'),
  baseInputMetronomeGuardsStillRegistered:
    suite.includes('xensonar:check-app-input-metronome-refactor') &&
    suite.includes('xensonar:check-app-input-metronome-shape-review') &&
    suiteContract.includes('xensonar:check-app-input-metronome-refactor') &&
    suiteContract.includes('xensonar:check-app-input-metronome-shape-review'),
  appLineCountUnaffectedByDependencyAudit: appLines <= 5625,
};

for (const failure of boolChecksToFailures(checks)) fail(failure);

const report = {
  ok: failures.length === 0,
  appLines,
  version: pkg.version,
  auditedKeys: Object.keys(hookFiles),
  dependencyAudit: {
    role: 'dependency audit for input metronome/browser containment hooks without moving App.tsx hook invocation',
    dependencyFindings,
    dependencyFilesClean,
    sharedGuardUtils: 'Import/export/dynamic-import extraction and dependency finding collection are delegated to xensonar-refactor-guard-utils.mjs.',
    allowedSpecialCases: {
      stableRhythmMetronomePulse: 'window.setTimeout/window.clearTimeout are allowed only for visual metronome pulse cleanup',
      resonanceInputIndicator: 'document.activeElement/isEditableTarget are allowed only for input indicator observation',
      resonanceKeyCaptureGate: 'event.preventDefault is allowed only for browser default prevention before the App-owned musical key body',
    },
  },
  movedScope: [
    'Kept the input-metronome dependency audit behavior but moved generic dependency scanning into shared guard utils',
    'Kept a static dependency audit for input metronome containment hooks',
    'Kept the guard registered in the refactor sanity suite and contract checker',
  ],
  explicitlyNotMoved: [
    'No input metronome hook callsite was moved out of App.tsx',
    'No stable rhythm planning or drum/bass scheduling was moved',
    'No resonance hotkey musical command body was moved',
    'No audio, Root-Follow, Wellenstarter, Partikel, package, recording, Room III, or visible UI behavior changed',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
