#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import {
  codexRefactorHarnessVersion,
  deltaGuardPaths,
  requiredHarnessScripts,
  sourceMetricsBaselinePaths,
} from './codex-refactor-harness-contract.mjs';
import { codexSourceMetricsModuleVersion } from './codex-source-metrics.mjs';

const failures = [];

function hasFile(rel) {
  return fs.existsSync(rel);
}

function read(rel) {
  return fs.readFileSync(rel, 'utf8');
}

function readJson(rel) {
  return JSON.parse(read(rel));
}

for (const file of [
  'tools/run-codex-refactor-delta-guard.mjs',
  'tools/check-codex-refactor-delta-guard.mjs',
  'tools/codex-source-metrics.mjs',
  sourceMetricsBaselinePaths.json,
]) {
  if (!hasFile(file)) failures.push(`missing ${file}`);
}

const pkg = readJson('package.json');
for (const script of [
  'xensonar:codex:refactor-delta',
  'xensonar:codex:refactor-delta:gates',
  'xensonar:check-codex-refactor-delta-guard',
]) {
  if (!pkg.scripts?.[script]) failures.push(`package.json missing script ${script}`);
  if (!requiredHarnessScripts.includes(script)) failures.push(`requiredHarnessScripts missing ${script}`);
}

if (!failures.length) {
  const runner = read('tools/run-codex-refactor-delta-guard.mjs');
  for (const marker of [
    'xensonar-codex-refactor-delta-guard',
    'sourceMetricsBaselinePaths',
    'buildSourceMetrics',
    'diffTagHistogram',
    'Core-HTML Delta',
    'Größen-/Datei-Drift',
    'maxFileIncrease',
    'maxLineIncrease',
    'maxByteIncrease',
  ]) {
    if (!runner.includes(marker)) failures.push(`delta guard runner missing marker ${marker}`);
  }
  if (!runner.includes("from './codex-source-metrics.mjs'")) failures.push('delta guard does not import shared source metrics module');
}

if (!failures.length) {
  const baseline = readJson(sourceMetricsBaselinePaths.json);
  if (baseline.reportKind !== 'xensonar-codex-source-metrics-snapshot') failures.push(`unexpected baseline reportKind ${baseline.reportKind}`);
  if (baseline.harnessVersion !== codexRefactorHarnessVersion) failures.push(`baseline harnessVersion should match current harness, got ${baseline.harnessVersion}`);
  if (!baseline.summary || baseline.summary.fileCount < 1000) failures.push('baseline source metrics summary is unexpectedly small');
}

const run = spawnSync(process.execPath, ['tools/run-codex-refactor-delta-guard.mjs'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  maxBuffer: 1024 * 1024 * 16,
});
if (run.status !== 0) failures.push(`delta guard runner failed with ${run.status}: ${run.stderr || run.stdout}`.trim());

if (!failures.length) {
  if (!hasFile(deltaGuardPaths.json)) failures.push(`missing ${deltaGuardPaths.json}`);
  if (!hasFile(deltaGuardPaths.markdown)) failures.push(`missing ${deltaGuardPaths.markdown}`);
}

if (!failures.length) {
  const report = readJson(deltaGuardPaths.json);
  if (report.reportKind !== 'xensonar-codex-refactor-delta-guard') failures.push(`unexpected reportKind ${report.reportKind}`);
  if (report.harnessVersion !== codexRefactorHarnessVersion) failures.push(`harnessVersion ${report.harnessVersion} != ${codexRefactorHarnessVersion}`);
  if (report.sourceMetricsModuleVersion !== codexSourceMetricsModuleVersion) failures.push(`sourceMetricsModuleVersion ${report.sourceMetricsModuleVersion} != ${codexSourceMetricsModuleVersion}`);
  if (!report.delta?.summary) failures.push('delta summary missing');
  if (!Array.isArray(report.delta?.tags)) failures.push('delta tag list missing');
  if (!report.delta?.hotspots) failures.push('delta hotspot data missing');
  if (report.verdict !== 'clean') failures.push(`delta guard should be clean after current-line baseline refresh, got ${report.verdict}`);
  if (report.delta.summary.fileCount !== 0) failures.push(`delta fileCount should be 0 after baseline refresh, got ${report.delta.summary.fileCount}`);
  const md = read(deltaGuardPaths.markdown);
  for (const marker of ['Delta Guard', 'Summary Delta', 'Core-HTML Delta', 'Tag Delta', 'Hotspot Delta', 'Warnungen']) {
    if (!md.includes(marker)) failures.push(`delta guard markdown missing ${marker}`);
  }
}

if (failures.length) {
  console.error('[codex-refactor-delta-guard] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, harness: 'codex-refactor-delta-guard', version: codexRefactorHarnessVersion }, null, 2));
