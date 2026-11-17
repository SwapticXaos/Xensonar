'use strict';
// KEY-OWNER-01 (real app): a room parked in the aria-hidden keepalive box (Material Forge / Spectral Forge while another room is shown)
// sleeps and owns NO key.
//  1. Wave Editor (WAVE-KEYS-02 regression): Backspace in the Live Room with the focus nowhere was swallowed by the hidden editor
//     (the Live octave hold never saw it) and ripple-deleted audio from the hidden Forge file.
//  2. Spectral Forge: with its focus flag left on (room changed without a focus change) letters, Ctrl+Z and Space in other rooms
//     changed the hidden Forge tool, grain layer, undo stack. Now the parked room also gives its focus back on the room change.
//  3. In the Forge itself the keys keep working (Backspace cuts, tool letters switch).
// Usage: node tests/e2e/key_owner_parked_rooms.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1440,height:1000}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{window.__bs=[];window.addEventListener('keydown',e=>{if(e.key==='Backspace')window.__bs.push(1)})});
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 const E=c=>p.evaluate(c=>window.__xenProbe.draw.evalInBundle(c),c);
 const header=t=>p.evaluate(t=>{[...document.querySelectorAll('header button')].find(b=>new RegExp(t).test(b.innerText.trim())).click()},t);
 const room=t=>p.evaluate(t=>{[...document.querySelectorAll('header button')].find(b=>b.innerText.includes(t)).click()},t);// .click(): no focus change, like a room hotkey
 await header('^Rec$');await p.waitForTimeout(800);await p.keyboard.down('KeyA');await p.waitForTimeout(3000);await p.keyboard.up('KeyA');await p.waitForTimeout(300);await header('Enough');await p.waitForTimeout(2500);
 await p.locator('[data-xen-send-wave-editor]').click();
 await p.waitForFunction(()=>{const x=globalThis.__XenWaveUIW01;return !!x&&[...document.querySelectorAll('canvas')].some(c=>{try{return x.getEditor(c)?.doc?.frames>0}catch{return false}})},null,{timeout:60000});await p.waitForTimeout(1500);
 const frames=()=>p.evaluate(()=>{const x=globalThis.__XenWaveUIW01;const c=[...document.querySelectorAll('canvas')].find(c=>{try{return x.getEditor(c)?.doc?.frames>0}catch{return false}});return x.getEditor(c).doc.frames});
 const mask=p.locator('canvas[data-xwe-workspace-resize]');await mask.scrollIntoViewIfNeeded();const lm=await mask.boundingBox();
 await p.mouse.move(lm.x+lm.width*.2,lm.y+lm.height*.4);await p.mouse.down();await p.mouse.move(lm.x+lm.width*.4,lm.y+lm.height*.4,{steps:6});await p.mouse.up();await p.waitForTimeout(500);
 const f0=await frames();
 // ---- 1. Backspace in the Live Room, focus nowhere ----
 await room('LIVE ROOM');await p.waitForTimeout(1500);await p.evaluate(()=>{document.activeElement?.blur();window.__bs.length=0});
 await p.keyboard.down('Backspace');await p.waitForTimeout(300);await p.keyboard.up('Backspace');await p.waitForTimeout(800);
 assert.equal(await frames(),f0,'Backspace in the Live Room leaves the hidden Forge file alone');
 assert.equal(await p.evaluate(()=>window.__bs.length),1,'Backspace reaches the Live Room (octave hold)');
 // ---- 2. Spectral Forge focus left on, room change by click() ----
 const st=()=>E('JSON.stringify((s=>({tool:s.activeTool,grain:s.showGrainLayer}))(pe.getState()))').then(JSON.parse);
 const page=p.locator('[data-xensonar-scroll-island="spectralforge-page"]');
 await room('MATERIAL FORGE');await p.waitForTimeout(1500);await page.focus();await p.keyboard.press('h');await p.waitForTimeout(300);
 assert.equal((await st()).tool,'hardBrush','in the Spectral Forge the tool letters work');await p.keyboard.press('b');await p.waitForTimeout(200);
 for(const r of ['LIVE ROOM','NODAL CENTER','PSY LAB','MULTITRACK']){// (the Package Station shows the Forge on screen: there its keys are right)
  await room('MATERIAL FORGE');await p.waitForTimeout(800);await page.focus();
  await room(r);await p.waitForTimeout(1200);
  assert.equal(await p.evaluate(()=>!!document.activeElement?.closest?.('[data-package-station-keepalive]')),false,r+': the parked Forge gave its focus back');
  const s0=await st();for(const k of ['h','g','Control+z'])await p.keyboard.press(k);await p.waitForTimeout(300);
  assert.deepEqual(await st(),s0,r+': keys do not reach the parked Spectral Forge');await p.keyboard.press('Escape');
 }
 // ---- 3. back in the Forge: Backspace still cuts ----
 await room('MATERIAL FORGE');await p.waitForTimeout(1500);await mask.scrollIntoViewIfNeeded();await p.waitForTimeout(600);await mask.scrollIntoViewIfNeeded();await p.waitForTimeout(300);const lm2=await mask.boundingBox();
 await p.mouse.move(lm2.x+lm2.width*.6,lm2.y+lm2.height*.4);await p.mouse.down();await p.mouse.move(lm2.x+lm2.width*.8,lm2.y+lm2.height*.4,{steps:6});await p.mouse.up();await p.waitForTimeout(500);
 const f1=await frames();await p.keyboard.press('Backspace');await p.waitForTimeout(900);assert((await frames())<f1,'Backspace cuts in the Forge');
 assert.deepEqual(errs,[]);await b.close();console.log('PASS KEY-OWNER-01 parked rooms own no keys (Wave Editor Backspace, Spectral Forge letters/Ctrl+Z), Forge keys still work');
})().catch(e=>{console.error(e);process.exit(1)});
