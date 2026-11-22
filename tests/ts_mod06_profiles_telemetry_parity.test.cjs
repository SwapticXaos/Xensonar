'use strict';
// TS-MOD-06 & TS-MOD-07 parity tests: verifies src/ts/runtime/performanceProfiles.ts and
// src/ts/runtime/telemetryRing.ts match the legacy minified code bit-for-bit across all
// profiles, routing plans, resident timbre lookups, telemetry ring trimming, and gain math.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const same = (a, b, msg) => assert.deepEqual(JSON.parse(JSON.stringify(b)), JSON.parse(JSON.stringify(a)), msg);

let fakeNow = 500;
const baseGlobals = { Math, Date, Array, Number, String, Object, performance: { now: () => fakeNow } };

const legacyCtx = vm.createContext({ ...baseGlobals });
vm.runInContext(
  fs.readFileSync(path.join(root, 'tests/fixtures/ts_mod06_legacy_04_profiles_telemetry.js'), 'utf8') +
    ';globalThis.L={EA,H0,c2,Lee,Bee,Nx,Dee,Q5,Fj,U5,hg,Oee,_ee,zee,Tj,zP,ate,BF,ute,zy,Fn,zj,fte,gte,bte,yte,jP};',
  legacyCtx,
);
const L = legacyCtx.L;

const modCtx = vm.createContext({ ...baseGlobals });
vm.runInContext(
  execFileSync('node', [path.join(root, 'tools/ts_module.cjs'), path.join(root, 'src/ts/runtime/performanceProfiles.ts')]).toString() +
    '\n' +
    execFileSync('node', [path.join(root, 'tools/ts_module.cjs'), path.join(root, 'src/ts/runtime/telemetryRing.ts')]).toString() +
    ';globalThis.PP=__XenTs_performanceProfiles;globalThis.TR=__XenTs_telemetryRing;',
  modCtx,
);
const PP = modCtx.PP;
const TR = modCtx.TR;

test('TS-MOD-06: room profiles, Mycelium post groups, routing plans & descriptions match legacy', () => {
  same(L.EA, PP.ROOM_ARCHITECTURE_PROFILES, 'room architecture profiles');
  same(L.H0, PP.MYZEL_POST_GROUPS, 'myzel post groups');
  same(L.hg, PP.RESIDENT_TIMBRE_OPTIONS, 'resident timbre options');
  assert.equal(PP.describeArchitectureResponsibilityShift(), L.U5());

  for (const id of Object.keys(L.EA)) {
    same(L.c2(id), PP.getRoomArchitectureProfile(id), 'room profile ' + id);
  }
  for (const gid of ['master', 'particles', 'drone', 'waves', 'forge', 'unknown']) {
    same(L.Lee(gid), PP.getMyzelPostGroup(gid), 'post group ' + gid);
  }

  const roles = ['loop', 'waveMaterial', 'particleExciter', 'droneTexture', 'other'];
  const origins = ['microtonal-logic', 'wave-material', 'legacy-forge', 'external-adapter'];
  for (const role of roles) {
    assert.equal(PP.describeMaterialRoleHandoff(role), L.Q5(role), 'role handoff ' + role);
    for (const workspaceOrigin of origins) {
      assert.equal(PP.resolvePreferredMyzelGroup(role, workspaceOrigin), L.Bee(role, workspaceOrigin));
      const pL = L.Nx({ role, workspaceOrigin });
      const pM = PP.buildMaterialRoutingPlan({ role, workspaceOrigin });
      same(pL, pM, `plan ${role}/${workspaceOrigin}`);
      assert.equal(PP.formatMaterialRoutingSummary(pM), L.Dee(pL), `summary ${role}/${workspaceOrigin}`);
    }
  }
  for (const kind of ['legacy', 'canonical', 'external']) {
    assert.equal(PP.describeEngineOwnership(kind, 'Forge'), L.Fj(kind, 'Forge'));
  }

  for (const val of ['glass_needle', 'wire_bow', 'hollow_wood', 'star_chime', 'resonance_pipe', 'signal_splitter', 'unknown', null, 'sample:abc', 'sample:42']) {
    same(L.Tj(val, { elasticPitch: false }), PP.resolveResidentTimbreOption(val, { elasticPitch: false }), 'timbre ' + val);
    same(L.Tj(val, { elasticPitch: true }), PP.resolveResidentTimbreOption(val, { elasticPitch: true }), 'timbre elastic ' + val);
  }
});

test('TS-MOD-07: health classifier, traffic ring buffer, trimming & resident coupling gain parity', () => {
  same(L.zP(), TR.createBurstRecorderState());
  assert.equal(TR.RESIDENT_DEFAULT_VOLUME, L.fte);
  assert.equal(TR.RESIDENT_OUTPUT_GAIN_SCALE, L.gte);

  const bools = [false, true];
  for (const a of bools)
    for (const b of bools)
      for (const c of bools)
        for (const d of bools)
          for (const e of bools)
            for (const f of [null, 'warm'])
              for (const g of [null, 'fb']) {
                const inp = {
                  primaryCandidateCanMuteLegacy: a,
                  stableLanePrimaryAuditionReady: b,
                  stableLaneEnabled: c,
                  stableLaneReliefReady: d,
                  stableLaneProven: e,
                  stableLaneWarmupReason: f,
                  fallbackReason: g,
                };
                assert.equal(TR.classifyStableLaneHealth(inp), L.ate(inp));
              }

  const tL = L.BF();
  const tM = TR.createRuntimeTrafficSnapshot();
  tL.createdAtIso = tM.createdAtIso = '2026-11-21T00:00:00.000Z';
  same(tL, tM, 'initial traffic snapshot');

  L.ute(tL, { activeRequested: true, volume: 0.75, token: 3 });
  TR.patchRootFollowTraffic(tM, { activeRequested: true, volume: 0.75, token: 3 });
  same(tL.rootFollow, tM.rootFollow, 'rootFollow patch');

  for (const patch of [
    { enabled: true, queueLength: 4 },
    { queueLength: 12, playedTotal: 5 },
    { queueLength: 3, maxQueueLength: 9 },
    { queueLength: NaN, failedTotal: 1 },
  ]) {
    L.zy(tL, patch);
    TR.patchWaveOvertoneArpTraffic(tM, patch);
    same(tL.waveOvertoneArp, tM.waveOvertoneArp, 'arp patch');
  }

  // Ring buffer trimming across threshold (maxEvents=100 -> trimThreshold=132)
  for (let i = 0; i < 220; i++) {
    fakeNow = 1000 + i * 7;
    const ev = { kind: 'tick', subsystem: 'arp', audioNowSec: i * 0.01, detail: { i } };
    L.Fn(tL, ev, 100);
    TR.pushRuntimeTrafficEvent(tM, ev, 100);
    assert.equal(tM.recentEvents.length, tL.recentEvents.length, 'ring len #' + i);
  }
  same(tL.recentEvents, tM.recentEvents, 'ring contents after trim');

  for (const active of [false, true]) {
    for (const residentsEnabled of [false, true]) {
      for (const oscillatorBall of [false, true]) {
        const s = { residentsEnabled, residentBallCoupling: { oscillatorBall }, residentVolume: 0.45 };
        assert.equal(TR.isOscillatorBallResidentCoupled(active, s), L.yte(active, s));
      }
    }
  }
  for (const vol of [0, 0.32, 0.85, 1]) {
    for (const vel of [0, 0.5, 1]) {
      assert.ok(Object.is(L.jP({ residentVolume: vol }, vel, 0.6), TR.computeResidentHitGain({ residentVolume: vol }, vel, 0.6)));
    }
  }
});
