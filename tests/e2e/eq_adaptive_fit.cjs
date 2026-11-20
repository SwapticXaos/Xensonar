'use strict';
// EQ-ADAPT-01 (real app): the adaptive EQ follows the drawn line, never the rigid equal-slice raster.
//  1. Wave Editor offline EQ (no audio owner): the displayed plan (peekPlan) at rest is the accurate fit, not the provisional equal-slice plan
//  2. while a drawing gesture runs the cheap provisional plan is still used (no 40 ms fit per pointer move)
//  3. Live Room EQ with the fit Worker blocked (Worker unavailable): the accurate fit still arrives (control-thread fallback)
//  4. same with the Worker available
// Usage: node tests/e2e/eq_adaptive_fit.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
async function boot(b,blockWorker){
 const ctx=await b.newContext();const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 if(blockWorker)await p.addInitScript(()=>{window.Worker=undefined});
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2000);
 return {p,errors,E:c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c)};
}
const SETUP=key=>`(()=>{const key=${JSON.stringify(key)};const a=Array(360).fill(0);for(let i=0;i<360;i++)a[i]=i>=200&&i<215?0.9:i>=100&&i<104?-0.8:0;
 __XenEQ.set(key,{a,mode:'adaptive',bands:12});globalThis.__k=key;return 1})()`;
(async()=>{
 const b=await chromium.launch();
 // ---- 1 + 2: offline (Wave Editor) ----
 {const {p,errors,E}=await boot(b,false);
  const r=JSON.parse(await E(`(()=>{const key='waveOffline:t:1';__XenWaveOfflineEQ.registerRate(key,48000);`+SETUP('waveOffline:t:1').slice(0,0)+`
   const a=Array(360).fill(0);for(let i=0;i<360;i++)a[i]=i>=200&&i<215?0.9:i>=100&&i<104?-0.8:0;__XenEQ.set(key,{a,mode:'adaptive',bands:12});
   const cfg=__XenEQ.get(key),peek=__XenEQ.peekPlan(cfg,48000,key),exact=__XenEQ.plan(cfg,48000);
   const top=Math.min(20000,48000*.45),grid=Array.from({length:12},(_,i)=>20*Math.pow(top/20,(i+.5)/12));
   const off=peek.filters.filter(f=>Math.abs(f.gain)>.01).filter(f=>grid.every(g=>Math.abs(Math.log(f.frequency/g))>.02)).length;
   __XenEQ.startGesture(key,'paint');__XenEQ.set(key,{a:a.map((v,i)=>i===50?.5:v)});const gcfg=__XenEQ.get(key),gp=__XenEQ.peekPlan(gcfg,48000,key);__XenEQ.endGesture(key);
   return JSON.stringify({prov:!!peek.provisional,sameAsExact:JSON.stringify(peek.filters)===JSON.stringify(exact.filters),fitError:peek.fitError,offGrid:off,gestureProv:!!gp.provisional})})()`));
  assert.equal(r.prov,false,'offline EQ at rest shows the accurate fit, not the provisional plan');
  assert(r.sameAsExact,'the displayed plan is the plan the bake uses');
  assert(Number.isFinite(r.fitError),'a real fit error is reported');
  assert(r.offGrid>=3,'filters sit on the drawn line (off the equal-slice grid): '+r.offGrid);
  assert.equal(r.gestureProv,true,'during a drawing gesture the cheap provisional plan is used');
  assert.deepEqual(errors,[]);await p.context().close();}
 // ---- 3 + 4: live room fit, Worker blocked / available ----
 for(const blocked of [true,false]){
  const {p,errors,E}=await boot(b,blocked);await E(SETUP('material:live-test'));
  let res=null;for(let i=0;i<40;i++){await p.waitForTimeout(150);res=JSON.parse(await E(`(()=>{const pl=__XenEQ.livePlan(__XenEQ.get(__k),48000,__k);return JSON.stringify({prov:!!pl.provisional,err:pl.fitError,n:pl.filters.filter(q=>Math.abs(q.gain)>.01).length})})()`));if(!res.prov)break}
  assert.equal(res.prov,false,(blocked?'Worker blocked: ':'Worker available: ')+'the accurate fit arrives: '+JSON.stringify(res));
  assert(res.n>=3&&Number.isFinite(res.err),'fit has bands: '+JSON.stringify(res));
  assert.deepEqual(errors,[]);await p.context().close();
 }
 console.log('eq_adaptive_fit OK');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
