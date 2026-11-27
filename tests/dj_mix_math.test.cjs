const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui', 'dj_mix_math.js'), 'utf8');
const M = vm.runInNewContext(src + '\n__XenDjMixMath;', {});

test('crossfadeGains: smooth curve keeps unity at center and tapers to 0 at edges', () => {
  const left = M.crossfadeGains(0, 'smooth');
  const mid = M.crossfadeGains(0.5, 'smooth');
  const right = M.crossfadeGains(1, 'smooth');
  assert.equal(left.A, 1);
  assert.equal(left.B, 0);
  assert.equal(mid.A, 1);
  assert.equal(mid.B, 1);
  assert.ok(right.A < 1e-6);
  assert.equal(right.B, 1);
});

test('crossfadeGains: linear and cut curves behave accurately', () => {
  const linMid = M.crossfadeGains(0.5, 'linear');
  assert.equal(linMid.A, 0.5);
  assert.equal(linMid.B, 0.5);

  const cutMid = M.crossfadeGains(0.5, 'cut');
  assert.equal(cutMid.A, 1);
  assert.equal(cutMid.B, 1);

  const cutNearLeft = M.crossfadeGains(0.05, 'cut');
  assert.equal(cutNearLeft.A, 1);
  assert.ok(Math.abs(cutNearLeft.B - 0.5) < 1e-6);
});

test('barsToMs computes exact musical duration from live BPM (including fractional bars)', () => {
  assert.equal(M.barsToMs(4, 120), 8000);
  assert.equal(M.barsToMs(2, 108), Math.round(2 * 4 * (60000 / 108)));
  assert.equal(M.barsToMs(4.5, 120), 9000);
});

test('synthesize3BandCurve produces smooth 360-point curve with continuous gain and kill switches', () => {
  const flat = M.synthesize3BandCurve({ low: 0, mid: 0, high: 0 });
  assert.equal(flat.length, 360);
  assert.ok(flat.every(v => Math.abs(v) < 1e-9));

  const killedLow = M.synthesize3BandCurve({ low: 0.2, mid: 0, high: 0.3, killLow: true });
  assert.equal(killedLow[10], -1);
  assert.ok(Math.abs(killedLow[190]) < 0.05);
  assert.ok(Math.abs(killedLow[340] - 0.3) < 0.02);
});

test('autoCarvePockets assigns complementary non-overlapping spectral bands for 2..6 decks', () => {
  const plan3 = M.autoCarvePockets(['d1', 'd2', 'd3']);
  assert.ok(plan3.d1.low > 0 && plan3.d1.high < -0.5);
  assert.ok(plan3.d2.mid > 0 && plan3.d2.low < -0.5);
  assert.ok(plan3.d3.high > 0 && plan3.d3.low < -0.5);

  const plan6 = M.autoCarvePockets(['d1', 'd2', 'd3', 'd4', 'd5', 'd6']);
  assert.equal(Object.keys(plan6).length, 6);
});

test('effectiveDeckMultiplier handles Mute, Solo, THRU, and Crossfader correctly', () => {
  assert.equal(M.effectiveDeckMultiplier({ bus: 'THRU', crossfade: 0 }), 1);
  assert.equal(M.effectiveDeckMultiplier({ bus: 'A', crossfade: 1, curve: 'linear' }), 0);
  assert.equal(M.effectiveDeckMultiplier({ bus: 'A', muted: true, crossfade: 0 }), 0);
  assert.equal(M.effectiveDeckMultiplier({ bus: 'THRU', id: 'd2', soloId: 'd1' }), 0);
  assert.equal(M.effectiveDeckMultiplier({ bus: 'THRU', id: 'd1', soloId: 'd1' }), 1);
});

test('compactTrackLabel preserves distinguishing suffix on prefixed demo names', () => {
  const parsed = M.compactTrackLabel('Random Demo · Pattern B');
  assert.equal(parsed.primary, 'Pattern B');
  assert.equal(parsed.group, 'Random Demo');
  const plain = M.compactTrackLabel('Sub Pulse 01');
  assert.equal(plain.primary, 'Sub Pulse 01');
  assert.equal(plain.group, '');
});

