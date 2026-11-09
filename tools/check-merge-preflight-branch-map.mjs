#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const jsonPath = path.join(root, 'reports/merge-prep/3.2.91.6.9.215_branch_map.json');
const mdPath = path.join(root, 'reports/merge-prep/3.2.91.6.9.215_branch_map.md');
const pkgPath = path.join(root, 'package.json');

function fail(message) {
  console.error(`[merge-preflight-branch-map] ${message}`);
  process.exit(1);
}

function read(filePath) {
  if (!fs.existsSync(filePath)) fail(`Missing required file: ${path.relative(root, filePath)}`);
  return fs.readFileSync(filePath, 'utf8');
}

const map = JSON.parse(read(jsonPath));
const md = read(mdPath);
const pkg = JSON.parse(read(pkgPath));

if (pkg.version !== '3.2.91.6.9.216') {
  fail(`package.json version must be 3.2.91.6.9.216, got ${pkg.version}`);
}

if (map.schema !== 'xensonar-merge-preflight-branch-map/v1') fail('Unexpected schema.');
if (map.branchTip !== '3.2.91.6.9.215_resonance_panel_identity_wrapper_cleanup') fail('Unexpected branchTip.');
if (map.generatedFor !== '3.2.91.6.9.216_merge_preflight_branch_map') fail('Unexpected generatedFor.');

const counts = map.fileDeltaCounts ?? {};
if (counts.added < 40 || counts.modified < 30 || counts.deleted < 4) {
  fail(`File-delta counts look incomplete: ${JSON.stringify(counts)}`);
}

const requiredHotspots = [
  'package.json',
  'package-lock.json',
  'src/features/l3lab/canonicalForge/CanonicalForgeRoom.tsx',
  'src/features/l3lab/materialIntake/MaterialIntakePanel.tsx',
  'src/features/l3lab/canonicalForge/melodicLoopPanel.tsx',
  'src/App.tsx',
];
const hotspotPaths = new Set((map.mergeHotspots ?? []).map((entry) => entry.path));
for (const required of requiredHotspots) {
  if (!hotspotPaths.has(required)) fail(`Missing merge hotspot: ${required}`);
}

const functionalTitles = (map.functionalChanges ?? []).map((entry) => entry.title).join('\n');
for (const phrase of ['Real export title', 'Sample menu viewport', 'Cut upload route']) {
  if (!functionalTitles.includes(phrase)) fail(`Missing functional-change marker: ${phrase}`);
}

const nonGoals = (map.nonGoals ?? []).join('\n');
for (const phrase of ['Keine AudioEngine', 'Keine Root-Follow', 'Keine Materialspur']) {
  if (!nonGoals.includes(phrase)) fail(`Missing non-goal marker: ${phrase}`);
}

const markdownMustContain = [
  '# Xensonar 3.2.91.6.9.215 — Merge-Preflight Branch Map',
  '## Funktionale Aenderungen',
  '## Merge-Hotspots',
  '## Bewusst nicht geaendert',
  'git merge-base',
  'git rerere',
  'git merge --no-commit --no-ff',
];
for (const needle of markdownMustContain) {
  if (!md.includes(needle)) fail(`Markdown report missing: ${needle}`);
}

const forbiddenReportPaths = [
  'node_modules',
  '/dist/',
];
for (const needle of forbiddenReportPaths) {
  if (JSON.stringify(map.fileDeltas).includes(needle)) {
    fail(`Report file-deltas must not include build/install artifact path: ${needle}`);
  }
}

console.log('[merge-preflight-branch-map] ok');
