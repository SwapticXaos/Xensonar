#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const nodeModules = path.join(root, 'node_modules');
const binDir = path.join(nodeModules, '.bin');
const lockPath = path.join(root, 'package-lock.json');
const packagePath = path.join(root, 'package.json');
const cacheRoot = process.env.NPM_CACHE || path.join(process.env.HOME || '', '.npm');
const contentRoot = path.join(cacheRoot, '_cacache', 'content-v2', 'sha512');
const sourceNodeModules = process.env.XENSONAR_NODE_MODULES_SOURCE || '';
const installTimeoutMs = Number(process.env.XENSONAR_INSTALL_TIMEOUT_MS || 20 * 60 * 1000);

function log(message) {
  console.log(`[prepare-vite-html-toolchain] ${message}`);
}

function fail(message) {
  console.error(`[prepare-vite-html-toolchain] ${message}`);
  process.exit(1);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

if (!fs.existsSync(lockPath)) fail('package-lock.json not found');
if (!fs.existsSync(packagePath)) fail('package.json not found');

const lock = readJson(lockPath);
const packages = lock.packages || {};
const entries = Object.entries(packages).filter(([lockName, meta]) => {
  if (!lockName.startsWith('node_modules/') || !meta?.integrity) return false;
  if (!meta.optional) return true;
  if (Array.isArray(meta.os) && meta.os.length > 0 && !meta.os.includes(process.platform)) return false;
  if (Array.isArray(meta.cpu) && meta.cpu.length > 0 && !meta.cpu.includes(process.arch)) return false;
  return true;
});

function expectedPackageName(lockName) {
  return lockName.replace(/^node_modules\//, '');
}

function packagePresent(lockName, meta) {
  const packageJsonPath = path.join(root, lockName, 'package.json');
  if (!fs.existsSync(packageJsonPath)) return false;
  try {
    const packageJson = readJson(packageJsonPath);
    return String(packageJson.version || '') === String(meta.version || '');
  } catch {
    return false;
  }
}

function missingEntries() {
  return entries.filter(([lockName, meta]) => !packagePresent(lockName, meta));
}

function viteReady() {
  const viteBin = path.join(binDir, process.platform === 'win32' ? 'vite.cmd' : 'vite');
  const vitePkg = path.join(nodeModules, 'vite', 'package.json');
  return fs.existsSync(viteBin) && fs.existsSync(vitePkg);
}

function cacheBlobForIntegrity(integrity) {
  const b64 = String(integrity).split('-').pop();
  const hex = Buffer.from(b64, 'base64').toString('hex');
  return path.join(contentRoot, hex.slice(0, 2), hex.slice(2, 4), hex.slice(4));
}

function allCacheBlobsAvailable() {
  if (!fs.existsSync(contentRoot)) return false;
  return missingEntries().every(([, meta]) => fs.existsSync(cacheBlobForIntegrity(meta.integrity)));
}

function copyFromSourceNodeModules() {
  if (!sourceNodeModules) return false;
  if (!fs.existsSync(sourceNodeModules)) {
    log(`XENSONAR_NODE_MODULES_SOURCE does not exist: ${sourceNodeModules}`);
    return false;
  }

  let copied = 0;
  let skipped = 0;
  fs.mkdirSync(nodeModules, { recursive: true });
  for (const [lockName, meta] of missingEntries()) {
    const rel = expectedPackageName(lockName);
    const source = path.join(sourceNodeModules, rel);
    const sourcePackageJson = path.join(source, 'package.json');
    if (!fs.existsSync(sourcePackageJson)) {
      skipped += 1;
      continue;
    }
    let sourceVersion = '';
    try { sourceVersion = String(readJson(sourcePackageJson).version || ''); } catch {}
    if (sourceVersion !== String(meta.version || '')) {
      skipped += 1;
      continue;
    }
    const destination = path.join(root, lockName);
    fs.rmSync(destination, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.cpSync(source, destination, { recursive: true, dereference: false, preserveTimestamps: false });
    copied += 1;
    if (copied % 25 === 0) log(`copied ${copied} packages from source node_modules`);
  }
  log(`source node_modules import copied=${copied}, skipped=${skipped}, remaining=${missingEntries().length}`);
  return copied > 0;
}

function runNode(script, label) {
  const result = spawnSync(process.execPath, [script], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status === 0) return true;
  log(`${label} did not complete cleanly`);
  return false;
}

function runWithHeartbeat(command, args, label, timeoutMs) {
  const runner = path.join(root, 'tools', 'run-command-with-heartbeat.mjs');
  const result = spawnSync(process.execPath, [runner, '--label', label, '--timeout-ms', String(timeoutMs), '--', command, ...args], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  return result.status === 0;
}

function rebuildBinLinks() {
  fs.mkdirSync(binDir, { recursive: true });
  let links = 0;
  for (const [lockName] of entries) {
    const packageDir = path.join(root, lockName);
    const packageJsonPath = path.join(packageDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) continue;
    let packageJson;
    try { packageJson = readJson(packageJsonPath); } catch { continue; }
    let bins = packageJson.bin;
    if (!bins) continue;
    if (typeof bins === 'string') bins = { [String(packageJson.name).split('/').pop()]: bins };
    for (const [binName, relativeTarget] of Object.entries(bins)) {
      const targetAbs = path.join(packageDir, String(relativeTarget));
      const linkAbs = path.join(binDir, binName);
      fs.rmSync(linkAbs, { force: true });
      if (process.platform === 'win32') {
        fs.writeFileSync(`${linkAbs}.cmd`, `@echo off\r\nnode "%~dp0\\..\\${expectedPackageName(lockName)}\\${String(relativeTarget).replaceAll('/', '\\')}" %*\r\n`);
      } else {
        fs.symlinkSync(path.relative(binDir, targetAbs), linkAbs);
        try { fs.chmodSync(targetAbs, 0o755); } catch {}
      }
      links += 1;
    }
  }
  log(`rebuilt ${links} bin links`);
}

const initialMissing = missingEntries().length;
if (initialMissing === 0 && viteReady()) {
  rebuildBinLinks();
  log('OK: node_modules and vite are already ready');
  process.exit(0);
}

log(`node_modules incomplete: missing ${initialMissing} of ${entries.length} compatible lockfile packages`);
copyFromSourceNodeModules();

if (missingEntries().length > 0 && allCacheBlobsAvailable()) {
  log('hydrating node_modules from npm cache blobs');
  runNode(path.join(root, 'tools', 'hydrate-node-modules-from-npm-cache.mjs'), 'cache hydration');
}

if (missingEntries().length > 0) {
  log('running npm ci with heartbeat and generous timeout');
  const ok = runWithHeartbeat('npm', ['ci', '--prefer-offline', '--no-audit', '--no-fund'], 'npm-ci', installTimeoutMs);
  if (!ok) log('npm ci failed or was terminated; trying cache hydration once more');
  if (allCacheBlobsAvailable()) runNode(path.join(root, 'tools', 'hydrate-node-modules-from-npm-cache.mjs'), 'cache hydration after npm ci');
}

rebuildBinLinks();
const remaining = missingEntries();
if (remaining.length > 0) {
  const sample = remaining.slice(0, 12).map(([name]) => name).join(', ');
  fail(`node_modules still incomplete: ${remaining.length} packages missing; first entries: ${sample}`);
}
if (!viteReady()) fail('vite binary still unavailable after setup');

log('OK: portable Vite HTML toolchain ready');
