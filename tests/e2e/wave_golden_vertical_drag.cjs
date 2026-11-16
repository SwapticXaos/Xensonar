'use strict';
// Wave Editor (real app, real mouse): dragging a single-channel Golden mask down retargets it L -> L+R -> R;
// release cuts the source lane and mixes into the target lane. Usage: node tests/e2e/wave_golden_vertical_drag.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1440,height:1000}})).newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+require('node:path').resolve(process.argv[2]||'dist/XenSonar_PROBE.html'));await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
  const header=t=>p.evaluate(t=>{[...document.querySelectorAll('header button')].find(b=>new RegExp(t).test(b.innerText.trim())).click()},t);
  await header('^Rec$');await p.waitForTimeout(800);await p.keyboard.down('KeyA');await p.waitForTimeout(4500);await p.keyboard.up('KeyA');await p.waitForTimeout(300);await header('Enough');await p.waitForTimeout(2500);
  const w=p.locator('[data-xen-send-wave-editor]');await w.scrollIntoViewIfNeeded();await w.click();
  await p.waitForFunction(()=>{const x=globalThis.__XenWaveUIW01;return !!x&&[...document.querySelectorAll('canvas')].some(c=>{try{return x.getEditor(c)?.doc?.frames>0}catch{return false}})},null,{timeout:60000});await p.waitForTimeout(1500);
  const info=await p.evaluate(()=>{const x=__XenWaveUIW01,c=[...document.querySelectorAll('canvas')].find(c=>{try{return x.getEditor(c)?.doc?.frames>0}catch{return false}});const e=x.getEditor(c);window.__E=e;window.__C=c;
    const d=e.doc;return {ch:d.channels.length,frames:d.frames,vs:d.viewport.start,ve:d.viewport.end}});
  console.log(info);
  await p.evaluate(()=>{const e=__E,C=__XenWaveCoreW01;const f=e.doc.frames;e.setChannel('L');e.doc=C.setSelection(e.doc,Math.floor(f*.2),Math.floor(f*.3));e.goldenMoveArmed=true;e.refresh(false)});
  const g=await p.evaluate(()=>{const r=__C.getBoundingClientRect(),e=__E,d=e.doc,v=d.viewport,sp=v.end-v.start;return {l:r.left,t:r.top,w:r.width,h:r.height,x0:(d.selection.start-v.start)/sp*r.width,x1:(d.selection.end-v.start)/sp*r.width}});
  const x=g.l+(g.x0+g.x1)/2,y=g.t+2;
  await p.mouse.move(x,y);await p.mouse.down();
  const dest=()=>p.evaluate(()=>({dest:__E.goldenGesture?.dest,mv:__E.maskVertical}));
  await p.mouse.move(x+30,y+10,{steps:3});assert.equal((await dest()).dest,'L','start: own lane');
  await p.mouse.move(x+40,y+g.h*.25,{steps:6});assert.deepEqual(await dest(),{dest:'all',mv:{top:0,bottom:1}},'a quarter down: both lanes');
  await p.mouse.move(x+50,y+g.h*.55,{steps:6});assert.deepEqual(await dest(),{dest:'R',mv:{top:.5,bottom:1}},'further down: right lane');
  await p.mouse.up();await p.waitForTimeout(800);
  const res=await p.evaluate(()=>{const e=__E,d=e.doc;let n=(c,a,z)=>{let s=0;for(let i=a;i<z;i++)s+=Math.abs(d.channels[c][i]);return s};const f=d.frames;return {ch:e.channel,L_src:n(0,Math.floor(f*.2),Math.floor(f*.3)),R_src:n(1,Math.floor(f*.2),Math.floor(f*.3)),sel:d.selection,rev:d.revision}});
  assert.equal(res.L_src,0,'source lane L is cut');assert.ok(res.R_src>0,'R has audio at the old place (own or mixed)');assert.equal(res.ch,'R','channel follows the target');assert.equal(res.rev,1,'one edit');
  assert.deepEqual(errors,[]);console.log('PASS wave golden vertical drag: L -> L+R -> R, source lane cut, mixed into R');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
