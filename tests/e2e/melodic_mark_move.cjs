'use strict';
// ML-MARK-03 (real app, Melodic Loop): marked notes can be grabbed and moved together over the grid (time and pitch), one undo step, the marking survives.
// Usage: node tests/e2e/melodic_mark_move.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{const b=await chromium.launch();const p=await(await b.newContext({viewport:{width:1500,height:950}})).newPage();
const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('file://'+html);await p.waitForTimeout(3500);
const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
await p.locator('button',{hasText:'MATERIAL FORGE'}).first().click();await p.waitForTimeout(2500);
await p.locator('button',{hasText:'MELODIC LOOP'}).first().click();await p.waitForTimeout(4000);
const cv=p.locator('canvas').last();await cv.scrollIntoViewIfNeeded();await p.waitForTimeout(300);const r=await cv.boundingBox();
const mark=p.locator('[data-ml-noteclip=mark]').first(),undo=p.getByRole('button',{name:'Undo',exact:true}).first();
const info=async()=>JSON.parse(await E('JSON.stringify(globalThis.__xenMlNoteClip.inspectMarked())'));
await mark.click();await p.mouse.move(r.x+300,r.y+190);await p.mouse.down();await p.mouse.move(r.x+520,r.y+320,{steps:6});await p.mouse.up();await p.waitForTimeout(400);
const n0=await info();assert.ok(n0.length>=2,'notes are marked: '+n0.length);
const key=a=>JSON.stringify(a.map(x=>[x.s,x.c]));
// find a marked note by pressing: the first press point where a drag moves the marking is on a note
let hit=null;
for(let y=190;y<=320&&!hit;y+=6)for(let x=300;x<=520&&!hit;x+=10){
 await p.mouse.move(r.x+x,r.y+y);await p.mouse.down();await p.mouse.move(r.x+x+70,r.y+y,{steps:5});await p.mouse.up();await p.waitForTimeout(80);
 const a=await info();if(key(a)!==key(n0)&&a.length===n0.length)hit=[x,y,a];
 else if(a.length!==n0.length||!a.length){/* a new rectangle replaced the marking: mark again */await p.mouse.move(r.x+300,r.y+190);await p.mouse.down();await p.mouse.move(r.x+520,r.y+320,{steps:6});await p.mouse.up();await p.waitForTimeout(200);if(key(await info())!==key(n0))break}}
assert.ok(hit,'dragging from a marked note moves the marking');
const a1=hit[2];
const dS=a1.map((x,i)=>+(x.s-n0[i].s).toFixed(4));assert.ok(dS.every(d=>Math.abs(d-dS[0])<1e-6)&&dS[0]>0,'every note moved by the same amount in time: '+dS);
assert.ok(a1.every((x,i)=>x.c===n0[i].c),'the pitch lines stayed (horizontal drag)');
assert.ok(a1.every((x,i)=>Math.abs(x.d-n0[i].d)<1e-9),'lengths unchanged');
assert.equal(await mark.getAttribute('data-count'),String(n0.length),'the marking survives the move');
// vertical drag moves all by the same number of pitch lines
const [hx,hy]=hit;await p.mouse.move(r.x+hx+70,r.y+hy);await p.mouse.down();await p.mouse.move(r.x+hx+70,r.y+hy+40,{steps:6});await p.mouse.up();await p.waitForTimeout(150);
const a2=await info();const dC=a2.map((x,i)=>x.c-a1[i].c);assert.ok(dC.every(d=>d===dC[0])&&dC[0]!==0,'every note moved by the same number of pitch lines: '+dC);
assert.equal(await undo.isDisabled(),false,'the move is undoable');
// two drags = exactly two undo steps (not one per mouse move): after two Undos the notes stand where they started
await undo.click();await p.waitForTimeout(300);await undo.click();await p.waitForTimeout(400);
if(await mark.getAttribute('aria-pressed')!=='true')await mark.click();
await p.mouse.move(r.x+300,r.y+190);await p.mouse.down();await p.mouse.move(r.x+520,r.y+320,{steps:6});await p.mouse.up();await p.waitForTimeout(400);
assert.equal(key(await info()),key(n0),'two Undos bring the notes back to the start');
assert.deepEqual(errors,[]);console.log('PASS melodic_mark_move, notes',n0.length,'dTime',dS[0],'dLines',dC[0]);await b.close()})().catch(e=>{console.error(e);process.exit(1)});
