#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const cacheRoot = process.env.NPM_CACHE || path.join(process.env.HOME || '', '.npm');
const contentRoot = path.join(cacheRoot, '_cacache', 'content-v2', 'sha512');
const lockPath = path.join(root, 'package-lock.json');

function fail(message) {
  console.error(`[hydrate-node-modules-from-npm-cache] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(lockPath)) fail('package-lock.json not found');
if (!fs.existsSync(contentRoot)) fail(`npm cache content directory not found: ${contentRoot}`);

const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
const packages = lock.packages || {};

function isCompatibleOptionalPackage(meta) {
  if (!meta.optional) return true;
  if (Array.isArray(meta.os) && meta.os.length > 0 && !meta.os.includes(process.platform)) return false;
  if (Array.isArray(meta.cpu) && meta.cpu.length > 0 && !meta.cpu.includes(process.arch)) return false;
  return true;
}

function cacheBlobForIntegrity(integrity) {
  const b64 = String(integrity).split('-').pop();
  const hex = Buffer.from(b64, 'base64').toString('hex');
  return path.join(contentRoot, hex.slice(0, 2), hex.slice(2, 4), hex.slice(4));
}

const entries = Object.entries(packages)
  .filter(([lockName, meta]) => lockName.startsWith('node_modules/') && meta?.integrity && isCompatibleOptionalPackage(meta));

const nodeModules = path.join(root, 'node_modules');
fs.mkdirSync(nodeModules, { recursive: true });

let extracted = 0;
let skipped = 0;
for (const [lockName, meta] of entries) {
  const destination = path.join(root, lockName);
  if (fs.existsSync(path.join(destination, 'package.json'))) {
    skipped += 1;
    continue;
  }

  const tarball = cacheBlobForIntegrity(meta.integrity);
  if (!fs.existsSync(tarball)) {
    fail(`cache blob missing for ${lockName}; run npm ci once in an environment with registry access`);
  }

  console.log(`[hydrate-node-modules-from-npm-cache] extracting ${lockName}`);
  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(destination, { recursive: true });
  execFileSync('tar', ['-xzf', tarball, '-C', destination, '--strip-components=1'], { stdio: 'ignore' });
  extracted += 1;
  console.log(`[hydrate-node-modules-from-npm-cache] extracted ${extracted}; skipped ${skipped}`);
}

const binDir = path.join(nodeModules, '.bin');
fs.mkdirSync(binDir, { recursive: true });
for (const [lockName] of entries) {
  const packageDir = path.join(root, lockName);
  const packageJsonPath = path.join(packageDir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) continue;

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  let bins = packageJson.bin;
  if (!bins) continue;
  if (typeof bins === 'string') bins = { [String(packageJson.name).split('/').pop()]: bins };

  for (const [binName, relativeTarget] of Object.entries(bins)) {
    const targetAbs = path.join(packageDir, relativeTarget);
    const linkAbs = path.join(binDir, binName);
    fs.rmSync(linkAbs, { force: true });
    fs.symlinkSync(path.relative(binDir, targetAbs), linkAbs);
    try { fs.chmodSync(targetAbs, 0o755); } catch {}
  }
}

console.log(`[hydrate-node-modules-from-npm-cache] OK: compatible packages ${entries.length}, extracted ${extracted}, skipped ${skipped}`);