test('toRationalBars and formatMetricSpec represent XenSonar fractional & polymetric bars accurately', () => {
  // 4 bars + 2/4 in 4-segment meter -> 4+2/4B · 4/B
  const m1 = M.formatMetricSpec({ bars: 4.5, segmentsPerBar: 4 });
  assert.equal(m1.barText, '4+2/4B');
  assert.equal(m1.label, '4+2/4B · 4/B');
  assert.equal(m1.isFractional, true);

  // 5 bars + 2/7 in 7-segment meter -> 5+2/7B · 7/B
  const m2 = M.formatMetricSpec({ bars: 5 + 2 / 7, segmentsPerBar: 7 });
  assert.equal(m2.barText, '5+2/7B');
  assert.equal(m2.label, '5+2/7B · 7/B');
  assert.equal(m2.rational.whole, 5);
  assert.equal(m2.rational.remNum, 2);
  assert.equal(m2.rational.den, 7);

  // Standard 4/4 techno 4-bar loop -> 4B · 4/B
  const m3 = M.formatMetricSpec({ bars: 4, segmentsPerBar: 4 });
  assert.equal(m3.barText, '4B');
  assert.equal(m3.isFractional, false);
});

test('computePolymetricCycle computes exact shared-bar-truth LCM convergence', () => {
  // Straight 4/4 techno: 4B + 4B -> 4B equal cycle
  const straight = M.computePolymetricCycle([4, 4]);
  assert.equal(straight.isPolymetric, false);
  assert.equal(straight.convergenceBars, 4);
  assert.deepEqual(straight.cyclesPerDeck, [1, 1]);

  // 4B vs 4+2/4B (9/2) -> LCM = 36 bars (9 cycles vs 8 cycles)
  const hemiola = M.computePolymetricCycle([4, 4.5]);
  assert.equal(hemiola.isPolymetric, true);
  assert.equal(hemiola.convergenceBars, 36);
  assert.equal(hemiola.convergenceText, '36B');
  assert.deepEqual(hemiola.cyclesPerDeck, [9, 8]);

  // Complex polymetric: 4B vs 5+2/7B (37/7) -> LCM = 148 bars (37 cycles vs 28 cycles)
  const poly = M.computePolymetricCycle([4, 5 + 2 / 7]);
  assert.equal(poly.isPolymetric, true);
  assert.equal(poly.convergenceBars, 148);
  assert.equal(poly.convergenceText, '148B');
  assert.deepEqual(poly.cyclesPerDeck, [37, 28]);
});

test('cyclePhaseAtBar and nextRoomBarDelayMs track shared Room-Bar clock accurately', () => {
  const p = M.cyclePhaseAtBar(5.25, 4.5, 4, 0);
  assert.ok(Math.abs(p.cyclePosBars - 0.75) < 1e-6);
  assert.equal(p.barIndex, 0);
  assert.equal(p.segmentIndex, 3);

  // At 120 BPM, 1 bar = 2000ms. At bar 3.75, 0.25 bars remain = 500ms.
  assert.equal(M.nextRoomBarDelayMs(3.75, 120), 500);
});

test('computeAudioPhase01 matches XenSonar loop phase and ATT nudge sign', () => {
  // 4 bars at 120 BPM = 8.0s duration; at elapsed=2.0s, phase = 0.25 (start of bar 2)
  assert.ok(Math.abs(M.computeAudioPhase01({ elapsedSec: 2.0, durationSec: 8.0, attBeats: 0, bpm: 120 }) - 0.25) < 1e-6);
  // Wrap around past 1 cycle (10.0s -> 2.0s -> 0.25)
  assert.ok(Math.abs(M.computeAudioPhase01({ elapsedSec: 10.0, durationSec: 8.0, attBeats: 0, bpm: 120 }) - 0.25) < 1e-6);
  // Positive attBeats (+1 beat = 0.5s at 120 BPM) shifts onset later -> reads 0.5s earlier in loop (1.5/8 = 0.1875)
  assert.ok(Math.abs(M.computeAudioPhase01({ elapsedSec: 2.0, durationSec: 8.0, attBeats: 1, bpm: 120 }) - 0.1875) < 1e-6);
  // Negative wrap safety (elapsed=0.25s, attBeats=+1 beat -> -0.25s wraps to 7.75/8 = 0.96875)
  assert.ok(Math.abs(M.computeAudioPhase01({ elapsedSec: 0.25, durationSec: 8.0, attBeats: 1, bpm: 120 }) - 0.96875) < 1e-6);
});

