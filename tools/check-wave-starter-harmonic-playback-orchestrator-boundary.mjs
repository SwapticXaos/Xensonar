#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const app = read('src/App.tsx');
const emitBoundaryPath = 'src/features/xensonar/audio/waveStarterEmitAttackBoundary.ts';
const emitBoundary = fs.existsSync(path.join(root, emitBoundaryPath)) ? read(emitBoundaryPath) : '';
const orchestratorPath = 'src/features/xensonar/audio/waveStarterHarmonicPlaybackOrchestrator.ts';
const orchestrator = fs.existsSync(path.join(root, orchestratorPath)) ? read(orchestratorPath) : '';

const failures = [];
const mustContain = [
  [orchestrator, 'export function playWaveStarterHarmonicPlaybackPlans', 'harmonic playback orchestrator export missing'],
  [orchestrator, 'resolveWaveStarterBodyExciterPlan({', 'orchestrator must execute body exciter plan'],
  [orchestrator, 'buildWaveStarterPresetToneSpecs(preset, { isSector })', 'orchestrator must execute preset tone plan'],
  [orchestrator, 'resolveWaveStarterOvertonePlaybackPlan({', 'orchestrator must execute overtone plan'],
  [orchestrator, 'resolveWaveStarterSwellReinforcementPlan({', 'orchestrator must execute swell reinforcement plan'],
  [orchestrator, 'callbacks.playGradientTone(tone)', 'orchestrator must use callback for gradient tone playback'],
  [orchestrator, 'callbacks.triggerBodyExciter(', 'orchestrator must use callback for body exciter playback'],
  [orchestrator, 'callbacks.enqueueOvertoneArp(', 'orchestrator must use callback for ARP runtime enqueue'],
  [emitBoundary, 'playWaveStarterHarmonicPlaybackPlans({', 'emit boundary must delegate harmonic playback plans'],
  [emitBoundary, 'triggerBodyExciter: (profile, bodyFreq, gain, options) => args.triggerBodyExciter(', 'emit boundary must provide the budgeted body exciter callback'],
  [emitBoundary, 'acquireTransientPlaybackLease(args.transientRuntime, wavePlan, 0.45)', 'body sources must use the wave event lease'],
  [emitBoundary, 'enqueueOvertoneArp: args.enqueueOvertoneArp', 'emit boundary must provide ARP enqueue callback'],
];
for (const [content, needle, message] of mustContain) {
  if (!content.includes(needle)) failures.push(message);
}

const corePlaybackIndex = orchestrator.indexOf('for (const tone of buildWaveStarterPresetToneSpecs');
const admittedBodyGateIndex = orchestrator.lastIndexOf('if (startedToneCount > 0)');
const bodyPlaybackIndex = orchestrator.indexOf('callbacks.triggerBodyExciter(', admittedBodyGateIndex);
if (corePlaybackIndex < 0 || admittedBodyGateIndex < corePlaybackIndex || bodyPlaybackIndex < admittedBodyGateIndex) {
  failures.push('resonant body must follow at least one successfully admitted core tone');
}

const forbiddenInOrchestrator = [
  'AudioContext',
  'AudioNode',
  'audioCtxRef',
  'nexusParamsRef',
  'beginTransientEvent(',
  'playScheduledTone(',
  'playWaveStarterSampleSelection(',
  'getLiveMasterBus(',
];
for (const needle of forbiddenInOrchestrator) {
  if (orchestrator.includes(needle)) failures.push(`orchestrator owns runtime/audio context detail: ${needle}`);
}

const appForbidden = [
  'resolveWaveStarterBodyExciterPlan({',
  'resolveWaveStarterOvertonePlaybackPlan({',
  'resolveWaveStarterSwellReinforcementPlan({',
  'buildWaveStarterPresetToneSpecs(resolvedWavePreset, { isSector })',
];
for (const needle of appForbidden) {
  if (app.includes(needle)) failures.push(`App.tsx still owns harmonic plan execution detail: ${needle}`);
}

if (failures.length) {
  console.error('[wave-starter-harmonic-playback-orchestrator-boundary] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[wave-starter-harmonic-playback-orchestrator-boundary] OK');
