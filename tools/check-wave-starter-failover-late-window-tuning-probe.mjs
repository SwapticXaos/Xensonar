#!/usr/bin/env node
import fs from 'node:fs';
const files = {
  probe: 'src/features/xensonar/audio/waveStarterFailoverLateWindowTuningProbe.ts',
  gate: 'src/features/xensonar/audio/waveStarterFailoverDecisionGate.ts',
  ledger: 'src/features/xensonar/audio/waveStarterFailoverEventLedger.ts',
  ui: 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx',
  packageJson: 'package.json',
};
for (const rel of Object.values(files)) if (!fs.existsSync(rel)) throw new Error(`${rel} missing`);
const read = (rel) => fs.readFileSync(rel, 'utf8');
const probe = read(files.probe);
for (const token of [
  'xensonar-wave-starter-failover-late-window-tuning-probe',
  '__XENSONAR_WAVE_STARTER_FAILOVER_LATE_WINDOW_TUNING_PROBE__',
  'strict-24ms',
  'balanced-48ms',
  'current-gate',
  'loose-96ms',
  'comparesOnly: true',
  'doesNotChangeRuntimePolicy: true',
  'doesNotChangeGateRuntime: true',
  'forbidsLateRhythmicReplay: true',
  'buildWaveStarterFailoverLateWindowTuningProbeReport',
  'formatWaveStarterFailoverLateWindowTuningProbeUiValue',
]) if (!probe.includes(token)) throw new Error(`late-window probe missing ${token}`);
const ui = read(files.ui);
for (const token of [
  'buildWaveStarterFailoverLateWindowTuningProbeReport',
  'waveStarterFailoverLateWindowTuningProbeReport',
  'Wellenstarter Late-Window',
  '__XENSONAR_WAVE_STARTER_FAILOVER_LATE_WINDOW_TUNING_PROBE__',
]) if (!ui.includes(token)) throw new Error(`panel missing ${token}`);
const pkg = read(files.packageJson);
if (!pkg.includes('"xensonar:check-wave-starter-failover-late-window-tuning-probe"')) throw new Error('package script missing');
if (!/"version": "3\.2\.91\.6\.9\.(?:173|174|175|176|177|178)"/.test(pkg)) throw new Error('package version must be at least 9.173 for late-window probe');
console.log('wave-starter failover late-window tuning probe OK');
