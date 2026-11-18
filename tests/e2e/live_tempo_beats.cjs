'use strict';
// LIVE-TEMPO-01 (real app): the glide length can be given in beats as well as in Live Room bars (16 sixteenths).
// 108 → 120 BPM in 7 beats must glide over exactly 28 sixteenths (no 4/4 rounding); the unit selector sits in the same row
// (the Time & Echo column keeps its height); the bars unit still works (1 bar = 16 sixteenths).
// Usage: node tests/e2e/live_tempo_beats.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1440,height:1000}})).newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(3500);
 const card=p.locator('h3',{hasText:'Time & Echo'}).locator('xpath=..');
 await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
 await E(`(()=>{window.__steps=[];const o=QPe;QPe=function(a){const r=o(a);if(!r.stale)window.__steps.push([r.absoluteStep,r.timeSec]);return r}})()`);
 const glide=async(to,len,unit)=>{await E('window.__steps.length=0');await p.locator('[data-xen-tempo-ramp-unit]').selectOption(unit);await p.locator('[data-xen-tempo-ramp-to]').fill(String(to));await p.locator('[data-xen-tempo-ramp-bars]').fill(String(len));
  const from=await E('__NodalBallGrid.params().quantizeBpm');await p.locator('[data-xen-tempo-ramp-go]').click();
  for(let k=0;k<100&&await p.locator('[data-xen-tempo-ramp]').getAttribute('data-xen-tempo-ramp')!=='idle';k++)await p.waitForTimeout(100);await p.waitForTimeout(1200);
  const st=await E('JSON.stringify(window.__steps)').then(JSON.parse),ioi=st.slice(1).map((s,i)=>s[1]-st[i][1]),a=60/from/4,z=60/to/4;
  const first=ioi.findIndex(x=>Math.abs(x-a)>1e-6),last=ioi.length-1-[...ioi].reverse().findIndex(x=>Math.abs(x-z)>1e-6);return {n:last-first+1,from}};
 const h0=await card.evaluate(c=>Math.round(c.getBoundingClientRect().height));
 const r1=await glide(120,7,'beats');assert.ok(r1.n>=27&&r1.n<=29,'7 beats = 28 gliding sixteenths, got '+r1.n);
 assert.equal(await E('__NodalBallGrid.params().quantizeBpm'),120);
 const r2=await glide(100,1,'bars');assert.ok(r2.n>=15&&r2.n<=17,'1 bar = 16 gliding sixteenths, got '+r2.n);
 assert.equal(await card.evaluate(c=>Math.round(c.getBoundingClientRect().height)),h0,'the Time & Echo column keeps its height');
 assert.deepEqual(errs,[]);console.log('PASS LIVE-TEMPO-01 length in beats (7 beats = '+r1.n+' sixteenths) and in bars (1 bar = '+r2.n+'), column height '+h0);await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
