'use strict';
// TS-MOD-01 (real app): the old short names of the Nodal modulation matrix are bound to the typed module
// (src/ts/nodal/nodalModulationMatrix.ts), and Art Installation shows the routing labels from it.
// Note: the evaluation path (Mycelium colour voice, Ape/vpe in src/rhythm/02_bass_and_rack.js) only runs with Mycelium on
// WITHOUT installation sound, Live power on and a non-installation mode; not reached through the UI here (also not before).
// Its arithmetic is covered by tests/ts_mod01_parity.test.cjs.
// Usage: node tests/e2e/ts_mod01_live.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch();const q=await(await b.newContext({viewport:{width:1440,height:1000}})).newPage();
 const errors=[];q.on('pageerror',e=>errors.push(e.message));
 await q.goto('file://'+html);await q.waitForTimeout(3500);
 const inBundle=code=>q.evaluate(c=>window.__xenProbe.draw.evalInBundle(c),code);
 const m='__XenTs_nodalModulationMatrix';
 const bound=await inBundle(`eoe===${m}.evaluateNodalModulationMatrix&&Jae===${m}.deriveNodalModSourceValues&&R0===${m}.DEFAULT_NODAL_MOD_ROUTES&&Kae===${m}.NODAL_MOD_SOURCE_LABELS&&$ae===${m}.NODAL_MOD_TARGET_LABELS`);
 assert.equal(bound,true,'old names bound to the typed module');
 await q.evaluate(()=>[...document.querySelectorAll('header button')].find(b=>/NODAL/.test(b.innerText)).click());await q.waitForTimeout(2000);
 const art=q.getByRole('button',{name:'Art Installation'});if(await art.count())await art.first().click();await q.waitForTimeout(1200);
 await q.evaluate(()=>document.querySelectorAll('details').forEach(d=>d.open=true));await q.waitForTimeout(400);
 const text=await q.evaluate(()=>document.body.innerText);
 for(const s of ['Aura Intersection → Resonator Intersection','Raw Body → Friction Noise','Friction · FM'])assert.ok(text.includes(s),'routing view shows '+s);
 assert.deepEqual(errors,[],'no page errors');await b.close();console.log('ts_mod01_live OK');
})().catch(e=>{console.error(e);process.exit(1)});
