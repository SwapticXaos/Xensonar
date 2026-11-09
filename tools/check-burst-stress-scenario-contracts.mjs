#!/usr/bin/env node
import fs from 'node:fs';

const requiredFiles = [
  'src/features/xensonar/diagnostics/burstStressScenarioContracts.ts',
  'src/features/xensonar/audioTraffic/audioTrafficForensics.ts',
  'src/features/xensonar/rooms/ResonanceBurstDiagnosticsPanel.tsx',
  'src/features/xensonar/diagnostics/burstDiagnosticsRuntime.ts',
  'tools/analyze-xensonar-burst-log.mjs',
];

const read = (file) => fs.readFileSync(file, 'utf8');
const fail = (message) => {
  console.error(`[burst-stress-scenario-contracts] ${message}`);
  process.exit(1);
};

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) fail(`missing ${file}`);
}

const contracts = read('src/features/xensonar/diagnostics/burstStressScenarioContracts.ts');
const audioTraffic = read('src/features/xensonar/audioTraffic/audioTrafficForensics.ts');
const panel = read('src/features/xensonar/rooms/ResonanceBurstDiagnosticsPanel.tsx');
const runtime = read('src/features/xensonar/diagnostics/burstDiagnosticsRuntime.ts');
const analyzer = read('tools/analyze-xensonar-burst-log.mjs');
const packageJson = read('package.json');

const requiredScenarioIds = [
  'idle-baseline',
  'root-follow-solo',
  'root-follow-glissando',
  'particles-ringwaves',
  'wavestarter-firework',
  'combo-root-particle-wave',
  'full-lane-max-stress',
];
for (const id of requiredScenarioIds) {
  if (!contracts.includes(`'${id}'`)) fail(`scenario ${id} is not registered`);
}

for (const phrase of [
  'firefox-gecko',
  'targetRiskBand',
  'musicalPreservationFocus',
  'buildBurstStressExportSlug',
]) {
  if (!contracts.includes(phrase)) fail(`contract missing ${phrase}`);
}

for (const phrase of [
  'version: 2',
  'browserProfile',
  'robustnessScore',
  'musicalPreservationScore',
  'restrictionCostScore',
  'browserOptimizedReadout',
  'smoothingBeforeDropProxy',
]) {
  if (!audioTraffic.includes(phrase)) fail(`audio traffic snapshot missing ${phrase}`);
}

for (const phrase of [
  'Stress-Szenario',
  'data-burst-stress-scenario-contract',
  'Robust',
  'Erhalt',
  'Restriktion',
]) {
  if (!panel.includes(phrase)) fail(`diagnostics panel missing ${phrase}`);
}

for (const phrase of [
  'activeStressScenarioId',
  'setActiveStressScenarioId',
  'suggestedFilename',
  'burstStressBrowserProfile',
]) {
  if (!runtime.includes(phrase)) fail(`runtime/export missing ${phrase}`);
}

for (const phrase of [
  'Browserprofil + Stress-Szenario',
  'browser',
  'scenario',
  'preservation',
  'restriction',
]) {
  if (!analyzer.includes(phrase)) fail(`analyzer missing ${phrase}`);
}

if (!packageJson.includes('xensonar:check-burst-stress-scenario-contracts')) fail('package script missing guard');

console.log('[burst-stress-scenario-contracts] ok');
