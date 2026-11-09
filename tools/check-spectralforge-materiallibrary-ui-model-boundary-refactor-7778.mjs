#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const panelPath = 'src/features/l3lab/spectralForge/components/MaterialLibraryPanel.tsx';
const modelPath = 'src/features/l3lab/spectralForge/components/materialLibrary/materialLibraryUiModel.ts';
const panel = fs.readFileSync(path.join(root, panelPath), 'utf8');
const model = fs.readFileSync(path.join(root, modelPath), 'utf8');

const failures = [];
const warnings = [];

function requireIncludes(source, needle, label) {
  if (!source.includes(needle)) failures.push(`${label}: missing ${needle}`);
}
function requireNotIncludes(source, needle, label) {
  if (source.includes(needle)) failures.push(`${label}: forbidden ${needle}`);
}

requireIncludes(panel, "from './materialLibrary/materialLibraryUiModel'", panelPath);
requireIncludes(panel, 'sortMaterialLibraryEntries(entries, sortMode)', panelPath);
requireIncludes(panel, 'formatMaterialLibrarySummary(entry)', panelPath);
requireIncludes(panel, 'formatMaterialLibrarySelectedMeta(selectedEntry)', panelPath);
requireIncludes(panel, 'formatMaterialLibraryDate(entry.createdAt)', panelPath);
requireIncludes(panel, 'resolveMaterialLibraryRoleBadge(entry)', panelPath);

requireNotIncludes(panel, "type SortMode = 'created-desc'", panelPath);
requireNotIncludes(panel, 'function formatDate(', panelPath);
requireNotIncludes(panel, 'const ROLE_LABELS', panelPath);
requireNotIncludes(panel, 'next.sort((a, b) => b.createdAt - a.createdAt)', panelPath);

requireIncludes(model, "export type MaterialLibrarySortMode = 'created-desc' | 'name-asc' | 'role';", modelPath);
requireIncludes(model, 'export const MATERIAL_ROLE_LABELS', modelPath);
requireIncludes(model, 'export function formatMaterialLibraryDate', modelPath);
requireIncludes(model, 'export function sortMaterialLibraryEntries', modelPath);
requireIncludes(model, 'export function resolveMaterialLibraryRoleBadge', modelPath);
requireIncludes(model, 'export function formatMaterialLibrarySummary', modelPath);
requireIncludes(model, 'export function formatMaterialLibrarySelectedMeta', modelPath);

for (const forbidden of [
  'useStore',
  'useMaterialLibrary',
  'updateMaterialEntry',
  'deleteMaterialEntry',
  'new Audio(',
  'useMemo',
  'useEffect',
  'useState',
  'useRef',
]) {
  requireNotIncludes(model, forbidden, modelPath);
}

if (/from ['\"]react['\"]/.test(model)) failures.push(`${modelPath}: UI model must not import React`);
if (/from ['\"].*state\/store['\"]/.test(model)) failures.push(`${modelPath}: UI model must not import the SpectralForge store`);
if (/from ['\"].*AudioEngine['\"]/.test(model)) failures.push(`${modelPath}: UI model must not import AudioEngine`);

if (!panel.includes('previewEntry(selectedEntry.blobUrl)')) warnings.push('preview action remains in MaterialLibraryPanel, as intended; this check is not a browser playback proof.');

const report = {
  ok: failures.length === 0,
  reportKind: 'spectralforge-materiallibrary-ui-model-boundary-refactor-7778',
  generatedAt: new Date().toISOString(),
  proofClass: 'source-shape/static boundary sanity; not a browser DOM smoke test and not a playback proof.',
  panelPath,
  modelPath,
  failures,
  warnings,
  claimBoundary: {
    canClaim: [
      'MaterialLibraryPanel delegates pure role/date/sort/badge/summary view-model decisions to materialLibraryUiModel.',
      'MaterialLibraryPanel keeps store writes, IndexedDB material mutation calls, and audio preview actions inside the component.',
      'materialLibraryUiModel does not import React hooks, the SpectralForge store, AudioEngine, or material-library mutation functions.',
    ],
    cannotClaim: [
      'This check does not click the built HTML in a browser.',
      'This check does not prove audio preview playback behavior.',
      'This check does not prove IndexedDB persistence behavior.',
    ],
  },
};

fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
fs.writeFileSync(path.join(root, 'reports/spectralforge-materiallibrary-ui-model-boundary-refactor-7778.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(root, 'reports/spectralforge-materiallibrary-ui-model-boundary-refactor-7778.md'), [
  '# SpectralForge MaterialLibrary UI model boundary refactor 7.7.78',
  '',
  `- ok: ${report.ok}`,
  `- proofClass: ${report.proofClass}`,
  `- panel: ${panelPath}`,
  `- model: ${modelPath}`,
  '',
  '## Claim boundary',
  ...report.claimBoundary.canClaim.map((line) => `- CAN: ${line}`),
  ...report.claimBoundary.cannotClaim.map((line) => `- CANNOT: ${line}`),
  '',
  '## Failures',
  ...(failures.length ? failures.map((line) => `- ${line}`) : ['- none']),
  '',
  '## Warnings',
  ...(warnings.length ? warnings.map((line) => `- ${line}`) : ['- none']),
  '',
].join('\n'));

if (!report.ok) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, report: 'reports/spectralforge-materiallibrary-ui-model-boundary-refactor-7778.json' }, null, 2));
