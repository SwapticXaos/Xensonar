'use strict';
// ML-DRAG-CLICK-01 (real app, Melodic Loop): moving a note block on the grid.
//  1. The tone of a block is heard when the pitch row (or block) CHANGES, not re-fired by every pointer move:
//     dragging along one row = one tone (before: one every ~80 ms = crackling stutter).
//  2. Moving across rows: a tone per row change (you still hear where you are), at most one every 50 ms.
//  3. The previous preview is faded out with a lead (the fade ramp starts in the future: ctx.currentTime is behind the audio thread, a ramp that starts "now" has already run when rendered = gain step).
// Usage: node tests/e2e/melodic_drag_preview.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1500,height:950}})).newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(3500);
 await p.locator('button',{hasText:'MATERIAL FORGE'}).first().click();await p.waitForTimeout(2500);
 await p.locator('button',{hasText:'MELODIC LOOP'}).first().click();await p.waitForTimeout(4000);
 const cv=p.locator('canvas').last();await cv.scrollIntoViewIfNeeded();await p.waitForTimeout(300);const r=await cv.boundingBox();
 const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
 await E(`globalThis.__ev=[];const __oh=hh;hh=function(e){__ev.push(['hh',Math.round(performance.now()),e.noteId||null]);return __oh.apply(this,arguments)};
  const __of=__f49FadeAndRelease;__f49FadeAndRelease=function(b,s,rel,lead){__ev.push(['fade',Math.round(performance.now()),lead||0]);return __of.apply(this,arguments)};1`);
 const calls=async()=>JSON.parse(await E('JSON.stringify(__ev)'));
 const reset=()=>E('__ev.length=0;1');
 const AX=r.x+500,AY=r.y+184;   // the middle of a long block of the default pattern
 const drag=async(f,ax=AX,ay=AY)=>{await p.mouse.move(ax,ay);await p.mouse.down();await p.waitForTimeout(300);await reset();await f();await p.mouse.up();await p.waitForTimeout(400)};
 // 2) across rows
  await drag(async()=>{for(let i=1;i<=24;i++){await p.mouse.move(AX+i*6,AY+(((i%4)-1)*16));await p.waitForTimeout(70)}},AX,AY);
 let ev=await calls();const hh=ev.filter(e=>e[0]==='hh'),fadeEv=ev;
 assert(hh.length>=4,'a tone per row change while moving across rows: '+hh.length);
 for(let i=1;i<hh.length;i++)assert(hh[i][1]-hh[i-1][1]>=45,'at most one tone per 50 ms: '+(hh[i][1]-hh[i-1][1])+' ms');
 // 1) along one row
 const BX=r.x+845,BY=r.y+215;// a second long block
 await drag(async()=>{for(let i=1;i<=30;i++){await p.mouse.move(BX+i*8,BY);await p.waitForTimeout(70)}},BX,BY);
 ev=await calls();const along=ev.filter(e=>e[0]==='hh').length;
 assert(along<=1,'dragging along one row does not re-fire the tone on every pointer move: '+along+' previews');
 // 3) fade lead
 const fades=fadeEv.filter(e=>e[0]==='fade');assert(fades.length>=3,'the previous preview is faded out each time: '+fades.length);
 assert(fades.every(f=>f[2]>=.012),'the fade-out starts with a lead (ramp in the future): '+JSON.stringify(fades.map(f=>f[2])));
 assert.deepEqual(errors,[]);
 console.log('melodic_drag_preview OK along-row previews',along,'across-rows previews',hh.length,'fades',fades.length,'lead ms',Math.round(fades[0][2]*1000));
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
