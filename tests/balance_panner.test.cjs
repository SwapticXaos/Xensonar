'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function loadPanHelpers() {
  const src = fs.readFileSync(path.join(root, 'src/mix/01_pan.js'), 'utf8');
  const head = src.slice(0, src.indexOf('const __XenPan='));
  const scope = { console, setTimeout, clearTimeout, Math, Number, WeakMap };
  vm.runInNewContext(
    head + ';globalThis.__xenBalanceGains=__xenBalanceGains;globalThis.__xenCreateBalancePanner=__xenCreateBalancePanner;globalThis.__xenSmoothMixParam=__xenSmoothMixParam;',
    scope
  );
  return scope;
}

function makeMockCtx({ withSplitter = true } = {}) {
  let now = 0;
  const events = [];
  const makeParam = (tag) => ({
    value: 1,
    setValueAtTime(v, t) { this.value = v; events.push([tag, 'set', v, t]); },
    linearRampToValueAtTime(v, t) { this.value = v; events.push([tag, 'ramp', v, t]); },
    setTargetAtTime(v, t, tau) { this.value = v; events.push([tag, 'target', v, t, tau]); },
    cancelScheduledValues(t) { events.push([tag, 'cancel', t]); },
    cancelAndHoldAtTime(t) { events.push([tag, 'hold', t]); },
  });
  let gains = 0, splitters = 0, mergers = 0, stereoPanners = 0;
  const connections = [];
  const makeNode = (kind) => ({
    kind,
    context: null,
    gain: makeParam(kind),
    pan: makeParam(kind + '.pan'),
    connect(dest, outIdx = 0, inIdx = 0) { connections.push([kind, dest.kind || 'dest', outIdx, inIdx]); return dest; },
    disconnect() { events.push([kind, 'disconnect']); },
  });
  const ctx = {
    state: 'running',
    get currentTime() { return now; },
    set currentTime(t) { now = t; },
    createGain() { const n = makeNode('gain' + (++gains)); n.context = ctx; return n; },
    createStereoPanner() { const n = makeNode('stereoPan' + (++stereoPanners)); n.context = ctx; return n; },
    events,
    connections,
    counts: () => ({ gains, splitters, mergers, stereoPanners }),
  };
  if (withSplitter) {
    ctx.createChannelSplitter = () => { const n = makeNode('split' + (++splitters)); n.context = ctx; return n; };
    ctx.createChannelMerger = () => { const n = makeNode('merge' + (++mergers)); n.context = ctx; return n; };
  }
  return ctx;
}

test('__xenBalanceGains preserves unity at centre, exact equal-power L/R ratio, and never boosts > 1', () => {
  const { __xenBalanceGains } = loadPanHelpers();
  assert.deepEqual(Array.from(__xenBalanceGains(0)), [1, 1]);
  assert.deepEqual(Array.from(__xenBalanceGains(NaN)), [1, 1]);
  const [gL1, gR1] = __xenBalanceGains(1);
  assert.ok(Math.abs(gL1) < 1e-12 && gR1 === 1);
  const [gLm1, gRm1] = __xenBalanceGains(-1);
  assert.ok(gLm1 === 1 && Math.abs(gRm1) < 1e-12);
  // Matches equal-power L/R ratio at pan = +0.65 (~ -11.0 dB) without boosting dominant channel
  const [gLp, gRp] = __xenBalanceGains(0.65);
  assert.equal(gRp, 1);
  const ratioDb = 20 * Math.log10(gLp / gRp);
  assert.ok(Math.abs(ratioDb - (-11.0)) < 0.05, 'expected -11.0 dB at +0.65, got ' + ratioDb);
  // Symmetry
  const [gLn, gRn] = __xenBalanceGains(-0.65);
  assert.equal(gLn, 1);
  assert.ok(Math.abs(gRn - gLp) < 1e-12);
});

test('__xenCreateBalancePanner builds strict 2ch split-gain-merge graph without L/R crosstalk', () => {
  const { __xenCreateBalancePanner, __xenSmoothMixParam } = loadPanHelpers();
  const ctx = makeMockCtx({ withSplitter: true });
  const stage = __xenCreateBalancePanner(ctx, 0.5);
  assert.equal(ctx.counts().splitters, 1);
  assert.equal(ctx.counts().mergers, 1);
  assert.equal(ctx.counts().stereoPanners, 0);
  assert.equal(stage.input.channelCount, 2);
  assert.equal(stage.input.channelCountMode, 'explicit');
  assert.equal(stage.input.channelInterpretation, 'speakers');
  assert.equal(stage.input.__xenPanOutput, stage.output);

  // Verify zero crosstalk: gainL -> merger input 0 only, gainR -> merger input 1 only
  const mergeEdges = ctx.connections.filter(([, dest]) => dest === 'merge1');
  assert.deepEqual(mergeEdges, [
    ['gain2', 'merge1', 0, 0],
    ['gain3', 'merge1', 0, 1],
  ]);

  // Smooth pan update uses 30ms setTargetAtTime on gainL/gainR
  ctx.events.length = 0;
  ctx.currentTime = 0.25;
  __xenSmoothMixParam(stage.pan, -0.5, ctx);
  const targets = ctx.events.filter((e) => e[1] === 'target');
  assert.equal(targets.length, 2);
  assert.ok(targets.every((e) => e[4] === 0.03));
  assert.equal(stage.pan.value, -0.5);

  // Zero-crossing linearRampToValueAtTime inserts midpoint at unity (1, 1)
  ctx.events.length = 0;
  stage.pan.setValueAtTime(-1, 1.0);
  stage.pan.linearRampToValueAtTime(1, 3.0);
  const ramps = ctx.events.filter((e) => e[1] === 'ramp');
  // 2 ramps for tZero = 2.0 (to 1.0 on both), then 2 ramps for t = 3.0
  assert.equal(ramps.length, 4);
  assert.equal(ramps[0][2], 1);
  assert.equal(ramps[0][3], 2.0);
  assert.equal(ramps[1][2], 1);
  assert.equal(ramps[1][3], 2.0);
});

test('__xenCreateBalancePanner falls back cleanly to StereoPannerNode on minimal mock contexts', () => {
  const { __xenCreateBalancePanner } = loadPanHelpers();
  const ctx = makeMockCtx({ withSplitter: false });
  const node = __xenCreateBalancePanner(ctx, -0.4);
  assert.equal(ctx.counts().stereoPanners, 1);
  assert.equal(node.pan.value, -0.4);
});
