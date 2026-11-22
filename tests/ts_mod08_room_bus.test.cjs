'use strict';
// TS-MOD-08 / ROOM-BUS-01: contract of src/ts/runtime/roomBus.ts (compiled exactly as the build does).
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const code = execFileSync('node', [path.join(root, 'tools/ts_module.cjs'), path.join(root, 'src/ts/runtime/roomBus.ts')]).toString();
const ctx = { setTimeout, clearTimeout, AbortController, Promise, TypeError, Object, Math, Number, Set, Map };
vm.createContext(ctx);
vm.runInContext(code + ';globalThis.RB=__XenTs_roomBus;', ctx);
const { createRoomBus, isValidTopic, clampTtl, DEFAULT_TTL_MS, MAX_TTL_MS } = ctx.RB;

function fakeClock() {
 let t = 0; const timers = new Map(); let seq = 0;
 return {
  now: () => t,
  setTimer: (fn, ms) => { const id = ++seq; timers.set(id, { at: t + ms, fn }); return id; },
  clearTimer: id => timers.delete(id),
  advance(ms) { t += ms; for (const [id, x] of [...timers]) if (x.at <= t) { timers.delete(id); x.fn(); } },
  size: () => timers.size
 };
}

test('topics and ttl are validated and clamped', () => {
 assert.equal(isValidTopic('forge:send-to-editor-file'), true);
 assert.equal(isValidTopic('Bad Topic'), false);
 assert.equal(isValidTopic(''), false);
 assert.equal(clampTtl(undefined), DEFAULT_TTL_MS);
 assert.equal(clampTtl(-5), 0);
 assert.equal(clampTtl(1e9), MAX_TTL_MS);
 const bus = createRoomBus();
 assert.throws(() => bus.publish('No Spaces', 1), TypeError);
 assert.throws(() => bus.subscribe('ok', 42), TypeError);
});

test('publish fans out synchronously to current subscribers only and isolates handler errors', () => {
 const errors = [];
 const bus = createRoomBus({ onError: (e, topic) => errors.push([String(e.message), topic]) });
 const got = [];
 assert.equal(bus.publish('room:a', 1), 0, 'no memory: nothing is replayed later');
 const off1 = bus.subscribe('room:a', d => got.push('one:' + d));
 bus.subscribe('room:a', () => { throw new Error('boom'); });
 bus.subscribe('room:a', d => got.push('three:' + d));
 assert.equal(bus.publish('room:a', 2), 3);
 off1();
 assert.equal(bus.publish('room:a', 3), 2);
 assert.deepEqual(got, ['one:2', 'three:2', 'three:3']);
 assert.deepEqual(errors, [['boom', 'room:a'], ['boom', 'room:a']]);
});

test('deliver reaches a mounted consumer immediately', async () => {
 const bus = createRoomBus();
 const seen = [];
 bus.consume('forge:file', d => { seen.push(d); });
 assert.equal(await bus.deliver('forge:file', 'x'), true);
 assert.deepEqual(seen, ['x']);
 assert.equal(bus.pending(), 0);
});

test('deliver waits across a lazy mount and is consumed exactly once (FIFO)', async () => {
 const c = fakeClock();
 const bus = createRoomBus(c);
 const a = bus.deliver('forge:file', 'first', { ttlMs: 1000 });
 const b = bus.deliver('forge:file', 'second', { ttlMs: 1000 });
 assert.equal(bus.pending('forge:file'), 2);
 c.advance(500);
 const seen = [];
 const off = bus.consume('forge:file', d => { seen.push(d); });
 assert.deepEqual(await Promise.all([a, b]), [true, true]);
 assert.deepEqual(seen, ['first', 'second']);
 assert.equal(bus.pending(), 0);
 assert.equal(c.size(), 0, 'timers released');
 off();
 const second = bus.consume('forge:file', d => { seen.push('again:' + d); });
 second();
 assert.deepEqual(seen, ['first', 'second'], 'a consumed handoff is never replayed');
});

test('a declining consumer leaves the handoff queued for the next one', async () => {
 const c = fakeClock();
 const bus = createRoomBus(c);
 const p = bus.deliver('forge:file', 'x', { ttlMs: 1000 });
 const offA = bus.consume('forge:file', () => false);
 assert.equal(bus.pending('forge:file'), 1);
 const got = [];
 bus.consume('forge:file', d => { got.push(d); return true; });
 assert.equal(await p, true);
 assert.deepEqual(got, ['x']);
 offA();
});

test('ttl expiry and abort withdraw queued handoffs; overflow drops the oldest', async () => {
 const c = fakeClock();
 const bus = createRoomBus({ ...c, maxPendingPerTopic: 2 });
 const expired = bus.deliver('forge:file', 1, { ttlMs: 100 });
 c.advance(100);
 assert.equal(await expired, false);
 assert.equal(bus.pending(), 0);

 const ctl = new AbortController();
 const aborted = bus.deliver('forge:file', 2, { ttlMs: 1000, signal: ctl.signal });
 ctl.abort();
 assert.equal(await aborted, false);
 assert.equal(bus.pending(), 0);
 assert.equal(c.size(), 0);
 const pre = new AbortController(); pre.abort();
 assert.equal(await bus.deliver('forge:file', 3, { signal: pre.signal }), false);

 const o1 = bus.deliver('forge:file', 'o1', { ttlMs: 1000 });
 const o2 = bus.deliver('forge:file', 'o2', { ttlMs: 1000 });
 const o3 = bus.deliver('forge:file', 'o3', { ttlMs: 1000 });
 assert.equal(await o1, false, 'oldest dropped when the per-topic mailbox is full');
 const got = [];
 bus.consume('forge:file', d => { got.push(d); });
 assert.deepEqual(await Promise.all([o2, o3]), [true, true]);
 assert.deepEqual(got, ['o2', 'o3']);
 assert.equal(await bus.deliver('forge:file', 'zero', { ttlMs: 0 }), true, 'ttl 0 still reaches a mounted consumer');
});

test('consumer errors are isolated and history is a bounded frozen ring', async () => {
 const c = fakeClock();
 const errors = [];
 const bus = createRoomBus({ ...c, historySize: 4, onError: e => errors.push(e.message) });
 bus.consume('room:x', () => { throw new Error('bad consumer'); });
 const p = bus.deliver('room:x', 1, { ttlMs: 50 });
 assert.deepEqual(errors, ['bad consumer']);
 c.advance(50);
 assert.equal(await p, false);
 for (let i = 0; i < 6; i++) bus.publish('room:y', i);
 const h = bus.history();
 assert.equal(h.length, 4);
 assert.ok(Object.isFrozen(h) && Object.isFrozen(h[0]));
 assert.ok(h.every(e => e.kind === 'publish' && e.topic === 'room:y'));
});
