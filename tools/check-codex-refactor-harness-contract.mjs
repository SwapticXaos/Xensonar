#!/usr/bin/env node
import fs from 'node:fs';
import {
  agentsInstructionsPath,
  codexRefactorHarnessVersion,
  expectedAgentInstructionMarkers,
  expectedHarnessDocMarkers,
  focusProfileNames,
  focusProfiles,
  forbiddenRuntimeClaims,
  requiredHarnessScripts,
} from './codex-refactor-harness-contract.mjs';

const failures = [];
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const requireFile = (file) => {
  if (!fs.existsSync(file)) failures.push(`missing file ${file}`);
};
const requireText = (label, content, needle) => {
  if (!content.includes(needle)) failures.push(`${label} missing marker: ${needle}`);
};

requireFile('docs/CODEX_REFACTOR_HARNESS_3.2.91-7.7.70.md');
requireFile('docs/CODEX_REFACTOR_HARNESS_3.2.91-7.7.83.md');
requireFile(agentsInstructionsPath);
requireFile('tools/codex-refactor-harness-contract.mjs');
requireFile('tools/run-codex-refactor-harness.mjs');
requireFile('tools/check-codex-refactor-harness-contract.mjs');
requireFile('tools/check-codex-refactor-radar-suite.mjs');
requireFile('tools/run-codex-refactor-candidate-planner.mjs');
requireFile('tools/check-codex-refactor-candidate-planner.mjs');
requireFile('tools/run-codex-refactor-impact-ledger.mjs');
requireFile('tools/check-codex-refactor-impact-ledger.mjs');
requireFile('tools/codex-source-metrics.mjs');
requireFile('tools/run-codex-source-metrics-snapshot.mjs');
requireFile('tools/check-codex-source-metrics-contract.mjs');
requireFile('tools/run-codex-refactor-delta-guard.mjs');
requireFile('tools/check-codex-refactor-delta-guard.mjs');
requireFile('tools/check-spectralforge-transportbar-ui-boundary-refactor-7768.mjs');
requireFile('tools/check-digital-commons-provenance-ledger.mjs');
requireFile('LICENSE_STATUS.md');
requireFile('THIRD_PARTY_NOTICES.md');
requireFile('docs/PROVENANCE_LEDGER.md');
requireFile('BUILD_REPORT_XENSONAR_3.2.91-7.7.70_check_registry_curation.md');
requireFile('BUILD_REPORT_XENSONAR_3.2.91-7.7.83_current_line_guard_baseline_refresh.md');

const pkg = JSON.parse(read('package.json') || '{}');
const scripts = pkg.scripts || {};
for (const script of requiredHarnessScripts) {
  if (!scripts[script]) failures.push(`package.json missing script ${script}`);
}
if (pkg.version !== codexRefactorHarnessVersion) failures.push(`package.json version is ${pkg.version}, expected ${codexRefactorHarnessVersion}`);

const docFiles = fs.readdirSync('docs').filter((name) => /^CODEX_REFACTOR_HARNESS_3\.2\.91-7\.7\.\d+\.md$/.test(name));
const doc = docFiles.map((name) => read(`docs/${name}`)).join('\n\n');
for (const marker of expectedHarnessDocMarkers) requireText('Codex refactor harness docs', doc, marker);

const agents = read(agentsInstructionsPath);
for (const marker of expectedAgentInstructionMarkers) requireText('AGENTS.md', agents, marker);

const contract = read('tools/codex-refactor-harness-contract.mjs');
for (const marker of [
  'codexRefactorHarnessVersion',
  'focusProfiles',
  'requiredHarnessScripts',
  'expectedAgentInstructionMarkers',
  'expectedHarnessDocMarkers',
  'radarIndexPaths',
  'candidatePlannerPaths',
  'impactLedgerPaths',
  'sourceMetricsPaths',
  'sourceMetricsBaselinePaths',
  'deltaGuardPaths',
  'runtimeTouchGuardPaths',
  'runtimeSensitiveBaselinePaths',
  'digitalCommonsProvenancePaths',
  'checkRegistryCurationPaths',
  'currentLineBaselineRefreshPaths',
]) requireText('Codex refactor harness contract module', contract, marker);