test('buildBarRulerGeometry handles whole, fractional, polymetric, and sub-bar spans', () => {
  const g4 = M.buildBarRulerGeometry({ effectiveBars: 4, segmentsPerBar: 4 });
  assert.equal(g4.wholeBars, 4);
  assert.equal(g4.fracRatio, 0);
  assert.equal(g4.showWholeSegTicks, true);
  assert.equal(g4.isSubBar, false);

  // 5 + 2/7 bars in 7-segment meter
  const gPoly = M.buildBarRulerGeometry({ effectiveBars: 5 + 2 / 7, segmentsPerBar: 7 });
  assert.equal(gPoly.wholeBars, 5);
  assert.ok(Math.abs(gPoly.fracBars - 2 / 7) < 1e-6);
  assert.equal(gPoly.fracSegTicks, 2);
  assert.equal(gPoly.showWholeSegTicks, true);

  // Sub-bar 1/2B loop
  const gHalf = M.buildBarRulerGeometry({ effectiveBars: 0.5, segmentsPerBar: 4 });
  assert.equal(gHalf.wholeBars, 0);
  assert.equal(gHalf.isSubBar, true);
  assert.equal(gHalf.fracSegTicks, 2);
});

test('lerpEqCurves smoothly interpolates 360-point EQ arrays', () => {
  const a = Array(360).fill(0);
  const b = Array(360).fill(0.5);
  const mid = M.lerpEqCurves(a, b, 0.5);
  assert.equal(mid.length, 360);
  assert.ok(Math.abs(mid[0] - 0.25) < 1e-9);
  assert.ok(Math.abs(mid[359] - 0.25) < 1e-9);
});


// DJ-SEEK-01: bar jumps & segment steps (att in beats, playhead = elapsed − att)
const posOf = (att, elapsed, L) => (((elapsed - att) % L) + L) % L;

test('planBarJump: lands in the clicked bar and keeps the position inside the bar', () => {
  // 4-bar loop at 4 beats/bar; playhead at beat 5.5 (bar 1, +1.5 beats)
  const L = 16, elapsed = 5.5, att0 = 0;
  const r = M.planBarJump({ att: att0, progress01: posOf(att0, elapsed, L) / L, targetBar: 3, loopBeats: L, effectiveBars: 4, segmentsPerBar: 4 });
  assert.equal(r.fromBar, 1);
  assert.equal(r.toBar, 3);
  assert.ok(Math.abs(posOf(r.att, elapsed, L) - 13.5) < 1e-9, 'bar 3 + 1.5 beats');
  assert.ok(Math.abs(r.att) <= L / 2);
  // the shift is a whole number of bars: the groove stays on the room grid
  assert.ok(Math.abs((r.att / 4) - Math.round(r.att / 4)) < 1e-9);
});

test('planBarJump: backwards, same bar, and the fractional tail bar', () => {
  const L = 18, grid = { loopBeats: L, effectiveBars: 4.5, segmentsPerBar: 4 };
  const at = (att, t) => posOf(att, t, L);
  const back = M.planBarJump({ att: 0, progress01: at(0, 9) / L, targetBar: 0, ...grid });
  assert.ok(Math.abs(at(back.att, 9) - 1) < 1e-9);
  const same = M.planBarJump({ att: 0, progress01: at(0, 9) / L, targetBar: 2, ...grid });
  assert.equal(same.att, 0);
  // bar 4 is only 2 beats long: 3 beats into a bar → wraps inside the short bar
  const tail = M.planBarJump({ att: 0, progress01: at(0, 7) / L, targetBar: 4, ...grid });
  const p = at(tail.att, 7);
  assert.ok(p >= 16 && p < 18, 'inside the tail bar: ' + p);
});

test('planSegmentStep / formatPhaseOffset: one segment, readable labels', () => {
  const grid = { loopBeats: 16, effectiveBars: 4, segmentsPerBar: 4 };
  const f = M.planSegmentStep({ att: 0, direction: 1, ...grid });
  assert.equal(f.att, -1);
  assert.equal(M.formatPhaseOffset(f.att, grid), '+1S');
  const b = M.planSegmentStep({ att: 0, direction: -1, ...grid });
  assert.equal(M.formatPhaseOffset(b.att, grid), '−1S');
  assert.equal(M.formatPhaseOffset(-5, grid), '+1T 1S');
  assert.equal(M.formatPhaseOffset(-0.37, grid), '+0.37S');
  assert.equal(M.formatPhaseOffset(0, grid), '0');
  // 7 segments per bar
  const g7 = { loopBeats: 8, effectiveBars: 2, segmentsPerBar: 7 };
  assert.ok(Math.abs(M.planSegmentStep({ att: 0, direction: 1, ...g7 }).att + 4 / 7) < 1e-12);
  // wraps to the shortest cyclic offset
  assert.equal(M.wrapCyclic(9, 16), -7);
  assert.equal(M.barAtRatio(0.99, 4.5), 4);
  assert.equal(M.barAtRatio(0.5, 4), 2);
});
