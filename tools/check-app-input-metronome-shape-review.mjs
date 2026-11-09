#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const failures = [];
const fail = (message) => failures.push(message);

const shapePath = 'validation/contracts/xensonar/input/appInputMetronomeShapeAudit.ts';
const appPath = 'src/App.tsx';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const expected = {
  stableRhythmMetronomePulse: {
    file: 'src/features/xensonar/rooms/useStableRhythmMetronomePulse.ts',
    hookName: 'useStableRhythmMetronomePulse',
    appCallsite: 'useStableRhythmMetronomePulse();',
    role: 'stable-rhythm-visual-pulse-timeout-owner',
    eventSource: 'window.setTimeout',
    output: 'visual metronome pulse state and timeout cleanup only',
  },
  resonanceInputIndicator: {
    file: 'src/features/xensonar/input/useResonanceInputIndicator.ts',
    hookName: 'useResonanceInputIndicator',
    appCallsite: 'useResonanceInputIndicator(resonanceInputActive);',
    role: 'editable-target-input-indicator',
    eventSource: 'window.focusin',
    output: 'editable-target indicator only',
  },
  resonanceKeyCaptureGate: {
    file: 'src/features/xensonar/input/useResonanceKeyCaptureGate.ts',
    hookName: 'useResonanceKeyCaptureGate',
    appCallsite: 'useResonanceKeyCaptureGate(appGlobalInputLowRiskCallsites.resonanceKeyCaptureGate);',
    role: 'resonance-key-browser-capture-gate',
    eventSource: 'window.keydown:capture',
    output: 'browser default prevention gate only',
  },
};

for (const rel of [shapePath, appPath, pkgPath, suitePath, suiteContractPath, ...Object.values(expected).map((entry) => entry.file)]) {
  if (!exists(rel)) fail(`missing required file ${rel}`);
}

