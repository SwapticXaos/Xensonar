#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import {
  codexRefactorHarnessVersion,
  currentLineBaselineRefreshPaths,
  requiredHarnessScripts,
  runtimeSensitiveBaselinePaths,
  sourceMetricsBaselinePaths,
} from './codex-refactor-harness-contract.mjs';
import { patchScopeBaselinePath, patchScopePolicyVersion } from './codex-patch-scope-policy.mjs';
import { XENSONAR_ARCHITECTURE_LINE } from './xensonar-project-line.mjs';

const failures = [];
const expectedVersion = XENSONAR_ARCHITECTURE_LINE;
function has(file) { return fs.existsSync(file); }
function read(file) { return fs.readFileSync(file, 'utf8'); }
function json(file) { return JSON.parse(read(file)); }
function requireFile(file) { if (!has(file)) failures.push(`missing ${file}`); }
function requireText(label, text, needle) { if (!text.includes(needle)) failures.push(`${label} missing ${needle}`); }
function run(args) {
  return spawnSync(process.execPath, args, { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 1024 * 1024 * 32 });
}

for (const file of [
  'tools/run-codex-current-line-baseline-refresh.mjs',
  'tools/check-codex-current-line-baseline-refresh.mjs',
  sourceMetricsBaselinePaths.json,
  runtimeSensitiveBaselinePaths.json,
  patchScopeBaselinePath,
  'docs/CODEX_REFACTOR_HARNESS_3.2.91-7.7.90.md',
  'BUILD_REPORT_XENSONAR_3.2.91-7.7.90_refactor_direction_review.md',
]) requireFile(file);

const pkg = json('package.json');
if (pkg.version !== expectedVersion) failures.push(`package version ${pkg.version} != ${expectedVersion}`);
for (const script of ['xensonar:codex:refresh-current-line-baselines', 'xensonar:check-codex-current-line-baseline-refresh']) {
  if (!pkg.scripts?.[script]) failures.push(`missing package script ${script}`);
  if (!requiredHarnessScripts.includes(script)) failures.push(`requiredHarnessScripts missing ${script}`);
}
if (codexRefactorHarnessVersion !== expectedVersion) failures.push(`harness version ${codexRefactorHarnessVersion} != ${expectedVersion}`);
if (patchScopePolicyVersion !== expectedVersion) failures.push(`patch scope policy version ${patchScopePolicyVersion} != ${expectedVersion}`);
for (const [label, path] of Object.entries({ sourceMetrics: sourceMetricsBaselinePaths.json, runtimeSensitive: runtimeSensitiveBaselinePaths.json, patchScope: patchScopeBaselinePath })) {
  if (!path.includes(expectedVersion)) failures.push(`${label} baseline path is not current-line: ${path}`);
}

if (!failures.length) {
  const source = json(sourceMetricsBaselinePaths.json);
  const runtime = json(runtimeSensitiveBaselinePaths.json);
  const scope = json(patchScopeBaselinePath);
  if (source.harnessVersion !== expectedVersion) failures.push(`source baseline harnessVersion ${source.harnessVersion}`);
  if (runtime.harnessVersion !== expectedVersion) failures.push(`runtime baseline harnessVersion ${runtime.harnessVersion}`);
  if (scope.harnessVersion !== expectedVersion) failures.push(`scope baseline harnessVersion ${scope.harnessVersion}`);
  if (scope.patchScopePolicyVersion !== expectedVersion) failures.push(`scope baseline policy ${scope.patchScopePolicyVersion}`);
  if (source.summary?.fileCount < 1000) failures.push('source baseline unexpectedly small');
  if (runtime.summary?.fileCount < 50) failures.push('runtime baseline unexpectedly small');
  if (scope.summary?.fileCount < 1000) failures.push('scope baseline unexpectedly small');
}

for (const [label, file, markers] of [
  ['refresh runner', 'tools/run-codex-current-line-baseline-refresh.mjs', ['--write-baselines', 'acceptedLine', 'neuen lokalen Nullpunkt', 'xensonar-codex-current-line-baseline-refresh']],
  ['refresh doc', 'docs/CODEX_REFACTOR_HARNESS_3.2.91-7.7.90.md', ['refactor_direction_review', 'neuer Nullpunkt', 'kein Verhaltensbeweis', '7.7.89']],
  ['build report', 'BUILD_REPORT_XENSONAR_3.2.91-7.7.90_refactor_direction_review.md', ['refactor_direction_review', 'Nicht geändert', 'neuer Guard-Nullpunkt', 'Keine Klangrenderer']],
]) {
  if (has(file)) {
    const text = read(file);
    for (const marker of markers) requireText(label, text, marker);
  }
}

if (!failures.length) {
  const proc = run(['tools/run-codex-current-line-baseline-refresh.mjs']);
  if (proc.status !== 0) failures.push(`baseline refresh report failed:\n${proc.stdout}\n${proc.stderr}`);
}
if (!failures.length) {
  const report = json(currentLineBaselineRefreshPaths.json);
  if (!report.ok) failures.push('current-line baseline refresh report not ok');
  if (report.refreshedLine !== expectedVersion) failures.push(`report refreshedLine ${report.refreshedLine}`);
  if (report.probes?.some((probe) => probe.status !== 'pass')) failures.push('one or more baseline refresh probes failed');
  const md = read(currentLineBaselineRefreshPaths.markdown);
  for (const marker of ['Current-Line Guard Baseline Refresh', 'neuen lokalen Nullpunkt', 'Guard-Probe nach Refresh', 'Falsifikationsfrage']) requireText('baseline refresh markdown', md, marker);
}

if (failures.length) {
  console.error('[codex-current-line-baseline-refresh] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, harness: 'codex-current-line-baseline-refresh', version: expectedVersion }, null, 2));
