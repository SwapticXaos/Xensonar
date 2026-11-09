#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const app = read('src/App.tsx');
const liveHookPath = 'src/features/xensonar/audio/useLiveMasteringUiState.ts';
const crisisHookPath = 'src/features/xensonar/performanceCrisis/usePerformanceCrisisUiPolicyState.ts';
const liveBusRefsHookPath = 'src/features/xensonar/audio/useLiveMasterBusRuntimeRefs.ts';
const liveCallsiteBoundaryPath = 'src/features/xensonar/audio/useAppLiveMasteringCallsiteBoundary.ts';
const liveHook = read(liveHookPath);
const crisisHook = read(crisisHookPath);
const liveBusRefsHook = exists(liveBusRefsHookPath) ? read(liveBusRefsHookPath) : '';
const liveCallsiteBoundary = exists(liveCallsiteBoundaryPath) ? read(liveCallsiteBoundaryPath) : '';

const protectedFiles = [
  'src/features/resonance/refactorTopologyLegacyAudio.ts',
  'src/features/resonance/refactorTopologyNodeAura.ts',
  'src/features/resonance/refactorTopologyLegacyAudioFrame.ts',
  'src/features/resonance/refactorTopologyLegacyAudioGraph.ts',
  'src/features/xensonar/room3/room3NodeDeviceAudioPath.ts',
  'src/features/xensonar/audio/waveStarterMicroOrchestrator.ts',
  'tools/prove-package-complete-musical-payload-roundtrip.mjs',
];

const forbiddenAppMarkers = [
  'createEmptyAudioEventIntakeState',
  'type AudioEventIntakeState',
  'type AudioTapMonitorSummary',
  'type LiveMasterTelemetry',
  'resolvePerformanceCrisisRuntimePolicy',
  'PerformanceCrisisPresetId',
];

const liveHookMarkers = [
  'createDefaultLiveMasterTelemetry',
  'createEmptyAudioEventIntakeState',
  'summarizeAudioTapState',
  'audioEventIntakeMonitorRef',
  'setLiveMasteringStrength',
  'setAudioTapMonitor',
];

const crisisHookMarkers = [
  'resolvePerformanceCrisisRuntimePolicy',
  'PerformanceCrisisPresetId',
  'performanceCrisisRuntimePolicy',
  'setWaveStarterCrisisPresetId',
];

const appLines = app.split(/\r?\n/).length;
const checks = {
  liveHookExists: exists(liveHookPath),
  crisisHookExists: exists(crisisHookPath),
  appUsesLiveHook: app.includes('useLiveMasteringUiState()') || (app.includes('useAppLiveMasteringCallsiteBoundary()') && liveCallsiteBoundary.includes('useLiveMasteringUiState();')),
  appUsesCrisisHook: app.includes('usePerformanceCrisisUiPolicyState({') || app.includes('usePerformanceCrisisUiPolicyState()'),
  liveHookOwnsMonitorDefaults: liveHookMarkers.every((marker) => liveHook.includes(marker)),
  crisisHookOwnsPolicyMemo: crisisHookMarkers.every((marker) => crisisHook.includes(marker)),
  appNoLongerOwnsMovedTypesOrFactories: forbiddenAppMarkers.every((marker) => !app.includes(marker)),
  liveRuntimeRefsStillHaveExplicitOwner: (app.includes('const liveMasteringRef = useRef<LiveMasteringSystem | null>(null)') && app.includes('const liveMasterBusRuntimeRefs')) || ((app.includes('useLiveMasterBusRuntimeRefs()') || app.includes('useAppLiveMasteringCallsiteBoundary()')) && liveBusRefsHook.includes('const liveMasteringRef = useRef<LiveMasteringSystem | null>(null)') && liveBusRefsHook.includes('liveMasterBusRuntimeRefs')), 
  appStillUsesMonitoringInBurstLog: app.includes('audioBurstRuntime.appendSnapshot') && app.includes('liveMasterMonitor.main'),
  appStillUsesPerformancePolicyAtAudioSites: app.includes('getPolicy: () => performanceCrisisRuntimePolicy.waveStarter') && app.includes('performancePolicy: performanceCrisisRuntimePolicy.particles'),
  packageRoundtripProofStillEmitsPackageJson: read('tools/prove-package-complete-musical-payload-roundtrip.mjs').includes('--package-out'),
  protectedFilesPresent: protectedFiles.every(exists),
  room3AudioMarkersPresent: read('src/features/resonance/refactorTopologyLegacyAudio.ts').includes('nodeColorOsc') && read('src/features/resonance/refactorTopologyNodeAura.ts').includes('getNodeAuraSignature'),
  appLineCountUnder7135: appLines < 7135,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  liveHookLines: liveHook.split(/\r?\n/).length,
  crisisHookLines: crisisHook.split(/\r?\n/).length,
  liveBusRefsHookLines: liveBusRefsHook ? liveBusRefsHook.split(/\r?\n/).length : 0,
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
