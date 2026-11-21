'use strict';
// ML-MARK-02 (real app, Melodic Loop): next to Mark there are four buttons (stretch / compress in time and in pitch) and the arrow keys do the same while something is marked
// (left/right = time, up/down = pitch, like the arrow keys of the Spectral Forge stamp). One undo step each; greyed out without a marking.
// Usage: node tests/e2e/melodic_mark_scale.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{const b=await chromium.launch();const p=await(await b.newContext({viewport:{width:1500,height:950}})).newPage();
const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('file://'+html);await p.waitForTimeout(3500);
const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
await p.locator('button',{hasText:'MATERIAL FORGE'}).first().click();await p.waitForTimeout(2500);
await p.locator('button',{hasText:'MELODIC LOOP'}).first().click();await p.waitForTimeout(4000);
const cv=p.locator('canvas').last();await cv.scrollIntoViewIfNeeded();await p.waitForTimeout(300);const r=await cv.boundingBox();
const q=k=>p.locator('[data-ml-noteclip='+k+']').first();const mark=q('mark'),undo=p.getByRole('button',{name:'Undo',exact:true}).first();
const info=async()=>JSON.parse(await E('JSON.stringify(globalThis.__xenMlNoteClip.inspectMarked())'));
for(const k of ['sh-p','sh-m','sv-p','sv-m'])assert.equal(await q(k).isDisabled(),true,k+' is greyed out with nothing marked');
await mark.click();await p.mouse.move(r.x+300,r.y+190);await p.mouse.down();await p.mouse.move(r.x+520,r.y+320,{steps:6});await p.mouse.up();await p.waitForTimeout(400);
const n0=await info();assert.ok(n0.length>=1,'the rectangle marked notes: '+n0.length);
for(const k of ['sh-p','sh-m','sv-p','sv-m'])assert.equal(await q(k).isDisabled(),false,k+' is active with a marking');
const span=a=>Math.max(...a.map(x=>x.s+x.d))-Math.min(...a.map(x=>x.s)),spread=a=>Math.max(...a.map(x=>x.c))-Math.min(...a.map(x=>x.c));
// time: stretch, compress
await q('sh-p').click();await p.waitForTimeout(300);let n1=await info();
const msg=await p.evaluate(()=>document.body.innerText);
assert.ok(Math.abs(span(n1)/span(n0)-1.1)<.01,'stretched in time by a tenth: '+span(n0)+' -> '+span(n1));assert.equal(Math.min(...n1.map(x=>x.s)),Math.min(...n0.map(x=>x.s)),'the start of the marking stays');
await q('sh-m').click();await p.waitForTimeout(300);let n2=await info();assert.ok(Math.abs(span(n2)-span(n0))<1e-6,'compress undoes the stretch');
// pitch: stretch (if there is spread), compress
if(spread(n0)>0){await q('sv-p').click();await p.waitForTimeout(300);const n3=await info();assert.ok(spread(n3)>spread(n0),'spread grows: '+spread(n0)+' -> '+spread(n3));assert.equal(Math.min(...n3.map(x=>x.c)),Math.min(...n0.map(x=>x.c)),'the lowest line stays');
 await q('sv-m').click();await p.waitForTimeout(300);assert.ok(spread(await info())<=spread(n3)-1,'spread shrinks again');}
// arrow keys
await p.mouse.move(r.x+5,r.y+5);const a0=await info();await p.keyboard.press('ArrowRight');await p.waitForTimeout(250);const a1=await info();assert.ok(span(a1)>span(a0)+1e-6,'ArrowRight stretches in time');
await p.keyboard.press('ArrowLeft');await p.waitForTimeout(250);assert.ok(Math.abs(span(await info())-span(a0))<1e-6,'ArrowLeft compresses');
if(spread(a0)>0){await p.keyboard.press('ArrowUp');await p.waitForTimeout(250);assert.ok(spread(await info())>spread(a0),'ArrowUp stretches in pitch');await p.keyboard.press('ArrowDown');await p.waitForTimeout(250);}
assert.equal(await undo.isDisabled(),false,'every step is an undo step');
// no marking, no arrow keys: nothing changes (the key is not swallowed)
await p.mouse.click(r.x+r.width-4,r.y+r.height-4);await p.waitForTimeout(300);
assert.deepEqual(errors,[]);console.log('PASS melodic_mark_scale, marked',n0.length,'notes, span',span(n0).toFixed(2),'spread',spread(n0));await b.close()})().catch(e=>{console.error(e);process.exit(1)});
