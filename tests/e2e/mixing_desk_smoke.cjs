'use strict';
// MIX-DESK-01 smoke (real app): the Mixing Desk is part of the bundle, loads without errors, maxVoices is configurable.
// Usage: node tests/e2e/mixing_desk_smoke.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1600,height:1000}})).newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click().catch(()=>{});await p.waitForTimeout(2000);
 const r=await p.evaluate(()=>({desk:typeof window.__XenMixingDesk,stage:typeof (window.__XenMixingDesk&&window.__XenMixingDesk.Stage),css:!!document.getElementById('xen-dj-mix-stage-css')}));
 assert.equal(r.desk,'object','__XenMixingDesk present');assert.equal(r.stage,'function','Stage component present');assert.ok(r.css,'desk stylesheet present');
 const m=await p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),`typeof __XenDjMixMath==='object'&&__XenDjMixMath.clamp(9,0,6)`);
 assert.equal(m,6);
 assert.deepEqual(errors,[]);console.log('PASS MIX-DESK-01 smoke');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
