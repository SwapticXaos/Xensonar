#!/usr/bin/env node
import fs from 'node:fs';
const files = {
  readiness: 'src/features/xensonar/audio/waveStarterFailoverPolicyReadinessMatrix.ts',
  ui: 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx',
  packageJson: 'package.json',
};
for (const rel of Object.values(files)) if (!fs.existsSync(rel)) throw new Error(`${rel} missing`);
const read = (rel) => fs.readFileSync(rel, 'utf8');
const readiness = read(files.readiness);
for (const token of [
  'xensonar-wave-starter-failover-policy-readiness-matrix',
  '__XENSONAR_WAVE_STARTER_FAILOVER_POLICY_READINESS_MATRIX__',
  'safeToEnableRuntimePolicy: false',
  'doesNotMutateRuntimePolicy: true',
  'doesNotEnablePrimaryReplacement: true',
  'doesNotEnableSampleToSynthFallback: true',
  'legacyPrimaryPreserved: true',
  'sample-parity-fx-gap',
  'late-window-not-calibrated',
  'buildWaveStarterFailoverPolicyReadinessMatrixReport',
  'formatWaveStarterFailoverPolicyReadinessMatrixUiValue',
]) if (!readiness.includes(token)) throw new Error(`readiness missing ${token}`);
const ui = read(files.ui);
for (const token of [
  'buildWaveStarterFailoverPolicyReadinessMatrixReport',
  'waveStarterFailoverPolicyReadinessMatrixReport',
  'Wellenstarter Readiness',
  'formatWaveStarterFailoverPolicyReadinessMatrixUiValue',
]) if (!ui.includes(token)) throw new Error(`panel missing ${token}`);
const pkg = read(files.packageJson);
if (!pkg.includes('"xensonar:check-wave-starter-failover-policy-readiness-matrix"')) throw new Error('package script missing readiness check');
if (!/"version": "3\.2\.91\.6\.9\.(?:176|177|178)"/.test(pkg)) throw new Error('package version must advance to 9.176');
console.log('wave-starter failover policy readiness matrix OK');
