#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const planPath = 'src/features/xensonar/audio/waveStarterPresetTonePlan.ts';
const app = read(appPath);
const plan = exists(planPath) ? read(planPath) : '';
const orchestratorPath = 'src/features/xensonar/audio/waveStarterHarmonicPlaybackOrchestrator.ts';
const orchestrator = exists(orchestratorPath) ? read(orchestratorPath) : '';
const emitBoundaryPath = 'src/features/xensonar/audio/waveStarterEmitAttackBoundary.ts';
const emitBoundary = exists(emitBoundaryPath) ? read(emitBoundaryPath) : '';
const executionHost = orchestrator || emitBoundary || app;
const appLines = app.split(/\r?\n/).length;

const presetIds = [
  'glass_ping',
  'soft_pluck',
  'bell_tone',
  'clean_pluck',
  'deep_sub',
  'vibrato_glass',
  'tape_halo',
  'membrane_thump',
  'reed_sigh',
  'spark_chime',
  'bowed_glass',
  'kalimba_tine',
  'gong_wash',
  'chime_spray',
  'dust_pulse',
];

const checks = {
  planFileExists: exists(planPath),
  planOwnsPresetToneRecipe: plan.includes('buildWaveStarterPresetToneSpecs')
    && plan.includes('WaveStarterPresetToneSpec')
    && plan.includes('freqMul')
    && plan.includes('prominence'),
  planContainsEveryWavePreset: presetIds.every((preset) => plan.includes(`case '${preset}'`)),
  planIsPureRecipeBoundary: !/AudioContext|AudioNode|OscillatorNode|GainNode|playWaveGradientTone|playScheduledTone|beginTransientEvent|playWaveStarterSample|getLiveMasterBus|triggerRoom3BodyExciter|nexusParamsRef|audioCtxRef/.test(plan),
  emitBoundaryDelegatesToTonePlanBoundary: emitBoundary.includes('playWaveStarterHarmonicPlaybackPlans({')
    && executionHost.includes('buildWaveStarterPresetToneSpecs(preset, { isSector })'),
  appNoLongerOwnsPresetIfElseRecipe: !/resolvedWavePreset\s*===\s*"glass_ping"/.test(app)
    && !/resolvedWavePreset\s*===\s*"tape_halo"/.test(app)
    && !/resolvedWavePreset\s*===\s*"dust_pulse"/.test(app),
  emitBoundaryKeepsWaveEmissionOrchestrationForLaterSlice: emitBoundary.includes('args.beginTransientEvent("wave"')
    && emitBoundary.includes('triggerBodyExciter: (profile, bodyFreq, gain, options) => args.triggerBodyExciter(')
    && emitBoundary.includes('acquireTransientPlaybackLease(args.transientRuntime, wavePlan, 0.45)')
    && emitBoundary.includes('enqueueOvertoneArp: args.enqueueOvertoneArp'),
  laterWaveStarterBoundariesRemainPresent: exists('src/features/xensonar/audio/waveStarterGradientTonePlayback.ts')
    && exists('src/features/xensonar/audio/waveStarterOvertonePlaybackPlan.ts')
    && exists('src/features/xensonar/audio/waveStarterSwellReinforcementPlan.ts')
    && exists('src/features/xensonar/audio/waveStarterBodyExciterPlan.ts')
    && executionHost.includes('resolveWaveStarterSwellReinforcementPlan({')
    && executionHost.includes('resolveWaveStarterBodyExciterPlan({'),
  appLineCountDidNotGrow: appLines < 6476,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  planPath,
  movedScope: [
    'Wellenstarter preset-to-tone recipe table',
    'per-preset tone multipliers, delays, durations, waveforms, resonance/cutoff/prominence',
  ],
  explicitlyNotMoved: [
    'AudioContext / node creation',
    'sample playback dispatch',
    'transient voice planning',
    'final Wellenstarter emission orchestration',
  ],
  laterMovedScope: [
    'Gradient tone playback, graph and lifecycle boundaries',
    'overtone direct/hybrid playback plan',
    'Room III body exciter plan',
    'swell reinforcement tail plan',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
