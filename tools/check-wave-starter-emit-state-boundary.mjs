#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const statePath = 'src/features/xensonar/audio/waveStarterEmitState.ts';
const app = read(appPath);
const emitBoundaryPath = 'src/features/xensonar/audio/waveStarterEmitAttackBoundary.ts';
const emitBoundary = exists(emitBoundaryPath) ? read(emitBoundaryPath) : '';
const state = exists(statePath) ? read(statePath) : '';
const appLines = app.split(/\r?\n/).length;

const checks = {
  stateFileExists: exists(statePath),
  stateOwnsPitchVolumeGradientContract: state.includes('resolveWaveStarterEmitState')
    && state.includes('resolveWaveStarterPitch({')
    && state.includes('computeWaveTimbreGradientState(')
    && state.includes('computeWaveVolumeGradientMultiplier(')
    && state.includes('microVoiceDemandMul'),
  stateOwnsMicroOrchestrationGainScalars: state.includes('args.options?.microOrchestrated')
    && state.includes('args.options.microGainScale ?? 0.84')
    && state.includes('args.options.microVoiceDemandMul ?? 0.82')
    && state.includes('runtimeVolume * swellScalar * waveVolumeGradientMul * microGainScale'),
  stateDoesNotOwnAudioNodesOrScheduling: !/AudioContext|OscillatorNode|GainNode|getLiveMasterBus|playScheduledTone|playWaveStarterSample|beginTransientEvent|ensureAudioReady|requestWaveStarterLaneAttack/.test(state),
  emitBoundaryImportsEmitStateBoundary: emitBoundary.includes('waveStarterEmitState')
    && emitBoundary.includes('resolveWaveStarterEmitState({'),
  appNoLongerOwnsWavePitchGradientMath: !app.includes('computeWaveTimbreGradientState(')
    && !app.includes('computeWaveVolumeGradientMultiplier(')
    && !app.includes('resolveWaveStarterPitch({')
    && !app.includes('const swellScalar = 1 + waveSoundSwellRef.current * 2.35'),
  emissionDspDelegatedToEmitBoundary: app.includes('emitWaveStarterAttack({')
    && emitBoundary.includes('playWaveStarterSampleSelection({')
    && emitBoundary.includes("args.beginTransientEvent('wave'")
    && emitBoundary.includes('playWaveGradientTone'),
  appLineCountDidNotGrow: appLines < 6479,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  statePath,
  movedScope: [
    'Wellenstarter playback pitch resolution',
    'cursor-X timbre-gradient resolution',
    'cursor-X volume-gradient resolution',
    'swell and micro-orchestrated gain / voice-demand scalars',
  ],
  explicitlyNotMoved: [
    'AudioContext / live-master routing adapter remains App-provided',
    'raw effect-device implementation',
    'raw sample playback implementation',
    'transient voice planning and oscillator DSP',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
