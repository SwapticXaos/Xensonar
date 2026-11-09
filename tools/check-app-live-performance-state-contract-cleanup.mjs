#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const failures = [];
const fail = (message) => failures.push(message);

const shapePath = 'validation/contracts/xensonar/performanceCrisis/appLivePerformanceStateShapeAudit.ts';
const dependencyPath = 'validation/contracts/xensonar/performanceCrisis/appLivePerformanceStateDependencyAudit.ts';
const appPath = 'src/App.tsx';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const expectedKeys = [
  'liveMasteringUiState',
  'performanceCrisisUiPolicyState',
  'liveMasterBusRuntimeRefs',
];

const expectedInputContracts = {
  liveMasteringUiState: 'live-mastering-ui-monitor-input',
  performanceCrisisUiPolicyState: 'performance-crisis-ui-policy-input',
  liveMasterBusRuntimeRefs: 'live-master-bus-ref-container-input',
};

const expectedOutputContracts = {
  liveMasteringUiState: 'live-mastering-ui-monitor-state-output',
  performanceCrisisUiPolicyState: 'performance-crisis-runtime-policy-state-output',
  liveMasterBusRuntimeRefs: 'live-master-bus-runtime-ref-container-output',
};

const expectedCalls = {
  liveMasteringUiState: 'const liveMasteringCallsiteBoundary = useAppLiveMasteringCallsiteBoundary();',
  performanceCrisisUiPolicyState: 'usePerformanceCrisisUiPolicyState({',
  liveMasterBusRuntimeRefs: 'const liveMasteringCallsiteBoundary = useAppLiveMasteringCallsiteBoundary();',
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
  'APP_LIVE_PERFORMANCE_STATE_CONTRACT_BUILD_ORDER',
  'AppLivePerformanceStateInputContractName',
  'AppLivePerformanceStateOutputContractName',
  'AppLivePerformanceStateInputContractMap',
  'AppLivePerformanceStateOutputContractMap',
  'AppLivePerformanceStateContractEntry',
  'APP_LIVE_PERFORMANCE_STATE_INPUT_CONTRACTS',
  'APP_LIVE_PERFORMANCE_STATE_OUTPUT_CONTRACTS',
  'APP_LIVE_PERFORMANCE_STATE_CONTRACT',
  'APP_LIVE_PERFORMANCE_STATE_CONTRACT_CLEANUP_PROBE',
  "patch: '3.2.91.6.9.130_app_live_performance_state_contract_cleanup'",
  "scope: 'contract-cleanup-only'",
  'createsBridgeOrIndex: false',
  'appInvocationOwner: true',
  'appStillOwnsAudioBusConstruction: true',
  'appStillOwnsLiveMasterRuntimeAccess: true',
  'runtimeOwned: false',
  'audioMutating: false',
  'audioNodeConstructing: false',
  'packagePersistenceOwned: false',
]) {
  if (!shape.includes(marker)) fail(`shape audit missing contract-cleanup marker ${marker}`);
}

if (!shape.includes('APP_LIVE_PERFORMANCE_STATE_CONTRACT_BUILD_ORDER = APP_LIVE_PERFORMANCE_STATE_SHAPE_KEYS')) {
  fail('contract build order must reuse APP_LIVE_PERFORMANCE_STATE_SHAPE_KEYS');
}

for (const key of expectedKeys) {
  if (!shape.includes(`${key}: '`)) fail(`contract maps missing ${key} entry`);
  if (!shape.includes(`key: '${key}'`)) fail(`contract entry missing key literal ${key}`);
  if (!shape.includes(`APP_LIVE_PERFORMANCE_STATE_SHAPE_AUDIT.${key}.hookName`)) fail(`contract entry ${key} must derive hookName from shape audit`);
  if (!shape.includes(`APP_LIVE_PERFORMANCE_STATE_SHAPE_AUDIT.${key}.file`)) fail(`contract entry ${key} must derive file from shape audit`);
  if (!shape.includes(`APP_LIVE_PERFORMANCE_STATE_INPUT_CONTRACTS.${key}`)) fail(`contract entry ${key} must derive input contract from central input map`);
  if (!shape.includes(`APP_LIVE_PERFORMANCE_STATE_OUTPUT_CONTRACTS.${key}`)) fail(`contract entry ${key} must derive output contract from central output map`);
  if (!shape.includes(expectedInputContracts[key])) fail(`shape audit missing input contract literal for ${key}: ${expectedInputContracts[key]}`);
  if (!shape.includes(expectedOutputContracts[key])) fail(`shape audit missing output contract literal for ${key}: ${expectedOutputContracts[key]}`);
  if (!dependency.includes(key)) fail(`dependency audit must still mention ${key}`);
  if (!app.includes(expectedCalls[key])) fail(`App.tsx must still expose ${key} through the current live-mastering callsite boundary`);
}

