#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const matrix = JSON.parse(readFileSync(resolve(here, 'typecheckChunkMatrix.json'), 'utf8'));
const args = process.argv.slice(2);
const getArg = (flag) => { const idx = args.indexOf(flag); return idx >= 0 ? args[idx + 1] : undefined; };
const hasFlag = (flag) => args.includes(flag);
const setName = getArg('--set') || 'micro';
const chunkName = getArg('--chunk');
const timeoutMs = Number(process.env.TYPECHECK_CHUNK_TIMEOUT_MS || 120000);
const reportJsonPath = process.env.TYPECHECK_MATRIX_REPORT_JSON;
const chunks = matrix[setName] || [];
const selected = chunkName ? chunks.filter((chunk) => chunk.name === chunkName) : chunks;
const tscJs = resolve(root, 'node_modules', 'typescript', 'lib', 'tsc.js');
const maxCaptureBytes = Number(process.env.TYPECHECK_CAPTURE_MAX_BYTES || 16 * 1024 * 1024);

const writeReport = (payload) => {
  if (!reportJsonPath) return;
  writeFileSync(resolve(root, reportJsonPath), JSON.stringify(payload, null, 2) + '\n');
};

const appendLimited = (current, chunk) => {
  if (!chunk) return current;
  if (current.length >= maxCaptureBytes) return current;
  const next = current + chunk;
  return next.length > maxCaptureBytes ? next.slice(0, maxCaptureBytes) : next;
};

const forwardTruncated = (label, text) => {
  if (!text) return 0;
  const bytes = Buffer.byteLength(text);
  const printable = bytes > maxCaptureBytes
    ? text.slice(0, maxCaptureBytes) + `\n[typecheck-matrix] ${label} truncated after ${maxCaptureBytes} bytes.\n`
    : text;
  if (label === 'stderr') process.stderr.write(printable);
  else process.stdout.write(printable);
  return bytes;
};

const runtimeClockProbe = () => {
  const startDate = Date.now();
  const startHr = typeof process.hrtime?.bigint === 'function' ? process.hrtime.bigint() : null;
  let sink = 0;
  for (let i = 0; i < 8_000_000; i += 1) sink ^= (i * 31) & 0xff;
  const elapsedDate = Date.now() - startDate;
  const elapsedHrMs = startHr ? Number(process.hrtime.bigint() - startHr) / 1_000_000 : elapsedDate;
  return { elapsedDate, elapsedHrMs, sink };
};

if (hasFlag('--list')) {
  for (const chunk of chunks) console.log(`${setName}:${chunk.name} -> ${chunk.project}`);
  process.exit(0);
}

if (!selected.length) {
  console.error(`[typecheck-matrix] No chunks selected for set=${setName}${chunkName ? ` chunk=${chunkName}` : ''}.`);
  process.exit(2);
}

const runtimeClock = runtimeClockProbe();
if (runtimeClock.elapsedDate <= 0 && runtimeClock.elapsedHrMs <= 0) {
  console.error('[typecheck-matrix] Runtime clock did not advance during a bounded CPU loop; refusing to start tsc because watchdog semantics are not reliable in this container session.');
  writeReport({ ok: false, reason: 'runtime-clock-stalled', setName, chunkName, timeoutMs, runtimeClock, results: [] });
  process.exit(4);
}
console.log(`[typecheck-matrix] Runtime clock OK: elapsedDateMs=${runtimeClock.elapsedDate.toFixed(3)} elapsedHrMs=${runtimeClock.elapsedHrMs.toFixed(3)}`);

if (!existsSync(tscJs)) {
  console.error(`[typecheck-matrix] Missing TypeScript compiler at ${tscJs}. Run npm ci before typecheck, or hydrate node_modules from a compatible cache.`);
  writeReport({ ok: false, reason: 'missing-typescript-compiler', tscJs, setName, chunkName, results: [] });
  process.exit(3);
}

const killProcessGroup = (child) => {
  if (!child.pid) return;
  try { process.kill(-child.pid, 'SIGKILL'); }
  catch {
    try { child.kill('SIGKILL'); } catch {}
  }
};

const runChunk = (chunk) => new Promise((resolveResult) => {
  const started = Date.now();
  console.log(`\n[typecheck-matrix] START ${chunk.name}`);
  console.log(`[typecheck-matrix] PROJECT ${chunk.project}`);
  let stdout = '';
  let stderr = '';
  let timedOut = false;
  let timeoutReason = null;
  let settled = false;
  const child = spawn(process.execPath, [tscJs, '-p', chunk.project, '--noEmit', '--pretty', 'false'], {
    cwd: root,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const timer = setTimeout(() => {
    if (settled) return;
    timedOut = true;
    timeoutReason = 'timer-timeout';
    killProcessGroup(child);
  }, timeoutMs);
  child.stdout.on('data', (data) => { stdout = appendLimited(stdout, data.toString()); });
  child.stderr.on('data', (data) => { stderr = appendLimited(stderr, data.toString()); });
  child.on('error', (error) => {
    stderr = appendLimited(stderr, String(error?.stack || error));
  });
  child.on('close', (code, signal) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    const stdoutBytes = forwardTruncated('stdout', stdout);
    const stderrBytes = forwardTruncated('stderr', stderr);
    const elapsed = Date.now() - started;
    const ok = code === 0 && !timedOut;
    const status = ok ? 'PASS' : timedOut ? `TIMEOUT after ${timeoutMs}ms${timeoutReason ? ` (${timeoutReason})` : ''}` : `FAIL code=${Number.isFinite(code) ? code : 'unknown'}`;
    console.log(`[typecheck-matrix] END ${chunk.name}: ${status} (${elapsed}ms)`);
    resolveResult({ name: chunk.name, ok, timedOut, timeoutReason, code, signal: timedOut ? 'SIGKILL' : signal, elapsed, project: chunk.project, stdoutBytes, stderrBytes });
  });
});

const results = [];
for (const chunk of selected) {
  results.push(await runChunk(chunk));
}
const failed = results.filter((result) => !result.ok);
console.log('\n[typecheck-matrix] SUMMARY');
for (const result of results) console.log(`- ${result.ok ? 'PASS' : result.timedOut ? 'TIMEOUT' : 'FAIL'} ${result.name} (${result.elapsed}ms)`);
writeReport({ ok: failed.length === 0, setName, chunkName: chunkName ?? null, timeoutMs, runtimeClock, results });
process.exit(failed.length ? 1 : 0);
