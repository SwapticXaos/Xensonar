#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const failures = [];
const fail = (message) => failures.push(message);

const appPath = 'src/App.tsx';
const boundaryPath = 'src/features/xensonar/audio/useAppLiveMasteringCallsiteBoundary.ts';
const busHookPath = 'src/features/xensonar/audio/useLiveMasterBusRuntimeRefs.ts';
const uiHookPath = 'src/features/xensonar/audio/useLiveMasteringUiState.ts';
const crisisHookPath = 'src/features/xensonar/performanceCrisis/usePerformanceCrisisUiPolicyState.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

for (const rel of [appPath, boundaryPath, busHookPath, uiHookPath, crisisHookPath, pkgPath, suitePath, suiteContractPath]) {
  if (!exists(rel)) fail(`missing required file ${rel}`);
}

const app = exists(appPath) ? read(appPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const appLines = app.split(/\r?\n/).length;

for (const marker of [
  'APP_LIVE_MASTERING_CALLSITE_BOUNDARY_CONTRACT',
  'AppLiveMasteringCallsiteBoundaryContract',
  'useAppLiveMasteringCallsiteBoundary',
  'useLiveMasterBusRuntimeRefs();',
  'useLiveMasteringUiState();',
  'preservesHookOrder',
  'wrapsPerformanceCrisisPolicyHook: false',
  'runtimeOwned: false',
  'audioMutating: false',
  'audioNodeConstructing: false',
  'packagePersistenceOwned: false',
  'visibleUiChangedByBoundary: false',
  '3.2.91.6.9.131_app_live_mastering_callsite_boundary',
]) {
  if (!boundary.includes(marker)) fail(`boundary missing marker ${marker}`);
}

const boundaryOrder = boundary.indexOf('const liveMasterBusRuntimeRefs = useLiveMasterBusRuntimeRefs();') < boundary.indexOf('const liveMasteringUiState = useLiveMasteringUiState();');
if (!boundaryOrder) fail('boundary must preserve previous hook order: bus refs before live mastering UI state');

for (const marker of [
  'finalOutputTrimRef',
  'finalMixAnalyserRef',
  'preFxTapAnalyserRef',
  'postFxTapAnalyserRef',
  'monitorTapAnalyserRef',
  'audioTapScratchRef',
  'liveMasteringRef',
  'liveMasterBusRuntimeRefs',
  'liveMasteringEnabled',
  'setLiveMasteringEnabled',
  'liveMasteringStrength',
  'setLiveMasteringStrength',
  'liveMasteringGlue',
  'setLiveMasteringGlue',
  'liveMasteringAir',
  'setLiveMasteringAir',
  'liveMasterMonitor',
  'setLiveMasterMonitor',
  'setAudioEventIntakeMonitor',
  'audioEventIntakeMonitorRef',
  'audioTapMonitor',
  'setAudioTapMonitor',
]) {
  if (!app.includes(marker)) fail(`App.tsx must still destructure ${marker}`);
}

const checks = {
  packageVersionAtLeast131: /^3\.2\.91\.6\.9\.(13[1-9]|1[4-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-live-mastering-callsite-boundary'] ===
    'node tools/check-app-live-mastering-callsite-boundary.mjs',
  guardListedInSanitySuite:
    suite.includes('Live mastering callsite boundary') &&
    suite.includes('xensonar:check-app-live-mastering-callsite-boundary'),
  guardListedInSanitySuiteContract: suiteContract.includes('xensonar:check-app-live-mastering-callsite-boundary'),
  appUsesOnlyBoundaryHook:
    app.includes('useAppLiveMasteringCallsiteBoundary()') &&
    !app.includes('useLiveMasterBusRuntimeRefs()') &&
    !app.includes('useLiveMasteringUiState()'),
  appImportUsesOnlyBoundary:
    app.includes('useAppLiveMasteringCallsiteBoundary') &&
    !app.includes('from "./features/xensonar/audio/useLiveMasteringUiState"') &&
    !app.includes('from "./features/xensonar/audio/useLiveMasterBusRuntimeRefs"'),
  performanceCrisisPolicyHookStillInApp:
    app.includes('usePerformanceCrisisUiPolicyState({') &&
    app.includes('const { performanceCrisisRuntimePolicy } = performanceCrisisUiPolicyState;'),
  appStillOwnsAudioBusRuntimeConstruction:
    app.includes('ensureFinalMixBusRuntime(ctx, liveMasterBusRuntimeRefs)') &&
    app.includes('ensureDrumMixBusRuntime(ctx, liveMasterBusRuntimeRefs)') &&
    app.includes('getLiveMasterBusRuntime(ctx, liveMasterBusRuntimeRefs, role)') &&
    app.includes('getLiveMasterEffectBusRuntime(ctx, liveMasterBusRuntimeRefs, effect)') &&
    app.includes('ensureLiveMasterRecordingDestinationRuntime(ctx, liveMasterBusRuntimeRefs, mode)'),
  appStillUsesPerformancePolicyAtAudioSites:
    app.includes('getPolicy: () => performanceCrisisRuntimePolicy.waveStarter') &&
    app.includes('performancePolicy: performanceCrisisRuntimePolicy.particles'),
  noBridgeOrIndexIntroduced:
    !exists('src/features/xensonar/audio/appLiveMasteringBridge.ts') &&
    !exists('src/features/xensonar/audio/appLiveMasteringIndex.ts') &&
    !exists('src/features/xensonar/performanceCrisis/appLivePerformanceStateBridge.ts') &&
    !exists('src/features/xensonar/performanceCrisis/useAppLivePerformanceStateBridge.ts'),
  appLineCountShrankAgainst130: appLines <= 5567,
};

for (const forbiddenToken of [
  'createOscillator(',
  'createGain(',
  'createMediaStreamDestination(',
  'new AudioContext',
  '.connect(',
  '.disconnect(',
  '.start(',
  '.stop(',
  'ensureFinalMixBusRuntime(',
  'ensureDrumMixBusRuntime(',
  'getLiveMasterBusRuntime(',
  'getLiveMasterEffectBusRuntime(',
  'ensureLiveMasterRecordingDestinationRuntime(',
  'resolvePerformanceCrisisRuntimePolicy(',
  'startRecording(',
  'stopRecording(',
  'downloadRecordingWav(',
]) {
  if (boundary.includes(forbiddenToken)) fail(`callsite boundary must not include runtime/audio/policy token ${forbiddenToken}`);
}

for (const [name, ok] of Object.entries(checks)) if (!ok) fail(name);

const report = {
  ok: failures.length === 0,
  version: pkg.version,
  appLines,
  callsiteCleanup: {
    role: 'flatten adjacent live-master bus refs and live-mastering UI hook invocation into one App.tsx callsite boundary',
    previousHookCallsInApp: ['useLiveMasterBusRuntimeRefs()', 'useLiveMasteringUiState()'],
    currentHookCallInApp: 'useAppLiveMasteringCallsiteBoundary()',
    preservesHookOrder: ['useLiveMasterBusRuntimeRefs', 'useLiveMasteringUiState'],
    performanceCrisisPolicyHookStillInApp: true,
    runtimeOwned: false,
    audioMutating: false,
    audioNodeConstructing: false,
    packagePersistenceOwned: false,
  },
  explicitlyNotMoved: [
    'Performance Crisis policy hook stays in App.tsx',
    'Live-master bus construction and accessors stay in App.tsx',
    'No live mastering DSP graph construction moved into the new boundary',
    'No audio, package, recording, Root-Follow, Wellenstarter, Partikel, Drum/Bass, Materialspur, Room III, or visible UI behavior changed',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
