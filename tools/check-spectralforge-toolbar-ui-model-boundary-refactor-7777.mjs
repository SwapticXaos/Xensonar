#!/usr/bin/env node
import fs from 'node:fs';

const failures = [];
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const requireFile = (file) => { if (!fs.existsSync(file)) failures.push(`missing file ${file}`); };
const requireText = (label, content, needle) => { if (!content.includes(needle)) failures.push(`${label} missing marker: ${needle}`); };
const forbidText = (label, content, needle) => { if (content.includes(needle)) failures.push(`${label} must not contain marker: ${needle}`); };

const componentPath = 'src/features/l3lab/spectralForge/components/Toolbar.tsx';
const modelPath = 'src/features/l3lab/spectralForge/components/toolbar/toolbarUiModel.ts';
requireFile(componentPath);
requireFile(modelPath);
const component = read(componentPath);
const model = read(modelPath);

for (const marker of [
  './toolbar/toolbarUiModel',
  'TOOLBAR_TOOLS.map',
  'buildToolButtonTitle(tool)',
  'resolveToolButtonClass(activeTool, tool.id)',
  'resolveEraseModeTitle(eraseMode)',
  'resolveEraseModeClass(eraseMode)',
  'resolveEraseModeLabel(eraseMode)',
  'resolveStampPresetCategories(stampPresets)',
  'resolveVisibleStampPresetCategories(stampPresets, selectedCategory)',
  'resolveStampPresetsByCategory(stampPresets, category)',
]) requireText('Toolbar.tsx', component, marker);

for (const marker of [
  'export const TOOLBAR_TOOLS',
  'export function buildToolButtonTitle',
  'export function resolveToolButtonClass',
  'export function resolveEraseModeTitle',
  'export function resolveEraseModeLabel',
  'export function resolveEraseModeClass',
  'export function resolveStampPresetCategories',
  'export function resolveVisibleStampPresetCategories',
  'export function resolveStampPresetsByCategory',
  'export function resolveStampCategoryFilterClass',
  'export function resolveStampCategoryHeaderLabel',
  'export function resolveStampPresetButtonClass',
]) requireText('toolbarUiModel.ts', model, marker);

for (const forbidden of [
  'useStore',
  'useState',
  'useEffect',
  'setActiveTool',
  'setStampData',
  'setStampPhase',
  'resetStampTransform',
  'updateToolSettings',
  'document.',
  'window.',
  'localStorage',
  'sessionStorage',
  'audioEngine',
  'AudioEngine',
]) forbidText('toolbarUiModel.ts', model, forbidden);

for (const forbiddenLocalBlock of [
  'const tools:',
  "{ id: 'brush', icon: '🖌️'",
  'Array.from(new Set(stampPresets.map',
  "preset.legacy ? 'legacy' : preset.category",
  "category === 'legacy' ? 'legacy bank'",
]) forbidText('Toolbar.tsx', component, forbiddenLocalBlock);

for (const retainedAction of [
  "setActiveTool('stamp')",
  'updateToolSettings({ brushSize: preset.defaultSize, intensity: preset.defaultIntensity })',
  'setStampData({',
  'resetStampTransform();',
  "setStampPhase('stamping')",
  'window.addEventListener',
]) requireText('Toolbar.tsx', component, retainedAction);

if (failures.length) {
  console.error('[spectralforge-toolbar-ui-model-boundary-refactor-7777] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  check: 'spectralforge-toolbar-ui-model-boundary-refactor-7777',
  boundary: 'toolbar-ui-model',
  runtimeExecutionMoved: false,
  storeWritesMoved: false,
  stampPresetActionsMoved: false,
}, null, 2));
