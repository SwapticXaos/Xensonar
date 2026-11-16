'use strict';
// WAVE-LOOP-LIVE (real app): while the Forge Preview Loop runs from the Wave Editor, dragging the loop mask changes the running loop at once
// (no Stop/Play needed), as in the import view. Usage: node tests/e2e/wave_loop_live.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1440,height:1000}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
  const header=t=>p.evaluate(t=>{[...document.querySelectorAll('header button')].find(b=>new RegExp(t).test(b.innerText.trim())).click()},t);
  await header('^Rec$');await p.waitForTimeout(800);await p.keyboard.down('KeyA');await p.waitForTimeout(6000);await p.keyboard.up('KeyA');await p.waitForTimeout(300);await header('Enough');await p.waitForTimeout(2500);
  await p.locator('[data-xen-send-wave-editor]').click();
  await p.waitForFunction(()=>{const x=globalThis.__XenWaveUIW01;return !!x&&[...document.querySelectorAll('canvas')].some(c=>{try{return x.getEditor(c)?.doc?.frames>0}catch{return false}})},null,{timeout:60000});await p.waitForTimeout(1500);
  const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
  const loop=async()=>JSON.parse(await E(`JSON.stringify({playing:Id.isPlaying(),start:Id.sourceNode&&Id.sourceNode.loopStart,end:Id.sourceNode&&Id.sourceNode.loopEnd})`));
  const mask=p.locator('canvas[data-xwe-workspace-resize]');await mask.scrollIntoViewIfNeeded();const lm=await mask.boundingBox();
  // a mask 25%..60%, then start the loop
  await p.mouse.move(lm.x+lm.width*.25,lm.y+lm.height*.4);await p.mouse.down();await p.mouse.move(lm.x+lm.width*.6,lm.y+lm.height*.4,{steps:6});await p.mouse.up();await p.waitForTimeout(500);
  await p.getByRole('button',{name:'Loop Audio'}).click();await p.waitForTimeout(1200);
  const l1=await loop();assert(l1.playing,'the loop plays');
  // drag the right edge of the mask outwards while it plays
  await p.mouse.move(lm.x+lm.width*.6,lm.y+lm.height*.4);await p.mouse.down();await p.mouse.move(lm.x+lm.width*.85,lm.y+lm.height*.4,{steps:8});await p.waitForTimeout(250);
  const l2=await loop();await p.mouse.up();await p.waitForTimeout(300);
  assert(l2.playing,'it keeps playing while the mask is dragged');
  assert(l2.end>l1.end+0.5,'the running loop followed the mask live: loop end '+l1.end.toFixed(2)+' -> '+l2.end.toFixed(2));
  assert.deepEqual(errs,[]);console.log('PASS WAVE-LOOP-LIVE loop end '+l1.end.toFixed(2)+' -> '+l2.end.toFixed(2)+' without restart');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
