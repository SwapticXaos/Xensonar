'use strict';
// AUDIT-1117 (real app): leaving and re-entering the Live Room must not leave window "resize" listeners behind.
// Before, every new Live Room canvas added one that was never removed; through its ResizeObserver it kept the replaced
// canvas (and its backing store) alive: one per room change. Counted with the DevTools protocol (all listeners on window).
// Also: the canvas still follows a viewport resize (the shared counter marks it dirty).
// Usage: node tests/e2e/live_canvas_no_leak.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1440,height:900}});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+html);await p.waitForTimeout(3500);
  const c=await p.context().newCDPSession(p);
  const resizeListeners=async()=>{const {result}=await c.send('Runtime.evaluate',{expression:'window'});const {listeners}=await c.send('DOMDebugger.getEventListeners',{objectId:result.objectId});return listeners.filter(l=>l.type==='resize').length};
  const room=t=>p.evaluate(t=>{const b=[...document.querySelectorAll('button')].find(b=>b.innerText.replace(/\s+/g,' ').includes(t));if(!b)throw Error('no '+t);b.click()},t);
  const cycle=async()=>{await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2000);for(const r of ['MATERIAL FORGE','NODAL CENTER','LIVE ROOM']){await room(r);await p.waitForTimeout(1500)}};
  await cycle();const after1=await resizeListeners();
  for(let i=0;i<3;i++)await cycle();const after4=await resizeListeners();
  assert.equal(after4,after1,'no resize listener left behind per Live Room re-entry: '+after1+' after 1 cycle, '+after4+' after 4');
  // the canvas backing store still follows the shown size after a resize
  await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(1500);
  const w0=await p.evaluate(()=>{const cv=[...document.querySelectorAll('canvas')].filter(x=>x.offsetParent).sort((a,b)=>b.clientWidth-a.clientWidth)[0];return cv?cv.width:0});
  await p.setViewportSize({width:1000,height:900});await p.waitForTimeout(1200);
  const w1=await p.evaluate(()=>{const cv=[...document.querySelectorAll('canvas')].filter(x=>x.offsetParent).sort((a,b)=>b.clientWidth-a.clientWidth)[0];return cv?cv.width:0});
  assert.ok(w0>0&&w1>0&&w1<w0,'backing store follows a narrower window: '+w0+' -> '+w1);
  assert.deepEqual(errors,[]);console.log('PASS AUDIT-1117 Live Room canvas: no listener left per re-entry ('+after1+' = '+after4+'), resize still followed ('+w0+' -> '+w1+')');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
