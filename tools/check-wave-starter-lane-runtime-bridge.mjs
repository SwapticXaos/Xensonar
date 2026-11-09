#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const bridgePath = 'src/features/xensonar/audio/waveStarterLaneRuntimeBridge.ts';
const runtimePath = 'src/features/xensonar/audio/waveStarterLaneRuntime.ts';
const app = read(appPath);
const emitBoundaryPath = 'src/features/xensonar/audio/waveStarterEmitAttackBoundary.ts';
const emitBoundary = exists(emitBoundaryPath) ? read(emitBoundaryPath) : '';
const bridge = exists(bridgePath) ? read(bridgePath) : '';
const runtime = read(runtimePath);
const appLines = app.split(/\r?\n/).length;

const checks = {
  bridgeFileExists: exists(bridgePath),
  bridgeOwnsLazyRuntimeConstruction: bridge.includes('getOrCreateWaveStarterLaneRuntime')
    && bridge.includes('createWaveStarterLaneRuntime(deps)')
    && bridge.includes('runtimeRef.current = createWaveStarterLaneRuntime(deps)'),
  bridgeOwnsAttackRequestAdapter: bridge.includes('requestWaveStarterLaneAttack')
    && bridge.includes('getOrCreateWaveStarterLaneRuntime(deps).request(baseFreq, isSector)'),
  bridgeOwnsRuntimeDisposal: bridge.includes('disposeWaveStarterLaneRuntimeRef')
    && bridge.includes('runtimeRef.current?.dispose()')
    && bridge.includes('runtimeRef.current = null'),
  bridgeDoesNotOwnEmissionDsp: !/AudioContext|OscillatorNode|GainNode|getLiveMasterBus|setTargetAtTime|linearRampToValueAtTime|playScheduledTone|playWaveStarterSample/.test(bridge),
  runtimeStillOwnsAdmissionPolicy: runtime.includes('resolveWaveStarterLaneAdmission')
    && runtime.includes('commitWaveStarterLaneAdmission')
    && runtime.includes('latest-intent slot'),
  appImportsBridgeInsteadOfRuntimeFactory: app.includes('waveStarterLaneRuntimeBridge')
    && app.includes('requestWaveStarterLaneAttack')
    && app.includes('disposeWaveStarterLaneRuntimeRef')
    && !app.includes('createWaveStarterLaneRuntime'),
  appBuildsBridgeDepsNearPlayRequest: app.includes('const getWaveStarterLaneRuntimeBridgeDeps = () => ({')
    && app.includes('runtimeRef: waveStarterLaneRuntimeRef')
    && app.includes('getPolicy: () => performanceCrisisRuntimePolicy.waveStarter')
    && app.includes('emitAttack: (baseFreq: number, isSector: boolean, options?: WaveStarterEmitOptions) => emitWaveStartSound(baseFreq, isSector, options)'),
  appPlayWaveStartSoundOnlyRequestsBridge: app.includes('requestWaveStarterLaneAttack(getWaveStarterLaneRuntimeBridgeDeps(), baseFreq, isSector)')
    && !app.includes('.request(baseFreq, isSector);'),
  appDelegatesActualWaveEmissionToEmitBoundary: app.includes('const emitWaveStartSound = (baseFreq: number, isSector: boolean = false, options?: WaveStarterEmitOptions)')
    && app.includes('emitWaveStarterAttack({')
    && emitBoundary.includes('playWaveStarterSampleSelection({')
    && emitBoundary.includes("args.beginTransientEvent('wave'"),
  appLineCountDidNotGrow: appLines < 6484,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  bridgePath,
  movedScope: [
    'lazy WaveStarter lane runtime construction',
    'Wellenstarter request adapter from App.tsx into audio boundary',
    'WaveStarter lane runtime disposal adapter',
  ],
  explicitlyNotMoved: [
    'actual Wellenstarter DSP/emission body, now routed through emit-attack boundary',
    'raw sample playback implementation',
    'transient voice planning',
    'AudioContext/live master bus routing',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
