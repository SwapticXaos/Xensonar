#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (relative) => fs.readFileSync(path.resolve(root, relative), 'utf8');
const exists = (relative) => fs.existsSync(path.resolve(root, relative));
const fail = (message) => {
  console.error(`[audio-crisis-candidate-matrix-runner] FAIL: ${message}`);
  process.exit(1);
};

const matrixPath = 'diagnostics/audio_crisis_matrix/crisis_candidate_matrix.json';
if (!exists(matrixPath)) fail(`missing ${matrixPath}`);
const matrix = JSON.parse(read(matrixPath));
if (!Array.isArray(matrix) || matrix.length < 8) fail('candidate matrix must contain the curated crisis candidates');
const ids = new Set(matrix.map((candidate) => candidate.id));
for (const required of [
  'C1_balanced_shadow_default_candidate',
  'C2_pressure_safe_shadow_browser_safe',
  'C4_studio_density_shadow_musical_outlier',
  'W1_balanced_worklet_granular_pilot',
  'W3_balanced_primary_candidate_risky_future',
]) {
  if (!ids.has(required)) fail(`matrix missing ${required}`);
}
for (const candidate of matrix) {
  for (const key of ['id', 'stylePreset', 'particlePreset', 'waveStarterPreset', 'rootFollowVoiceEngineMode']) {
    if (!candidate[key]) fail(`candidate ${candidate.id ?? '<missing-id>'} missing ${key}`);
  }
}

const runner = read('tools/run-audio-crisis-candidate-matrix.mjs');
for (const needle of [
  '--browser',
  '--from-logs',
  '--candidates',
  '--scenarios',
  'collectSelectionArgs',
  'candidate_run_plan.json',
  'Keep raw_runs.json reserved for real/imported browser payloads.',
  'summary_by_candidate.csv',
  '__xensonarPerformanceCrisisHarness',
  '__xensonarBurstStressHarness',
]) {
  if (!runner.includes(needle)) fail(`runner missing ${needle}`);
}

const burstRuntime = read('src/features/xensonar/diagnostics/burstDiagnosticsRuntime.ts');
for (const needle of [
  '__xensonarBurstStressHarness',
  'createAudioBurstRecorderLogPayload',
  'exportPayload',
  'setScenario',
]) {
  if (!burstRuntime.includes(needle)) fail(`burst runtime bridge missing ${needle}`);
}

const policyState = read('src/features/xensonar/performanceCrisis/usePerformanceCrisisUiPolicyState.ts');
for (const needle of [
  '__xensonarPerformanceCrisisHarness',
  'applyCandidate',
  'rootFollowVoiceEngineMode',
  'particleLoadReductionMode',
]) {
  if (!policyState.includes(needle)) fail(`performance crisis bridge missing ${needle}`);
}

const recorder = read('src/features/soundLibrary/audioBurstRecorder.ts');
if (!recorder.includes('createAudioBurstRecorderLogPayload')) fail('audioBurstRecorder does not expose a non-download payload builder');

console.log('[audio-crisis-candidate-matrix-runner] OK · Kandidatenmatrix, Browser-Hooks und Auswertungsrunner sind verdrahtet.');
