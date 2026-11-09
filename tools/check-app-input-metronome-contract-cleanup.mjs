#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const failures = [];
const fail = (message) => failures.push(message);

const shapePath = 'validation/contracts/xensonar/input/appInputMetronomeShapeAudit.ts';
const dependencyPath = 'validation/contracts/xensonar/input/appInputMetronomeDependencyAudit.ts';
const appPath = 'src/App.tsx';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const expectedKeys = [
  'stableRhythmMetronomePulse',
  'resonanceInputIndicator',
  'resonanceKeyCaptureGate',
];

const expectedInputContracts = {
  stableRhythmMetronomePulse: 'stable-rhythm-visual-pulse-input',
  resonanceInputIndicator: 'editable-target-indicator-input',
  resonanceKeyCaptureGate: 'resonance-key-browser-capture-input',
};

const expectedOutputContracts = {
  stableRhythmMetronomePulse: 'visual-metronome-pulse-state-output',
  resonanceInputIndicator: 'resonance-input-indicator-output',
  resonanceKeyCaptureGate: 'browser-default-prevention-output',
};

const expectedCalls = {
  stableRhythmMetronomePulse: ['useStableRhythmMetronomePulse();'],
  resonanceInputIndicator: ['useResonanceInputIndicator(resonanceInputActive);'],
  resonanceKeyCaptureGate: [
    'useResonanceKeyCaptureGate(appGlobalInputLowRiskCallsites.resonanceKeyCaptureGate);',
    'useAppGlobalInputLowRiskKeyCaptureBoundary({',
  ],
};

for (const rel of [shapePath, dependencyPath, appPath, pkgPath, suitePath, suiteContractPath]) {
  if (!exists(rel)) fail(`missing required file ${rel}`);
}

const shape = exists(shapePath) ? read(shapePath) : '';
const dependency = exists(dependencyPath) ? read(dependencyPath) : '';
const app = exists(appPath) ? read(appPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const appLines = app.split(/\r?\n/).length;

for (const marker of [
  'APP_INPUT_METRONOME_CONTRACT_BUILD_ORDER',
  'AppInputMetronomeInputContractName',
  'AppInputMetronomeOutputContractName',
  'AppInputMetronomeInputContractMap',
  'AppInputMetronomeOutputContractMap',
  'AppInputMetronomeContractEntry',
  'APP_INPUT_METRONOME_INPUT_CONTRACTS',
  'APP_INPUT_METRONOME_OUTPUT_CONTRACTS',
  'APP_INPUT_METRONOME_CONTRACT',
  'APP_INPUT_METRONOME_CONTRACT_CLEANUP_PROBE',
  "patch: '3.2.91.6.9.126_app_input_metronome_contract_cleanup'",
  "scope: 'contract-cleanup-only'",
  'createsBridgeOrIndex: false',
  'runtimeOwned: false',
  'audioMutating: false',
  'packagePersistenceOwned: false',
  'musicalCommandOwned: false',
]) {
  if (!shape.includes(marker)) fail(`shape audit missing contract-cleanup marker ${marker}`);
}

if (!shape.includes('APP_INPUT_METRONOME_CONTRACT_BUILD_ORDER = APP_INPUT_METRONOME_SHAPE_KEYS')) {
  fail('contract build order must reuse APP_INPUT_METRONOME_SHAPE_KEYS');
}

for (const key of expectedKeys) {
  if (!shape.includes(`${key}: '`)) fail(`contract maps missing ${key} entry`);
  if (!shape.includes(`key: '${key}'`)) fail(`contract entry missing key literal ${key}`);
  if (!shape.includes(`APP_INPUT_METRONOME_SHAPE_AUDIT.${key}.hookName`)) fail(`contract entry ${key} must derive hookName from shape audit`);
  if (!shape.includes(`APP_INPUT_METRONOME_SHAPE_AUDIT.${key}.file`)) fail(`contract entry ${key} must derive file from shape audit`);
  if (!shape.includes(`APP_INPUT_METRONOME_INPUT_CONTRACTS.${key}`)) fail(`contract entry ${key} must derive input contract from central input map`);
  if (!shape.includes(`APP_INPUT_METRONOME_OUTPUT_CONTRACTS.${key}`)) fail(`contract entry ${key} must derive output contract from central output map`);
  if (!shape.includes(expectedInputContracts[key])) fail(`shape audit missing input contract literal for ${key}: ${expectedInputContracts[key]}`);
  if (!shape.includes(expectedOutputContracts[key])) fail(`shape audit missing output contract literal for ${key}: ${expectedOutputContracts[key]}`);
  if (!dependency.includes(key)) fail(`dependency audit must still mention ${key}`);
  if (!expectedCalls[key].some((call) => app.includes(call))) fail(`App.tsx must still invoke ${key} hook at original callsite or through the low-risk wrapper`);
}

const contractStart = shape.indexOf('export const APP_INPUT_METRONOME_CONTRACT');
const contractSlice = contractStart >= 0 ? shape.slice(contractStart) : '';
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
  'scheduleClassicBassPatternStep(',
  'scheduleBassClipStep(',
]) {
  if (contractSlice.includes(forbiddenToken)) fail(`contract cleanup must stay descriptive and must not include ${forbiddenToken}`);
}

