#!/usr/bin/env node
import fs from 'node:fs';
const files = {
  shadow: 'src/features/xensonar/audio/waveStarterFailoverPolicyShadowAb.ts',
  late: 'src/features/xensonar/audio/waveStarterFailoverLateWindowTuningProbe.ts',
  policy: 'src/features/xensonar/audio/waveStarterFailoverDefaultPolicyCandidate.ts',
  ui: 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx',
  packageJson: 'package.json',
};
for (const rel of Object.values(files)) if (!fs.existsSync(rel)) throw new Error(`${rel} missing`);
const read = (rel) => fs.readFileSync(rel, 'utf8');
const shadow = read(files.shadow);
for (const token of [
  'xensonar-wave-starter-failover-policy-shadow-ab',
  '__XENSONAR_WAVE_STARTER_FAILOVER_POLICY_SHADOW_AB__',
  'current-observed',
  'strict-late-window-shadow',
  'balanced-late-window-shadow',
  'token-bound-mixed-shadow',
  'shadowOnly: true',
  'doesNotMutateRuntimePolicy: true',
  'doesNotEnablePrimaryReplacement: true',
  'doesNotEnableSampleToSynthFallback: true',
  'sampleTokenRequired: true',
  'buildWaveStarterFailoverPolicyShadowAbReport',
  'formatWaveStarterFailoverPolicyShadowAbUiValue',
]) if (!shadow.includes(token)) throw new Error(`shadow A/B missing ${token}`);
const ui = read(files.ui);
for (const token of [
  'buildWaveStarterFailoverPolicyShadowAbReport',
  'waveStarterFailoverPolicyShadowAbReport',
  'Wellenstarter Shadow-A/B',
  '__XENSONAR_WAVE_STARTER_FAILOVER_POLICY_SHADOW_AB__',
]) if (!ui.includes(token)) throw new Error(`panel missing ${token}`);
const pkg = read(files.packageJson);
if (!pkg.includes('"xensonar:check-wave-starter-failover-policy-shadow-ab"')) throw new Error('package script missing');
if (!/"version": "3\.2\.91\.6\.9\.(?:174|175|176|177|178)"/.test(pkg)) throw new Error('package version must be at least 9.174 for shadow A/B');
console.log('wave-starter failover policy shadow A/B OK');
