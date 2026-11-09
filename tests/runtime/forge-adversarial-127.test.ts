import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SpectralData } from '../../src/features/l3lab/spectralForge/audio/SpectralData';
import { extractSpectralSkeleton } from '../../src/features/l3lab/spectralForge/carrierV2/extractSpectralSkeleton';
import { buildProjectionCarrierPlan } from '../../src/features/l3lab/spectralForge/donorV2/projectionCarrierPlan';

// User-facing adversarial fixtures, from painted pixels through the actual
// skeleton/voice planner. These do not manufacture already-correct anchors.
const donorOptions = { maxAnchorsPerFrame: 8, minPeakAmplitude: 0.025, verticalSmoothingRadius: 1, minPeakDistanceBins: 2 };
function figure(draw: (grid: SpectralData) => void) {
  const grid = new SpectralData(9, 64);
  draw(grid);
  return grid;
}
function line(grid: SpectralData, y: number, amplitude = 0.6) {
  for (let x = 0; x < grid.width; x++) grid.set(x, y, amplitude);
}
function read(grid: SpectralData) { return extractSpectralSkeleton(grid, 1, donorOptions); }

test('painted border lines remain readable at both frequency boundaries', () => {
  for (const y of [0, 63]) {
    const skeleton = read(figure(grid => line(grid, y)));
    for (const anchors of skeleton.anchorsByTime) {
      assert.equal(anchors.length, 1, `the painted boundary at bin ${y} must have one body`);
      assert.equal(anchors[0].centerBin, y);
    }
  }
});

test('one flat thick stroke is one body, not a stack of artificial voices', () => {
  const skeleton = read(figure(grid => { for (let y = 24; y <= 34; y++) line(grid, y); }));
  for (const anchors of skeleton.anchorsByTime) {
    assert.equal(anchors.length, 1, 'a single contiguous flat ridge must not manufacture polyphony');
    assert.ok(Math.abs(anchors[0].centerBin - 29) <= 1, 'the body follows the centre of its painted thickness');
  }
});

test('a thin line whose ink exceeds the admission floor survives vertical analysis', () => {
  const quiet = read(figure(grid => line(grid, 30, 0.04)));
  const loud = read(figure(grid => line(grid, 30, 0.4)));
  const quietPlan = buildProjectionCarrierPlan(quiet);
  const loudPlan = buildProjectionCarrierPlan(loud);
  assert.equal(quietPlan.bands.length, 1, 'smoothing must not erase a line already above the declared 0.025 floor');
  assert.ok(quietPlan.bands[0].gainCurve.every(g => g > 0));
  assert.ok(quietPlan.bands[0].gainCurve[4] < loudPlan.bands[0].gainCurve[4], 'retain quiet/loud dynamics');
});

test('two painted lines remain two ordered pitches and a blank column remains blank', () => {
  const grid = figure(grid => { line(grid, 20); line(grid, 40); });
  for (let y = 0; y < grid.height; y++) grid.set(4, y, 0);
  const skeleton = read(grid);
  assert.equal(skeleton.anchorsByTime[4].length, 0);
  for (const x of [0, 3, 5, 8]) {
    const anchors = skeleton.anchorsByTime[x];
    assert.equal(anchors.length, 2);
    assert.ok(anchors[0].centerHz > anchors[1].centerHz, 'higher ink means higher frequency');
  }
  const plan = buildProjectionCarrierPlan(skeleton);
  assert.equal(plan.bands.length, 2);
  assert.ok(plan.bands.every(band => band.gainCurve[4] === 0));
});


test('voice assignment minimizes total motion instead of stealing a neighbour lane', () => {
  const grid = new SpectralData(3, 64);
  // Two bright strokes approach: local nearest matching at x=1 would swap them.
  for (const [x, ys] of [[0, [42, 30]], [1, [31, 29]], [2, [20, 28]]] as const)
    for (const y of ys) grid.set(x, y, 0.6);
  const skeleton = extractSpectralSkeleton(grid, 1, { ...donorOptions, verticalSmoothingRadius: 0, minPeakDistanceBins: 1 });
  const plan = buildProjectionCarrierPlan(skeleton);
  assert.equal(plan.bands.length, 2);
  const low = plan.bands.find(b => b.centerRatioCurve[0] < plan.bands.reduce((v, a) => Math.max(v, a.centerRatioCurve[0]), 0))!;
  assert.ok(low.centerRatioCurve[1] < plan.bands.find(b => b !== low)!.centerRatioCurve[1]);
});
