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

const auditPath = 'validation/contracts/xensonar/performanceCrisis/appLivePerformanceStateDependencyAudit.ts';
const shapeAuditPath = 'validation/contracts/xensonar/performanceCrisis/appLivePerformanceStateShapeAudit.ts';
const appPath = 'src/App.tsx';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const guardUtilsPath = 'tools/xensonar-refactor-guard-utils.mjs';

const hookFiles = {
  liveMasteringUiState: 'src/features/xensonar/audio/useLiveMasteringUiState.ts',
  performanceCrisisUiPolicyState: 'src/features/xensonar/performanceCrisis/usePerformanceCrisisUiPolicyState.ts',
  liveMasterBusRuntimeRefs: 'src/features/xensonar/audio/useLiveMasterBusRuntimeRefs.ts',
};

const allowedValueImports = {
  liveMasteringUiState: ['react', '@/features/soundLibrary/audioEventIntake', '@/features/soundLibrary/audioTapDiagnostics'],
  performanceCrisisUiPolicyState: ['react', './performanceCrisisRuntimePolicies'],
  liveMasterBusRuntimeRefs: ['react'],
};

const allowedTypeImports = {
  liveMasteringUiState: ['@/features/resonance/liveMastering'],
  performanceCrisisUiPolicyState: ['./performanceCrisisTypes'],
  liveMasterBusRuntimeRefs: ['../../resonance/liveMastering', './liveMasterBusRuntimeBoundary'],
};

const requiredAllowedTokens = {
  liveMasteringUiState: [
    'useState(false)',
    'useRef<AudioEventIntakeState>',
    'createDefaultLiveMasterTelemetry',
    'createEmptyAudioEventIntakeState',
    'summarizeAudioTapState',
    'setLiveMasteringStrength',
    'setAudioTapMonitor',
  ],
  performanceCrisisUiPolicyState: [
    'useState<PerformanceCrisisPresetId>("balanced")',
    'const performanceCrisisRuntimePolicy = useMemo(',
    'resolvePerformanceCrisisRuntimePolicy({',
    'setWaveStarterCrisisPresetId',
    'setRootFollowVoiceEngineMode',
    'setParticleQuantizationGrid',
  ],
  liveMasterBusRuntimeRefs: [
    'const finalMixBusRef = useRef<GainNode | null>(null)',
    'const liveMasteringRef = useRef<LiveMasteringSystem | null>(null)',
    'const recordingDestinationWithDrumsRef = useRef<MediaStreamAudioDestinationNode | null>(null)',
    'const liveMasterBusRuntimeRefs = useMemo<LiveMasterBusRuntimeRefs>',
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
  'createDynamicsCompressor(',
  'createWaveShaper(',
  'createMediaStreamDestination(',
  'new AudioContext',
  '.connect(',
  '.disconnect(',
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
      content.includes('window.setTimeout') ||
      content.includes('window.clearTimeout') ||
      content.includes('window.setInterval') ||
      content.includes('requestAnimationFrame('),
    unauthorizedPreventDefault: content.includes('event.preventDefault()'),
    unauthorizedAudioClockRead: content.includes('currentTime') || content.includes('AudioContext'),
    unauthorizedAudioNodeConstructor:
      content.includes('new GainNode') ||
      content.includes('new DynamicsCompressorNode') ||
      content.includes('new WaveShaperNode') ||
      content.includes('new AnalyserNode') ||
      content.includes('new MediaStreamAudioDestinationNode'),
    unauthorizedAudioGraphMutation:
      content.includes('.connect(') ||
      content.includes('.disconnect(') ||
      content.includes('createGain(') ||
      content.includes('createMediaStreamDestination('),
    unexpectedUseMemo:
      key === 'liveMasteringUiState' && content.includes('useMemo('),
    unexpectedUseRef:
      key === 'performanceCrisisUiPolicyState' && content.includes('useRef('),
  }),
});

const dependencyFilesClean = dependencyFindingsClean(dependencyFindings, (finding) =>
  !finding.unauthorizedTimer &&
  !finding.unauthorizedPreventDefault &&
  !finding.unauthorizedAudioClockRead &&
  !finding.unauthorizedAudioNodeConstructor &&
  !finding.unauthorizedAudioGraphMutation &&
  !finding.unexpectedUseMemo &&
  !finding.unexpectedUseRef
);

for (const [key, file] of Object.entries(hookFiles)) {
  if (!exists(file)) fail(`missing hook file ${file}`);
  if (!audit.includes(`${key}: {`)) fail(`dependency audit missing key block ${key}`);
  if (!audit.includes(file)) fail(`dependency audit missing file ${file}`);
  if (!shapeAudit.includes(key)) fail(`shape audit missing key ${key}`);
}

assertAllMarkers(audit, [
  'APP_LIVE_PERFORMANCE_STATE_DEPENDENCY_AUDIT_FORBIDDEN_IMPORT_FAMILIES',
  'APP_LIVE_PERFORMANCE_STATE_DEPENDENCY_AUDIT_FORBIDDEN_MUTATION_TOKENS',
  'APP_LIVE_PERFORMANCE_STATE_DEPENDENCY_AUDIT',
  'APP_LIVE_PERFORMANCE_STATE_DEPENDENCY_AUDIT_PROBE',
  "patch: '3.2.91.6.9.129_app_live_performance_state_dependency_audit'",
  'appStillOwnsAudioBusConstruction: true',
  'appStillOwnsLiveMasterRuntimeAccess: true',
  'mayImportApp: false',
  'mayImportAudioEngine: false',
  'mayImportWorkletRuntime: false',
  'mayImportPackagePersistence: false',
  'mayImportRecordingRuntime: false',
  'mayConstructAudioNodes: false',
  'mayConnectAudioGraph: false',
  'mayScheduleAudio: false',
  'runtimeOwned: false',
  'audioMutating: false',
], fail, 'dependency audit');

