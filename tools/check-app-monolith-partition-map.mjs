#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const mapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const appPath = 'src/App.tsx';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const map = exists(mapPath) ? read(mapPath) : '';
const app = exists(appPath) ? read(appPath) : '';
const pkg = JSON.parse(read(pkgPath));
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const appLines = app.split(/\r?\n/).length;

const keys = [
  'resonancePanelProps',
  'resonanceScreenRuntimeAssembly',
  'roomSceneRuntimeBoundary',
  'roomScreenSurfaceMount',
  'globalInputAndMetronome',
  'livePerformanceState',
  'stableAudioLaneRuntime',
  'room3TopologyRuntime',
  'resonanceNexusMainLoop',
];

const forbiddenRuntimeTokens = [
  'createOscillator(',
  'createGain(',
  '.connect(',
  '.start(',
  'requestAnimationFrame(',
  'setInterval(',
  'setTimeout(',
  'new AudioContext',
  'ensureAudioReady()',
  'prewarmAudioRuntime(',
  'audioCtx.resume(',
  'scheduleClassicBassPatternStep(',
  'scheduleExportedDrumConfigStep(',
  'scheduleBassClipStep(',
  'runParticleNexusToneOrchestrator(',
  'playWaveStartSound(',
  'emitWaveStartSound(',
  'startQuantizedCollisionRuntime(',
  'updateRoom3NodeDeviceAudioFrame(',
  'localStorage.',
];

function blockFor(key) {
  const start = map.indexOf(`${key}: {`);
  if (start < 0) return '';
  const nextStarts = keys
    .filter((other) => other !== key)
    .map((other) => map.indexOf(`${other}: {`, start + 1))
    .filter((idx) => idx > start);
  const end = nextStarts.length ? Math.min(...nextStarts) : map.indexOf('} as const satisfies Record', start);
  return map.slice(start, end > start ? end : undefined);
}

const nonOwnershipNeedles = [
  'runtimeOwned: false',
  'audioMutating: false',
  'schedulingOwned: false',
  'packagePersistenceOwned: false',
  'visibleUiChangedByMap: false',
];

