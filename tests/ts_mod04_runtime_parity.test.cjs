'use strict';
// TS-MOD-04 & TS-MOD-05 parity tests: verifies src/ts/runtime/voiceAdmission.ts and
// src/ts/runtime/workspacePackageCodec.ts match the legacy minified code bit-for-bit across
// constants, edge cases, probe hooks, timers, and thousands of randomized inputs.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const same = (a, b, msg) => assert.deepEqual(JSON.parse(JSON.stringify(b)), JSON.parse(JSON.stringify(a)), msg);

let seed = 1337;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const edge = [0, -10, 0.001, 0.25, 0.5, 0.9, 1, 1.5, 55, 220, 440, 1760, 5000, NaN, Infinity, -Infinity];
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

const metricsL = [];
const metricsM = [];
const probeLogL = [];
const probeLogM = [];
let fakeNow = 1000;

const baseGlobals = {
  Math,
  Date,
  Array,
  Number,
  String,
  Object,
  Set,
  Map,
  Uint8Array,
  Blob,
  Error,
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  setTimeout,
  clearTimeout,
};

const legacyCtx = vm.createContext({
  ...baseGlobals,
  performance: { now: () => fakeNow },
  fr: (k, v) => metricsL.push([k, v]),
  __XenAudioProbe: { enabled: true, record: (...args) => probeLogL.push(args) },
});
legacyCtx.window = legacyCtx;
legacyCtx.globalThis = legacyCtx;
vm.runInContext(
  fs.readFileSync(path.join(root, 'tests/fixtures/ts_mod04_legacy_04_runtime.js'), 'utf8') +
    ';globalThis.L={$5,Kl,DF,Ste,vte,jj,NF,Mte,Gj,wte,Rte,kte,Pte,Ite,Ete,Bte,wS,al,vt,Dte,Wj,OF,Sw,qj,Nte,Qj,Ote};',
  legacyCtx,
);
const L = legacyCtx.L;

const modCtx = vm.createContext({
  ...baseGlobals,
  performance: { now: () => fakeNow },
  __XenAudioProbe: { enabled: true, record: (...args) => probeLogM.push(args) },
});
modCtx.window = modCtx;
modCtx.globalThis = modCtx;
vm.runInContext(
  execFileSync('node', [path.join(root, 'tools/ts_module.cjs'), path.join(root, 'src/ts/runtime/voiceAdmission.ts')]).toString() +
    '\n' +
    execFileSync('node', [path.join(root, 'tools/ts_module.cjs'), path.join(root, 'src/ts/runtime/workspacePackageCodec.ts')]).toString() +
    ';globalThis.VA=__XenTs_voiceAdmission;globalThis.PK=__XenTs_workspacePackageCodec;',
  modCtx,
);
const VA = modCtx.VA;
const PK = modCtx.PK;

test('TS-MOD-04: pitch blend constants & logarithmic frequency math (1500 cases)', () => {
  same(L.$5, VA.DEFAULT_PITCH_BLEND_WEIGHTS, 'pitch blend weights');
  same(L.Gj, VA.PERFORMANCE_TRACK_KINDS, 'track kinds');
  same(L.wte, VA.DEFAULT_VOICE_ADMISSION_CONFIG, 'default admission config');
  same(L.Rte, VA.DEFAULT_VOICE_MIN_OCCUPANCY_OVERRIDE, 'min occupancy override');

  const quantize = (hz) => Math.round(hz * 2) / 2;
  for (let i = 0; i < 1500; i++) {
    const a = rnd() < 0.3 ? pick(edge) : rnd() * 2000;
    const b = rnd() < 0.3 ? pick(edge) : rnd() * 2000;
    const t = rnd() < 0.3 ? pick(edge) : rnd() * 1.4 - 0.2;
    assert.ok(Object.is(L.DF(a, b, t, 55, 1760), VA.blendFreqLog(a, b, t, 55, 1760)), 'blendFreqLog #' + i);

    const field = {
      dominantFreq: rnd() < 0.25 ? 0 : 40 + rnd() * 2000,
      maxEnergy: rnd() * 1.3 - 0.1,
      coherence: rnd() < 0.3 ? undefined : rnd() * 1.2,
      myceliumBallSpeed: rnd() * 20,
    };
    const freq = rnd() < 0.2 ? undefined : 30 + rnd() * 2200;
    const fallback = 220;
    const blend = rnd();
    assert.ok(
      Object.is(
        L.jj(freq, fallback, field, quantize, 55, 1760, blend),
        VA.resolveHybridFieldFreq(freq, fallback, field, quantize, 55, 1760, blend),
      ),
      'resolveHybridFieldFreq #' + i,
    );
  }
});

