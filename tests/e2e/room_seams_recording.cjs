'use strict';
// ROOM-SEAMS-02 (real app): a recording that runs while the room is changed. Rec in the Live Room, play a key, go to the Material
// Forge and back (2 s each), then "Enough!":
//  - the Live engine stays on while the take records (leaving the Live Room does not cut a running take)
//  - the take has no gaps (frameGaps 0, missingFrames 0) and covers the whole time incl. the time spent in the other room
//  - after "Enough!" the take is ready and shown; the header is back at "Rec"; no page error
// Usage: node tests/e2e/room_seams_recording.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1440,height:1000}})).newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 const header=t=>p.evaluate(t=>{[...document.querySelectorAll('header button')].find(b=>new RegExp(t).test(b.innerText.trim())).click()},t);
 const go=n=>p.evaluate(n=>[...document.querySelectorAll('header button')].find(x=>x.innerText.replace(/\s+/g,' ').includes(n)&&x.offsetParent).click(),n);
 const pcm=async()=>JSON.parse(await E('JSON.stringify(__XenPcmCaptureStatus)'));
 await header('^Rec$');await p.waitForTimeout(1200);await p.keyboard.down('KeyA');await p.waitForTimeout(800);await p.keyboard.up('KeyA');
 const s0=await pcm();assert.equal(s0.state,'recording');const t0=Date.now();
 await go('MATERIAL FORGE');await p.waitForTimeout(2000);const s1=await pcm();
 assert.equal(s1.state,'recording','the take keeps recording in another room');assert.ok(s1.frames>s0.frames,'frames keep coming in the other room');
 await go('LIVE ROOM');await p.waitForTimeout(2000);
 assert.ok(!(await p.evaluate(()=>document.body.innerText.includes('OFFLINE - ENABLE'))),'the Live engine stayed on while recording');
 await header('^Enough');await p.waitForTimeout(3500);const held=(Date.now()-t0)/1000,s2=await pcm();
 console.log('take',JSON.stringify({state:s2.state,seconds:+(s2.frames/s2.sampleRate).toFixed(2),gaps:s2.frameGaps,missing:s2.missingFrames,overlap:s2.overlapFrames}),'· wall',held.toFixed(1),'s');
 assert.equal(s2.state,'ready','the take is ready after Enough!');
 assert.equal(s2.frameGaps,0,'no gap in the take');assert.equal(s2.missingFrames,0,'no missing frames');
 assert.ok(s2.frames/s2.sampleRate>=4.5,'the take covers the time in the other room too: '+(s2.frames/s2.sampleRate).toFixed(2)+' s');
 assert.ok(await p.evaluate(()=>/Take ready/.test(document.body.innerText)),'the take is shown as ready');
 assert.ok(await p.evaluate(()=>[...document.querySelectorAll('header button')].some(b=>b.innerText.trim()==='Rec')),'header back at Rec');
 assert.deepEqual(errors,[]);console.log('PASS ROOM-SEAMS-02: a take recorded across a room change is complete and gapless');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
