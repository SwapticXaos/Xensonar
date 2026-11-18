'use strict';
// KEY-GUARD-01 (real app): every key has at most one owner, and text fields belong to the person typing.
// Measured with every window/document key listener wrapped: a listener "claims" a key when it calls preventDefault or stops it.
//  1. In each room (Live Room on, Forge, Nodal, Psy Lab, Multitrack), focus on the page: no key press is claimed by two listeners.
//  2. Same rooms, focus in a text field: no listener claims a key (Escape excepted: dialogs may close), and typing arrives.
//  3. Forge with a file in the Wave Editor, then the Live Room with the Forge parked: rules 1 and 2 still hold.
// Catches the class of bugs from WAVE-KEYS-01..03 / KEY-OWNER-01 / FORGE-SLEEP-01 (two owners for one key, keys taken in the wrong room).
// Map of who owns what: node tools/probes/key_owner_map.cjs
// Usage: node tests/e2e/key_owner_guard.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
const KEYS=['Backspace','Delete','Space','Enter','Escape','ArrowLeft','ArrowUp','KeyA','KeyQ','Digit1','Comma','Control+KeyZ','Control+KeyX','Control+KeyV'];
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
 const p=await(await b.newContext({viewport:{width:1440,height:1000}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{let n=0;const A=EventTarget.prototype.addEventListener,R=EventTarget.prototype.removeEventListener,wrapped=new WeakMap();
  EventTarget.prototype.addEventListener=function(type,fn,opt){if(type==='keydown'&&(this===window||this===document)&&fn){const id=++n,src=String(typeof fn==='function'?fn:fn.handleEvent).replace(/\s+/g,' ').slice(0,90);
    const w=function(ev){const before=ev.defaultPrevented;let stopped=false;const sp=ev.stopPropagation,si=ev.stopImmediatePropagation;ev.stopPropagation=function(){stopped=true;return sp.call(this)};ev.stopImmediatePropagation=function(){stopped=true;return si.call(this)};
     try{return typeof fn==='function'?fn.call(this,ev):fn.handleEvent(ev)}finally{ev.stopPropagation=sp;ev.stopImmediatePropagation=si;if((!before&&ev.defaultPrevented)||stopped)(window.__claims||(window.__claims=[])).push({id,src,key:ev.key})}};
    let m=wrapped.get(fn);if(!m)wrapped.set(fn,m=new Map());m.set(this===window?'w':'d',w);return A.call(this,type,w,opt)}return A.call(this,type,fn,opt)};
  EventTarget.prototype.removeEventListener=function(type,fn,opt){if(type==='keydown'&&(this===window||this===document)&&fn){const w=wrapped.get(fn)?.get(this===window?'w':'d');if(w)return R.call(this,type,w,opt)}return R.call(this,type,fn,opt)}});
 await p.goto('file://'+html);await p.waitForTimeout(3500);
 const power=async()=>{if(await p.evaluate(()=>document.body.innerText.includes('OFFLINE - ENABLE'))){const pw=p.getByRole('button',{name:/^(Power|Have you tried turning it off and on again\?)$/}).first();if(await pw.count()){await pw.click();await p.waitForTimeout(2200)}}};
 const room=n=>p.evaluate(n=>{[...document.querySelectorAll('header button, button')].find(b=>b.innerText.replace(/\s+/g,' ').includes(n)&&b.offsetParent).click()},n);
 const problems=[];let presses=0;
 const sweep=async label=>{
  for(const focus of ['page','text field'])for(const k of KEYS){
   await p.evaluate(f=>{document.activeElement?.blur?.();document.getElementById('__kg')?.remove();if(f==='text field'){const i=document.createElement('input');i.id='__kg';i.style.cssText='position:fixed;left:2px;top:2px;width:40px;z-index:99999';document.body.appendChild(i);i.focus()}window.__claims=[]},focus);
   await p.keyboard.press(k);await p.waitForTimeout(40);presses++;
   const c=await p.evaluate(()=>(window.__claims||[]).splice(0));const owners=[...new Map(c.map(x=>[x.id,x.src])).values()];
   if(owners.length>1)problems.push(`${label} · ${focus} · ${k}: ${owners.length} owners: ${owners.join(' || ')}`);
   if(focus==='text field'&&owners.length&&k!=='Escape')problems.push(`${label} · text field · ${k}: taken by ${owners.join(' || ')}`);
  }
  if(label.startsWith('Live'))await p.keyboard.press('Escape');
  if(label.startsWith('Live')||label.startsWith('LIVE'))assert.ok(!(await p.evaluate(()=>document.body.innerText.includes('OFFLINE - ENABLE'))),label+': Power is on while the keys are checked');
 };
 await power();
 for(const r of ['LIVE ROOM','MATERIAL FORGE','NODAL CENTER','PSY LAB','MULTITRACK']){await room(r);await p.waitForTimeout(2000);if(r==='LIVE ROOM')await power();await sweep(r)}
 // Forge with a file in the Wave Editor, then the Live Room with the Forge parked
 await room('LIVE ROOM');await p.waitForTimeout(1200);await power();
 const header=t=>p.evaluate(t=>{[...document.querySelectorAll('header button')].find(b=>new RegExp(t).test(b.innerText.trim())).click()},t);
 await header('^Rec$');await p.waitForTimeout(800);await p.keyboard.down('KeyA');await p.waitForTimeout(2500);await p.keyboard.up('KeyA');await p.waitForTimeout(300);await header('Enough');await p.waitForTimeout(2500);
 await p.locator('[data-xen-send-wave-editor]').click();
 await p.waitForFunction(()=>{const x=globalThis.__XenWaveUIW01;return !!x&&[...document.querySelectorAll('canvas')].some(c=>{try{return x.getEditor(c)?.doc?.frames>0}catch{return false}})},null,{timeout:60000});await p.waitForTimeout(1500);
 await sweep('Forge with a file in the Wave Editor');
 await room('LIVE ROOM');await p.waitForTimeout(1500);await power();await sweep('Live Room, Forge parked');
 // typing still reaches a real field of the app
 const f=p.locator('input[aria-label="Take name"]:visible, input[type=text]:visible').first();let typed='';if(await f.count()){await f.click();await f.press('End');await p.keyboard.type('qa1');typed=await f.inputValue()}
 assert.deepEqual(problems,[],'key ownership:\n'+problems.join('\n'));
 assert.ok(!typed||/qa1$/.test(typed),'typing into an app text field arrives: '+typed);
 assert.deepEqual(errs,[]);console.log('PASS KEY-GUARD-01: '+presses+' key presses in 7 situations, every key at most one owner, nothing taken from text fields');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
