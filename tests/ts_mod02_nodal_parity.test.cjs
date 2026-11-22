'use strict';
// TS-MOD-02 & TS-MOD-03 parity tests: verifies src/ts/nodal/nodalDeviceMatrix.ts and
// src/ts/nodal/residentNodeTuning.ts match the legacy minified code bit-for-bit across
// constants, edge cases, and thousands of randomized inputs.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const same = (a, b, msg) => assert.deepEqual(JSON.parse(JSON.stringify(b)), JSON.parse(JSON.stringify(a)), msg);

let seed = 42;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const edge = [undefined, null, NaN, Infinity, -Infinity, -100, -1, 0, 0.25, 0.5, 1, 1.5, 2, 54, 55, 440, 1760, 3000, '0.4'];
const pickEdge = () => (rnd() < 0.35 ? edge[Math.floor(rnd() * edge.length)] : rnd() * 2.4 - 0.6);

// --- TS-MOD-02: nodalDeviceMatrix.ts ---
const legacyDevCtx = vm.createContext({});
vm.runInContext(
  fs.readFileSync(path.join(root, 'tests/fixtures/ts_mod02_legacy_07_devices.js'), 'utf8') +
    ';globalThis.L={Wx,ZP,q0,eI,eT,tI,qae,b2,toe,noe};',
  legacyDevCtx,
);
const LD = legacyDevCtx.L;

const modDevCtx = vm.createContext({});
vm.runInContext(
  execFileSync('node', [path.join(root, 'tools/ts_module.cjs'), path.join(root, 'src/ts/nodal/nodalDeviceMatrix.ts')]).toString() +
    ';globalThis.M=__XenTs_nodalDeviceMatrix;',
  modDevCtx,
);
const MD = modDevCtx.M;

test('TS-MOD-02: device matrix & Room III metadata constants are identical', () => {
  same(LD.Wx, MD.NODAL_INTERPRETERS, 'interpreters');
  same(LD.ZP, MD.NODAL_SOUND_TARGETS, 'sound targets');
  same(LD.eI, MD.DEFAULT_NODAL_DEVICE_MATRIX, 'default matrix');
  same(LD.b2, MD.NODAL_ROOM3_FOCUS_TABS, 'room 3 focus tabs');
  assert.equal(MD.DEFAULT_NODAL_ROOM3_FOCUS, LD.toe);
  same(LD.noe, MD.MYZEL_COLOR_VOICE_SLIDERS, 'color voice sliders');
});

test('TS-MOD-02: clampNodalUnit, normalizeNodalDeviceMatrix, patchNodalDevice, setNodalDeviceTarget (2000 cases)', () => {
  for (const v of edge) {
    assert.ok(Object.is(LD.q0(v), MD.clampNodalUnit(v)), 'clamp ' + String(v));
    assert.ok(Object.is(LD.q0(v, -1, 2), MD.clampNodalUnit(v, -1, 2)), 'clamp range ' + String(v));
  }
  same(LD.eT(undefined), MD.normalizeNodalDeviceMatrix(undefined), 'normalize undefined');
  same(LD.eT(null), MD.normalizeNodalDeviceMatrix(null), 'normalize null');
  same(LD.eT({}), MD.normalizeNodalDeviceMatrix({}), 'normalize empty');

  const ids = LD.Wx.map((x) => x.id);
  const targets = LD.ZP.map((x) => x.id);

  for (let i = 0; i < 2000; i++) {
    const partial = {};
    for (const id of ids) {
      if (rnd() < 0.6) {
        const entry = {};
        if (rnd() < 0.7) entry.enabled = rnd() < 0.5;
        if (rnd() < 0.7) entry.amount = pickEdge();
        if (rnd() < 0.7) {
          entry.targets = {};
          for (const t of targets) if (rnd() < 0.5) entry.targets[t] = pickEdge();
        }
        partial[id] = entry;
      }
    }
    const normL = LD.eT(partial);
    const normM = MD.normalizeNodalDeviceMatrix(partial);
    same(normL, normM, 'normalize #' + i);

    const pickId = ids[Math.floor(rnd() * ids.length)];
    const patch = {
      ...(rnd() < 0.5 ? { enabled: rnd() < 0.5 } : {}),
      ...(rnd() < 0.5 ? { amount: pickEdge() } : {}),
      ...(rnd() < 0.5 ? { targets: { [targets[Math.floor(rnd() * targets.length)]]: pickEdge() } } : {}),
    };
    same(LD.tI(normL, pickId, patch), MD.patchNodalDevice(normM, pickId, patch), 'patch #' + i);

    const pickTarget = targets[Math.floor(rnd() * targets.length)];
    const val = pickEdge();
    same(LD.qae(normL, pickId, pickTarget, val), MD.setNodalDeviceTarget(normM, pickId, pickTarget, val), 'setTarget #' + i);
  }
});