const shape = exists(shapePath) ? read(shapePath) : '';
const app = exists(appPath) ? read(appPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const appLines = app.split(/\r?\n/).length;

for (const marker of [
  'APP_INPUT_METRONOME_SHAPE_KEYS',
  'AppInputMetronomeShapeKey',
  'AppInputMetronomeShapeRole',
  'AppInputMetronomeShapeAuditEntry',
  'APP_INPUT_METRONOME_SHAPE_AUDIT',
  'APP_INPUT_METRONOME_SHAPE_REVIEW_PROBE',
  "patch: '3.2.91.6.9.124_app_input_metronome_shape_review'",
  "scope: 'shape-review-only'",
  'createsBridgeOrIndex: false',
  'runtimeOwned: false',
  'audioMutating: false',
  'roomLifecycleOwned: false',
  'packagePersistenceOwned: false',
  'musicalCommandOwned: false',
  'visibleUiChangedByAudit: false',
]) {
  if (!shape.includes(marker)) fail(`shape review missing marker ${marker}`);
}

for (const [key, entry] of Object.entries(expected)) {
  const shapeEntryStart = shape.indexOf(`${key}: {`);
  const shapeEntryEnd = shape.indexOf('\n  },', shapeEntryStart);
  const shapeEntry = shapeEntryStart >= 0 && shapeEntryEnd >= 0 ? shape.slice(shapeEntryStart, shapeEntryEnd) : '';
  if (!shapeEntry) fail(`missing shape entry for ${key}`);
  for (const marker of [
    `key: '${key}'`,
    `file: '${entry.file}'`,
    `hookName: '${entry.hookName}'`,
    `role: '${entry.role}'`,
    entry.eventSource,
    entry.output,
    `appCallsite: '${entry.appCallsite}'`,
    'appOwnsHookInvocation: true',
    'runtimeOwned: false',
    'audioMutating: false',
    'roomLifecycleOwned: false',
    'packagePersistenceOwned: false',
    'musicalCommandOwned: false',
    'visibleUiChangedByAudit: false',
  ]) {
    if (!shapeEntry.includes(marker)) fail(`${key} shape entry missing ${marker}`);
  }
  if (!app.includes(entry.appCallsite) && !(key === 'resonanceKeyCaptureGate' && app.includes('useAppGlobalInputLowRiskKeyCaptureBoundary({'))) fail(`App.tsx must still invoke ${entry.appCallsite} or the low-risk key-capture wrapper`);
}

const hookContents = Object.fromEntries(
  Object.entries(expected).map(([key, entry]) => [key, exists(entry.file) ? read(entry.file) : '']),
);

const hookSpecificChecks = {
  stableRhythmMetronomeStillOwnsPulseTimeouts:
    hookContents.stableRhythmMetronomePulse.includes('const [metronomePulse, setMetronomePulse] = useState(0)') &&
    hookContents.stableRhythmMetronomePulse.includes('const metronomeTimeoutsRef = useRef<number[]>([])') &&
    hookContents.stableRhythmMetronomePulse.includes('window.setTimeout') &&
    hookContents.stableRhythmMetronomePulse.includes('window.clearTimeout'),
  resonanceInputIndicatorStillReadOnlyIndicator:
    hookContents.resonanceInputIndicator.includes('isEditableTarget(document.activeElement)') &&
    hookContents.resonanceInputIndicator.includes('window.addEventListener("focusin", refreshResonanceInputIndicator)') &&
    hookContents.resonanceInputIndicator.includes('window.addEventListener("pointerdown", refreshResonanceInputIndicator)'),
  resonanceKeyCaptureGateStillOnlyPreventsBrowserDefault:
    hookContents.resonanceKeyCaptureGate.includes('shouldCaptureResonanceKey(event, nexusParamsRef.current.quantizeOn)') &&
    hookContents.resonanceKeyCaptureGate.includes('event.preventDefault()') &&
    hookContents.resonanceKeyCaptureGate.includes('window.addEventListener("keydown", onKeyCapture, true)'),
  appStillOwnsStableRhythmPlanning:
    (app.includes('resolveStableRhythmLaneTimeWindow({') || app.includes('resolveStableRhythmLaneTimeWindow(stableRhythmLaneSchedulerSource.timeWindowArgs)')) &&
    (app.includes('buildStableRhythmLaneStepPlan({') || app.includes('buildStableRhythmLaneStepPlan(buildAppStableRhythmLaneSchedulerStepPlanArgs({')) &&
    (app.includes('executeStableRhythmLaneStepPlan(stationaryPlan, {') || app.includes('executeStableRhythmLaneStepPlan(stationaryPlan, stableRhythmLaneSchedulerActionPort)')) &&
    app.includes('scheduleDrumStep: (plan) => {') &&
    app.includes('scheduleBassStep: (plan) => {'),
  appStillOwnsResonanceKeyMusicalBody:
    app.includes('const handleResonanceKeyDown = (event: KeyboardEvent) =>') &&
    app.includes('runEnterWaveHotkeyGesture(buildNexusRippleGestureRuntime())'),
};

for (const [name, ok] of Object.entries(hookSpecificChecks)) if (!ok) fail(name);

const shapeSlice = shape.slice(shape.indexOf('export const APP_INPUT_METRONOME_SHAPE_AUDIT'));
for (const forbiddenToken of [
  'createOscillator(',
  'createGain(',
  '.connect(',
  '.start(',
  '.stop(',
  'safeApplyAttack',
  'safeApplyExponentialRelease',
  'scheduleClassicBassPatternStep',
  'scheduleExportedDrumConfigStep',
  'scheduleBassClipStep',
  'importXensonarPackageStationFile(',
  'downloadRecordingWav(',
]) {
  if (shapeSlice.includes(forbiddenToken)) fail(`shape review must stay descriptive and must not include ${forbiddenToken}`);
}

const noBridgeOrIndex = [
  'src/features/xensonar/input/appInputMetronomeBridge.ts',
  'src/features/xensonar/input/useAppInputMetronomeBridge.ts',
  'src/features/xensonar/input/appInputMetronomeIndex.ts',
  'src/features/xensonar/rooms/appInputMetronomeBridge.ts',
  'src/features/xensonar/rooms/useAppInputMetronomeBridge.ts',
  'src/features/xensonar/rooms/appStableRhythmMetronomeBridge.ts',
].every((rel) => !exists(rel));

const checks = {
  packageVersionAtLeast124: /^3\.2\.91\.6\.9\.(12[4-9]|1[3-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-input-metronome-shape-review'] ===
    'node tools/check-app-input-metronome-shape-review.mjs',
  guardListedInSanitySuite:
    suite.includes('Input metronome shape review') &&
    suite.includes('xensonar:check-app-input-metronome-shape-review'),
  guardListedInSanitySuiteContract: suiteContract.includes('xensonar:check-app-input-metronome-shape-review'),
  baseInputMetronomeGuardStillRegistered:
    suite.includes('xensonar:check-app-input-metronome-refactor') &&
    suiteContract.includes('xensonar:check-app-input-metronome-refactor'),
  appStillOwnsHookInvocation:
    expected.stableRhythmMetronomePulse.appCallsite && app.includes(expected.stableRhythmMetronomePulse.appCallsite) &&
    app.includes(expected.resonanceInputIndicator.appCallsite) &&
    (app.includes(expected.resonanceKeyCaptureGate.appCallsite) || app.includes('useAppGlobalInputLowRiskKeyCaptureBoundary({')) &&
    (app.includes('appGlobalInputLowRiskCallsites.resonanceKeyCaptureGate') || app.includes('appGlobalInputLowRiskBoundary')),
  noBridgeOrIndexIntroduced: noBridgeOrIndex,
  appLineCountUnaffectedByShapeReview: appLines <= 5625,
};

for (const [name, ok] of Object.entries(checks)) if (!ok) fail(name);

const report = {
  ok: failures.length === 0,
  appLines,
  version: pkg.version,
  auditedKeys: Object.keys(expected),
  shapeReview: {
    role: 'shape review for stable rhythm metronome pulse plus resonance input indicator/capture gate hooks',
    keepsAppHookInvocation: true,
    keepsStableRhythmPlanningInApp: true,
    keepsResonanceKeyMusicalBodyInApp: true,
    createsBridgeOrIndex: false,
    runtimeOwned: false,
    audioMutating: false,
    packagePersistenceOwned: false,
  },
  explicitlyNotMoved: [
    'No input metronome hook callsite was moved out of App.tsx',
    'No hook implementation was changed',
    'No stable rhythm planning or drum/bass scheduling was moved',
    'No resonance hotkey musical command body was moved',
    'No audio, Root-Follow, Wellenstarter, Partikel, package, recording, Room III, or visible UI behavior changed',
  ],
  checks: { ...hookSpecificChecks, ...checks },
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
