'use strict';
// TS-MOD-09: unit contract for src/ts/bass/bassDawTools.ts.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const code = execFileSync('node', [path.join(root, 'tools/ts_module.cjs'), path.join(root, 'src/ts/bass/bassDawTools.ts')]).toString();
const ctx = { Math, Number, Object, Set, Map, Date };
vm.createContext(ctx);
vm.runInContext(code + ';globalThis.BD=__XenTs_bassDawTools;', ctx);
const BD = ctx.BD;
const eq = (a, b, msg) => assert.deepEqual(JSON.parse(JSON.stringify(a)), b, msg);

const ev = (id, startStep, durationSteps = 1, ratioFromRoot = 1, octave = 0, velocity = 0.8) =>
 ({ id, startStep, durationSteps, ratioFromRoot, octave, velocity, accent: 0.72 });

test('quantize pulls events onto grid with strength 0..1 and respects selection', () => {
 const list = [ev('a', 0.35), ev('b', 4.4)];
 const full = BD.quantizeBassEvents(list, 16, 16, '1/16', 1);
 assert.deepEqual(full.map(x => x.startStep), [0, 4]);
 const half = BD.quantizeBassEvents(list, 16, 16, '1/16', 0.5, ['a']);
 assert.equal(half[0].startStep, 0.175);
 assert.equal(half[1].startStep, 4.4, 'unselected event unchanged');
 assert.ok(Math.abs(BD.quantizeStepUnit('1/8T', 16) - 16 / 12) < 1e-9);
});

test('humanize is deterministic per seed and stays in bounds', () => {
 const list = [ev('a', 0, 1, 1, 0, 0.8), ev('b', 4, 1, 1.5, 0, 0.8)];
 const h1 = BD.humanizeBassEvents(list, 16, 0.08, 0.12, 42);
 const h2 = BD.humanizeBassEvents(list, 16, 0.08, 0.12, 42);
 assert.deepEqual(h1, h2);
 assert.notEqual(h1[1].startStep, 4);
 assert.ok(h1.every(x => x.startStep >= 0 && x.startStep < 16 && x.velocity >= 0.1 && x.velocity <= 1.4));
});

test('legato stretches events cleanly up to next event including wrap-around', () => {
 const list = [ev('a', 0, 0.5), ev('b', 6, 0.5), ev('c', 12, 0.5)];
 const out = BD.legatoBassEvents(list, 16, 0.05);
 assert.deepEqual(out.map(x => x.durationSteps), [5.95, 5.95, 3.95]);
});

test('rotate, transpose, scaleTime, reverse, duplicate, doubleClip behave like a DAW', () => {
 const list = [ev('a', 0, 1, 1, 0), ev('b', 4, 1, 1.5, 0)];
 eq(BD.rotateBassEvents(list, 16, -1).map(x => x.startStep), [15, 3]);
 eq(BD.transposeBassEvents(list, 2).map(x => x.octave), [1, 1]);
 assert.ok(Math.abs(BD.transposeBassEvents(list, 1.5, ['a'])[0].ratioFromRoot - 1.5) < 1e-9);
 assert.equal(BD.transposeBassEvents(list, 1.5, ['a'])[1].ratioFromRoot, 1.5);
 const dbl = BD.scaleBassTime(list, 16, 0.5);
 eq(dbl.map(x => [x.startStep, x.durationSteps]), [[0, 0.5], [2, 0.5]]);
 const rev = BD.reverseBassEvents(list, 16);
 eq(rev.map(x => x.startStep), [15, 11]);
 const dup = BD.duplicateBassEvents(list, 16, ['a', 'b'], 't');
 assert.equal(dup.events.length, 4);
 assert.equal(dup.createdIds.length, 2);
 eq(dup.events.slice(2).map(x => x.startStep), [5, 9]);

 const clip = {
  id: 'c1', name: 'Test', bars: 1, stepsPerBar: 16, stepCount: 16, segmentCount: 4,
  segmentMarkers: [{ id: 's1', step: 4, kind: 'segment' }], events: list, generatorMeta: { kind: 'classic' }
 };
 const x2 = BD.doubleBassClip(clip, 'd');
 assert.equal(x2.bars, 2);
 assert.equal(x2.stepCount, 32);
 assert.equal(x2.events.length, 4);
 eq(x2.events.map(x => x.startStep), [0, 4, 16, 20]);
 assert.equal(x2.segmentMarkers.length, 2);
});

test('resolveBassGlideTargetHz finds true next microtonal note including loop wrap', () => {
 const list = [ev('a', 2, 1, 1, 0), ev('b', 6, 1, 1.5, 0), ev('c', 12, 1, 7 / 4, -1)];
 assert.ok(Math.abs(BD.resolveBassGlideTargetHz(list, list[0], 16, 55) - 82.5) < 1e-6);
 assert.ok(Math.abs(BD.resolveBassGlideTargetHz(list, list[1], 16, 55) - 55 * (7 / 4) * 0.5) < 1e-6);
 assert.ok(Math.abs(BD.resolveBassGlideTargetHz(list, list[2], 16, 55) - 55) < 1e-6, 'wraps to first note');
});

test('probability is deterministic and ratchet expands cleanly within duration', () => {
 assert.equal(BD.shouldTriggerBassEvent(undefined, 'a', 0), true);
 assert.equal(BD.shouldTriggerBassEvent(1, 'a', 0), true);
 assert.equal(BD.shouldTriggerBassEvent(0, 'a', 0), false);
 let hits = 0;
 for (let r = 0; r < 400; r++) if (BD.shouldTriggerBassEvent(0.5, 'ev-1', r)) hits++;
 assert.ok(hits > 150 && hits < 250, `expected ~200/400 triggers, got ${hits}`);
 const r3 = BD.expandBassEventRatchets(0.3, 3);
 assert.equal(r3.length, 3);
 assert.ok(Math.abs(r3[1].offsetSec - 0.1) < 1e-9);
 assert.ok(r3.every(h => h.durationSec >= 0.025 && h.velocityScale > 0 && h.velocityScale <= 1));
 assert.equal(BD.cleanCutoffScale(1), undefined);
 assert.equal(BD.cleanCutoffScale(5), 2.4);
 assert.equal(BD.cleanProbability(1), undefined);
 assert.equal(BD.cleanProbability(0.65), 0.65);
 assert.equal(BD.cleanRatchet(1), undefined);
 assert.equal(BD.cleanRatchet(3), 3);
});
