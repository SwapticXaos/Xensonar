#!/usr/bin/env node
import fs from 'node:fs';

const failures = [];
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const panelPath = 'src/features/l3lab/spectralForge/components/SpectralCanvas.tsx';
const boundaryDir = 'src/features/l3lab/spectralForge/components/spectralCanvas';
const files = {
  panel: panelPath,
  visuals: `${boundaryDir}/spectralCanvasVisuals.ts`,
  hud: `${boundaryDir}/SpectralCanvasHud.tsx`,
  renderer: `${boundaryDir}/spectralCanvasRenderer.ts`,
  editCommit: `${boundaryDir}/spectralCanvasEditCommit.ts`,
  paintStroke: `${boundaryDir}/spectralCanvasPaintStroke.ts`,
  navigator: `${boundaryDir}/useSpectralCanvasNavigator.ts`,
  overlayRenderer: `${boundaryDir}/spectralCanvasOverlayRenderer.ts`,
  lifecycle: `${boundaryDir}/useSpectralCanvasLifecycle.ts`,
};

for (const file of Object.values(files)) {
  if (!fs.existsSync(file)) failures.push(`missing ${file}`);
}

const panel = read(files.panel);
const visuals = read(files.visuals);
const hud = read(files.hud);
const renderer = read(files.renderer);
const editCommit = read(files.editCommit);
const paintStroke = read(files.paintStroke);
const navigator = read(files.navigator);
const overlayRenderer = read(files.overlayRenderer);
const lifecycle = read(files.lifecycle);

function requireText(label, content, needle) {
  if (!content.includes(needle)) failures.push(`${label} missing ${needle}`);
}
function forbidText(label, content, needle) {
  if (content.includes(needle)) failures.push(`${label} still contains ${needle}`);
}

requireText('overlay renderer imports visuals boundary', overlayRenderer, './spectralCanvasVisuals');
requireText('SpectralCanvas imports HUD boundary', panel, './spectralCanvas/SpectralCanvasHud');
requireText('SpectralCanvas imports renderer boundary', panel, './spectralCanvas/spectralCanvasRenderer');
requireText('SpectralCanvas imports edit commit boundary', panel, './spectralCanvas/spectralCanvasEditCommit');
requireText('SpectralCanvas imports paint stroke boundary', panel, './spectralCanvas/spectralCanvasPaintStroke');
requireText('SpectralCanvas imports navigator boundary', panel, './spectralCanvas/useSpectralCanvasNavigator');
requireText('SpectralCanvas imports overlay renderer boundary', panel, './spectralCanvas/spectralCanvasOverlayRenderer');
requireText('SpectralCanvas imports lifecycle boundary', panel, './spectralCanvas/useSpectralCanvasLifecycle');

forbidText('SpectralCanvas', panel, 'function grainToTint(');
forbidText('SpectralCanvas', panel, 'function frequencyToScreenY(');
forbidText('SpectralCanvas', panel, 'function anchorColor(');
forbidText('SpectralCanvas', panel, 'function continuityColor(');
forbidText('SpectralCanvas', panel, 'function bindingColor(');
forbidText('SpectralCanvas', panel, 'absolute bottom-1 right-1 bg-black/70');
forbidText('SpectralCanvas', panel, 'Ziehe ein Rechteck um den gewünschten Bereich');
forbidText('SpectralCanvas', panel, 'Ränder ziehen = Zeit-Zoom');

requireText('visual boundary', visuals, 'export function grainToTint');
requireText('visual boundary', visuals, 'export function frequencyToScreenY');
requireText('visual boundary', visuals, 'export function anchorColor');
requireText('visual boundary', visuals, 'export function continuityColor');
requireText('visual boundary', visuals, 'export function bindingColor');
requireText('visual boundary', visuals, 'dominantRegister');
requireText('visual boundary', visuals, 'continuityScore');
requireText('visual boundary', visuals, 'anchor.regime');

for (const marker of [
  'export function SpectralCanvasHoverInfo',
  'export function SpectralCanvasStatusBadges',
  'export function StampPhaseIndicator',
  'export function SpectralFrequencyLabels',
  'export function SpectralNavigatorBar',
  'RADIEREN',
  'Linse:',
  'Navigator',
]) requireText('HUD boundary', hud, marker);

for (const retained of [
  'previewColumn',
  'applySourceTrace',
  'applyMorph',
  'pasteCapturedStampMetadata',
  'setGuideMarker',
  'showCarrierDonorV2Overlay',
  'bindingOverlayVisible',
  'renderSpectralCanvasFrame',
  'commitSpectralCanvasAudioEdit',
  'applySpectralCanvasPaintStroke',
]) requireText('SpectralCanvas retained interactive/audio-adjacent marker', panel, retained);

requireText('lifecycle boundary', lifecycle, 'export function useSpectralCanvasRenderLifecycle');
requireText('lifecycle boundary', lifecycle, 'export function useSpectralCanvasResizeLifecycle');
requireText('lifecycle boundary', lifecycle, 'ResizeObserver');
requireText('overlay renderer boundary', overlayRenderer, 'export function renderSpectralCanvasOverlay');
requireText('overlay renderer boundary', overlayRenderer, 'screenToDataFromScreen');
requireText('navigator boundary', navigator, 'export function useSpectralCanvasNavigator');
requireText('navigator boundary', navigator, 'updateViewportFromNavigator');
requireText('navigator boundary', navigator, 'resolveSpectralNavigatorViewportPatch');
requireText('renderer boundary', renderer, 'export function renderSpectralCanvasFrame');
requireText('edit commit boundary', editCommit, 'export function commitSpectralCanvasAudioEdit');
requireText('paint stroke boundary', paintStroke, 'export function applySpectralCanvasPaintStroke');
requireText('paint stroke retains effect-domain contract', paintStroke, 'TOOL_EFFECT_DOMAIN');

const panelLines = panel.split(/\r?\n/).length;
if (panelLines > 1450) failures.push(`SpectralCanvas should stay below 1450 lines after renderer/edit/paint boundary split; saw ${panelLines}`);

if (failures.length) {
  console.error('[spectral-canvas-boundary] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  panelLines,
  extractedBoundaries: [files.visuals, files.hud, files.renderer, files.overlayRenderer, files.editCommit, files.paintStroke, files.navigator, files.lifecycle],
}, null, 2));
