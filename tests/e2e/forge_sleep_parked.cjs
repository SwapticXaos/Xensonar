'use strict';
// FORGE-SLEEP-01 (real app): the Forge with its Wave Editor is a separate app that sleeps while another room is shown,
// even with a file always lying in the editor; only "send" connects the rooms.
//  1. Live Room, Forge parked with a file and a marked range, focus nowhere: Backspace (octave hold) and Delete reach the
//     Live Room and never edit the parked file (used to: Backspace swallowed and the marked audio cut, unseen).
//  2. While parked the Forge registers NO key / pointer / mouse listener on window or document (same set as before the Forge
//     was ever opened), and Tab never moves the focus into the hidden Forge (inert).
//  3. Back to the Forge by its header button (focus stays on that button): Backspace, Delete and Ctrl+X cut at once
//     (used to do nothing until a click into the waveform), Ctrl+Z undoes.
// Usage: node tests/e2e/forge_sleep_parked.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
 const p=await(await b.newContext({viewport:{width:1440,height:1000}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 // listener census of window/document key, pointer, mouse and wheel listeners (by function source; identity changes on re-render)
 await p.addInitScript(()=>{const live=new Map();const who=t=>t===window?'window':t===document?'document':null;
  const A=EventTarget.prototype.addEventListener,R=EventTarget.prototype.removeEventListener;const key=(w,type,opt)=>w+'|'+type+'|'+(typeof opt==='boolean'?opt:!!opt?.capture);
  EventTarget.prototype.addEventListener=function(type,fn,opt){const w=who(this);if(w&&fn&&/^(key|pointer|mouse|wheel)/.test(type)){const k=key(w,type,opt);let m=live.get(k);if(!m)live.set(k,m=new Map());if(!m.has(fn))m.set(fn,String(fn).replace(/\s+/g,' ').slice(0,120))}return A.call(this,type,fn,opt)};
  EventTarget.prototype.removeEventListener=function(type,fn,opt){const w=who(this);if(w&&fn)live.get(key(w,type,opt))?.delete(fn);return R.call(this,type,fn,opt)};
  window.__census=()=>{const out=[];for(const [k,m] of live)for(const src of m.values())if(!/_hitTargetInterceptor|window\.__seen/.test(src))out.push(k+' :: '+src);return out.sort()}});
 await p.goto('file://'+html);await p.waitForTimeout(3500);
 const power=async()=>{await p.getByRole('button',{name:'Power'}).first().click();await p.waitForTimeout(2200)};
 await power();
 const header=t=>p.evaluate(t=>{[...document.querySelectorAll('header button')].find(b=>new RegExp(t).test(b.innerText.trim())).click()},t);
 const roomBtn=n=>p.locator('header button',{hasText:n}).first();
 const ed=()=>p.evaluate(()=>{const x=globalThis.__XenWaveUIW01;for(const c of document.querySelectorAll('canvas')){let e;try{e=x.getEditor(c)}catch{}if(e&&e.doc)return {frames:e.doc.frames,sel:e.doc.selection.end-e.doc.selection.start}}return null});
 await header('^Rec$');await p.waitForTimeout(800);await p.keyboard.down('KeyA');await p.waitForTimeout(4000);await p.keyboard.up('KeyA');await p.waitForTimeout(300);await header('Enough');await p.waitForTimeout(2500);
 const baseline=await p.evaluate(()=>window.__census());
 await p.locator('[data-xen-send-wave-editor]').click();
 await p.waitForFunction(()=>{const x=globalThis.__XenWaveUIW01;return !!x&&[...document.querySelectorAll('canvas')].some(c=>{try{return x.getEditor(c)?.doc?.frames>0}catch{return false}})},null,{timeout:60000});await p.waitForTimeout(1500);
 const mask=p.locator('canvas[data-xwe-workspace-resize]');
 const drag=async(a,c)=>{await mask.scrollIntoViewIfNeeded();const lm=await mask.boundingBox();await p.mouse.move(lm.x+lm.width*a,lm.y+lm.height*.4);await p.mouse.down();await p.mouse.move(lm.x+lm.width*c,lm.y+lm.height*.4,{steps:6});await p.mouse.up();await p.waitForTimeout(500)};
 await drag(.2,.4);const marked=await ed();assert(marked.sel>0,'a range is marked in the Wave Editor');

 // ---- 1. Live Room: keys belong to the Live Room, the parked file is untouched ----
 await roomBtn('LIVE ROOM').click();await p.waitForTimeout(1200);await power();
 await p.evaluate(()=>{window.__seen=[];window.addEventListener('keydown',e=>{if(e.key==='Backspace'||e.key==='Delete')window.__seen.push(e.key+(e.defaultPrevented?':handled':':free'))});document.activeElement?.blur?.()});
 await p.keyboard.down('Backspace');await p.waitForTimeout(150);await p.keyboard.up('Backspace');await p.keyboard.press('Delete');await p.waitForTimeout(900);
 const seen=await p.evaluate(()=>window.__seen);
 assert.equal(seen[0],'Backspace:handled','Backspace reaches the Live Room octave hold ('+seen.join(',')+')');
 assert.equal(seen.length,2,'Delete reaches the Live Room too ('+seen.join(',')+')');
 assert.equal((await ed()).frames,marked.frames,'the parked Wave Editor file is not edited from the Live Room');

 // ---- 2. the parked Forge sleeps: no listener of its own, no focus ----
 const parked=await p.evaluate(()=>window.__census());
 const pool=[...baseline];const extra=parked.filter(x=>{const i=pool.indexOf(x);if(i>=0){pool.splice(i,1);return false}return true});
 assert.deepEqual(extra,[],'parked Forge: no extra window/document key/pointer/mouse listener compared with "Forge never opened"');
 assert(await p.evaluate(()=>!!document.querySelector('[data-xen-forge-room][inert]')),'the parked Forge box is inert');
 await p.evaluate(()=>document.activeElement?.blur?.());
 for(let i=0;i<60;i++){await p.keyboard.press('Tab');assert(!(await p.evaluate(()=>!!document.activeElement?.closest?.('[data-xen-forge-room]'))),'Tab never focuses inside the parked Forge (step '+i+')')}

 // ---- 3. back by the header button: the edit keys cut at once ----
 for(const k of ['Backspace','Delete','Control+x']){
  await roomBtn('MATERIAL FORGE').click();await p.waitForTimeout(1500);
  assert(await p.evaluate(()=>/MATERIAL FORGE/.test(document.activeElement?.innerText||'')),'focus is on the header button (as after a real click)');
  const s0=await ed();await p.keyboard.press(k);await p.waitForTimeout(900);const s1=await ed();
  assert(s1.frames<s0.frames,k+' cuts at once after coming back by the header button ('+s0.frames+' -> '+s1.frames+')');
  await p.keyboard.press('Control+z');await p.waitForTimeout(900);assert.equal((await ed()).frames,s0.frames,'Ctrl+Z undoes '+k);
  await roomBtn('LIVE ROOM').click();await p.waitForTimeout(800);
 }
 assert.deepEqual(errs,[]);
 console.log('PASS FORGE-SLEEP-01 parked Forge owns no key/pointer listener and no focus; Live Room keeps Backspace/Delete; back in the Forge Backspace/Delete/Ctrl+X cut at once');
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
