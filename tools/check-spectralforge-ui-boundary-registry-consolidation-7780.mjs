#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sharedPath = 'src/features/l3lab/spectralForge/components/uiModel/spectralForgeUiModelShared.ts';
const materialModelPath = 'src/features/l3lab/spectralForge/components/materialLibrary/materialLibraryUiModel.ts';
const customModelPath = 'src/features/l3lab/spectralForge/components/customStampLibrary/customStampLibraryUiModel.ts';
const materialPanelPath = 'src/features/l3lab/spectralForge/components/MaterialLibraryPanel.tsx';
const shared = fs.readFileSync(path.join(root, sharedPath), 'utf8');
const materialModel = fs.readFileSync(path.join(root, materialModelPath), 'utf8');
const customModel = fs.readFileSync(path.join(root, customModelPath), 'utf8');
const materialPanel = fs.readFileSync(path.join(root, materialPanelPath), 'utf8');

const failures = [];
const warnings = [];

function requireIncludes(source, needle, label) {
  if (!source.includes(needle)) failures.push(`${label}: missing ${needle}`);
}
function requireNotIncludes(source, needle, label) {
  if (source.includes(needle)) failures.push(`${label}: forbidden ${needle}`);
}

requireIncludes(shared, 'export function formatSpectralForgeLocaleDate', sharedPath);
requireIncludes(shared, 'export function buildSpectralForgeSelectedEntryClass', sharedPath);
requireIncludes(shared, 'export function formatSpectralForgeCountLabel', sharedPath);
requireNotIncludes(shared, "from 'react'", sharedPath);
requireNotIncludes(shared, 'useStore', sharedPath);
requireNotIncludes(shared, 'AudioEngine', sharedPath);
requireNotIncludes(shared, 'window.', sharedPath);

requireIncludes(materialModel, "from '../uiModel/spectralForgeUiModelShared'", materialModelPath);
requireIncludes(materialModel, 'export function formatMaterialLibraryDate', materialModelPath);
requireIncludes(materialModel, 'return formatSpectralForgeLocaleDate(value)', materialModelPath);
requireIncludes(materialModel, 'export function resolveMaterialLibraryEntryClass', materialModelPath);
requireIncludes(materialModel, 'return buildSpectralForgeSelectedEntryClass(selected)', materialModelPath);
requireIncludes(customModel, "from '../uiModel/spectralForgeUiModelShared'", customModelPath);
requireIncludes(customModel, 'export function formatCustomStampDate', customModelPath);
requireIncludes(customModel, 'return formatSpectralForgeLocaleDate(value)', customModelPath);
requireIncludes(customModel, "return formatSpectralForgeCountLabel(count, 'Stempel')", customModelPath);
requireIncludes(customModel, 'return buildSpectralForgeSelectedEntryClass(selected)', customModelPath);
requireIncludes(materialPanel, 'resolveMaterialLibraryEntryClass(selected)', materialPanelPath);

for (const [label, source] of [
  [materialModelPath, materialModel],
  [customModelPath, customModel],
]) {
  requireNotIncludes(source, 'new Date(value).toLocaleString()', label);
  requireNotIncludes(source, "selected ? 'border-cyan-600/70 bg-cyan-950/20'", label);
}

for (const [label, source] of [
  [sharedPath, shared],
  [materialModelPath, materialModel],
  [customModelPath, customModel],
]) {
  for (const forbidden of [
    'useEffect',
    'useMemo',
    'useState',
    'useRef',
    'useMaterialLibrary',
    'useCustomStampLibrary',
    'saveCustomStamp',
    'deleteCustomStamp',
    'updateMaterialEntry',
    'deleteMaterialEntry',
    'new Audio(',
    'audioEngine',
    'setStampData',
    'setActiveTool',
  ]) {
    requireNotIncludes(source, forbidden, label);
  }
}

warnings.push('This is source-shape/static boundary sanity. It proves shared UI-model helpers are used, not browser behaviour or persistence.');
warnings.push('Only identical low-risk helpers were consolidated; domain-specific labels remain in their local UI models.');

const report = {
  ok: failures.length === 0,
  reportKind: 'spectralforge-ui-boundary-registry-consolidation-7780',
  generatedAt: new Date().toISOString(),
  proofClass: 'source-shape/static boundary consolidation sanity; not a browser DOM smoke test.',
  sharedPath,
  consolidatedModels: [materialModelPath, customModelPath],
  failures,
  warnings,
  claimBoundary: {
    canClaim: [
      'MaterialLibrary and CustomStampLibrary now reuse one shared date formatter and selected-entry class helper.',
      'The shared helper module stays free of React hooks, stores, browser globals, AudioEngine, and persistence/mutation functions.',
      'Domain-specific labels and behaviour remain in their local panels or local UI models.',
    ],
    cannotClaim: [
      'This check does not click the built HTML in a browser.',
      'This check does not prove material preview, IndexedDB persistence, Melodic-Loop handoff, or audio behaviour.',
    ],
  },
};

fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
fs.writeFileSync(path.join(root, 'reports/spectralforge-ui-boundary-registry-consolidation-7780.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(root, 'reports/spectralforge-ui-boundary-registry-consolidation-7780.md'), [
  '# SpectralForge UI boundary registry consolidation 7.7.80',
  '',
  `- ok: ${report.ok}`,
  `- proofClass: ${report.proofClass}`,
  `- sharedPath: ${sharedPath}`,
  `- consolidatedModels: ${report.consolidatedModels.join(', ')}`,
  `- failures: ${failures.length}`,
  `- warnings: ${warnings.length}`,
  '',
  '## Claim boundary',
  ...report.claimBoundary.canClaim.map((line) => `- CAN: ${line}`),
  ...report.claimBoundary.cannotClaim.map((line) => `- CANNOT: ${line}`),
  '',
  '## Warnings',
  ...warnings.map((line) => `- ${line}`),
  '',
].join('\n'));

console.log(JSON.stringify({ ok: report.ok, failures: failures.length, warnings: warnings.length }, null, 2));
process.exit(report.ok ? 0 : 1);