const roomSceneStillPrimary = map.includes("strongestNextCandidate: 'roomSceneRuntimeBoundary'") && map.includes("firstSafeMove: 'room-screen-surface-mount-source-readiness-audit'");
const surfaceMountNowPrimary = map.includes("strongestNextCandidate: 'roomScreenSurfaceMount'") && map.includes("firstSafeMove: 'surface-frame-mount-source-builder-probe'");
const livePerformanceNowPrimary = map.includes("strongestNextCandidate: 'livePerformanceState'") && (map.includes("firstSafeMove: 'audio-control-scheduler-runtime-boundary-extracted'") || map.includes("firstSafeMove: 'audio-device-rack-runtime-boundary-extracted'") || map.includes("firstSafeMove: 'audio-readiness-runtime-boundary-extracted'") || map.includes("firstSafeMove: 'drone-graph-routing-boundary-extracted'") || map.includes("firstSafeMove: 'drone-frame-mix-sync-boundary-extracted'"));
const room3TopologyNowPrimary = map.includes("strongestNextCandidate: 'room3TopologyRuntime'") && (map.includes("firstSafeMove: 'myzel-topology-runtime-loop-boundary-extracted'") || map.includes("firstSafeMove: 'room3-body-audio-audited'") || map.includes("firstSafeMove: 'room3-body-audio-runtime-boundary-extracted'"));
const resonanceNexusNowPrimary = map.includes("strongestNextCandidate: 'resonanceNexusMainLoop'") && (map.includes("firstSafeMove: 'resonance-nexus-main-loop-segment-audited'") || map.includes("firstSafeMove: 'resident-traffic-bridge-audited'") || map.includes("firstSafeMove: 'resident-traffic-bridge-io-snapshotted'"));
const globalInputNowPrimary = map.includes("strongestNextCandidate: 'globalInputAndMetronome'") && (map.includes("firstSafeMove: 'global-input-and-metronome-source-readiness-audit'") || map.includes("firstSafeMove: 'global-input-and-metronome-source-builder-probe'") || map.includes("firstSafeMove: 'global-input-low-risk-callsite-normalization'") || map.includes("firstSafeMove: 'resonance-keyboard-command-adapter-shape-audit'") || map.includes("firstSafeMove: 'resonance-keyboard-command-adapter-callsite-probe'") || map.includes("firstSafeMove: 'arrow-motion-raf-shape-audit'") || map.includes("firstSafeMove: 'arrow-motion-raf-callsite-source-probe'") || map.includes("firstSafeMove: 'stable-rhythm-lane-scheduler-shape-audit'") || map.includes("firstSafeMove: 'stable-rhythm-lane-scheduler-callsite-source-probe'") || map.includes("firstSafeMove: 'stable-rhythm-lane-scheduler-action-port-shape-audit'") || map.includes("firstSafeMove: 'stable-rhythm-lane-scheduler-prestep-context-shape-audit'") || map.includes("firstSafeMove: 'stable-rhythm-lane-scheduler-action-port-arg-normalization-or-cache-mutation-seam-audit'") || map.includes("firstSafeMove: 'app-input-metronome-scaffolding-contraction'") || map.includes("firstSafeMove: 'app-global-input-low-risk-hook-extraction'") || map.includes("firstSafeMove: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audit'") || map.includes("firstSafeMove: 'app-resonance-arrow-motion-raf-hook-extraction'") || map.includes("firstSafeMove: 'rhythm-forge-drum-cache-helper-read-generate-return-probe'") || map.includes("firstSafeMove: 'bass-clip-root-binding-helper-read-resolve-return-probe'") || map.includes("firstSafeMove: 'rhythm-forge-bass-cache-helper-read-generate-return-probe'") || map.includes("firstSafeMove: 'psy-bass-cache-helper-read-generate-return-probe'") || map.includes("firstSafeMove: 'audit-shared-rhythmforge-cache-helper-normalization-after-step-action-boundary'") || map.includes("firstSafeMove: 'stable-rhythm-lane-cache-refs-callsite-grouping'") || map.includes("firstSafeMove: 'stable-rhythm-lane-boundary-groove-locals-normalization'") || map.includes("firstSafeMove: 'stable-rhythm-lane-call-plan-registry-vocabulary-probed'") || map.includes("firstSafeMove: 'stable-rhythm-lane-scheduler-loop-probed'") || map.includes("firstSafeMove: 'stable-rhythm-lane-bass-note-action-probed'") || map.includes("firstSafeMove: 'stable-rhythm-lane-hot-path-result-trimmed'") || map.includes("firstSafeMove: 'stable-rhythm-lane-effect-args-contract-probed'") || map.includes("firstSafeMove: 'stable-rhythm-lane-myzel-layer-step-action-probed'") || map.includes("firstSafeMove: 'stable-rhythm-lane-scheduler-effect-hook-probed'") || map.includes("firstSafeMove: 'resonance-keyboard-input-effect-boundary-extracted'"));
const globalInputFirstSafeMove = [
  'stable-rhythm-lane-effect-args-contract-probed',
  'resonance-keyboard-input-effect-boundary-extracted',
  'stable-rhythm-lane-scheduler-effect-hook-probed',
  'stable-rhythm-lane-myzel-layer-step-action-probed',
  'stable-rhythm-lane-hot-path-result-trimmed',
  'stable-rhythm-lane-bass-note-action-probed',
  'stable-rhythm-lane-scheduler-loop-probed',
  'stable-rhythm-lane-call-plan-registry-vocabulary-probed',
  'stable-rhythm-lane-boundary-groove-locals-normalization',
  'stable-rhythm-lane-cache-refs-callsite-grouping',
  'audit-shared-rhythmforge-cache-helper-normalization-after-step-action-boundary',
  'psy-bass-cache-helper-read-generate-return-probe',
  'rhythm-forge-bass-cache-helper-read-generate-return-probe',
  'bass-clip-root-binding-helper-read-resolve-return-probe',
  'rhythm-forge-drum-cache-helper-read-generate-return-probe',
  'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audit',
  'app-input-metronome-scaffolding-contraction',
  'app-resonance-arrow-motion-raf-hook-extraction',
  'app-global-input-low-risk-hook-extraction',
  'stable-rhythm-lane-scheduler-action-port-arg-normalization-or-cache-mutation-seam-audit',
  'stable-rhythm-lane-scheduler-prestep-context-shape-audit',
  'stable-rhythm-lane-scheduler-action-port-shape-audit',
  'stable-rhythm-lane-scheduler-callsite-source-probe',
  'stable-rhythm-lane-scheduler-shape-audit',
  'arrow-motion-raf-callsite-source-probe',
  'arrow-motion-raf-shape-audit',
  'resonance-keyboard-command-adapter-callsite-probe',
  'resonance-keyboard-command-adapter-shape-audit',
  'global-input-low-risk-callsite-normalization',
  'global-input-and-metronome-source-builder-probe',
].find((move) => map.includes(`firstSafeMove: '${move}'`)) ?? 'global-input-and-metronome-source-readiness-audit';

