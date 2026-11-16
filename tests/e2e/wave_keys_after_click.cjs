'use strict';
// WAVE-KEYS-01 (real app): Delete/Backspace cut the selection right after a MOUSE click on the Loop Mask or the Taktometer (the focus then sits on the
// Forge panel, not on a canvas or button); it used to work only after a button had been clicked. Usage: node tests/e2e/wave_keys_after_click.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1440,height:1000}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
  const header=t=>p.evaluate(t=>{[...document.querySelectorAll('header button')].find(b=>new RegExp(t).test(b.innerText.trim())).click()},t);
  await header('^Rec$');await p.waitForTimeout(800);await p.keyboard.down('KeyA');await p.waitForTimeout(5000);await p.keyboard.up('KeyA');await p.waitForTimeout(300);await header('Enough');await p.waitForTimeout(2500);
  await p.locator('[data-xen-send-wave-editor]').click();
  await p.waitForFunction(()=>{const x=globalThis.__XenWaveUIW01;return !!x&&[...document.querySelectorAll('canvas')].some(c=>{try{return x.getEditor(c)?.doc?.frames>0}catch{return false}})},null,{timeout:60000});await p.waitForTimeout(1500);
  const frames=()=>p.evaluate(()=>{const x=globalThis.__XenWaveUIW01;const c=[...document.querySelectorAll('canvas')].find(c=>{try{return x.getEditor(c)?.doc?.frames>0}catch{return false}});return x.getEditor(c).doc.frames});
  const mask=p.locator('canvas[data-xwe-workspace-resize]');await mask.scrollIntoViewIfNeeded();const lm=await mask.boundingBox();
  const drag=async(a,b2)=>{await p.mouse.move(lm.x+lm.width*a,lm.y+lm.height*.4);await p.mouse.down();await p.mouse.move(lm.x+lm.width*b2,lm.y+lm.height*.4,{steps:6});await p.mouse.up();await p.waitForTimeout(500)};
  for(const key of ['Delete','Backspace']){
    await drag(.25,.5);const f0=await frames();await p.keyboard.press(key);await p.waitForTimeout(900);const f1=await frames();assert(f1<f0,key+' cuts right after a mouse selection on the Loop Mask ('+f0+' -> '+f1+')');
  }
  const mb=await p.locator('[data-xen-bar-meter]').boundingBox();await drag(.2,.4);await p.mouse.click(mb.x+mb.width*.5,mb.y+mb.height/2);await p.waitForTimeout(300);
  const g0=await frames();await p.keyboard.press('Delete');await p.waitForTimeout(900);assert((await frames())<g0,'Delete cuts after a click on the Taktometer');
  // focus lost (e.g. after a menu closed): the edit keys still work while the editor is open, Space/arrows are not taken
  await drag(.2,.4);await p.evaluate(()=>document.activeElement.blur());const h0=await frames();await p.keyboard.press('Backspace');await p.waitForTimeout(900);assert((await frames())<h0,'Backspace cuts with no focused element');
  // import view (editor panel closed): the same keys cut and undo
  await p.evaluate(()=>{const x=globalThis.__XenWaveUIW01;const c=[...document.querySelectorAll('canvas')].find(c=>{try{return x.getEditor(c)?.doc?.frames>0}catch{return false}});x.getEditor(c).close()});await p.waitForTimeout(800);
  const isOpen=await p.evaluate(()=>{const x=globalThis.__XenWaveUIW01;const c=[...document.querySelectorAll('canvas')].find(c=>{try{return x.getEditor(c)?.doc?.frames>0}catch{return false}});return !!x.getEditor(c).overlay});
  assert(!isOpen,'editor panel closed for the import-view check');{await mask.scrollIntoViewIfNeeded();const lm2=await mask.boundingBox();await p.mouse.move(lm2.x+lm2.width*.2,lm2.y+lm2.height*.4);await p.mouse.down();await p.mouse.move(lm2.x+lm2.width*.4,lm2.y+lm2.height*.4,{steps:6});await p.mouse.up();await p.waitForTimeout(500);
   const k0=await frames();await p.keyboard.press('Backspace');await p.waitForTimeout(900);const k1=await frames();assert(k1<k0,'Backspace cuts without the editor panel ('+k0+' -> '+k1+')');await p.keyboard.press('Control+z');await p.waitForTimeout(900);assert.equal(await frames(),k0,'Ctrl+Z undoes it')}
  assert.deepEqual(errs,[]);console.log('PASS WAVE-KEYS-01 Delete/Backspace cut after mouse clicks on the mask and the Taktometer');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
