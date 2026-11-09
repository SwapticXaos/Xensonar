#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const manifestPath = path.join(repoRoot, 'tools', 'xensonar-check-manifest.json');
const packagePath = path.join(repoRoot, 'package.json');
const expectedGroups = [
  'static',
  'boundary',
  'contract',
  'lifecycle',
  'audio-contract',
  'regression',
  'build',
];

function fail(message) {
  console.error(`[xensonar][check-taxonomy] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(manifestPath)) fail('Missing tools/xensonar-check-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (![1, 2].includes(manifest.schemaVersion)) fail('Expected schemaVersion: 1 or 2');
if (!manifest.groups || typeof manifest.groups !== 'object') fail('Missing groups object.');
if (manifest.schemaVersion >= 2 && (!manifest.focusGroups || typeof manifest.focusGroups !== 'object')) {
  fail('schemaVersion >= 2 requires focusGroups object.');
}

for (const group of expectedGroups) {
  if (!Array.isArray(manifest.groups[group])) fail(`Missing manifest group: ${group}`);
}

const toolsDir = path.join(repoRoot, 'tools');
const expectedFiles = fs.readdirSync(toolsDir)
  .filter((name) => (/^(check|audit)-.*\.mjs$/).test(name))
  .map((name) => `tools/${name}`)
  .sort();

const seen = new Map();
for (const [group, entries] of Object.entries(manifest.groups)) {
  if (!expectedGroups.includes(group)) fail(`Unexpected group in manifest: ${group}`);
  for (const entry of entries) {
    if (typeof entry !== 'string') fail(`Non-string entry in group ${group}`);
    if (!entry.startsWith('tools/')) fail(`Entry must be tools-relative: ${entry}`);
    const fullPath = path.join(repoRoot, entry);
    if (!fs.existsSync(fullPath)) fail(`Manifest entry points to missing file: ${entry}`);
    const prior = seen.get(entry);
    if (prior) fail(`Duplicate manifest entry: ${entry} in ${prior} and ${group}`);
    seen.set(entry, group);
  }
}

const missing = expectedFiles.filter((entry) => !seen.has(entry));
const extra = Array.from(seen.keys()).filter((entry) => !expectedFiles.includes(entry));
if (missing.length > 0) fail(`Missing ${missing.length} check/audit file(s) in taxonomy manifest. First missing: ${missing.slice(0, 10).join(', ')}`);
if (extra.length > 0) fail(`Manifest contains ${extra.length} non-check/audit file(s). First extra: ${extra.slice(0, 10).join(', ')}`);


if (manifest.schemaVersion >= 2) {
  const groupedEntries = new Set(seen.keys());
  for (const [focusName, entries] of Object.entries(manifest.focusGroups)) {
    if (!Array.isArray(entries)) fail(`Focus group "${focusName}" must be an array.`);
    if (entries.length === 0) fail(`Focus group "${focusName}" must not be empty.`);
    for (const entry of entries) {
      if (typeof entry !== 'string') fail(`Non-string entry in focus group ${focusName}`);
      const fullPath = path.join(repoRoot, entry);
      if (!fs.existsSync(fullPath)) fail(`Focus group "${focusName}" references missing entry: ${entry}`);
      // Focus suites may intentionally point at a dedicated run-*.mjs aggregator instead
      // of duplicating that runner in the primary physical check/audit taxonomy.
      if (!groupedEntries.has(entry) && !/^tools\/run-.*\.mjs$/.test(entry)) {
        fail(`Focus group "${focusName}" references entry not present in primary groups: ${entry}`);
      }
    }
  }
}

const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const requiredScripts = [
  'xensonar:check-taxonomy-manifest',
  'check:xensonar:static',
  'check:xensonar:boundary',
  'check:xensonar:contract',
  'check:xensonar:lifecycle',
  'check:xensonar:audio-contract',
  'check:xensonar:regression',
  'check:xensonar:build',
  'check:xensonar:focus:preview-session',
  'check:xensonar:focus:transport-session',
  'check:xensonar:focus:root-follow-hotkeys',
  'check:xensonar:focus:taxonomy',
];
for (const script of requiredScripts) {
  if (!pkg.scripts?.[script]) fail(`Missing package script: ${script}`);
}

const totals = Object.fromEntries(expectedGroups.map((group) => [group, manifest.groups[group].length]));
console.log('[xensonar][check-taxonomy] ok');
console.log(JSON.stringify({ total: expectedFiles.length, groups: totals }, null, 2));