const checks = {
  expectedFilesExist: [mapPath, appPath, pkgPath, suitePath, suiteContractPath].every(exists),
  packageVersionAtLeast160: String(pkg.version || '').startsWith('3.2.91.6.9.'),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-monolith-partition-map'] ===
    'node tools/check-app-monolith-partition-map.mjs',
  mapDeclaresExpectedTypes: [
    'APP_MONOLITH_PARTITION_KEYS',
    'AppMonolithPartitionKey',
    'AppMonolithPartitionStatus',
    'AppMonolithPartitionEntry',
    'APP_MONOLITH_PARTITION_MAP',
    'APP_MONOLITH_PARTITION_NEXT_CUTS',
  ].every((needle) => map.includes(needle)),
  mapCoversAllKeys: keys.every((key) => map.includes(`'${key}'`) && map.includes(`${key}: {`) && map.includes(`key: '${key}'`)),
  mapDeclaresNonOwnershipForEveryEntry: keys.every((key) => {
    const block = blockFor(key);
    return nonOwnershipNeedles.every((needle) => block.includes(needle));
  }),
  mapIsStaticAndImportFree:
    !map.includes('import ') &&
    !map.includes('export function') &&
    forbiddenRuntimeTokens.every((needle) => !map.includes(needle)),
  mapMarksCurrentProgressCorrectly:
    blockFor('resonancePanelProps').includes("status: 'source-normalized'") &&
    blockFor('resonanceScreenRuntimeAssembly').includes("status: 'assembly-extracted'") &&
    blockFor('roomSceneRuntimeBoundary').includes("status: 'source-builder-probed'") &&
    ["status: 'contract-audited'", "status: 'source-readiness-audited'", "status: 'source-builder-probed'"].some((statusNeedle) => blockFor('roomScreenSurfaceMount').includes(statusNeedle)) &&
    ["status: 'contract-audited'", "status: 'source-readiness-audited'", "status: 'source-builder-probed'", "status: 'low-risk-callsite-normalized'", "status: 'adapter-shape-audited'", "status: 'adapter-callsite-probed'", "status: 'arrow-motion-raf-shape-audited'", "status: 'arrow-motion-raf-callsite-source-probed'", "status: 'stable-rhythm-lane-scheduler-shape-audited'", "status: 'stable-rhythm-lane-scheduler-callsite-source-probed'", "status: 'stable-rhythm-lane-scheduler-action-port-shape-audited'", "status: 'stable-rhythm-lane-scheduler-prestep-context-shape-audited'", "status: 'stable-rhythm-lane-scheduler-prestep-context-arg-builder-probed'", "status: 'stable-rhythm-lane-scheduler-action-port-arg-normalization-or-cache-mutation-seam-audited'", "status: 'input-metronome-scaffolding-contracted'", "status: 'global-input-low-risk-hook-extracted'", "status: 'arrow-motion-raf-hook-extracted'", "status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'", "status: 'rhythm-forge-drum-cache-helper-probed'", "status: 'bass-clip-root-binding-helper-probed'", "status: 'rhythm-forge-bass-cache-helper-probed'", "status: 'psy-bass-cache-helper-probed'", "status: 'stable-rhythm-lane-scheduler-step-action-boundary-extracted'", "status: 'rhythm-forge-pattern-cache-shared-helper-probed'", "status: 'stable-rhythm-lane-scheduler-cache-refs-callsite-grouped'", "status: 'stable-rhythm-lane-boundary-groove-locals-normalized'", "status: 'stable-rhythm-lane-read-action-ports-grouped'", "status: 'stable-rhythm-lane-step-voice-values-grouped'", "status: 'stable-rhythm-lane-step-branch-classifiers-probed'", "status: 'stable-rhythm-lane-pattern-cache-commit-probed'", "status: 'stable-rhythm-lane-bass-clip-root-binding-commit-probed'", "status: 'stable-rhythm-lane-boundary-ports-builder-probed'", "status: 'stable-rhythm-lane-step-action-boundary-args-builder-probed'", "status: 'stable-rhythm-lane-step-runners-probed'", "status: 'stable-rhythm-lane-boundary-ports-contract-probed'", "status: 'stable-rhythm-lane-call-plan-registry-vocabulary-probed'", "status: 'stable-rhythm-lane-runner-call-plan-contract-registry-probed'", "status: 'stable-rhythm-lane-runner-call-plan-fixture-probed'", "status: 'stable-rhythm-lane-runner-call-plan-parity-probed'", "status: 'stable-rhythm-lane-bass-note-action-probed'", "status: 'stable-rhythm-lane-scheduler-loop-probed'", "status: 'stable-rhythm-lane-myzel-layer-step-action-probed'", "status: 'stable-rhythm-lane-effect-args-contract-probed'", "status: 'stable-rhythm-lane-hot-path-result-trimmed'", "status: 'resonance-keyboard-input-effect-boundary-extracted'", "status: 'stable-rhythm-lane-scheduler-effect-hook-probed'", "status: 'resonance-keyboard-input-effect-boundary-extracted'"].some((statusNeedle) => blockFor('globalInputAndMetronome').includes(statusNeedle)) &&
    ["status: 'contract-audited'", "status: 'audio-control-scheduler-runtime-boundary-extracted'", "status: 'audio-device-rack-runtime-boundary-extracted'", "status: 'audio-readiness-runtime-boundary-extracted'", "status: 'drone-graph-routing-boundary-extracted'"].some((statusNeedle) => blockFor('livePerformanceState').includes(statusNeedle)) &&
    blockFor('stableAudioLaneRuntime').includes("status: 'runtime-owned-outside-app-refactor'") &&
    ["status: 'readiness-candidate'", "status: 'myzel-topology-runtime-loop-boundary-extracted'", "status: 'room3-body-audio-audited'", "status: 'room3-body-audio-runtime-boundary-extracted'"].some((statusNeedle) => blockFor('room3TopologyRuntime').includes(statusNeedle)) &&
    (blockFor('resonanceNexusMainLoop').includes("status: 'resonance-nexus-main-loop-segment-audited'") || blockFor('resonanceNexusMainLoop').includes("status: 'resident-traffic-bridge-audited'") || blockFor('resonanceNexusMainLoop').includes("status: 'resident-traffic-bridge-io-snapshotted'")),
  mapNamesCurrentStrongestNextCandidate:
    roomSceneStillPrimary || surfaceMountNowPrimary || globalInputNowPrimary || livePerformanceNowPrimary || room3TopologyNowPrimary || resonanceNexusNowPrimary,
  appStillHasExpectedBoundarySeams:
    app.includes('useAppResonancePanelPropsBoundary({') &&
    app.includes('useAppResonanceScreenRuntimeAssembly({') &&
    app.includes('useAppRoomSceneRuntimeBoundary(appRoomSceneRuntimeSource);') &&
    (app.includes('useAppSurfaceFrameRuntimeBoundary({') || app.includes('useAppSurfaceFrameRuntimeBoundary(appSurfaceFrameMountSource)')) &&
    (app.includes('useAppGlobalBrowserInputCallsiteBoundary({') || app.includes('useAppGlobalBrowserInputCallsiteBoundary(appGlobalInputLowRiskCallsites.globalBrowserInput)') || app.includes('useAppGlobalInputLowRiskBrowserBoundary(appGlobalInputLowRiskBoundary);')) &&
    app.includes('useAppDrumConfigCallsiteBoundary({') &&
    app.includes('const room3RuntimeEntry = useRoom3TopologyRuntimeEntry({'),
  appStillKeepsSensitiveRoomSceneInputsVisible:
    app.includes('handoffScene: {') &&
    app.includes('runtimeScene: {') &&
    app.includes('deviceScene: {') &&
    app.includes('residentScene: {') &&
    app.includes('xenpolarScene: {') &&
    app.includes('gameArenaScene: {') &&
    app.includes('spectralForgeEntryScene: {') &&
    app.includes('externalAudioUploadFile: spectralForgeEntryUploadState.spectralForgeExternalAudioFile') &&
    app.includes('onEntryScrollIntentConsumed: (token) => {') &&
    app.includes('installationSharedFieldController,'),
  noFalseNextBridgeIntroduced:
    !exists('src/features/xensonar/layout/useAppMonolithAssembly.ts') &&
    !exists('src/features/xensonar/layout/appMonolithAssembly.ts') &&
    !exists('src/features/xensonar/layout/appRootRuntimeAssembly.ts') &&
    !exists('src/features/xensonar/room3/useAppRoomSceneRuntimeAssembly.ts') &&
    !exists('src/features/xensonar/layout/appSurfaceMountBridge.ts'),
  sanitySuiteIncludesGuard:
    suite.includes('App monolith partition map') &&
    suite.includes('xensonar:check-app-monolith-partition-map'),
  sanitySuiteContractIncludesGuard: suiteContract.includes('xensonar:check-app-monolith-partition-map'),
  appLineCountStableForMapPatch: appLines <= 5625,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);

