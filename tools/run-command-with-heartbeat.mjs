#!/usr/bin/env node
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const sep = args.indexOf('--');
if (sep === -1 || sep === args.length - 1) {
  console.error('[run-command-with-heartbeat] usage: node tools/run-command-with-heartbeat.mjs [--label name] [--timeout-ms n] [--heartbeat-ms n] -- <command> [args...]');
  process.exit(2);
}

let label = 'command';
let timeoutMs = Number(process.env.XENSONAR_COMMAND_TIMEOUT_MS || 20 * 60 * 1000);
let heartbeatMs = Number(process.env.XENSONAR_HEARTBEAT_MS || 15 * 1000);
for (let i = 0; i < sep; i += 1) {
  const item = args[i];
  if (item === '--label') label = args[++i] || label;
  else if (item === '--timeout-ms') timeoutMs = Number(args[++i] || timeoutMs);
  else if (item === '--heartbeat-ms') heartbeatMs = Number(args[++i] || heartbeatMs);
}

const command = args[sep + 1];
const commandArgs = args.slice(sep + 2);
if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) timeoutMs = 20 * 60 * 1000;
if (!Number.isFinite(heartbeatMs) || heartbeatMs <= 0) heartbeatMs = 15 * 1000;

const startedAt = Date.now();
console.log(`[${label}] start: ${command} ${commandArgs.join(' ')}`);
console.log(`[${label}] timeout=${Math.round(timeoutMs / 1000)}s heartbeat=${Math.round(heartbeatMs / 1000)}s`);

const child = spawn(command, commandArgs, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: {
    ...process.env,
    CI: process.env.CI || '1',
    npm_config_audit: process.env.npm_config_audit || 'false',
    npm_config_fund: process.env.npm_config_fund || 'false',
  },
});

const heartbeat = setInterval(() => {
  const elapsed = Math.round((Date.now() - startedAt) / 1000);
  console.log(`[${label}] heartbeat: still running after ${elapsed}s`);
}, heartbeatMs);

const timeout = setTimeout(() => {
  const elapsed = Math.round((Date.now() - startedAt) / 1000);
  console.error(`[${label}] timeout after ${elapsed}s; sending SIGTERM`);
  child.kill('SIGTERM');
  setTimeout(() => child.kill('SIGKILL'), 5000).unref();
}, timeoutMs);

child.on('exit', (code, signal) => {
  clearInterval(heartbeat);
  clearTimeout(timeout);
  const elapsed = Math.round((Date.now() - startedAt) / 1000);
  if (signal) {
    console.error(`[${label}] failed: signal ${signal} after ${elapsed}s`);
    process.exit(1);
  }
  console.log(`[${label}] done: exit ${code} after ${elapsed}s`);
  process.exit(code ?? 1);
});
