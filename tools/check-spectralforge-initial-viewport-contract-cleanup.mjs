import { readFileSync } from 'node:fs';

const room = readFileSync('src/features/l3lab/spectralForge/SpectralForgeRoom.tsx', 'utf8');
const canvas = readFileSync('src/features/l3lab/spectralForge/components/SpectralCanvas.tsx', 'utf8');
const lifecycle = readFileSync('src/features/l3lab/spectralForge/components/spectralCanvas/useSpectralCanvasLifecycle.ts', 'utf8');
const viewportModel = readFileSync('src/features/l3lab/spectralForge/components/spectralCanvas/spectralCanvasViewportModel.ts', 'utf8');
const beatRuler = readFileSync('src/features/l3lab/spectralForge/components/BeatRuler.tsx', 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`spectralforge-initial-viewport-contract-cleanup check failed: ${message}`);
    process.exit(1);
  }
}

assert(!room.includes('<BeatRuler />'), 'obsolete visible BeatRuler/status row is still mounted above the canvas');
assert(!room.includes("import BeatRuler"), 'obsolete BeatRuler import remains in SpectralForgeRoom');

for (const forbidden of [
  'Tempo-Metadaten',
  'Loop-Vorschau',
  'verschiebbare Marker',
  'Segmente pro Takt',
]) {
  assert(!beatRuler.includes(forbidden), `obsolete BeatRuler status copy remains: ${forbidden}`);
}

assert(!canvas.includes('initialFullCanvasZoomAppliedRef') && !lifecycle.includes('initialFullCanvasZoomAppliedRef'), 'old one-shot initial viewport guard remains');
assert(canvas.includes('useSpectralCanvasResizeLifecycle'), 'SpectralCanvas does not delegate resize/auto-fit lifecycle');
assert(lifecycle.includes('autoFitHorizontalViewportRef'), 'auto-fit viewport ref missing from lifecycle boundary');
assert(viewportModel.includes('export function getFullCanvasFitZoomX'), 'explicit full-canvas fit zoom helper missing from viewport model');
assert(viewportModel.includes('const matchesPreviousAutoFit ='), 'initial auto-fit does not tolerate late layout resizing');
assert(lifecycle.includes('renderMain(viewportForThisFrame)'), 'ResizeObserver still paints a stale first frame');
assert(lifecycle.includes('zoomX: autoFitDecision.fitZoomX'), 'resolved fit zoom is not written into the horizontal viewport');
assert(!lifecycle.includes('zoomY: autoFitDecision.fitZoomX'), 'patch must not add vertical zoom fitting');
assert(!lifecycle.includes('offsetY: 0,'), 'patch must not reset vertical source/canvas placement');

console.log('spectralforge-initial-viewport-contract-cleanup check passed');