const report = {
  ok: failures.length === 0,
  appLines,
  partitionMap: {
    keys,
    role: 'static source-code map for the next App.tsx monolith split candidates after the Resonance panel and screen assembly line',
    strongestNextCandidate: resonanceNexusNowPrimary ? 'resonanceNexusMainLoop' : (room3TopologyNowPrimary ? 'room3TopologyRuntime' : (livePerformanceNowPrimary ? 'livePerformanceState' : (globalInputNowPrimary ? 'globalInputAndMetronome' : (surfaceMountNowPrimary ? 'roomScreenSurfaceMount' : 'roomSceneRuntimeBoundary')))),
    firstSafeMove: resonanceNexusNowPrimary ? (map.includes("firstSafeMove: 'resident-traffic-bridge-io-snapshotted'") ? 'resident-traffic-bridge-io-snapshotted' : (map.includes("firstSafeMove: 'resident-traffic-bridge-audited'") ? 'resident-traffic-bridge-audited' : 'resonance-nexus-main-loop-segment-audited')) : (room3TopologyNowPrimary ? (map.includes("firstSafeMove: 'room3-body-audio-runtime-boundary-extracted'") ? 'room3-body-audio-runtime-boundary-extracted' : (map.includes("firstSafeMove: 'room3-body-audio-audited'") ? 'room3-body-audio-audited' : 'myzel-topology-runtime-loop-boundary-extracted')) : (livePerformanceNowPrimary ? (map.includes("firstSafeMove: 'drone-frame-mix-sync-boundary-extracted'") ? 'drone-frame-mix-sync-boundary-extracted' : (map.includes("firstSafeMove: 'drone-graph-routing-boundary-extracted'") ? 'drone-graph-routing-boundary-extracted' : (map.includes("firstSafeMove: 'audio-readiness-runtime-boundary-extracted'") ? 'audio-readiness-runtime-boundary-extracted' : (map.includes("firstSafeMove: 'audio-device-rack-runtime-boundary-extracted'") ? 'audio-device-rack-runtime-boundary-extracted' : 'audio-control-scheduler-runtime-boundary-extracted')))) : (globalInputNowPrimary ? globalInputFirstSafeMove : (surfaceMountNowPrimary ? 'surface-frame-mount-source-builder-probe' : 'room-screen-surface-mount-source-readiness-audit')))),
    runtimeMoved: false,
    audioMoved: false,
    uiChanged: false,
  },
  failures,
};

if (failures.length) {
  console.error('[check-app-monolith-partition-map] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log('[check-app-monolith-partition-map] ok');
console.log(JSON.stringify(report, null, 2));
