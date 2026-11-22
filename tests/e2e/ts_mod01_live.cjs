'use strict';
// TS-MOD-01 (real app): the old short names of the Nodal modulation matrix are bound to the typed module
// (src/ts/nodal/nodalModulationMatrix.ts), and Art Installation shows the routing labels from it.
// The old evaluation path (Mycelium colour voice) was dead code and is removed (DEAD-MYZEL-01); the arithmetic stays
// covered by tests/ts_mod01_parity.test.cjs.
// Usage: node tests/e2e/ts_mod01_live.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch();const q=await(await b.newContext({viewport:{width:1440,height:1000}})).newPage();
 const errors=[];q.on('pageerror',e=>errors.push(e.message));
 await q.goto('file://'+html);await q.waitForTimeout(3500);
 const inBundle=code=>q.evaluate(c=>window.__xenProbe.draw.evalInBundle(c),code);
 const m='__XenTs_nodalModulationMatrix';
 const m2='__XenTs_nodalDeviceMatrix';
 const m3='__XenTs_residentNodeTuning';
 const m4='__XenTs_voiceAdmission';
 const m5='__XenTs_workspacePackageCodec';
 const bound=await inBundle(`eoe===${m}.evaluateNodalModulationMatrix&&Jae===${m}.deriveNodalModSourceValues&&R0===${m}.DEFAULT_NODAL_MOD_ROUTES&&Kae===${m}.NODAL_MOD_SOURCE_LABELS&&$ae===${m}.NODAL_MOD_TARGET_LABELS&&ZP===${m2}.NODAL_SOUND_TARGETS&&eI===${m2}.DEFAULT_NODAL_DEVICE_MATRIX&&eT===${m2}.normalizeNodalDeviceMatrix&&tI===${m2}.patchNodalDevice&&qae===${m2}.setNodalDeviceTarget&&$d===${m3}.RESIDENT_MIN_FREQ_HZ&&Gy===${m3}.RESIDENT_MAX_FREQ_HZ&&CS===${m3}.clampResidentFreq&&hoe===${m3}.normToResidentFreq&&rI===${m3}.residentFreqToNorm&&DF===${m4}.blendFreqLog&&jj===${m4}.resolveHybridFieldFreq&&Ete===${m4}.evaluateRate160Gate&&al===${m5}.hashStringFnv1a&&Wj===${m5}.validateWorkspacePackageEnvelope&&Sw===${m5}.encodeArrayBufferToBase64`);
 assert.equal(bound,true,'old names bound to the typed TS modules (TS-MOD-01..05)');
 await q.evaluate(()=>[...document.querySelectorAll('header button')].find(b=>/NODAL/.test(b.innerText)).click());await q.waitForTimeout(2000);
 const art=q.getByRole('button',{name:'Art Installation'});if(await art.count())await art.first().click();await q.waitForTimeout(1200);
 await q.evaluate(()=>document.querySelectorAll('details').forEach(d=>d.open=true));await q.waitForTimeout(400);
 const text=await q.evaluate(()=>document.body.innerText);
 for(const s of ['Aura Intersection → Resonator Intersection','Raw Body → Friction Noise','Friction · FM'])assert.ok(text.includes(s),'routing view shows '+s);
 assert.deepEqual(errors,[],'no page errors');await b.close();console.log('ts_mod01_live OK');
})().catch(e=>{console.error(e);process.exit(1)});
