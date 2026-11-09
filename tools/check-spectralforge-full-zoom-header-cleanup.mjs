import { readFileSync } from 'node:fs';

const room = readFileSync('src/features/l3lab/spectralForge/SpectralForgeRoom.tsx', 'utf8');
const functionalHeader = readFileSync('src/features/l3lab/spectralForge/components/SpectralForgeFunctionalHeader.tsx', 'utf8');
const canvas = readFileSync('src/features/l3lab/spectralForge/components/SpectralCanvas.tsx', 'utf8');
const carrierPanel = readFileSync('src/features/l3lab/spectralForge/components/CarrierIntegralPanel.tsx', 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`spectralforge-full-zoom-header-cleanup check failed: ${message}`);
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
assert(header.includes('Bild importieren'), 'Bild importieren button is no longer in the functional header');

for (const forbidden of [
  'Tastatur aktiv für SpectralForge',
  'Klicke in SpectralForge',
  'Quellenspur ausblenden',
  'Quellenspur anzeigen',
  'Körper: {',
  'Herkunftsspur:',
]) {
  assert(!room.includes(forbidden), `removed header copy still exists in SpectralForgeRoom: ${forbidden}`);
}

const rainbowCount = (carrierPanel.match(/🌈/g) ?? []).length;
assert(rainbowCount === 1, `Gestalt-Projekte button should use one large rainbow symbol, found ${rainbowCount}`);
assert(carrierPanel.includes('data-xensonar-gesture-projects-single-rainbow="true"'), 'single-rainbow button marker missing');
assert(carrierPanel.includes('text-[28px]'), 'rainbow icon is not sized as the two-line leading symbol');

assert(!canvas.includes('initialFullCanvasZoomAppliedRef'), 'old one-shot full-canvas zoom guard is still present');
assert(canvas.includes('autoFitHorizontalViewportRef'), 'initial full-canvas zoom must be an auto-fit contract, not a one-shot side effect');
assert(canvas.includes('getFullCanvasFitZoomX'), 'full-canvas zoom must be expressed through an explicit fit-zoom helper');
assert(canvas.includes('matchesPreviousAutoFit'), 'auto-fit must keep following late layout width while still in initial fit state');
assert(canvas.includes('render(viewportForThisFrame)'), 'first ResizeObserver frame must render with the fitted viewport, not stale React viewport');
assert(canvas.includes('zoomX: fitZoomX'), 'initial zoomX does not fit the complete canvas width');
assert(!canvas.includes('zoomY: Math.max(0.1, h / Math.max(1, spectralData.height))'), 'initial zoom must not reinterpret vertical image/source geometry');

console.log('spectralforge-full-zoom-header-cleanup check passed');