test('TS-MOD-04: voice admission controller, lease, send-gating & reset parity (500 step simulation)', () => {
  metricsL.length = 0;
  metricsM.length = 0;
  let extBias = 0;
  const cfg = {
    softLimit: 10,
    hardLimit: 18,
    perSourceHard: { particle: 7, wave: 6, drum: 5, other: 4 },
    sourceMinOccupancyMs: { particle: 0, wave: 0, drum: 0, other: 0 },
    silentHotPathSources: { drum: true },
    getExternalPressureBias: () => extBias,
  };
  const ctrlL = L.Mte(cfg);
  const ctrlM = VA.createVoiceAdmissionController(cfg, (k, v) => metricsM.push([k, v]));
  const sources = ['particle', 'wave', 'drum', 'other'];
  const handlesL = [];
  const handlesM = [];

  for (let i = 0; i < 500; i++) {
    extBias = rnd() < 0.25 ? rnd() * 1.2 : 0;
    const src = pick(sources);
    assert.equal(ctrlM.canAdmitVoice(src), ctrlL.canAdmitVoice(src), 'canAdmit #' + i);

    const req = 1 + Math.floor(rnd() * 6);
    const intensity = rnd() * 2.8;
    const planL = ctrlL.beginEvent(src, req, intensity);
    const planM = ctrlM.beginEvent(src, req, intensity);
    same(planL, planM, 'beginEvent #' + i);

    const tries = 1 + Math.floor(rnd() * 4);
    for (let k = 0; k < tries; k++) {
      const prom = rnd();
      const hL = ctrlL.admitVoice(planL, prom);
      const hM = ctrlM.admitVoice(planM, prom);
      assert.equal(Boolean(hM), Boolean(hL), 'admit nullability #' + i + '.' + k);
      if (hL && hM) {
        assert.equal(hM.id, hL.id);
        same(ctrlL.pickTargets(['a', null, 'b', 'c', 'd'], hL), ctrlM.pickTargets(['a', null, 'b', 'c', 'd'], hM));
        const buckets = [[], ['x'], ['x', 'y'], ['x', 'y', 'z']];
        same(ctrlL.pickPreparedTargets(buckets, hL), ctrlM.pickPreparedTargets(buckets, hM));
        handlesL.push(hL);
        handlesM.push(hM);
      }
    }

    if (handlesL.length > 0 && rnd() < 0.55) {
      const idx = Math.floor(rnd() * handlesL.length);
      const [rL] = handlesL.splice(idx, 1);
      const [rM] = handlesM.splice(idx, 1);
      if (rnd() < 0.2) {
        ctrlL.retainRejectedAdmission(rL);
        ctrlM.retainRejectedAdmission(rM);
      } else {
        ctrlL.releaseVoice(rL);
        ctrlM.releaseVoice(rM);
      }
    }

    if (i === 250) {
      ctrlL.reset();
      ctrlM.reset();
      handlesL.length = 0;
      handlesM.length = 0;
    }

    same(ctrlL.getSnapshot(), ctrlM.getSnapshot(), 'snapshot #' + i);
  }
  same(metricsL, metricsM, 'emitted admission metrics match exactly');

  // Lease wrapper NF parity
  ctrlL.reset();
  ctrlM.reset();
  const leasePlanL = ctrlL.beginEvent('wave', 2, 1);
  const leasePlanM = ctrlM.beginEvent('wave', 2, 1);
  const leaseL = L.NF(ctrlL, leasePlanL, 0.9, ['bus1', '', 'bus2']);
  const leaseM = VA.acquireVoiceLease(ctrlM, leasePlanM, 0.9, ['bus1', '', 'bus2']);
  assert.ok(leaseL && leaseM);
  same({ g: leaseL.gainScale, e: leaseL.envelopeScale, t: leaseL.auxTargets }, { g: leaseM.gainScale, e: leaseM.envelopeScale, t: leaseM.auxTargets });
  leaseL.release();
  leaseM.release();
  same(ctrlL.getSnapshot(), ctrlM.getSnapshot());
});

