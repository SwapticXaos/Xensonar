'use strict';
// STRIP-ACTIVE-01 (real app): in the Live Room strip, Drums, Bass and Fretboard glow green while they are on – like Material Track and
// Root Follow Loop – and plain while off. Switched with their own controls: "Drums Active", "Bass Active", "Show Tuning Grid".
// Usage: node tests/e2e/strip_active_green.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1440,height:1000}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(4000);
 const GREEN='rgba(88, 214, 158, 0.68)';
 const state=()=>p.evaluate(()=>{const s=document.querySelector('[data-xensonar-performance-strip]');const by=re=>[...s.querySelectorAll('button')].find(x=>re.test(x.title||''));
  const one=el=>el?{on:el.dataset.xenActive,border:getComputedStyle(el).borderTopColor}:null;
  return {drum:one(by(/Drum Pattern manager/)),bass:one(by(/Bass Pattern manager/)),grid:one(s.querySelector('[data-xen-status-fretboard]')),material:one(by(/Material Track manager/))}});
 const openMenu=re=>p.evaluate(src=>{const s=document.querySelector('[data-xensonar-performance-strip]');[...s.querySelectorAll('button')].find(x=>new RegExp(src).test(x.title||''))?.click()},re);
 const toggle=label=>p.evaluate(l=>{const el=[...document.querySelectorAll('label')].find(x=>x.offsetParent&&x.innerText.trim().startsWith(l));const c=el?.querySelector('input[type=checkbox]');if(!c)return null;c.click();return c.checked},label);
 const check=(x,label)=>{assert.ok(x.on==='true'||x.on==='false',label+' carries its state');if(x.on==='true')assert.equal(x.border,GREEN,label+' on: green');else assert.notEqual(x.border,GREEN,label+' off: plain')};
 const steps=[['drum','Drum Pattern manager','Drums Active'],['bass','Bass Pattern manager','Bass Active'],['grid',null,'Show Tuning Grid']];
 for(const [key,menu,label] of steps){
  const before=(await state())[key];check(before,key);
  for(let round=0;round<2;round++){
   if(menu){await openMenu(menu);await p.waitForTimeout(800)}else await p.evaluate(()=>[...document.querySelectorAll('label')].find(x=>x.offsetParent&&/Show Tuning Grid/.test(x.innerText))?.scrollIntoView({block:'center'}));
   const checked=await toggle(label);assert.notEqual(checked,null,label+' found');
   if(menu){await p.keyboard.press('Escape');await p.waitForTimeout(400)}else await p.waitForTimeout(400);
   const now=(await state())[key];assert.equal(now.on,String(checked),key+' follows '+label);check(now,key);
  }
 }
 assert.deepEqual(errors,[]);console.log('PASS STRIP-ACTIVE-01 Drums / Bass / Fretboard green while on, plain while off');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
