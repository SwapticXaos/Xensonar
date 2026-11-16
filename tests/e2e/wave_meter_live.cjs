'use strict';
// BAR-METER-LIVE (real app, Wave Editor): while the Loop Mask is dragged, the Taktometer follows the new selection continuously
// (it used to jump only at release); the same as the import view. Usage: node tests/e2e/wave_meter_live.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1440,height:1000}})).newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
  const header=t=>p.evaluate(t=>{[...document.querySelectorAll('header button')].find(b=>new RegExp(t).test(b.innerText.trim())).click()},t);
  await header('^Rec$');await p.waitForTimeout(800);await p.keyboard.down('KeyA');await p.waitForTimeout(5000);await p.keyboard.up('KeyA');await p.waitForTimeout(300);await header('Enough');await p.waitForTimeout(2500);
  const w=p.locator('[data-xen-send-wave-editor]');await w.scrollIntoViewIfNeeded();await w.click();
  await p.waitForFunction(()=>{const x=globalThis.__XenWaveUIW01;return !!x&&[...document.querySelectorAll('canvas')].some(c=>{try{return x.getEditor(c)?.doc?.frames>0}catch{return false}})},null,{timeout:60000});await p.waitForTimeout(1500);
  const frameEnd=()=>p.evaluate(()=>{const c=document.querySelector('[data-xen-bar-meter]');const d=c.getContext('2d').getImageData(0,Math.floor(c.height/2),c.width,1).data;let z=-1;for(let i=0;i<c.width;i++)if(d[i*4+1]>150&&d[i*4+2]>180&&d[i*4]<100)z=i;return z});
  const mask=p.locator('canvas[data-xwe-workspace-resize]');await mask.scrollIntoViewIfNeeded();const lm=await mask.boundingBox();
  await p.mouse.move(lm.x+lm.width*.25,lm.y+lm.height*.4);await p.mouse.down();
  const seen=[];for(const f of [.35,.5,.6]){await p.mouse.move(lm.x+lm.width*f,lm.y+lm.height*.4,{steps:4});await p.waitForTimeout(250);seen.push(await frameEnd())}
  assert(seen[0]<seen[1]&&seen[1]<seen[2],'the Taktometer follows the mask while dragging: '+seen.join(' < '));
  assert(seen[2]<1100,'the Taktometer shrank with the selection (end at '+seen[2]+' of 1200)');
  await p.mouse.up();await p.waitForTimeout(500);
  assert(Math.abs(await frameEnd()-seen[2])<4,'the end state stays after release');
  assert.deepEqual(errors,[]);console.log('PASS BAR-METER-LIVE Taktometer follows the Loop Mask while dragging ('+seen.join(', ')+')');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
