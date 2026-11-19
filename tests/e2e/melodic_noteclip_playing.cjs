'use strict';
// ML-NOTECLIP-02 (Chromium, probe build): Copy and Paste work while the Melodic Loop plays.
// A click into the empty grid during playback moves the playhead; that rule used to come first and swallowed the Copy rectangle
// and the Paste click (no preview, no switch to Paste). Copy/Paste mode now owns the click; with both off the playhead click stays.
// Usage: node tests/e2e/melodic_noteclip_playing.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1500,height:950}})).newPage();
const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('file://'+html);await p.waitForTimeout(3500);
await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2000);
await p.locator('button',{hasText:'MATERIAL FORGE'}).first().click();await p.waitForTimeout(2500);
await p.locator('button',{hasText:'MELODIC LOOP'}).first().click();await p.waitForTimeout(3500);
const play=p.locator('.melodic-transport-dock button').first(),playing=async()=>(await play.getAttribute('aria-label'))==='Stop loop';
await play.click();await p.waitForTimeout(1200);assert.ok(await playing(),'the Melodic Loop plays');
const undo=p.getByRole('button',{name:'Undo',exact:true}).first();
const cv=p.locator('canvas').last();await cv.scrollIntoViewIfNeeded();await p.waitForTimeout(300);const r=await cv.boundingBox();
// Copy/Paste off: an empty-grid click during playback moves the playhead and places no note (unchanged behaviour)
assert.equal(await undo.isDisabled(),true,'nothing to undo yet');await p.mouse.click(r.x+545,r.y+672);await p.waitForTimeout(250);
assert.equal(await undo.isDisabled(),true,'with Copy/Paste off the playback click places no note (playhead click)');
const paste=p.locator('[data-ml-noteclip=paste]').first(),copy=p.locator('[data-ml-noteclip=copy]').first();
await copy.click();
await p.mouse.move(r.x+300,r.y+190);await p.mouse.down();await p.mouse.move(r.x+520,r.y+320,{steps:6});await p.mouse.up();await p.waitForTimeout(300);
assert.match(await paste.innerText(),/Paste\s*\d+/,'the rectangle loads notes during playback');assert.equal(await paste.getAttribute('aria-pressed'),'true','switches to Paste by itself');
const n=+(await paste.innerText()).match(/\d+/)[0];
await p.mouse.move(r.x+700,r.y+500,{steps:3});await p.mouse.move(r.x+800,r.y+520,{steps:4});await p.waitForTimeout(250);
await p.mouse.down();await p.mouse.up();await p.waitForTimeout(400);
assert.equal(await undo.isDisabled(),false,'the click lays the figure down (one undo step)');assert.ok(await playing(),'playback keeps running');
await p.keyboard.press('Escape');await paste.click();assert.equal(await paste.getAttribute('aria-pressed'),'true','clicking Paste turns paste mode on again');
await paste.click();assert.equal(await paste.getAttribute('aria-pressed'),'false');
assert.equal(await copy.getAttribute('aria-pressed'),'false','both off = normal editing');
assert.deepEqual(errors,[]);console.log('PASS melodic_noteclip_playing: '+n+' notes copied and pasted while the loop plays; playhead click unchanged otherwise');await b.close()})().catch(e=>{console.error(e);process.exit(1)});
