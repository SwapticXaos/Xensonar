#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const failures = [];
const fail = (message) => failures.push(message);

const shapePath = 'validation/contracts/xensonar/performanceCrisis/appLivePerformanceStateShapeAudit.ts';
const appPath = 'src/App.tsx';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const expected = {
  liveMasteringUiState: {
    file: 'src/features/xensonar/audio/useLiveMasteringUiState.ts',
    hookName: 'useLiveMasteringUiState',
    role: 'live-mastering-ui-and-monitor-state',
    appCallsite: 'useAppLiveMasteringCallsiteBoundary()',
    output: 'UI and monitor state only',
    stateMarkers: [
      'createDefaultLiveMasterTelemetry',
      'createEmptyAudioEventIntakeState',
      'summarizeAudioTapState',
      'audioEventIntakeMonitorRef',
      'setLiveMasteringStrength',
      'setAudioTapMonitor',
    ],
  },
  performanceCrisisUiPolicyState: {
    file: 'src/features/xensonar/performanceCrisis/usePerformanceCrisisUiPolicyState.ts',
    hookName: 'usePerformanceCrisisUiPolicyState',
    role: 'performance-crisis-policy-ui-state-and-runtime-policy-memo',
    appCallsite: 'usePerformanceCrisisUiPolicyState({',
    output: 'policy UI selections and resolved runtime policy memo only',
    stateMarkers: [
      'resolvePerformanceCrisisRuntimePolicy',
      'performanceCrisisRuntimePolicy',
      'setWaveStarterCrisisPresetId',
      'setRootFollowVoiceEngineMode',
      'setParticleQuantizationGrid',
    ],
  },
  liveMasterBusRuntimeRefs: {
    file: 'src/features/xensonar/audio/useLiveMasterBusRuntimeRefs.ts',
    hookName: 'useLiveMasterBusRuntimeRefs',
    role: 'live-master-bus-runtime-ref-container',
    appCallsite: 'useAppLiveMasteringCallsiteBoundary()',
    output: 'stable null-initialized ref container only',
    stateMarkers: [
      'const finalMixBusRef = useRef<GainNode | null>(null)',
      'const liveMasteringRef = useRef<LiveMasteringSystem | null>(null)',
      'const recordingDestinationWithDrumsRef = useRef<MediaStreamAudioDestinationNode | null>(null)',
      'liveMasterBusRuntimeRefs',
      'useMemo<LiveMasterBusRuntimeRefs>',
    ],
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
  'APP_LIVE_PERFORMANCE_STATE_SHAPE_KEYS',
  'AppLivePerformanceStateShapeKey',
  'AppLivePerformanceStateShapeRole',
  'AppLivePerformanceStateShapeAuditEntry',
  'APP_LIVE_PERFORMANCE_STATE_SHAPE_AUDIT',
  'APP_LIVE_PERFORMANCE_STATE_SHAPE_REVIEW_PROBE',
  "patch: '3.2.91.6.9.128_app_live_performance_state_shape_review'",
  "scope: 'shape-review-only'",
  'createsBridgeOrIndex: false',
  'runtimeOwned: false',
  'audioMutating: false',
  'audioNodeConstructing: false',
  'roomLifecycleOwned: false',
  'packagePersistenceOwned: false',
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
    entry.output,
    `appCallsite: '${entry.appCallsite}'`,
    'appOwnsHookInvocation: true',
    'runtimeOwned: false',
    'audioMutating: false',
    'audioNodeConstructing: false',
    'roomLifecycleOwned: false',
    'packagePersistenceOwned: false',
    'visibleUiChangedByAudit: false',
  ]) {
    if (!shapeEntry.includes(marker)) fail(`${key} shape entry missing ${marker}`);
  }
  if (!app.includes(entry.appCallsite)) fail(`App.tsx must still invoke ${entry.appCallsite}`);
  const hook = exists(entry.file) ? read(entry.file) : '';
  for (const marker of entry.stateMarkers) {
    if (!hook.includes(marker)) fail(`${entry.file} missing expected live performance state marker ${marker}`);
  }
}

const hookContents = Object.fromEntries(
  Object.entries(expected).map(([key, entry]) => [key, exists(entry.file) ? read(entry.file) : '']),
);

const checks = {
  packageVersionAtLeast128: /^3\.2\.91\.6\.9\.(12[8-9]|1[3-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  scriptRegistered: Boolean(pkg.scripts?.['xensonar:check-app-live-performance-state-shape-review']),
  suiteRegistersCheck: suite.includes("script: 'xensonar:check-app-live-performance-state-shape-review'"),
  suiteContractRequiresCheck: suiteContract.includes('xensonar:check-app-live-performance-state-shape-review'),
  appStillUsesLiveMasteringInBurstLog:
    app.includes('audioBurstRuntime.appendSnapshot') && app.includes('liveMasterMonitor.main'),
  appStillUsesPerformancePolicyAtAudioSites:
    app.includes('getPolicy: () => performanceCrisisRuntimePolicy.waveStarter') &&
    app.includes('performancePolicy: performanceCrisisRuntimePolicy.particles'),
  appStillKeepsLiveMasteringRuntimeRefsAtHookCallsite:
    app.includes('} = useAppLiveMasteringCallsiteBoundary();'),
  liveMasteringHookStillStateOnly:
    hookContents.liveMasteringUiState.includes('useState(false)') &&
    hookContents.liveMasteringUiState.includes('useRef<AudioEventIntakeState>') &&
    !hookContents.liveMasteringUiState.includes('createOscillator(') &&
    !hookContents.liveMasteringUiState.includes('.connect('),
  crisisHookStillMemoOnly:
    hookContents.performanceCrisisUiPolicyState.includes('const performanceCrisisRuntimePolicy = useMemo(') &&
    hookContents.performanceCrisisUiPolicyState.includes('resolvePerformanceCrisisRuntimePolicy({') &&
    !hookContents.performanceCrisisUiPolicyState.includes('createOscillator(') &&
    !hookContents.performanceCrisisUiPolicyState.includes('.connect('),
  busRefsHookStillRefContainerOnly:
    hookContents.liveMasterBusRuntimeRefs.includes('useRef<GainNode | null>(null)') &&
    hookContents.liveMasterBusRuntimeRefs.includes('useRef<MediaStreamAudioDestinationNode | null>(null)') &&
    !hookContents.liveMasterBusRuntimeRefs.includes('new MediaStreamAudioDestinationNode') &&
    !hookContents.liveMasterBusRuntimeRefs.includes('.connect('),
  noBridgeOrIndexCreated: [
    'src/features/xensonar/performanceCrisis/appLivePerformanceStateBridge.ts',
    'src/features/xensonar/performanceCrisis/useAppLivePerformanceStateBridge.ts',
    'src/features/xensonar/performanceCrisis/appLivePerformanceStateIndex.ts',
    'src/features/xensonar/audio/appLivePerformanceStateBridge.ts',
    'src/features/xensonar/audio/useAppLivePerformanceStateBridge.ts',
  ].every((rel) => !exists(rel)),
  appLineCountStillReasonable: appLines < 7135,
};

const shapeSlice = shape.slice(shape.indexOf('export const APP_LIVE_PERFORMANCE_STATE_SHAPE_AUDIT'));
for (const forbiddenToken of [
  'createOscillator(',
  'createGain(',
  '.connect(',
  '.disconnect(',
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

for (const [name, ok] of Object.entries(checks)) if (!ok) fail(name);

const report = {
  ok: failures.length === 0,
  patch: pkg.version,
  appLines,
  auditedKeys: Object.keys(expected),
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