// --- TS-MOD-03: residentNodeTuning.ts ---
const stubEnv = {
  fc: [
    { ratio: 1, cents: 0, label: '1/1' },
    { ratio: 9 / 8, cents: 203.91, label: '9/8' },
    { ratio: 5 / 4, cents: 386.31 },
    { ratio: 3 / 2, cents: 701.96, label: '3/2' },
  ],
  tj: [1, 1.08818, 1.18414, 1.28856, 1.40219, 1.52583],
  Kp: (sys) => (sys === '19edo' ? Array.from({ length: 19 }, (_, k) => (k * 1200) / 19) : Array.from({ length: 12 }, (_, k) => k * 100)),
  Ka: (sys) => (sys === 'empty' ? [] : [{ value: 'chromatic' }, { value: 'pentatonic' }, { value: 'diatonic' }]),
  Au: (mode, sys) =>
    mode === 'emptyMask'
      ? []
      : mode === 'pentatonic'
        ? [1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0]
        : sys === 'bp'
          ? [1, 1, 0, 1, 0, 1]
          : [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
};

const legacyResCtx = vm.createContext({ ...stubEnv, Math, Date, Array, Number, Object });
vm.runInContext(
  fs.readFileSync(path.join(root, 'tests/fixtures/ts_mod03_legacy_07_residents.js'), 'utf8') +
    ';globalThis.L={doe,moe,$d,Gy,i0,y2,E6,CS,hoe,rI,aI,F6,foe,T6,tT,goe,kS,boe,yoe,Soe,voe};',
  legacyResCtx,
);
const LR = legacyResCtx.L;

const modResCtx = vm.createContext({ Math, Date, Array, Number, Object });
vm.runInContext(
  execFileSync('node', [path.join(root, 'tools/ts_module.cjs'), path.join(root, 'src/ts/nodal/residentNodeTuning.ts')]).toString() +
    ';globalThis.M=__XenTs_residentNodeTuning;',
  modResCtx,
);
const MR = modResCtx.M;
const runtimeDeps = {
  getStepCents: stubEnv.Kp,
  getModeOptions: stubEnv.Ka,
  getModeMask: stubEnv.Au,
  getJiSteps: () => stubEnv.fc,
  getBpRatios: () => stubEnv.tj,
};
const boundMR = MR.bindResidentTuningRuntime(runtimeDeps);

test('TS-MOD-03: frequency math, labels, mute masks, and scale steps match legacy exactly', () => {
  assert.equal(MR.RESIDENT_MIN_FREQ_HZ, LR.$d);
  assert.equal(MR.RESIDENT_MAX_FREQ_HZ, LR.Gy);

  for (const v of edge) {
    assert.ok(Object.is(LR.CS(v), MR.clampResidentFreq(v)), 'clampFreq ' + String(v));
    assert.equal(MR.formatResidentFreqHz(v), LR.E6(v), 'formatFreq ' + String(v));
    assert.ok(Object.is(LR.hoe(v), MR.normToResidentFreq(v)), 'normToFreq ' + String(v));
    assert.ok(Object.is(LR.rI(v), MR.residentFreqToNorm(v)), 'freqToNorm ' + String(v));
  }

  for (const sys of ['ji', 'bp', '12edo', '19edo', 'empty']) {
    same(LR.F6(sys), boundMR.buildScaleSteps(sys), 'steps ' + sys);
    for (const mode of ['chromatic', 'pentatonic', 'unknown', 'emptyMask']) {
      assert.equal(boundMR.resolveMode(sys, mode), LR.aI(sys, mode), 'resolveMode ' + sys + '/' + mode);
      same(LR.foe(sys, mode, 14), boundMR.buildActiveMask(sys, mode, 14), 'mask ' + sys + '/' + mode);
    }
  }

  same(LR.doe([true, false, true], true), MR.maskMutedStates([true, false, true], true));
  same(LR.doe([true, false, true], false), MR.maskMutedStates([true, false, true], false));
  assert.equal(MR.isParticleWithOverlay('particle', true), LR.moe('particle', true));
  assert.equal(MR.isParticleWithOverlay('wave', true), LR.moe('wave', true));
});

test('TS-MOD-03: node sync, retune, and non-overlapping custom placement (500 randomized scenes)', () => {
  const systems = ['ji', 'bp', '12edo', '19edo'];
  const modes = ['chromatic', 'pentatonic', 'diatonic', 'unknown'];

  for (let i = 0; i < 500; i++) {
    const sys = systems[Math.floor(rnd() * systems.length)];
    const mode = modes[Math.floor(rnd() * modes.length)];
    const baseFreq = 55 + rnd() * 440;
    const width = 220 + Math.floor(rnd() * 600);
    const height = 180 + Math.floor(rnd() * 400);
    const count = 1 + Math.floor(rnd() * 14);

    const makeNodes = () =>
      Array.from({ length: count }, (_, idx) => ({
        x: Math.floor(rnd() * width),
        y: Math.floor(rnd() * height),
        freq: 40 + rnd() * 2000,
        energy: 0,
        label: 'n' + idx,
        ratio: 1,
        tuningCents: rnd() < 0.3 ? (rnd() - 0.5) * 40 : 0,
        residentId: 'fixed-' + idx,
        isCustomResident: rnd() < 0.25,
      }));
    const template = makeNodes();
    const nodesL = JSON.parse(JSON.stringify(template));
    const nodesM = JSON.parse(JSON.stringify(template));

    same(LR.Soe(nodesL, width, height), MR.findCustomResidentPlacement(nodesM, width, height), 'placement #' + i);
    LR.boe(nodesL, baseFreq, sys, mode);
    boundMR.retuneNodes(nodesM, baseFreq, sys, mode);
    same(nodesL, nodesM, 'retune #' + i);

    const hz = pickEdge();
    const createdL = LR.voe({ nodes: nodesL, baseFreq, width, height, system: sys, mode, frequencyHz: hz });
    const createdM = boundMR.createCustomNode({ nodes: nodesM, baseFreq, width, height, system: sys, mode, frequencyHz: hz });
    // Normalize non-deterministic residentId for parity comparison
    assert.match(createdM.residentId, /^resident-[a-z0-9]+-[a-z0-9]+$/);
    createdL.residentId = createdM.residentId = 'norm';
    same(createdL, createdM, 'createCustom #' + i);
    same(nodesL, nodesM, 'nodes after createCustom #' + i);
  }
});