const contractStart = shape.indexOf('export const APP_LIVE_PERFORMANCE_STATE_CONTRACT');
const contractSlice = contractStart >= 0 ? shape.slice(contractStart) : '';
for (const forbiddenToken of [
  'createOscillator(',
  'createGain(',
  'createMediaStreamDestination(',
  'new AudioContext',
  '.connect(',
  '.disconnect(',
  '.start(',
  '.stop(',
  'safeApplyAttack(',
  'safeApplyExponentialRelease(',
  'scheduleClassicBassPatternStep(',
  'scheduleExportedDrumConfigStep(',
  'scheduleBassClipStep(',
  'buildStableRhythmLaneStepPlan(',
  'executeStableRhythmLaneStepPlan(',
  'runEnterWaveHotkeyGesture(',
  'runParticleNexusToneOrchestrator(',
  'playWaveStartSound(',
  'emitWaveStartSound(',
  'startRecording(',
  'stopRecording(',
  'downloadRecordingWav(',
  'importXensonarPackageStationFile(',
]) {
  if (contractSlice.includes(forbiddenToken)) fail(`contract cleanup must stay descriptive and must not include ${forbiddenToken}`);
}

const expectedBooleanContracts = {
  liveMasteringUiState: ['uiStateOnly: true', 'policyMemoOnly: false', 'refContainerOnly: false'],
  performanceCrisisUiPolicyState: ['uiStateOnly: true', 'policyMemoOnly: true', 'refContainerOnly: false'],
  liveMasterBusRuntimeRefs: ['uiStateOnly: false', 'policyMemoOnly: false', 'refContainerOnly: true'],
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
  'src/features/xensonar/performanceCrisis/appLivePerformanceStateBridge.ts',
  'src/features/xensonar/performanceCrisis/useAppLivePerformanceStateBridge.ts',
  'src/features/xensonar/performanceCrisis/appLivePerformanceStateIndex.ts',
  'src/features/xensonar/performanceCrisis/appLivePerformanceStateContractIndex.ts',
  'src/features/xensonar/audio/appLivePerformanceStateBridge.ts',
  'src/features/xensonar/audio/useAppLivePerformanceStateBridge.ts',
].every((rel) => !exists(rel));

const checks = {
  packageVersionAtLeast130: /^3\.2\.91\.6\.9\.(13[0-9]|1[4-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-live-performance-state-contract-cleanup'] ===
    'node tools/check-app-live-performance-state-contract-cleanup.mjs',
  guardListedInSanitySuite:
    suite.includes('Live performance state contract cleanup') &&
    suite.includes('xensonar:check-app-live-performance-state-contract-cleanup'),
  guardListedInSanitySuiteContract: suiteContract.includes('xensonar:check-app-live-performance-state-contract-cleanup'),
  dependencyAuditStillRegistered:
    suite.includes('xensonar:check-app-live-performance-state-dependency-audit') &&
    suiteContract.includes('xensonar:check-app-live-performance-state-dependency-audit'),
  shapeReviewStillRegistered:
    suite.includes('xensonar:check-app-live-performance-state-shape-review') &&
    suiteContract.includes('xensonar:check-app-live-performance-state-shape-review'),
  appStillOwnsHookInvocation:
    Object.values(expectedCalls).every((call) => app.includes(call)) &&
    app.includes('} = liveMasteringCallsiteBoundary;') &&
    app.includes('liveMasterBusRuntimeRefs,'),
  appStillOwnsAudioBusRuntimeConstruction:
    app.includes('ensureFinalMixBusRuntime(ctx, liveMasterBusRuntimeRefs)') &&
    app.includes('ensureDrumMixBusRuntime(ctx, liveMasterBusRuntimeRefs)') &&
    app.includes('getLiveMasterBusRuntime(ctx, liveMasterBusRuntimeRefs, role)') &&
    app.includes('getLiveMasterEffectBusRuntime(ctx, liveMasterBusRuntimeRefs, effect)') &&
    app.includes('ensureLiveMasterRecordingDestinationRuntime(ctx, liveMasterBusRuntimeRefs, mode)'),
  appStillUsesPerformancePolicyAtAudioSites:
    app.includes('getPolicy: () => performanceCrisisRuntimePolicy.waveStarter') &&
    app.includes('performancePolicy: performanceCrisisRuntimePolicy.particles'),
  noBridgeOrIndexIntroduced: noBridgeOrIndex,
  appLineCountUnaffectedByContractCleanup: appLines <= 5595,
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
    role: 'central contract map for live performance UI state, policy memo state, and live-master bus ref container hooks through the App-owned live-mastering callsite boundary',
    keepsAppHookInvocation: true,
    keepsAudioBusRuntimeConstructionInApp: true,
    keepsPerformancePolicyUseAtAudioSites: true,
    createsBridgeOrIndex: false,
    runtimeOwned: false,
    audioMutating: false,
    audioNodeConstructing: false,
    packagePersistenceOwned: false,
  },
  explicitlyNotMoved: [
    'Live-master bus refs and live-mastering UI hook calls are wrapped by useAppLiveMasteringCallsiteBoundary in App.tsx',
    'No hook implementation was changed',
    'No live mastering DSP graph construction or bus connection was moved',
    'No Performance Crisis runtime policy semantics were changed',
    'No audio, Root-Follow, Wellenstarter, Partikel, package, recording, Room III, or visible UI behavior changed',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
