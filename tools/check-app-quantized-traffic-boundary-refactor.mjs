#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const app = read('src/App.tsx');
const hookPath = 'src/features/xensonar/audioTraffic/useQuantizedTrafficBoundary.ts';
const boundaryPath = 'src/features/xensonar/audioTraffic/quantizedTrafficQueueBoundary.ts';
const actionPath = 'src/features/xensonar/rooms/quantizeGridActions.ts';
const hook = exists(hookPath) ? read(hookPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const action = exists(actionPath) ? read(actionPath) : '';
const panelBoundaryPath = 'src/features/xensonar/layout/useAppResonancePanelPropsBoundary.ts';
const panelBoundary = exists(panelBoundaryPath) ? read(panelBoundaryPath) : '';
const particleLanePath = 'src/features/xensonar/rooms/resonanceParticleSimulationLane.ts';
const particleLane = exists(particleLanePath) ? read(particleLanePath) : '';
const appLines = app.split(/\r?\n/).length;

const protectedFiles = [
  'src/features/resonance/refactorTopologyLegacyAudio.ts',
  'src/features/resonance/refactorTopologyNodeAura.ts',
  'src/features/resonance/refactorTopologyLegacyAudioFrame.ts',
  'src/features/resonance/refactorTopologyLegacyAudioGraph.ts',
  'src/features/xensonar/room3/room3NodeDeviceAudioPath.ts',
  'src/features/xensonar/audio/waveStarterMicroOrchestrator.ts',
  'src/features/xensonar/audio/waveStarterLaneRuntime.ts',
  'src/features/xensonar/material/loopLaneUiState.ts',
  'tools/prove-package-complete-musical-payload-roundtrip.mjs',
];

const checks = {
  hookFileExists: exists(hookPath),
  appUsesQuantizedTrafficBoundaryHook: app.includes('} = useQuantizedTrafficBoundary({') && app.includes('trafficRef: audioTrafficForensicsRef'),
  appNoLongerCreatesQuantizeAnchorDirectly: !app.includes('const quantizeAnchorRef = useRef<number | null>(null);'),
  appNoLongerCreatesWaveCollisionQueueDirectly: !app.includes('const waveCollisionQueueRef = useRef<QueuedCollisionTrigger[]>([]);'),
  appNoLongerCreatesWaveOvertoneArpQueueDirectly: !app.includes('const waveOvertoneArpQueueRef = useRef<WaveOvertoneArpQueueEntry[]>([]);'),
  appNoLongerBuildsLocalTrafficRefsObject: !app.includes('const quantizedTrafficQueueRefs = {\n    quantizeAnchorRef,'),
  appStillStartsQuantizedCollisionRuntime: app.includes('startQuantizedCollisionRuntime({') && app.includes('refs: quantizedTrafficQueueRefs'),
  appStillStartsWaveOvertoneArpRuntime: app.includes('startWaveOvertoneArpRuntime({') && app.includes('waveOvertoneArpQueueRef'),
  appStillQueuesResidentWaveEvents: (app.includes('mergeQueuedCollisionTrigger(waveCollisionQueueRef.current') && app.includes('targetKind: "resident"')) || (particleLane.includes('audioIntentCandidates.push({') && particleLane.includes('agent.lastHitAudioTimeSec = audioNowSec();')),
  appStillPassesTrafficRefsToControlProps: (app.includes('resonanceControl: {') && app.includes('trafficRefs: { nexusRefs, quantizeAnchorRef, waveCollisionQueueRef, particleQuantizeSeenRef, particleQuantizeTimerRef }') && panelBoundary.includes('buildResonanceControlProps(')),
  hookOwnsAllTrafficRefs: [
    'quantizeAnchorRef = useRef<number | null>(null)',
    'waveCollisionQueueRef = useRef<QueuedCollisionTrigger[]>([])',
    'particleQuantizeSeenRef = useRef<number[]>([])',
    'waveOvertoneArpQueueRef = useRef<WaveOvertoneArpQueueEntry[]>([])',
    'waveOvertoneArpTimerRef = useRef<number | null>(null)',
  ].every((needle) => hook.includes(needle)),
  hookExportsSharedQueueRefs: hook.includes('quantizedTrafficQueueRefs') && hook.includes('waveOvertoneArpTrafficRefs'),
  hookUsesSharedBoundaryReset: hook.includes('resetQuantizedTrafficQueuesBoundary(quantizedTrafficQueueRefs)'),
  hookKeepsTempoAndGridResetFactories: hook.includes('createGridTempoBpmWithTrafficReset') && hook.includes('createQuantizeGridModeWithTrafficReset'),
  hookOwnsCycleQuantizeGridBridge: hook.includes('cycleQuantizeGridAction({') && hook.includes('refs: quantizedTrafficQueueRefs'),
  boundaryDefinesSharedContract: boundary.includes('export type QuantizedTrafficQueueBoundaryRefs') && boundary.includes('resetQuantizedTrafficQueuesBoundary'),
  quantizeGridActionUsesSharedBoundary: action.includes('type ContractCycleQuantizeGridArgs') && action.includes('resetQuantizedTrafficQueuesBoundary(refs)') && !action.includes('clearQuantizedTrafficFlushInterval({ particleQuantizeTimerRef }'),
  appStillOwnsMusicalEmissionBodies: app.includes('const enqueueWaveOvertoneArp = (') && app.includes('const playWaveStartSound = ('),
  appStillOwnsRootFollowAndMaterialRuntimes: app.includes('useRootFollowPlaybackRuntimeBoundary') && app.includes('useMaterialLoopPlaybackRuntimeBoundary'),
  protectedFilesPresent: protectedFiles.every(exists),
  packageRoundtripProofStillEmitsPackageJson: read('tools/prove-package-complete-musical-payload-roundtrip.mjs').includes('--package-out'),
  appLineCountUnder7045: appLines < 7045,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  hookLines: hook.split(/\r?\n/).length,
  movedScope: [
    'quantized traffic queue refs',
    'traffic reset contract bundle',
    'tempo/grid setters with queue reset',
    'quantize-grid cycle reset bridge',
    'wave-overtone-arp traffic refs bundle',
  ],
  explicitlyNotMoved: [
    'Wellenstarter sound emission',
    'wave overtone arp enqueue planning and tone payload',
    'resident wave event production',
    'Root-Follow runtime',
    'Materialspur runtime',
    'Room III / Myzel node-device audio',
    'workspace package musical payload serialization',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
