#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const panelPath = 'src/features/l3lab/spectralForge/components/CustomStampLibraryPanel.tsx';
const modelPath = 'src/features/l3lab/spectralForge/components/customStampLibrary/customStampLibraryUiModel.ts';
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

requireIncludes(panel, "from './customStampLibrary/customStampLibraryUiModel'", panelPath);
requireIncludes(panel, 'formatCustomStampCountLabel(entries.length)', panelPath);
requireIncludes(panel, 'resolveCustomStampExpandGlyph(expanded)', panelPath);
requireIncludes(panel, 'resolveSendStampButtonLabel(sentFlash)', panelPath);
requireIncludes(panel, 'formatCurrentStampSummary(stampData)', panelPath);
requireIncludes(panel, 'CUSTOM_STAMP_LIBRARY_EMPTY_MESSAGE', panelPath);
requireIncludes(panel, 'resolveCustomStampEntryClass(selected)', panelPath);
requireIncludes(panel, 'formatCustomStampEntryMeta(entry)', panelPath);
requireIncludes(panel, 'setStampData({', panelPath);
requireIncludes(panel, 'selectedEntry.stamp.data.slice()', panelPath);
requireIncludes(panel, 'selectedEntry.stamp.grainData.slice()', panelPath);
requireIncludes(panel, 'saveCustomStamp({ name: stampName, stamp: stampData })', panelPath);
requireIncludes(panel, 'deleteCustomStamp(selectedId)', panelPath);

requireNotIncludes(panel, 'function formatDate(', panelPath);
requireNotIncludes(panel, "{entries.length} Stempel", panelPath);
requireNotIncludes(panel, "{expanded ? '▲' : '▼'}", panelPath);
requireNotIncludes(panel, "sentFlash ? 'Gesendet ✓'", panelPath);
requireNotIncludes(panel, 'geändert {formatDate(entry.updatedAt)}', panelPath);

requireIncludes(model, 'export const CUSTOM_STAMP_LIBRARY_EMPTY_MESSAGE', modelPath);
requireIncludes(model, 'export function formatCustomStampDate', modelPath);
requireIncludes(model, 'export function formatCustomStampCountLabel', modelPath);
requireIncludes(model, 'export function resolveCustomStampExpandGlyph', modelPath);
requireIncludes(model, 'export function resolveSendStampButtonLabel', modelPath);
requireIncludes(model, 'export function formatCurrentStampSummary', modelPath);
requireIncludes(model, 'export function formatCustomStampEntryMeta', modelPath);
requireIncludes(model, 'export function resolveCustomStampEntryClass', modelPath);

for (const forbidden of [
  'useStore',
  'useCustomStampLibrary',
  'saveCustomStamp',
  'deleteCustomStamp',
  'setStampData',
  'setActiveTool',
  'resetStampTransform',
  'setStampPhase',
  'onSendStampAsMelodicSample',
  'window.',
  'useMemo',
  'useEffect',
  'useState',
  'Float32Array',
]) {
  requireNotIncludes(model, forbidden, modelPath);
}

if (/from ['\"]react['\"]/.test(model)) failures.push(`${modelPath}: UI model must not import React`);
if (/from ['\"].*state\/store['\"]/.test(model)) failures.push(`${modelPath}: UI model must not import the SpectralForge store`);
if (/from ['\"].*AudioEngine['\"]/.test(model)) failures.push(`${modelPath}: UI model must not import AudioEngine`);
if (/from ['\"].*customStampLibrary['\"]/.test(model) && /saveCustomStamp|deleteCustomStamp|useCustomStampLibrary/.test(model)) {
  failures.push(`${modelPath}: UI model must not import custom stamp mutation/subscription functions`);
}

warnings.push('This check is source-shape/static boundary sanity; it does not click the Custom-Stempelbibliothek disclosure or prove IndexedDB persistence.');

const report = {
  ok: failures.length === 0,
  reportKind: 'spectralforge-customstamp-ui-model-boundary-refactor-7779',
  generatedAt: new Date().toISOString(),
  proofClass: 'source-shape/static boundary sanity; not a browser DOM smoke test and not an IndexedDB persistence proof.',
  panelPath,
  modelPath,
  failures,
  warnings,
  claimBoundary: {
    canClaim: [
      'CustomStampLibraryPanel delegates pure label/date/button/count/class/summary view-model decisions to customStampLibraryUiModel.',
      'CustomStampLibraryPanel keeps store actions, stamp data cloning, IndexedDB custom-stamp mutations, and Melodic-Loop send callbacks inside the component.',
      'customStampLibraryUiModel does not import React hooks, SpectralForge store actions, AudioEngine, browser globals, or custom-stamp mutation functions.',
    ],
    cannotClaim: [
      'This check does not click the built HTML in a browser.',
      'This check does not prove IndexedDB save/delete persistence behavior.',
      'This check does not prove Melodic-Loop sample handoff behavior.',
    ],
  },
};

fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
fs.writeFileSync(path.join(root, 'reports/spectralforge-customstamp-ui-model-boundary-refactor-7779.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(root, 'reports/spectralforge-customstamp-ui-model-boundary-refactor-7779.md'), [
  '# SpectralForge CustomStamp UI model boundary refactor 7.7.79',
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
console.log(JSON.stringify({ ok: true, report: 'reports/spectralforge-customstamp-ui-model-boundary-refactor-7779.json' }, null, 2));
