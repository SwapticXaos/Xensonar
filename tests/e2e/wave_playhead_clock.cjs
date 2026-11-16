'use strict';
// PLAYHEAD-CLOCK (real app, Wave Editor): a running time (m:ss.t) floats above the playhead in the Loop Mask and moves with it; both for
// Play (editor playhead) and Loop (Forge loop playhead, drawn on the canvas). Usage: node tests/e2e/wave_playhead_clock.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1440,height:1000}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
  const header=t=>p.evaluate(t=>{[...document.querySelectorAll('header button')].find(b=>new RegExp(t).test(b.innerText.trim())).click()},t);
  await header('^Rec$');await p.waitForTimeout(800);await p.keyboard.down('KeyA');await p.waitForTimeout(6000);await p.keyboard.up('KeyA');await p.waitForTimeout(300);await header('Enough');await p.waitForTimeout(2500);
  await p.locator('[data-xen-send-wave-editor]').click();
  await p.waitForFunction(()=>{const x=globalThis.__XenWaveUIW01;return !!x&&[...document.querySelectorAll('canvas')].some(c=>{try{return x.getEditor(c)?.doc?.frames>0}catch{return false}})},null,{timeout:60000});await p.waitForTimeout(1500);
  assert.equal(await p.evaluate(()=>globalThis.__XenWaveUIW01.clockLabel(153.44)),'2:33.4');assert.equal(await p.evaluate(()=>globalThis.__XenWaveUIW01.clockLabel(5.96)),'0:06.0');
  // Play: the DOM clock moves
  await p.getByRole('button',{name:'Play Audio'}).click();await p.waitForTimeout(700);
  const t1=await p.locator('.xwe-playhead-time').innerText();await p.waitForTimeout(900);const t2=await p.locator('.xwe-playhead-time').innerText();
  assert.match(t1,/^\d+:\d\d\.\d$/);assert.notEqual(t1,t2,'the clock moves with the playhead');
  const sec=s=>{const m=/^(\d+):(\d\d\.\d)$/.exec(s);return +m[1]*60+ +m[2]};assert(sec(t2)>sec(t1),'it counts up ('+t1+' -> '+t2+')');assert(await p.evaluate(()=>{const e=document.querySelector('.xwe-playhead-time'),c=document.querySelector('canvas[data-xwe-workspace-resize]').getBoundingClientRect();return e.getBoundingClientRect().bottom<=c.top+1}),'the clock floats above the mask');
  await p.getByRole('button',{name:'Play Audio'}).click();await p.waitForTimeout(400);
  // Loop: the floating label above the Forge loop playhead, above the mask (outside the canvas), moving
  const lbl=()=>p.evaluate(()=>{const e=document.querySelector('.xwe-loop-clock');const c=document.querySelector('canvas[data-xwe-workspace-resize]').getBoundingClientRect();if(!e)return null;const r=e.getBoundingClientRect();return {text:e.textContent,above:r.bottom<=c.top+1,x:Math.round(r.x+r.width/2)}});
  await p.getByRole('button',{name:'Loop Audio'}).click();await p.waitForTimeout(900);const l1=await lbl();await p.waitForTimeout(900);const l2=await lbl();
  assert(l1&&/^\d+:\d\d\.\d$/.test(l1.text),'loop clock shown: '+JSON.stringify(l1));assert(l1.above,'the loop clock sits above the mask');assert(l1.text!==l2.text||l1.x!==l2.x,'the loop clock moves');
  await p.getByRole('button',{name:'Loop Audio'}).click();await p.waitForTimeout(500);
  assert.deepEqual(errs,[]);console.log('PASS PLAYHEAD-CLOCK '+t1+' -> '+t2+', loop clock above the mask');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
