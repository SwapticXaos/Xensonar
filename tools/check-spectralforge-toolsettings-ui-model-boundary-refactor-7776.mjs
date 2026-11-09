#!/usr/bin/env node
import fs from 'node:fs';

const failures = [];
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const requireFile = (file) => { if (!fs.existsSync(file)) failures.push(`missing file ${file}`); };
const requireText = (label, content, needle) => { if (!content.includes(needle)) failures.push(`${label} missing marker: ${needle}`); };
const forbidText = (label, content, needle) => { if (content.includes(needle)) failures.push(`${label} must not contain marker: ${needle}`); };

const componentPath = 'src/features/l3lab/spectralForge/components/ToolSettings.tsx';
const modelPath = 'src/features/l3lab/spectralForge/components/toolSettings/toolSettingsUiModel.ts';
requireFile(componentPath);
requireFile(modelPath);
const component = read(componentPath);
const model = read(modelPath);

for (const marker of [
  './toolSettings/toolSettingsUiModel',
  'resolveToolLabel(activeTool',
  'resolveToolDomain(activeTool)',
  'resolveDisplayToolDomain({ activeTool, forge3EditTarget })',
  'resolveSpecialToolHelp({ activeTool',
  'shouldShowBrushHardness(activeTool)',
  'MORPH_MODE_OPTIONS.map',
  'resolveGrainLabel(toolSettings.grainSize)',
]) requireText('ToolSettings.tsx', component, marker);

for (const marker of [
  'export function resolveToolLabel',
  'export function shouldShowBrushHardness',
  'export function resolveDisplayToolDomain',
  'export function resolveToolDomain',
  'export function resolveGrainLabel',
  'export function resolveSpecialToolHelp',
  'export const MORPH_MODE_OPTIONS',
]) requireText('toolSettingsUiModel.ts', model, marker);

for (const forbidden of [
  'useStore',
  'useState',
  'useEffect',
  'audioEngine',
  'AudioEngine',
  'document.',
  'window.',
  'localStorage',
  'sessionStorage',
]) forbidText('toolSettingsUiModel.ts', model, forbidden);

for (const forbiddenLocalBlock of [
  'const toolLabel: Record',
  'const grainLabel =',
  "(['brush', 'harmonicBrush'",
  "{ id: 'push', label: 'Verziehen' }",
  "activeTool === 'smudge' &&",
]) forbidText('ToolSettings.tsx', component, forbiddenLocalBlock);

if (!component.includes('updateToolSettings({ brushSize: Number(e.target.value) })')) failures.push('ToolSettings.tsx must still own brush setting writes; this slice should move view-model decisions only.');
if (!component.includes("setForge3EditTarget('linked_body')")) failures.push('ToolSettings.tsx must still own Forge3 edit target actions; this slice should not move store writes into the model.');

if (failures.length) {
  console.error('[spectralforge-toolsettings-ui-model-boundary-refactor-7776] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  check: 'spectralforge-toolsettings-ui-model-boundary-refactor-7776',
  boundary: 'tool-settings-ui-model',
  runtimeExecutionMoved: false,
  storeWritesMoved: false,
}, null, 2));
