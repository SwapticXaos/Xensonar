#!/usr/bin/env node
import fs from 'node:fs';

const failures = [];
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const requireFile = (file) => { if (!fs.existsSync(file)) failures.push(`missing file ${file}`); };
const requireText = (label, content, needle) => { if (!content.includes(needle)) failures.push(`${label} missing marker: ${needle}`); };
const forbidText = (label, content, needle) => { if (content.includes(needle)) failures.push(`${label} must not contain marker: ${needle}`); };

const componentPath = 'src/features/l3lab/spectralForge/components/SpectralCanvas.tsx';
const modelPath = 'src/features/l3lab/spectralForge/components/spectralCanvas/spectralCanvasViewportModel.ts';
const navigatorPath = 'src/features/l3lab/spectralForge/components/spectralCanvas/useSpectralCanvasNavigator.ts';
const lifecyclePath = 'src/features/l3lab/spectralForge/components/spectralCanvas/useSpectralCanvasLifecycle.ts';
requireFile(componentPath);
requireFile(modelPath);
requireFile(navigatorPath);
requireFile(lifecyclePath);
const component = read(componentPath);
const model = read(modelPath);
const navigator = read(navigatorPath);
const lifecycle = read(lifecyclePath);

requireText('SpectralCanvas.tsx', component, './spectralCanvas/useSpectralCanvasNavigator');
requireText('SpectralCanvas.tsx', component, './spectralCanvas/useSpectralCanvasLifecycle');
for (const marker of ['./spectralCanvasViewportModel', 'resolveSpectralNavigatorWindow', 'resolveSpectralNavigatorDragMode', 'resolveSpectralNavigatorViewportPatch', 'clampSpectralNavigatorLeft', 'type SpectralNavigatorDragMode']) requireText('useSpectralCanvasNavigator.ts', navigator, marker);
for (const marker of ['./spectralCanvasViewportModel', 'resolveSpectralCanvasHorizontalAutoFit', 'nearlyEqualViewportValue']) requireText('useSpectralCanvasLifecycle.ts', lifecycle, marker);
for (const marker of ['export function getFullCanvasFitZoomX', 'export function nearlyEqualViewportValue', 'export function resolveSpectralCanvasHorizontalAutoFit', 'export function clampStampWheelScale', 'export function normalizeStampWheelDeltaPx', 'export function resolveSpectralNavigatorWindow', 'export function clampSpectralNavigatorLeft', 'export function resolveSpectralNavigatorViewportPatch', 'export function resolveSpectralNavigatorDragMode', "export type SpectralNavigatorDragMode = 'move' | 'resize-left' | 'resize-right'"]) requireText('spectralCanvasViewportModel.ts', model, marker);

for (const forbidden of ['audioEngine', 'AudioEngine', 'useStore', 'useState', 'useEffect', 'spectralData.', 'document.', 'window.', 'canvasRef', 'overlayCanvasRef']) forbidText('spectralCanvasViewportModel.ts', model, forbidden);
for (const forbiddenLocalBlock of ['const STAMP_WHEEL_MIN_SCALE =', 'function getFullCanvasFitZoomX', 'function nearlyEqualViewportValue', 'function clampStampWheelScale', 'function normalizeStampWheelDeltaPx', "let mode: 'move' | 'resize-left' | 'resize-right' = 'move'", 'const minVisibleWidth = Math.max(16, spectralData.width * 0.015)', 'const centeredOffset = (pointerX / rect.width) * spectralData.width', 'const atDefaultHorizontalView =', 'const matchesPreviousAutoFit =']) forbidText('SpectralCanvas.tsx', component, forbiddenLocalBlock);

if (!component.includes('audioEngine.invalidateBuffer()') || !component.includes('audioEngine.previewColumn(')) failures.push('SpectralCanvas.tsx should still own existing audio invalidation/preview calls; this slice must not move audio execution into the viewport model.');

if (failures.length) {
  console.error('[spectralforge-canvas-viewport-boundary-refactor-7771] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, check: 'spectralforge-canvas-viewport-boundary-refactor-7771', boundary: 'spectral-canvas-viewport-model', runtimeExecutionMoved: false }, null, 2));
