'use strict';
// NODAL-GATE-01 (real app, Nodal Center · Art Installation):
//  1. Entering shows the closed gate (XenSonar seal in the middle, no text on the gate; the header switch says "Gate Closed"),
//     Mycelium is OFF, nothing sounds.
//  2. Clicking the seal turns it, unfolds it along its eight rays (Mycelium still off), then the centre opens, Mycelium
//     switches on, the halves part, and the sound starts muffled (gate low-pass far below Nyquist) and opens to full
//     (low-pass exactly at Nyquist = transparent).
//  3. "Gate Open" in the header closes the gate again; "Gate Closed" opens it the same way (turn, unfold, doors, muffled -> full).
// Usage: node tests/e2e/nodal_gate.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const q=await(await b.newContext({viewport:{width:1440,height:1000}})).newPage();
 const errors=[];q.on('pageerror',e=>errors.push(e.message));
 await q.addInitScript({path:path.resolve(__dirname,'../../tools/probes/room_activity_instrument.js')});
 await q.goto('file://'+html);await q.waitForTimeout(3500);
 await q.evaluate(()=>[...document.querySelectorAll('header button')].find(b=>/NODAL/.test(b.innerText)).click());await q.waitForTimeout(2000);
 const art=q.getByRole('button',{name:'Art Installation'});if(await art.count())await art.first().click();await q.waitForTimeout(1200);
 const gate=q.locator('[data-nodal-gate]'),seal=q.locator('[data-nodal-gate-seal]'),my=q.locator('[data-installation-sound-toggle]'),stage=q.locator('.nd-legacy-stage');
 const lp=()=>q.evaluate(()=>window.__xenProbe.draw.evalInBundle('myzelGLive&&!myzelGLive.disposed?{f:myzelGLive.gateLp.frequency.value,ny:myzelGLive.ctx.sampleRate/2}:null'));
 const rms=async sec=>{await q.evaluate(()=>__probe.reset());let sum=0;for(let k=0;k<sec;k++){await q.waitForTimeout(700);sum+=Math.max(0,...(await q.evaluate(()=>__probe.rms())).map(x=>x.rms))}return sum/sec};
 const doorX=()=>q.locator('.nd-gate-door.is-left').evaluate(e=>e.getBoundingClientRect().left);
 // ---- 1. closed ----
 assert.equal(await gate.getAttribute('data-nodal-gate'),'closed');assert.equal((await gate.innerText()).trim(),'','no text on the gate');assert.match(await my.innerText(),/Gate Closed/);
 assert.equal(await my.getAttribute('aria-pressed'),'false','Mycelium is off on entering');
 assert.equal(await stage.locator('canvas').count(),0,'nothing behind the closed gate yet');
 assert.equal(await stage.getByText('[ OFFLINE ]').count(),0,'the old OFFLINE text is gone');
 const box=await seal.boundingBox(),sb=await stage.boundingBox();
 assert.ok(Math.abs(box.x+box.width/2-(sb.x+sb.width/2))<3&&Math.abs(box.y+box.height/2-(sb.y+sb.height/2))<3,'the seal sits in the middle of the stage');
 assert.ok(await rms(2)<.002,'silent behind the closed gate');
 // ---- 2. turn the seal ----
 const x0=await doorX();await seal.click();await q.waitForTimeout(250);
 assert.equal(await gate.getAttribute('data-nodal-gate'),'turning');assert.equal(await my.getAttribute('aria-pressed'),'false','the seal turns before anything opens');
 assert.equal(await doorX(),x0,'doors still shut while the seal turns');
 await q.waitForTimeout(1900);
 assert.equal(await gate.getAttribute('data-nodal-gate'),'opening');assert.equal(await my.getAttribute('aria-pressed'),'true','Mycelium switches on as the doors open');
 const rot=await q.locator('.nd-gate .nd-gate-seal').evaluate(e=>getComputedStyle(e).transform);assert.notEqual(rot,'none','the seal is turned');
 await q.waitForTimeout(500);const early=await lp();assert.ok(early&&early.f<1500,'muffled at the start of the opening: '+JSON.stringify(early));
 assert.ok(parseFloat(await gate.evaluate(e=>getComputedStyle(e).getPropertyValue('--nd-hole')))>20,'the centre has opened');
 await q.waitForTimeout(1000);assert.ok(await doorX()<x0-20,'the left door slides out');assert.equal(await stage.locator('canvas').count(),1,'the installation is behind the doors');
 await q.waitForTimeout(2800);
 assert.equal(await gate.count(),0,'gate fully open, nothing covers the stage');
 const late=await lp();assert.ok(late&&late.f===late.ny,'fully open: low-pass exactly at Nyquist (transparent): '+JSON.stringify(late));
 const loud=await rms(4);assert.ok(loud>.02,'the installation is audible: '+loud);
 // ---- 3. close with the button, open with the button ----
 await my.click();await q.waitForTimeout(200);assert.equal(await gate.getAttribute('data-nodal-gate'),'closing');
 await q.waitForTimeout(1300);assert.equal(await gate.getAttribute('data-nodal-gate'),'closed');assert.ok(await rms(2)<.002,'silent again');
 await my.click();await q.waitForTimeout(300);assert.equal(await gate.getAttribute('data-nodal-gate'),'turning','the button turns the seal as well');
 await q.waitForTimeout(1300);const held=await lp();assert.ok(held&&held.f<1500,'muffled while the button opens the gate: '+JSON.stringify(held));
 await q.waitForTimeout(4200);assert.equal(await gate.count(),0);assert.match(await my.innerText(),/Gate Open/);const late2=await lp();assert.ok(late2&&late2.f===late2.ny,'open again: '+JSON.stringify(late2));
 assert.deepEqual(errors,[]);console.log('PASS NODAL-GATE-01 (closed '+x0+', LP early '+Math.round(early.f)+' Hz, held '+Math.round(held.f)+' Hz, open '+late.ny+' Hz, RMS '+loud.toFixed(4)+')');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