assertRequiredTokensByKey(hookText, requiredAllowedTokens, fail, 'allowed state/ref/memo');

const noBridgeOrIndex = [
  'src/features/xensonar/performanceCrisis/appLivePerformanceStateBridge.ts',
  'src/features/xensonar/performanceCrisis/useAppLivePerformanceStateBridge.ts',
  'src/features/xensonar/performanceCrisis/appLivePerformanceStateIndex.ts',
  'src/features/xensonar/audio/appLivePerformanceStateBridge.ts',
  'src/features/xensonar/audio/useAppLivePerformanceStateBridge.ts',
].every((rel) => !exists(rel));

const checks = {
  expectedFilesExist: [auditPath, shapeAuditPath, appPath, pkgPath, suitePath, suiteContractPath, guardUtilsPath, ...Object.values(hookFiles)].every(exists),
  packageVersionAtLeast129: /^3\.2\.91\.6\.9\.(129|1[3-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-live-performance-state-dependency-audit'] ===
    'node tools/check-app-live-performance-state-dependency-audit.mjs',
  dependencyAuditUsesSharedGuardUtils:
    readIfExists('tools/check-app-live-performance-state-dependency-audit.mjs').includes("from './xensonar-refactor-guard-utils.mjs'") &&
    guardUtils.includes('collectDependencyFindings') &&
    guardUtils.includes('dependencyFindingsClean'),
  dependencyAuditFilesMatchAllowlist: dependencyFilesClean,
  auditReferencesShapeAudit:
    audit.includes("from './appLivePerformanceStateShapeAudit'") &&
    audit.includes('APP_LIVE_PERFORMANCE_STATE_SHAPE_AUDIT') &&
    audit.includes('APP_LIVE_PERFORMANCE_STATE_SHAPE_KEYS'),
  appStillOwnsHookInvocation:
    app.includes('} = useAppLiveMasteringCallsiteBoundary();') &&
    app.includes('usePerformanceCrisisUiPolicyState({'),
  appStillOwnsAudioBusRuntimeAccess:
    app.includes('ensureFinalMixBusRuntime(ctx, liveMasterBusRuntimeRefs)') &&
    app.includes('ensureDrumMixBusRuntime(ctx, liveMasterBusRuntimeRefs)') &&
    app.includes('getLiveMasterBusRuntime(ctx, liveMasterBusRuntimeRefs, role)') &&
    app.includes('getLiveMasterEffectBusRuntime(ctx, liveMasterBusRuntimeRefs, effect)') &&
    app.includes('ensureLiveMasterRecordingDestinationRuntime(ctx, liveMasterBusRuntimeRefs, mode)'),
  appStillUsesPerformancePolicyAtAudioSites:
    app.includes('getPolicy: () => performanceCrisisRuntimePolicy.waveStarter') &&
    app.includes('performancePolicy: performanceCrisisRuntimePolicy.particles'),
  noBridgeOrIndexIntroduced: noBridgeOrIndex,
  dependencyGuardListedInSanitySuiteContract:
    suiteContract.includes('xensonar:check-app-live-performance-state-dependency-audit'),
  dependencyGuardListedInRefactorSuiteRunner:
    suite.includes('Live performance state dependency audit') &&
    suite.includes('xensonar:check-app-live-performance-state-dependency-audit'),
  baseLivePerformanceGuardsStillRegistered:
    suite.includes('xensonar:check-app-live-performance-state-refactor') &&
    suite.includes('xensonar:check-app-live-performance-state-shape-review') &&
    suiteContract.includes('xensonar:check-app-live-performance-state-refactor') &&
    suiteContract.includes('xensonar:check-app-live-performance-state-shape-review'),
  appLineCountUnaffectedByDependencyAudit: appLines <= 5595,
};

for (const failure of boolChecksToFailures(checks)) fail(failure);

const report = {
  ok: failures.length === 0,
  appLines,
  version: pkg.version,
  auditedKeys: Object.keys(hookFiles),
  dependencyAudit: {
    role: 'dependency audit for live performance UI/policy/ref hooks without moving App.tsx hook invocation',
    dependencyFindings,
    dependencyFilesClean,
    sharedGuardUtils: 'Import/export/dynamic-import extraction and dependency finding collection are delegated to xensonar-refactor-guard-utils.mjs.',
    allowedSpecialCases: {
      liveMasteringUiState: 'useState/useRef and monitor summarizers are allowed; no audio graph mutation is allowed',
      performanceCrisisUiPolicyState: 'useState/useMemo and resolved runtime-policy memo are allowed; audio sites still only read the policy outside the hook',
      liveMasterBusRuntimeRefs: 'null-initialized WebAudio node refs are allowed; construction/connect/disconnect remain outside',
    },
  },
  explicitlyNotMoved: [
    'No live performance hook callsite was moved out of App.tsx',
    'No live-master DSP graph construction or bus connection was moved',
    'No Root-Follow, WaveStarter, Partikel, package, recording, Room III, or visible UI behavior changed',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
