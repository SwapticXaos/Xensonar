'use strict';
// RESIDENT-HIT: the invisible drag circles of the Residents in the Live Room sit exactly on the drawn resident nodes at any display size
// (they were placed in logical 1100×580 px while the canvas is CSS-scaled, so they drifted). Normalised centre must not change with the window width; circles are invisible.
// Usage: node tests/e2e/resident_hit_alignment.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const errors=[];
 const p=await(await b.newContext({viewport:{width:1440,height:1000}})).newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(3500);
 await p.evaluate(()=>[...document.querySelectorAll('header button')].find(x=>/NODAL/.test(x.innerText)).click());await p.waitForTimeout(2000);
 const art=p.getByRole('button',{name:'Art Installation'});if(await art.count())await art.first().click();await p.waitForTimeout(1200);
 await p.locator('[data-installation-sound-toggle]').click();await p.waitForTimeout(1500);
 await p.evaluate(()=>[...document.querySelectorAll('header button')].find(x=>/MAIN|LIVE/i.test(x.innerText)&&!/NODAL/.test(x.innerText))?.click());await p.waitForTimeout(1500);
 const pw=p.getByRole('button',{name:'Power'});if(await pw.count())await pw.first().click();await p.waitForTimeout(2500);
 const read=()=>p.evaluate(()=>{const c=document.querySelector('canvas[data-xen-play-area]').getBoundingClientRect();
  return {w:c.width,hits:[...document.querySelectorAll('[data-xen-resident-hit]')].map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return{id:e.dataset.xenResidentHit,nx:(r.left+r.width/2-c.left)/c.width,ny:(r.top+r.height/2-c.top)/c.height,border:s.borderTopWidth,bg:s.backgroundColor,outline:s.outlineStyle}})}});
 const a=await read();assert.ok(a.hits.length>=3,'resident drag circles exist: '+a.hits.length);
 for(const h of a.hits){assert.equal(h.border,'0px','circle has no visible border');assert.equal(h.bg,'rgba(0, 0, 0, 0)','circle is transparent')}
 await p.setViewportSize({width:900,height:1000});await p.waitForTimeout(1200);
 const c=await read();assert.ok(c.w<a.w-100,'canvas got narrower: '+c.w+' < '+a.w);
 // nodes move slowly (drag/physics are off unless dragged): normalised centres must match per resident
 for(const h of a.hits){const k=c.hits.find(x=>x.id===h.id);assert.ok(k,'same resident present');assert.ok(Math.abs(k.nx-h.nx)<.01&&Math.abs(k.ny-h.ny)<.01,'circle stays on its node when the display scales: '+JSON.stringify([h,k]))}
 assert.deepEqual(errors,[]);console.log('PASS RESIDENT-HIT '+a.hits.length+' circles stay on their nodes at '+a.w+' and '+c.w+' px');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