const expectedBooleanContracts = {
  stableRhythmMetronomePulse: ['visualPulseOnly: true', 'editableTargetIndicatorOnly: false', 'browserEventContainmentOnly: false'],
  resonanceInputIndicator: ['visualPulseOnly: false', 'editableTargetIndicatorOnly: true', 'browserEventContainmentOnly: false'],
  resonanceKeyCaptureGate: ['visualPulseOnly: false', 'editableTargetIndicatorOnly: false', 'browserEventContainmentOnly: true'],
};
for (const [key, tokens] of Object.entries(expectedBooleanContracts)) {
  const entryStart = contractSlice.indexOf(`${key}: {`);
  let nextStart = contractSlice.length;
  for (const otherKey of expectedKeys) {
    if (otherKey === key) continue;
    const candidate = contractSlice.indexOf(`${otherKey}: {`, entryStart + 1);
    if (candidate > entryStart && candidate < nextStart) nextStart = candidate;
  }
  const entry = entryStart >= 0 ? contractSlice.slice(entryStart, nextStart) : '';
  if (!entry) fail(`missing contract entry body for ${key}`);
  for (const token of tokens) if (!entry.includes(token)) fail(`${key} contract missing ${token}`);
}

const noBridgeOrIndex = [
  'src/features/xensonar/input/appInputMetronomeBridge.ts',
  'src/features/xensonar/input/useAppInputMetronomeBridge.ts',
  'src/features/xensonar/input/appInputMetronomeIndex.ts',
  'src/features/xensonar/input/appInputContainmentBridge.ts',
  'src/features/xensonar/rooms/appStableRhythmMetronomeBridge.ts',
  'src/features/xensonar/rooms/useStableRhythmMetronomeBridge.ts',
  'src/features/xensonar/input/appInputMetronomeContractIndex.ts',
].every((rel) => !exists(rel));

const checks = {
  packageVersionAtLeast126: /^3\.2\.91\.6\.9\.(12[6-9]|1[3-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-input-metronome-contract-cleanup'] ===
    'node tools/check-app-input-metronome-contract-cleanup.mjs',
  guardListedInSanitySuite:
    suite.includes('Input metronome contract cleanup') &&
    suite.includes('xensonar:check-app-input-metronome-contract-cleanup'),
  guardListedInSanitySuiteContract: suiteContract.includes('xensonar:check-app-input-metronome-contract-cleanup'),
  dependencyAuditStillRegistered:
    suite.includes('xensonar:check-app-input-metronome-dependency-audit') &&
    suiteContract.includes('xensonar:check-app-input-metronome-dependency-audit'),
  shapeReviewStillRegistered:
    suite.includes('xensonar:check-app-input-metronome-shape-review') &&
    suiteContract.includes('xensonar:check-app-input-metronome-shape-review'),
  appStillOwnsHookInvocation:
    Object.values(expectedCalls).every((calls) => calls.some((call) => app.includes(call))) &&
    (app.includes('appGlobalInputLowRiskCallsites.resonanceKeyCaptureGate') || app.includes('useAppGlobalInputLowRiskKeyCaptureBoundary({')),
  appStillOwnsStableRhythmPlanning:
    (app.includes('resolveStableRhythmLaneTimeWindow({') || app.includes('resolveStableRhythmLaneTimeWindow(stableRhythmLaneSchedulerSource.timeWindowArgs)')) &&
    (app.includes('buildStableRhythmLaneStepPlan({') || app.includes('buildStableRhythmLaneStepPlan(buildAppStableRhythmLaneSchedulerStepPlanArgs({')) &&
    (app.includes('executeStableRhythmLaneStepPlan(stationaryPlan, {') || app.includes('executeStableRhythmLaneStepPlan(stationaryPlan, stableRhythmLaneSchedulerActionPort)')) &&
    app.includes('scheduleDrumStep: (plan) => {') &&
    app.includes('scheduleBassStep: (plan) => {'),
  appStillOwnsResonanceKeyMusicalBody:
    app.includes('const handleResonanceKeyDown = (event: KeyboardEvent) =>') &&
    app.includes('runEnterWaveHotkeyGesture(buildNexusRippleGestureRuntime())'),
  noBridgeOrIndexIntroduced: noBridgeOrIndex,
  appLineCountUnaffectedByContractCleanup: appLines <= 5625,
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
    role: 'central contract map for the input metronome and browser containment hooks without moving App.tsx invocation',
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
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
