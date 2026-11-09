import { readFileSync } from 'node:fs';

const room = readFileSync('src/features/l3lab/spectralForge/SpectralForgeRoom.tsx', 'utf8');
const functionalHeader = readFileSync('src/features/l3lab/spectralForge/components/SpectralForgeFunctionalHeader.tsx', 'utf8');
const canvas = readFileSync('src/features/l3lab/spectralForge/components/SpectralCanvas.tsx', 'utf8');
const lifecycle = readFileSync('src/features/l3lab/spectralForge/components/spectralCanvas/useSpectralCanvasLifecycle.ts', 'utf8');
const viewportModel = readFileSync('src/features/l3lab/spectralForge/components/spectralCanvas/spectralCanvasViewportModel.ts', 'utf8');
const carrierPanel = readFileSync('src/features/l3lab/spectralForge/components/CarrierIntegralPanel.tsx', 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`spectralforge-canvas-zoom-stamp-wheel-control check failed: ${message}`);
    process.exit(1);
  }
}

const headerMarker = 'data-xensonar-spectralforge-functional-header="true"';
assert(functionalHeader.includes(headerMarker), 'functional SpectralForge header marker missing');
const header = functionalHeader;

for (const forbidden of [
  'BPM ·',
  'intendedLoopDuration.toFixed',
  'Tastatur aktiv für SpectralForge',
  'Quellenspur ausblenden',
  'Quellenspur anzeigen',
  'Körper:',
  'Herkunftsspur:',
  'Konstituierter Körper aktiv',
]) {
  assert(!header.includes(forbidden), `top header still contains non-functional status/debug copy: ${forbidden}`);
}

assert(header.includes('label="Takte"'), 'top header does not expose Takte control');
assert(header.includes('label="Taktsegmente"'), 'top header does not expose Taktsegmente control');
assert(room.includes('onBarsChange={(bars) => updateMaterialExport({ bars })}'), 'Takte control is not wired to materialExport.bars');
assert(room.includes('onGuideSegmentsChange={(guideSegments) => updateMaterialExport({ guideSegments })}'), 'Taktsegmente control is not wired to materialExport.guideSegments');

const rainbowCount = (carrierPanel.match(/🌈/g) ?? []).length;
assert(rainbowCount === 1, `Gestalt-Projekte button should use one large rainbow symbol, found ${rainbowCount}`);
assert(carrierPanel.includes('data-xensonar-gesture-projects-single-rainbow="true"'), 'single-rainbow button marker missing');

assert(!canvas.includes('initialFullCanvasZoomAppliedRef') && !lifecycle.includes('initialFullCanvasZoomAppliedRef'), 'old one-shot horizontal zoom guard is still present');
assert(canvas.includes('useSpectralCanvasResizeLifecycle'), 'initial zoom lifecycle is not delegated by SpectralCanvas');
assert(lifecycle.includes('autoFitHorizontalViewportRef'), 'initial zoom must be an auto-fit contract attached to the canvas lifecycle');
assert(viewportModel.includes('export function getFullCanvasFitZoomX'), 'initial zoomX fit helper missing');
assert(viewportModel.includes('const matchesPreviousAutoFit ='), 'late layout width must be allowed to repair the initial auto-fit');
assert(lifecycle.includes('renderMain(viewportForThisFrame)'), 'first canvas frame must use the resolved viewport immediately');
assert(lifecycle.includes('zoomX: autoFitDecision.fitZoomX'), 'initial zoomX does not fit the complete canvas width');
assert(!lifecycle.includes('zoomY: autoFitDecision.fitZoomX'), 'initial zoom must not reinterpret vertical image/source geometry');
assert(!lifecycle.includes('offsetY: 0,'), 'initial zoom must not reset vertical placement');

for (const required of [
  'normalizeStampWheelDeltaPx',
  'STAMP_WHEEL_EVENT_DELTA_PX_MAX',
]) {
  assert(viewportModel.includes(required), `stable stamp wheel viewport-model contract missing: ${required}`);
}
for (const required of [
  'STAMP_WHEEL_FRAME_DELTA_PX_MAX',
  'window.requestAnimationFrame(flushStampWheelScale)',
  'Math.exp(-deltaPx * STAMP_WHEEL_FACTOR_PER_PIXEL)',
  'clampStampWheelScale(state.stampScaleX * scaleFactor)',
]) {
  assert(canvas.includes(required), `stable stamp wheel scaling contract missing: ${required}`);
}
assert(canvas.includes("state.activeTool === 'stamp' && state.stampPhase === 'stamping'"), 'wheel scaling must only run for an active stamp');
assert(!canvas.includes('state.setStampScale(state.stampScaleX + delta, state.stampScaleY + delta)'), 'old raw additive stamp wheel scaling is still present');
assert(canvas.includes('e.preventDefault();\n      e.stopPropagation();'), 'wheel handler must prevent browser/page zoom-scroll side effects');

// Historical header-input assertion retained as an independent UI signal.
assert(header.includes("raw === ''"), 'meter inputs must ignore empty intermediate edits instead of collapsing to 1');

console.log('spectralforge-canvas-zoom-stamp-wheel-control check passed');
