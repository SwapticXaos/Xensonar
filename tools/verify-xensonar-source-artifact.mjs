#!/usr/bin/env node
import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const warnings = [];

function exists(path) {
  return existsSync(join(root, path));
}

function listFilesRecursive(dir) {
  const full = join(root, dir);
  if (!existsSync(full)) return [];
  const out = [];
  const stack = [full];
  while (stack.length) {
    const current = stack.pop();
    for (const name of readdirSync(current)) {
      if (name === '.git' || name === 'node_modules' || name === 'dist') continue;
      const next = join(current, name);
      const st = statSync(next);
      if (st.isDirectory()) stack.push(next);
      else if (st.isFile()) out.push(relative(root, next));
    }
  }
  return out.sort();
}

function requireFile(path) {
  if (!exists(path)) failures.push(`missing file: ${path}`);
}

function requireNonEmptyDir(path, minFiles = 1) {
  if (!exists(path)) {
    failures.push(`missing directory: ${path}`);
    return;
  }
  const files = listFilesRecursive(path);
  if (files.length < minFiles) failures.push(`empty or incomplete directory: ${path} (${files.length} files, expected >= ${minFiles})`);
}

requireFile('package.json');
requireFile('package-lock.json');
requireFile('src/App.tsx');
requireFile('tools/xensonar-patch-html.sh');
requireFile('scripts/inspect-singlefile-html.mjs');
requireFile('scripts/assert-singlefile-budget.mjs');
requireFile('public/xensonar-family-standalone/manifest.json');

requireNonEmptyDir('src/features/xensonar/material', 5);
requireNonEmptyDir('src/features/xensonar/rootFollow', 5);
requireNonEmptyDir('src/features/xensonar/audioTraffic', 1);
requireNonEmptyDir('src/features/l3lab/spectralForge', 20);
requireNonEmptyDir('src/features/l3lab/canonicalForge', 20);
requireNonEmptyDir('src/core/systemMemory', 3);

if (exists('node_modules')) warnings.push('node_modules exists in working tree; packaging must exclude it.');
if (exists('dist')) warnings.push('dist exists in working tree; source ZIP must exclude it.');

try {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const scripts = pkg.scripts ?? {};
  for (const scriptName of ['build:production', 'inspect:html', 'assert:html-budget', 'patch:setup', 'patch:html', 'xensonar:verify-source-artifact']) {
    if (!scripts[scriptName]) failures.push(`missing package script: ${scriptName}`);
  }
  if (!String(pkg.version ?? '').trim()) failures.push('package.json version is empty');
} catch (error) {
  failures.push(`package.json is not readable JSON: ${error instanceof Error ? error.message : String(error)}`);
}

const zipPath = process.env.XENSONAR_SOURCE_ZIP;
if (zipPath) {
  try {
    const listing = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
    const forbidden = listing.filter((entry) => entry.includes('/node_modules/') || entry.startsWith('node_modules/') || entry.includes('/dist/') || entry.startsWith('dist/'));
    if (forbidden.length) failures.push(`source ZIP contains forbidden build artifacts: ${forbidden.slice(0, 8).join(', ')}${forbidden.length > 8 ? ' …' : ''}`);
  } catch (error) {
    warnings.push(`could not inspect XENSONAR_SOURCE_ZIP=${zipPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (warnings.length) {
  console.warn('[xensonar-source-verify] warnings:');
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (failures.length) {
  console.error('[xensonar-source-verify] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[xensonar-source-verify] ok');
console.log(JSON.stringify({
  root,
  version: JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version,
  criticalDirectories: {
    material: listFilesRecursive('src/features/xensonar/material').length,
    rootFollow: listFilesRecursive('src/features/xensonar/rootFollow').length,
    audioTraffic: listFilesRecursive('src/features/xensonar/audioTraffic').length,
    spectralForge: listFilesRecursive('src/features/l3lab/spectralForge').length,
    canonicalForge: listFilesRecursive('src/features/l3lab/canonicalForge').length,
    systemMemory: listFilesRecursive('src/core/systemMemory').length,
  },
}, null, 2));