test('TS-MOD-04: 160-ms rate gate & __XenAudioProbe parity (1000 events)', () => {
  probeLogL.length = 0;
  probeLogM.length = 0;
  const stL = L.kte();
  const stM = VA.createRate160State();
  same(stL, stM);

  const kinds = ['particle', 'resident', 'preview', 'other'];
  let nowSec = 0;
  for (let i = 0; i < 1000; i++) {
    nowSec += rnd() < 0.15 ? 0.17 : 0.015;
    const kind = pick(kinds);
    const pressure = rnd() * 1.2 - 0.1;
    const resL = L.Ete(stL, nowSec, kind, pressure, i);
    const resM = VA.evaluateRate160Gate(stM, nowSec, kind, pressure, i);
    same(resL, resM, 'gate160 result #' + i);
    same(stL, stM, 'gate160 state #' + i);
    if (i === 500) {
      L.Pte(stL);
      VA.resetRate160State(stM);
      same(stL, stM, 'gate160 reset');
    }
  }
  same(probeLogL, probeLogM, 'audio probe gate160 log matches exactly');
});

test('TS-MOD-05: FNV-1a hash, envelope validation, chunked Base64 & filenames parity', async () => {
  for (const s of ['', 'a', 'hello world', 'Xensonar Tüftelpaket 🎵', JSON.stringify({ a: [1, 2, 3], b: 'test' })]) {
    assert.equal(PK.hashStringFnv1a(s), L.al(s), 'fnv1a ' + s);
  }

  for (const v of [null, undefined, 0, 'x', [], {}, { a: 1 }]) {
    assert.equal(PK.isRecordObject(v), L.vt(v), 'isRecordObject');
  }

  const pkg = { sections: [{ kind: 'a', payload: { x: 1 } }, { kind: 'b' }] };
  same(L.Bte(pkg, 'a'), PK.findPackageSectionPayload(pkg, 'a'));
  same(L.Bte(pkg, 'b'), PK.findPackageSectionPayload(pkg, 'b'));
  same(L.Bte(pkg, 'c'), PK.findPackageSectionPayload(pkg, 'c'));
  same(L.Bte(null, 'a'), PK.findPackageSectionPayload(null, 'a'));

  const validInput = {
    parsed: { format: 'xen-test', version: 2, packageId: 'p-1', exportedAt: 123456, label: 'My Set', warnings: ['w1', 42, 'w2'] },
    expectedFormat: 'xen-test',
    expectedVersion: 2,
    fallbackLabel: 'Fallback',
  };
  same(L.Wj(validInput), PK.validateWorkspacePackageEnvelope(validInput));
  assert.throws(
    () => PK.validateWorkspacePackageEnvelope({ ...validInput, parsed: { format: 'wrong', version: 2 } }),
    /Not a valid Fallback package/,
  );

  // Chunked Base64 roundtrip across small, boundary, and multi-chunk buffers
  for (const len of [0, 1, 2, 3, 17, 1024, 70000]) {
    const buf = new Uint8Array(len);
    for (let i = 0; i < len; i++) buf[i] = (i * 37 + 13) & 255;
    same(L.OF(buf.buffer, 1000), PK.encodeArrayBufferToBase64Chunks(buf.buffer, 1000), 'chunks len=' + len);
    assert.equal(PK.encodeArrayBufferToBase64(buf.buffer), L.Sw(buf.buffer), 'base64 len=' + len);
    const blob = PK.decodeBase64ToBlob(PK.encodeArrayBufferToBase64(buf.buffer), 'application/octet-stream');
    assert.equal(blob.type, 'application/octet-stream');
    assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), buf, 'roundtrip len=' + len);
  }

  const fixedDate = new Date('2026-11-21T12:34:56.789Z');
  for (const label of ['My Pack!!', '---', 'Tüftel / Space 42', '']) {
    assert.equal(PK.slugifyPackageLabel(label), L.Nte(label), 'slug ' + label);
    assert.equal(
      PK.formatWorkspacePackageFilename(label, { prefix: ' xen ', createdAt: fixedDate }),
      L.Qj(label, { prefix: ' xen ', createdAt: fixedDate }),
    );
    assert.equal(
      PK.formatPackageFilenameFromMeta({ prefix: 'p', createdAt: fixedDate.getTime() }, label),
      L.Ote({ prefix: 'p', createdAt: fixedDate.getTime() }, label),
    );
  }
});
