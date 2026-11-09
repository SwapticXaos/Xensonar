#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import {
  patchScopeGuardPaths,
  requiredHarnessScripts,
  expectedHarnessDocMarkers,
  codexRefactorHarnessVersion,
} from './codex-refactor-harness-contract.mjs';
import {
  getPatchScope,
  patchScopeNames,
  patchScopeBaselinePath,
  patchScopePolicyVersion,
} from './codex-patch-scope-policy.mjs';

function fail(message) {
  console.error(`[codex-patch-scope-guard] FAIL: ${message}`);
  process.exit(1);
}

function readText(file) {
  return fs.readFileSync(file, 'utf8');
}

function readJson(file) {
  return JSON.parse(readText(file));
}

for (const file of [
  'tools/codex-patch-scope-policy.mjs',
  'tools/run-codex-patch-scope-guard.mjs',
  'tools/check-codex-patch-scope-guard.mjs',
  patchScopeBaselinePath,
]) {
  if (!fs.existsSync(file)) fail(`missing ${file}`);
}

for (const scopeName of ['harness-only', 'tooling-only', 'runtime-declared']) {
  const scope = getPatchScope(scopeName);
  if (!scope) fail(`missing scope ${scopeName}`);
  if (!scope.intent || !scope.requiredGuards?.length) fail(`scope ${scopeName} lacks intent/guards`);
}

if (!patchScopeNames().includes('harness-only')) fail('harness-only scope not advertised');
if (patchScopePolicyVersion !== codexRefactorHarnessVersion) fail(`unexpected policy version ${patchScopePolicyVersion}; expected ${codexRefactorHarnessVersion}`);

const pkg = readJson('package.json');
for (const script of [
  'xensonar:codex:patch-scope-guard',
  'xensonar:codex:patch-scope-guard:tooling',
  'xensonar:codex:patch-scope-guard:allow',
  'xensonar:check-codex-patch-scope-guard',
]) {
  if (!pkg.scripts?.[script]) fail(`missing package script ${script}`);
  if (!requiredHarnessScripts.includes(script)) fail(`requiredHarnessScripts does not include ${script}`);
}

const contract = readText('tools/codex-refactor-harness-contract.mjs');
for (const marker of ['patchScopeGuardPaths', 'Patch Scope Guard', 'Scope-Grenzen']) {
  if (!contract.includes(marker)) fail(`contract missing marker ${marker}`);
}

const doc = readText('docs/CODEX_REFACTOR_HARNESS_3.2.91-7.7.83.md') + '\n' + readText('docs/CODEX_REFACTOR_HARNESS_3.2.91-7.7.68.md');
for (const marker of ['Patch Scope Guard', 'harness-only', 'Scope-Grenzen', '7.7.83', 'current-line baseline refresh']) {
  if (!doc.includes(marker)) fail(`doc missing marker ${marker}`);
}
for (const marker of ['7.7.67', '7.7.68', '7.7.83', 'Patch Scope Guard']) {
  if (!expectedHarnessDocMarkers.includes(marker)) fail(`expectedHarnessDocMarkers missing ${marker}`);
}

const run = spawnSync(process.execPath, ['tools/run-codex-patch-scope-guard.mjs', '--scope', 'runtime-declared'], { encoding: 'utf8' });
if (run.status !== 0) fail(`scope guard failed:\n${run.stdout}\n${run.stderr}`);
const report = readJson(patchScopeGuardPaths.json);
if (!report.ok) fail('scope guard report not ok');
if (report.scope.name !== 'runtime-declared') fail(`unexpected report scope ${report.scope.name}`);
if (report.violations.length) fail(`unexpected violations ${JSON.stringify(report.violations)}`);
if (report.delta.changedFiles.length !== 0) fail(`baseline-refresh scope guard should be locally clean, saw ${report.delta.changedFiles.length} changed files`);
if (!fs.existsSync(patchScopeGuardPaths.markdown)) fail('missing markdown report');

console.log(`[codex-patch-scope-guard] PASS ${report.delta.changedFiles.length} changed files fit ${report.scope.name}.`);
