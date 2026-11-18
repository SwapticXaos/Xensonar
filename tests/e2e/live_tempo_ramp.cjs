'use strict';
// LIVE-TEMPO-01 (real app, Live Room · Time & Echo): "Tempo → X BPM in Y bars · Go" glides the Live Room clock.
// Records every 16th the rhythm clock plans (absolute step number and audio time) and checks, during a 108 → 140 BPM glide over 2 bars:
//  - no step lost or doubled, the bar position (step16) runs on without a jump
//  - the step distance changes smoothly (no jump between neighbours) from 60/108/4 to 60/140/4, in exactly 8 beats
//  - the glide starts at a step that was not planned yet (nothing already planned moves); the tempo state is written once, at the end
//  - the particle grid follows the map; the slider takes over at once (a jump, as before); the column does not grow
// Usage: node tests/e2e/live_tempo_ramp.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1440,height:1000}})).newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(3500);
 const card=p.locator('h3',{hasText:'Time & Echo'}).locator('xpath=..');const h0=await card.evaluate(c=>Math.round(c.getBoundingClientRect().height));
 await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
 await E(`(()=>{window.__steps=[];const o=QPe;QPe=function(a){const r=o(a);window.__steps.push([r.absoluteStep,r.timeSec,r.stale?1:0,r.step16]);return r};window.__writes=[];})()`);
 // count tempo state writes
 await E(`(()=>{const o=__NodalBallGrid.params;let last=o().quantizeBpm;window.__bpmWatch=setInterval(()=>{const v=o().quantizeBpm;if(v!==last){window.__writes.push(v);last=v}},20)})()`);
 const start=await E('__NodalBallGrid.params().quantizeBpm');assert.equal(start,108);
 assert.equal(await E('__XenLiveTempo.mapped()'),false,'no glide yet: the classic grid');
 await p.waitForTimeout(800);
 await p.locator('[data-xen-tempo-ramp-to]').fill('140');await p.locator('[data-xen-tempo-ramp-bars]').fill('2');
 const before=await E('JSON.stringify(window.__steps.filter(s=>!s[2]).map(s=>s[0]))').then(JSON.parse);const lastPlanned=before.at(-1);
 await p.locator('[data-xen-tempo-ramp-go]').click();
 await p.waitForTimeout(300);assert.equal(await p.locator('[data-xen-tempo-ramp]').getAttribute('data-xen-tempo-ramp'),'running','the control shows the glide');
 await p.waitForTimeout(6500);
 const steps=await E('JSON.stringify(window.__steps)').then(JSON.parse);const writes=await E('JSON.stringify(window.__writes)').then(JSON.parse);
 // planned (non-stale) steps, each number once, consecutive
 const live=steps.filter(s=>!s[2]);const nums=live.map(s=>s[0]);
 for(let i=1;i<nums.length;i++)assert.equal(nums[i],nums[i-1]+1,'consecutive 16ths without gap or double at '+nums[i-1]+' → '+nums[i]);
 for(const s of live)assert.equal(s[3],((s[0]%16)+16)%16,'bar position follows the step number');
 const ioi=[];for(let i=1;i<live.length;i++)ioi.push(live[i][1]-live[i-1][1]);
 const slow=60/108/4,fast=60/140/4;
 assert.ok(Math.abs(ioi[0]-slow)<1e-6,'before the glide: 60/108/4 s, got '+ioi[0]);
 assert.ok(Math.abs(ioi.at(-1)-fast)<1e-6,'after the glide: 60/140/4 s, got '+ioi.at(-1));
 const firstChange=ioi.findIndex(x=>Math.abs(x-slow)>1e-6),lastChange=ioi.length-1-[...ioi].reverse().findIndex(x=>Math.abs(x-fast)>1e-6);
 const rampSteps=lastChange-firstChange+1;
 assert.ok(rampSteps>=31&&rampSteps<=33,'the glide spans 8 beats = 32 sixteenths, got '+rampSteps);
 let maxJump=0;for(let i=1;i<ioi.length;i++)maxJump=Math.max(maxJump,Math.abs(ioi[i]-ioi[i-1])/ioi[i-1]);
 assert.ok(maxJump<.012,'neighbouring 16ths differ by < 1.2 % (a glide, no jump): '+(maxJump*100).toFixed(2)+' %');
 for(let i=firstChange;i<=lastChange;i++)assert.ok(ioi[i]<=ioi[i-1]+1e-9,'speeds up monotonically');
 const glideStartStep=live[firstChange][0];assert.ok(glideStartStep>lastPlanned,'starts at a step not planned before Go ('+glideStartStep+' > '+lastPlanned+')');
 assert.deepEqual(writes,[140],'the tempo state is written once, at the end: '+JSON.stringify(writes));
 assert.match(await card.innerText(),/Live Room Tempo: 140 BPM/,'the label shows the new tempo');
 assert.equal(await p.locator('[data-xen-tempo-ramp]').getAttribute('data-xen-tempo-ramp'),'idle');
 // 2nd glide, slowing down 140 → 100 over 4 bars: mid-way the particle grid (sM with liveTempo) uses the map's local step
 await p.locator('[data-xen-tempo-ramp-to]').fill('100');await p.locator('[data-xen-tempo-ramp-bars]').fill('4');await p.locator('[data-xen-tempo-ramp-go]').click();await p.waitForTimeout(3000);
 const q=await E('JSON.stringify(__XenLiveTempo.snapshot())').then(JSON.parse);
 assert.ok(q&&q.state==='running'&&q.bpm<139&&q.bpm>101&&q.beat>0&&q.beat<q.beats,'mid-glide, slowing down: '+JSON.stringify(q));
 const smOut=await E(`JSON.stringify((()=>{const lt=__XenLiveTempo,now=lt.audioNow(),r=sM({audioNowSec:now,bpm:140,quantizeGrid:16,quantizeReferenceBars:1,currentAnchorSec:now-10,liveTempo:!0});return {step:r.quantizeStepSec,bpm:lt.bpmAt(now),src:r.source,next:r.nextStepDueSec,now}})())`).then(JSON.parse);
 assert.equal(smOut.src,'live-tempo-map','particle quantization reads the map during a glide');
 assert.ok(Math.abs(smOut.step-60/smOut.bpm*4/16)/smOut.step<.02,'particle step = the local tempo share of a bar: '+JSON.stringify(smOut));
 assert.ok(smOut.next>=smOut.now&&smOut.next-smOut.now<=smOut.step*1.02,'next particle step lies within one local step');
 // Stop mid-glide: the tempo freezes at the nearest whole BPM and is written once
 const w0=(await E('JSON.stringify(window.__writes)').then(JSON.parse)).length;
 await p.locator('[data-xen-tempo-ramp-stop]').click();await p.waitForTimeout(900);
 const w1=await E('JSON.stringify(window.__writes)').then(JSON.parse);
 assert.equal(w1.length,w0+1,'Stop writes the tempo once: '+JSON.stringify(w1));assert.ok(w1.at(-1)<140&&w1.at(-1)>100,'stopped between start and target: '+w1.at(-1));
 assert.equal(await p.locator('[data-xen-tempo-ramp]').getAttribute('data-xen-tempo-ramp'),'idle');
 const after=await E('JSON.stringify(window.__steps.filter(s=>!s[2]).map(s=>s[0]))').then(JSON.parse);for(let i=1;i<after.length;i++)assert.equal(after[i],after[i-1]+1,'still no gap or double after the second glide and Stop');
 // slider takes over: a jump to the classic grid, as before
 const sl=p.locator('[data-xen-main-room-tempo]');const bb=await sl.boundingBox();await p.mouse.click(bb.x+bb.width*.3,bb.y+bb.height/2);await p.waitForTimeout(400);
 assert.equal(await E('__XenLiveTempo.mapped()'),false,'after a slider move the classic grid is back');
 assert.equal(await card.evaluate(c=>Math.round(c.getBoundingClientRect().height)),h0,'the Time & Echo column keeps its height');
 assert.deepEqual(errs,[]);console.log('PASS LIVE-TEMPO-01 108 → 140 BPM in 2 bars: '+rampSteps+' gliding 16ths, max neighbour change '+(maxJump*100).toFixed(2)+' %, no gap/double, one state write; slider takes over');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
