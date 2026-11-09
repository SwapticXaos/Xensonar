#!/usr/bin/env node
import fs from 'node:fs';
const files = {
  hooks: 'src/features/xensonar/audio/waveStarterFailoverRealTestHarnessHooks.ts',
  ui: 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx',
  packageJson: 'package.json',
};
for (const rel of Object.values(files)) if (!fs.existsSync(rel)) throw new Error(`${rel} missing`);
const read = (rel) => fs.readFileSync(rel, 'utf8');
const hooks = read(files.hooks);
for (const token of [
  'xensonar-wave-starter-failover-real-test-harness-hooks',
  '__XENSONAR_WAVE_STARTER_FAILOVER_REAL_TEST_HARNESS_HOOKS__',
  'synth-only-failover-pressure',
  'sample-token-failover-pressure',
  'mixed-synth-sample-pressure',
  'late-window-pressure',
  'worklet-pool-saturation',
  'root-follow-wave-starter-pressure',
  'manualHarnessOnly: true',
  'doesNotTriggerAudio: true',
  'doesNotMutateRuntimePolicy: true',
  'buildWaveStarterFailoverRealTestHarnessHooksReport',
  'formatWaveStarterFailoverRealTestHarnessHooksUiValue',
]) if (!hooks.includes(token)) throw new Error(`harness hooks missing ${token}`);
const ui = read(files.ui);
for (const token of [
  'buildWaveStarterFailoverRealTestHarnessHooksReport',
  'waveStarterFailoverRealTestHarnessHooksReport',
  'Wellenstarter Test-Hooks',
  'formatWaveStarterFailoverRealTestHarnessHooksUiValue',
]) if (!ui.includes(token)) throw new Error(`panel missing ${token}`);
const pkg = read(files.packageJson);
if (!pkg.includes('"xensonar:check-wave-starter-failover-real-test-harness-hooks"')) throw new Error('package script missing harness check');
if (!/"version": "3\.2\.91\.6\.9\.(?:176|177|178)"/.test(pkg)) throw new Error('package version must advance to 9.176');
console.log('wave-starter failover real test harness hooks OK');
