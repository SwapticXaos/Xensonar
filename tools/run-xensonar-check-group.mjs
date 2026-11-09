#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const manifestPath = path.join(repoRoot, 'tools', 'xensonar-check-manifest.json');
const args = process.argv.slice(2);
const group = args.find((arg) => !arg.startsWith('--'));
const listOnly = args.includes('--list');
const dryRun = args.includes('--dry-run');
const continueOnFailure = args.includes('--continue');

function fail(message) {
  console.error(`[xensonar][check-group] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(manifestPath)) fail(`Missing manifest: ${manifestPath}`);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const groups = manifest.groups ?? {};
const focusGroups = manifest.focusGroups ?? {};

if (!group || group === 'help' || group === '--help') {
  console.log('Usage: node tools/run-xensonar-check-group.mjs <group|focus:name> [--list|--dry-run|--continue]');
  console.log(`Groups: ${Object.keys(groups).sort().join(', ')}`);
  console.log(`Focus groups: ${Object.keys(focusGroups).sort().map((name) => `focus:${name}`).join(', ')}`);
  process.exit(group ? 0 : 1);
}

const isFocusGroup = group.startsWith('focus:');
const focusName = isFocusGroup ? group.slice('focus:'.length) : '';
const entries = isFocusGroup ? focusGroups[focusName] : groups[group];

if (!Array.isArray(entries)) {
  const availableGroups = Object.keys(groups).sort().join(', ');
  const availableFocusGroups = Object.keys(focusGroups).sort().map((name) => `focus:${name}`).join(', ');
  fail(`Unknown group "${group}". Available: ${availableGroups}. Focus: ${availableFocusGroups}`);
}

if (listOnly || dryRun) {
  for (const entry of entries) console.log(entry);
  process.exit(0);
}

let failures = 0;
for (const entry of entries) {
  const scriptPath = path.join(repoRoot, entry);
  if (!fs.existsSync(scriptPath)) {
    console.error(`[xensonar][check-group] missing: ${entry}`);
    failures += 1;
    if (!continueOnFailure) break;
    continue;
  }
  console.log(`\n[xensonar][check-group:${group}] node ${entry}`);
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    failures += 1;
    console.error(`[xensonar][check-group:${group}] failed: ${entry} (${result.status})`);
    if (!continueOnFailure) break;
  }
}

if (failures > 0) fail(`${failures} check(s) failed in group "${group}".`);
console.log(`\n[xensonar][check-group:${group}] ok (${entries.length} checks)`);
