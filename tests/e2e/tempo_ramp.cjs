'use strict';
// TEMPO-RAMP-01 (real app, Live Room · Time & Echo): "Tempo → X BPM in Y bars · Go" moves the shared Live Room tempo step by step,
// the slider and its label follow; moving the slider stops it; the column does not grow (no other column is stretched).
// Usage: node tests/e2e/tempo_ramp.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1440,height:1000}})).newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(3500);
 const card=p.locator('h3',{hasText:'Time & Echo'}).locator('xpath=..');const h0=await card.evaluate(c=>Math.round(c.getBoundingClientRect().height));
 await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2000);
 const bpm=()=>p.evaluate(()=>Number(document.querySelector('[data-xen-main-room-tempo]').value));
 const owner=()=>p.evaluate(()=>window.__xenProbe.draw.evalInBundle('__NodalBallGrid.params().quantizeBpm'));
 const start=await bpm();assert.equal(await owner(),start,'slider and the shared tempo agree');
 const target=start+12;
 await p.locator('[data-xen-tempo-ramp-to]').fill(String(target));await p.locator('[data-xen-tempo-ramp-bars]').fill('1');
 const t0=Date.now();await p.locator('[data-xen-tempo-ramp-go]').click();
 assert.equal(await p.locator('[data-xen-tempo-ramp]').getAttribute('data-xen-tempo-ramp'),'running');
 const seen=[];while(Date.now()-t0<8000){const v=await bpm();if(seen.at(-1)!==v)seen.push(v);if(v===target&&await p.locator('[data-xen-tempo-ramp]').getAttribute('data-xen-tempo-ramp')==='idle')break;await p.waitForTimeout(60)}
 const took=Date.now()-t0;
 assert.equal(seen.at(-1),target,'arrives at the target: '+seen);assert.ok(seen.every((v,i)=>!i||v>seen[i-1]),'rises step by step: '+seen);assert.ok(seen.length>=5,'several steps, not a jump: '+seen);
 assert.ok(took>1500&&took<4500,'1 bar (4 beats) from '+start+' to '+target+' BPM takes about 2 s, took '+took+' ms');
 assert.equal(await owner(),target,'the shared Live Room tempo is the target');
 assert.match(await card.innerText(),new RegExp('Live Room Tempo: '+target+' BPM'),'the label follows');
 // moving the slider while a ramp runs stops it
 await p.locator('[data-xen-tempo-ramp-to]').fill(String(start));await p.locator('[data-xen-tempo-ramp-bars]').fill('16');await p.locator('[data-xen-tempo-ramp-go]').click();await p.waitForTimeout(600);
 const sl=p.locator('[data-xen-main-room-tempo]');const bb=await sl.boundingBox();await p.mouse.click(bb.x+bb.width*.8,bb.y+bb.height/2);await p.waitForTimeout(150);const mine=await bpm();await p.waitForTimeout(1500);
 assert.equal(await p.locator('[data-xen-tempo-ramp]').getAttribute('data-xen-tempo-ramp'),'idle','the slider took over');assert.equal(await bpm(),mine,'and the tempo stays where the player put it');
 const h1=await card.evaluate(c=>Math.round(c.getBoundingClientRect().height));assert.equal(h1,h0,'the Time & Echo column keeps its height');
 assert.deepEqual(errs,[]);console.log('PASS TEMPO-RAMP-01 '+start+' → '+target+' BPM in 1 bar: '+seen.join(' ')+' ('+took+' ms); slider takes over; column height '+h0);await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
