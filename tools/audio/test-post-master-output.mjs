import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const esbuild = require(process.env.XENSONAR_ESBUILD_MODULE || 'esbuild');
const root = path.resolve(import.meta.dirname, '../..');
const code = esbuild.transformSync(fs.readFileSync(path.join(root, 'src/features/xensonar/audio/postMasterOutputSession.ts'), 'utf8'), { loader: 'ts', format: 'esm' }).code;
const { PostMasterOutputSession: Session, enqueueMasterOutput } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; };
const tick = () => new Promise(resolve => setImmediate(resolve));
let passed = 0;
function harness(overrides = {}) {
  const events = []; let browser = true, native = false;
  const ports = {
    prepare: async () => { events.push('prepare'); },
    settleBrowserMaster: async () => { events.push('graph-applied'); },
    commit: async () => { assert.equal(browser, false); native = true; events.push('commit'); },
    stop: async () => { native = false; events.push('stop-ack'); return { confirmed: true }; },
    disconnectBrowserMaster: () => { browser=false; events.push('disconnect'); },
    reconnectBrowserMaster: () => { assert.equal(native,false); browser=true; events.push('restore'); },
    dispose: () => events.push('dispose'), publish: phase => events.push(phase), ...overrides,
  };
  const stopPort = ports.stop;
  ports.stop = async () => { const proof = await stopPort(); if (proof.confirmed) native = false; return proof; };
  return { session: new Session(ports), ports, events, browser: () => browser };
}
async function test(name, run) { await run(); passed++; console.log('PASS ' + name); }
await test('concurrent starts have one preparation, one master disconnect and one commit', async () => {
  const prepare = deferred(); const h = harness({ prepare: () => { h.events.push('prepare'); return prepare.promise; } });
  const start = h.session.start(); assert.equal(start, h.session.start());
  await tick(); assert.equal(h.events.filter(x=>x==='prepare').length,1); prepare.resolve();
  await start; assert.equal(h.session.phase,'native-owned');
  assert.equal(h.events.filter(x=>x==='disconnect').length,1);
  await Promise.all([h.session.stop(),h.session.stop()]);
  assert.equal(h.events.filter(x=>x==='stop-ack').length,1);
  assert.ok(h.events.indexOf('stop-ack') < h.events.indexOf('restore'));
});
await test('late preparation after cancellation never disconnects or commits', async () => {
  const prepare = deferred(); const h = harness({ prepare: () => prepare.promise });
  const start=h.session.start(); await tick(); const stop=h.session.stop(); prepare.resolve();
  await Promise.all([start,stop]); assert.equal(h.browser(),true);
  assert.ok(!h.events.includes('commit')); assert.ok(!h.events.includes('disconnect'));
});
await test('cancel during in-flight commit waits for remote stop before restoring', async () => {
  const commit=deferred(), stopped=deferred(); const h=harness({ commit:()=>commit.promise, stop:()=>stopped.promise });
  const start=h.session.start(); await tick(); assert.equal(h.browser(),false);
  const close=h.session.stop(); commit.resolve(); await tick(); assert.equal(h.browser(),false);
  stopped.resolve({confirmed:true}); await Promise.all([start,close]); assert.equal(h.browser(),true);
  assert.ok(!h.events.includes('native-owned'));
});
await test('abort while the audio graph fence is pending cannot issue native commit', async () => {
  const fence=deferred(); const h=harness({settleBrowserMaster:()=>fence.promise});
  const start=h.session.start(); await tick(); const stop=h.session.stop();
  fence.resolve(); await Promise.all([start,stop]);
  assert.ok(!h.events.includes('commit')); assert.equal(h.browser(),true);
});
await test('unconfirmed stop retains master reservation and is not mislabeled stopped', async () => {
  const h=harness({ stop:async()=>({confirmed:false,reason:'timeout'}) });
  await h.session.start(); await h.session.stop('socket-fault');
  assert.equal(h.session.phase,'owner-unknown'); assert.equal(h.browser(),false);
  assert.equal(h.events.filter(x=>x==='dispose').length,1);
});
await test('failed commit restores only after a confirmed stop', async () => {
  const h=harness({ commit:async()=>{throw new Error('ack-lost');} });
  await h.session.start(); assert.equal(h.session.phase,'fault'); assert.equal(h.browser(),true);
  assert.ok(h.events.indexOf('stop-ack') < h.events.indexOf('restore'));
});
await test('capability failure preserves browser and creates no output switch', async () => {
  const h=harness({prepare:async()=>{throw new Error('host-v1');}});
  await h.session.start(); assert.equal(h.session.phase,'fault');
  assert.ok(!h.events.includes('disconnect')); assert.ok(!h.events.includes('restore'));
});
await test('rapid three-way remount serializes across asynchronous cleanup', async () => {
  const context={}, stop=deferred(); let count=0;
  const first=harness({stop:()=>stop.promise});
  const close1=enqueueMasterOutput(context,()=>{count++;return first.session;});
  await tick(); const release1=close1();
  const close2=enqueueMasterOutput(context,()=>{count++;return harness().session;});
  const release2=close2();
  const close3=enqueueMasterOutput(context,()=>{count++;return harness().session;});
  await tick(); assert.equal(count,1);
  stop.resolve({confirmed:true}); await Promise.all([release1,release2]); await tick();
  assert.equal(count,2); await close3();
});
console.log(JSON.stringify({pass:true,tests:passed,proof:'control-plane-behaviour',physicalAudio:false}));
