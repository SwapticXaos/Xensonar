#!/usr/bin/env node
import fs from 'node:fs';

const failures = [];
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const requireFile = (file) => {
  if (!fs.existsSync(file)) failures.push(`missing file ${file}`);
};
const requireText = (label, content, needle) => {
  if (!content.includes(needle)) failures.push(`${label} missing marker: ${needle}`);
};
const forbidText = (label, content, needle) => {
  if (content.includes(needle)) failures.push(`${label} must not contain marker: ${needle}`);
};

const componentPath = 'src/features/l3lab/spectralForge/components/TransportBar.tsx';
const presentationPath = 'src/features/l3lab/spectralForge/components/transportBar/TransportBarPresentation.tsx';
const modelPath = 'src/features/l3lab/spectralForge/components/transportBar/transportBarUiModel.ts';
requireFile(componentPath);
requireFile(presentationPath);
requireFile(modelPath);

const component = read(componentPath);
const presentation = read(presentationPath);
const model = read(modelPath);

for (const marker of [
  './transportBar/transportBarUiModel',
  'resolveTransportPlayButtonViewModel',
  'resolveBasisHearingBridgeFill',
  'resolveTransportDurationLabel',
  'formatActivePreviewTime',
  './transportBar/TransportBarPresentation',
  '<TransportBarPresentation',
]) requireText('TransportBar.tsx', component, marker);

for (const marker of [
  './transportBarUiModel',
  'TRANSPORT_PREVIEW_MODE_BUTTONS',
  'TRANSPORT_PLAY_BUTTON_STYLE',
  'data-xensonar-spectralforge-render-fill-button="true"',
  'aria-busy=',
]) requireText('TransportBarPresentation.tsx', presentation, marker);

for (const marker of [
  'export function resolveTransportPlayButtonViewModel',
  'export function resolveCurrentPreviewLabel',
  'export function resolveTransportDurationLabel',
  'export function resolveBasisHearingBridgeFill',
  'export function buildForge3TransportBadges',
  'TRANSPORT_PREVIEW_MODE_BUTTONS',
  'sourceWindow',
  'sourceFull',
  'forge',
]) requireText('transportBarUiModel.ts', model, marker);

for (const forbidden of [
  'audioEngine',
  'AudioEngine',
  'useStore(',
  'useState(',
  'useEffect(',
  'playSpectralForge',
  'prewarmSpectralForge',
  'importAudioSourceToSpectralData',
  'renderAudioImportPreview',
  'registerExternalMaterialPackage',
  'triggerSpectralForgeDownloadUrl',
]) forbidText('transportBarUiModel.ts', model, forbidden);

for (const forbiddenLocalBlock of [
  'const previewModeButtons',
  'const timeStr =',
  'const playButtonSymbol =',
  'const playButtonRenderStyle',
  'basisHearingBridgeMatchesCurrentRoute',
  'basisHearingBridgeFillPercent',
]) forbidText('TransportBar.tsx', component, forbiddenLocalBlock);

for (const forbiddenExecution of [
  'audioEngine.play(',
  'audioEngine.stop()',
  'prewarmSpectralForge',
  'playSpectralForge',
]) forbidText('TransportBarPresentation.tsx', presentation, forbiddenExecution);

if (!component.includes('audioEngine.play(') || !component.includes('audioEngine.stop()')) {
  failures.push('TransportBar.tsx should still own existing playback/stop calls; this slice must not move audio execution into the UI model.');
}

if (failures.length) {
  console.error('[spectralforge-transportbar-ui-boundary-refactor-7768] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  check: 'spectralforge-transportbar-ui-boundary-refactor-7768',
  boundary: 'transport-bar-ui-model',
  runtimeExecutionMoved: false,
}, null, 2));