const runner = read('tools/run-codex-refactor-harness.mjs');
for (const marker of [
  'codex-refactor-harness-contract.mjs',
  '--all',
  '--list',
  'writeRadarIndex',
  'agentInstructionsDigest',
  'Refactor Radar',
  'Sediment-Warnungen',
]) requireText('Codex refactor harness runner', runner, marker);

const candidatePlanner = read('tools/run-codex-refactor-candidate-planner.mjs');
for (const marker of [
  'candidatePlannerPaths',
  'recommendedFirstSlice',
  'Falsifikationsfrage',
  'kein Klang-/UI-Beweis',
]) requireText('Codex refactor candidate planner', candidatePlanner, marker);

const impactLedger = read('tools/run-codex-refactor-impact-ledger.mjs');
for (const marker of [
  'impactLedgerPaths',
  'codex-source-metrics.mjs',
  'Source Metrics Modul',
  'Vorher/Nachher-Signale',
  'Sediment-Hotspots',
  'Refactor-Wirkungsbuch',
]) requireText('Codex refactor impact ledger', impactLedger, marker);

const deltaGuard = read('tools/run-codex-refactor-delta-guard.mjs');
for (const marker of [
  'deltaGuardPaths',
  'sourceMetricsBaselinePaths',
  'Delta Guard',
  'Größen-/Datei-Drift',
]) requireText('Codex refactor delta guard', deltaGuard, marker);

const runtimeTouchGuard = read('tools/run-codex-runtime-touch-guard.mjs');
for (const marker of [
  'runtimeTouchGuardPaths',
  'runtime-sensitive',
  'Runtime Touch Delta',
  'allow-runtime-touch',
]) requireText('Codex runtime touch guard', runtimeTouchGuard, marker);

const sourceMetrics = read('tools/codex-source-metrics.mjs');
for (const marker of [
  'codexSourceMetricsModuleVersion',
  'buildSourceMetrics',
  'sourceMetricHotspots',
  'buildSourceProfileLedger',
]) requireText('Codex source metrics module', sourceMetrics, marker);

for (const focus of focusProfileNames()) {
  const profile = focusProfiles[focus];
  if (!profile.label || !profile.intent) failures.push(`${focus} missing label/intent`);
  if (!Array.isArray(profile.primaryFiles) || profile.primaryFiles.length === 0) failures.push(`${focus} missing primary files`);
  if (!Array.isArray(profile.gates) || profile.gates.length === 0) failures.push(`${focus} missing gates`);
  for (const primaryFile of profile.primaryFiles) {
    if (!fs.existsSync(primaryFile)) failures.push(`${focus} primary file missing: ${primaryFile}`);
  }
}
if (forbiddenRuntimeClaims.length < 5) failures.push('forbiddenRuntimeClaims unexpectedly small');

const report = read('BUILD_REPORT_XENSONAR_3.2.91-7.7.70_check_registry_curation.md');
for (const marker of [
  'check_registry_curation',
  'Nicht geändert',
  'Check-Registry-Kurationsschicht',
  'marker-static',
  'source-shape',
  'behavioural-audio-export',
  'tooling-only',
]) requireText('7.7.70 build report', report, marker);
const baselineReport = read('BUILD_REPORT_XENSONAR_3.2.91-7.7.83_current_line_guard_baseline_refresh.md');
for (const marker of [
  'current_line_guard_baseline_refresh',
  'neuer Nullpunkt',
  'Nicht geändert',
  'keine Klangrenderer',
]) requireText('7.7.83 build report', baselineReport, marker);

if (failures.length) {
  console.error('[codex-refactor-harness-contract] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, harness: 'codex-refactor', version: pkg.version, profiles: focusProfileNames().length }, null, 2));
