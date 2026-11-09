#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import {
  codexRefactorHarnessVersion,
  requiredHarnessScripts,
  runtimeSensitiveBaselinePaths,
  runtimeTouchGuardPaths,
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
  'tools/run-codex-runtime-touch-guard.mjs',
  'tools/check-codex-runtime-touch-guard.mjs',
  runtimeSensitiveBaselinePaths.json,
]) {
  if (!hasFile(file)) failures.push(`missing ${file}`);
}

const pkg = readJson('package.json');
for (const script of [
  'xensonar:codex:runtime-touch-guard',
  'xensonar:codex:runtime-touch-guard:allow',
  'xensonar:check-codex-runtime-touch-guard',
]) {
  if (!pkg.scripts?.[script]) failures.push(`package.json missing script ${script}`);
  if (!requiredHarnessScripts.includes(script)) failures.push(`requiredHarnessScripts missing ${script}`);
}

if (!failures.length) {
  const runner = read('tools/run-codex-runtime-touch-guard.mjs');
  for (const marker of [
    'xensonar-codex-runtime-touch-guard',
    'runtime-sensitive',
    'sha256',
    'allow-runtime-touch',
    'Runtime Touch Delta',
    'Falsifikationsfrage',
    'audio/runtime',
    'persistence/package',
  ]) {
    if (!runner.includes(marker)) failures.push(`runtime touch runner missing marker ${marker}`);
  }
  if (!runner.includes("from './codex-source-metrics.mjs'")) failures.push('runtime touch guard does not import shared source metrics module');
}

if (!failures.length) {
  const baseline = readJson(runtimeSensitiveBaselinePaths.json);
  if (baseline.reportKind !== 'xensonar-codex-runtime-sensitive-baseline') failures.push(`unexpected baseline reportKind ${baseline.reportKind}`);
  if (!baseline.summary || baseline.summary.fileCount < 50) failures.push('runtime-sensitive baseline seems too small');
  if (!Array.isArray(baseline.files) || !baseline.files.every((file) => file.sha256 && file.file?.startsWith('src/'))) failures.push('runtime-sensitive baseline entries are malformed');
}

const run = spawnSync(process.execPath, ['tools/run-codex-runtime-touch-guard.mjs'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  maxBuffer: 1024 * 1024 * 16,
});
if (run.status !== 0) failures.push(`runtime touch guard failed with ${run.status}: ${run.stderr || run.stdout}`.trim());

if (!failures.length) {
  if (!hasFile(runtimeTouchGuardPaths.json)) failures.push(`missing ${runtimeTouchGuardPaths.json}`);
  if (!hasFile(runtimeTouchGuardPaths.markdown)) failures.push(`missing ${runtimeTouchGuardPaths.markdown}`);
}

if (!failures.length) {
  const report = readJson(runtimeTouchGuardPaths.json);
  if (report.reportKind !== 'xensonar-codex-runtime-touch-guard') failures.push(`unexpected reportKind ${report.reportKind}`);
  if (report.harnessVersion !== codexRefactorHarnessVersion) failures.push(`harnessVersion ${report.harnessVersion} != ${codexRefactorHarnessVersion}`);
  if (report.sourceMetricsModuleVersion !== codexSourceMetricsModuleVersion) failures.push(`sourceMetricsModuleVersion ${report.sourceMetricsModuleVersion} != ${codexSourceMetricsModuleVersion}`);
  if (report.verdict !== 'clean') failures.push(`expected clean runtime touch verdict, got ${report.verdict}`);
  if (report.delta?.modified?.length !== 0) failures.push('runtime touch guard unexpectedly sees modified sensitive files');
  const md = read(runtimeTouchGuardPaths.markdown);
  for (const marker of ['Runtime Touch Guard', 'Runtime Touch Delta', 'Falsifikationsfrage', 'keine sensitive Runtime-Berührung']) {
    if (!md.includes(marker)) failures.push(`runtime touch markdown missing ${marker}`);
  }
}

if (failures.length) {
  console.error('[codex-runtime-touch-guard] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, harness: 'codex-runtime-touch-guard', version: codexRefactorHarnessVersion }, null, 2));
