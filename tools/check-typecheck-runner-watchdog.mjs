#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const fail = (message) => {
  console.error(`[typecheck-runner-watchdog] ${message}`);
  process.exit(1);
};

const pkg = JSON.parse(read('package.json'));
if (!String(pkg.version || '').startsWith('3.2.91.5.')) fail(`unexpected package version ${pkg.version}`);
if (pkg.scripts?.['xensonar:check-typecheck-runner-watchdog'] !== 'node tools/check-typecheck-runner-watchdog.mjs') {
  fail('package.json missing typecheck runner watchdog guard script');
}
if (pkg.scripts?.['xensonar:check-container-timer-health'] !== 'node tools/check-container-timer-health.mjs') {
  fail('package.json missing container timer health guard script');
}

const runner = read('tools/run-typecheck-matrix.mjs');
for (const needle of [
  "import { spawn } from 'node:child_process'",
  'existsSync(tscJs)',
  'missing-typescript-compiler',
  'TYPECHECK_MATRIX_REPORT_JSON',
  "process.kill(-child.pid, 'SIGKILL')",
  'setTimeout(() =>',
  'timer-timeout',
  'child.stdout.on',
  'child.stderr.on',
  'await runChunk(chunk)',
  'runtimeClockProbe',
  'runtime-clock-stalled',
]) {
  if (!runner.includes(needle)) fail(`run-typecheck-matrix.mjs missing watchdog feature: ${needle}`);
}
for (const forbidden of [
  'spawnSync(',
  "spawn('/bin/bash'",
  'status.txt',
  'TYPECHECK_CHUNK_POLL_LIMIT',
  'poll-limit',
  'while (true)',
]) {
  if (runner.includes(forbidden)) fail(`run-typecheck-matrix.mjs still contains fragile watchdog pattern: ${forbidden}`);
}

const timerGuard = read('tools/check-container-timer-health.mjs');
for (const needle of ['bounded CPU loop', 'Date.now()', 'process.hrtime', '8_000_000']) {
  if (!timerGuard.includes(needle)) fail(`container timer health guard missing ${needle}`);
}

const corridorGuard = read('tools/check-canonical-session-persistence-corridor.mjs');
if (corridorGuard.includes('expected 3.2.91.5.24')) fail('canonical session guard is still pinned to one patch version');
if (!corridorGuard.includes("startsWith('3.2.91.5.')")) fail('canonical session guard should use a patch-line version sanity check instead of an exact stale version');

console.log('[typecheck-runner-watchdog] PASS: matrix runner uses async child-process watchdogs, compiler preflight, JSON reporting, and non-stale guard semantics.');
