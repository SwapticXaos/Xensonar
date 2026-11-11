'use strict';
// ML-NOTECLIP-01 (Chromium): Copy rectangle -> clipboard loaded -> figure blinks under the pointer on the grid -> one click lays it down; Esc leaves paste mode.
// Usage: node tests/e2e/melodic_noteclip.cjs [html]
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'index.html');
(async()=>{const b=await chromium.launch();const p=await(await b.newContext({viewport:{width:1500,height:950}})).newPage();
const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('file://'+html);await p.waitForTimeout(3500);
await p.locator('button',{hasText:'MATERIAL FORGE'}).first().click();await p.waitForTimeout(2500);
await p.locator('button',{hasText:'MELODIC LOOP'}).first().click();await p.waitForTimeout(4000);
const cv=p.locator('canvas').last();await cv.scrollIntoViewIfNeeded();await p.waitForTimeout(300);const r=await cv.boundingBox();
const paste=p.locator('[data-ml-noteclip=paste]').first();
assert.equal(await paste.isDisabled(),true,'paste disabled while nothing is loaded');
await p.locator('[data-ml-noteclip=copy]').first().click();
await p.mouse.move(r.x+300,r.y+190);await p.mouse.down();await p.mouse.move(r.x+520,r.y+320,{steps:6});await p.mouse.up();await p.waitForTimeout(300);
assert.match(await paste.innerText(),/Paste · \d+/,'rectangle loaded notes');assert.equal(await paste.getAttribute('aria-pressed'),'true','paste mode follows copy directly');
const n=+(await paste.innerText()).match(/\d+/)[0];assert.ok(n>=1);
const undoBefore=await p.getByRole('button',{name:'Undo',exact:true}).first().isDisabled();
await p.mouse.move(r.x+700,r.y+500,{steps:4});await p.mouse.move(r.x+800,r.y+520,{steps:4});await p.waitForTimeout(250);
if(process.env.SHOT)await p.screenshot({path:process.env.SHOT+'/hover.png'});
await p.mouse.down();await p.mouse.up();await p.waitForTimeout(400);
if(process.env.SHOT)await p.screenshot({path:process.env.SHOT+'/placed.png'});
assert.equal(await p.getByRole('button',{name:'Undo',exact:true}).first().isDisabled(),false,'paste is one undo step');
assert.match(await paste.innerText(),new RegExp('Paste · '+n),'clipboard survives pasting (stamp-like)');
await p.keyboard.press('Escape');assert.equal(await paste.getAttribute('aria-pressed'),'false');
await paste.click({button:'right'});assert.equal(await paste.isDisabled(),true,'right-click empties the clipboard');
assert.deepEqual(errors,[]);console.log('PASS melodic_noteclip, notes:',n,'undo was disabled before:',undoBefore);await b.close()})().catch(e=>{console.error(e);process.exit(1)});
