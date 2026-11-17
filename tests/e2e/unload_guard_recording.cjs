'use strict';
// AUDIT-1117 (real app): closing or reloading the tab while a take is recorded asks first, and ONLY then.
//  - Live Room: Power on and playing, no take -> no question; Rec running -> question; after "Enough!" (take saved) -> no question
//  - Multitrack (Room V): input recording running -> question; stopped -> no question
// The question is checked by dispatching a cancelable beforeunload event (what the browser does before it shows its own dialog).
// Usage: node tests/e2e/unload_guard_recording.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
  const p=await(await b.newContext({viewport:{width:1600,height:1000},permissions:['microphone']})).newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+html);await p.waitForTimeout(3500);
  const asks=()=>p.evaluate(()=>{const e=new Event('beforeunload',{cancelable:true});dispatchEvent(e);return e.defaultPrevented});
  const header=t=>p.evaluate(t=>{const x=[...document.querySelectorAll('header button')].find(b=>new RegExp(t).test(b.innerText.trim()));if(!x)throw Error('no header button '+t);x.click()},t);
  assert.equal(await asks(),false,'cold start: no question');
  await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
  await p.keyboard.down('KeyA');await p.waitForTimeout(600);
  assert.equal(await asks(),false,'playing without a take: no question');
  await p.keyboard.up('KeyA');
  // ---- Live Room take ----
  await header('^Rec$');await p.waitForTimeout(1200);
  assert.equal(await asks(),true,'a take is being recorded: the browser asks before closing');
  await p.keyboard.down('KeyA');await p.waitForTimeout(1000);await p.keyboard.up('KeyA');
  await header('Enough');let ok=false;for(let k=0;k<40&&!ok;k++){await p.waitForTimeout(250);ok=!(await asks())}
  assert.ok(ok,'take finished and saved: no question any more');
  // ---- Multitrack input recording ----
  await p.evaluate(()=>{[...document.querySelectorAll('header button, button')].find(x=>/MULTITRACK/.test(x.innerText)&&x.offsetParent).click()});
  await p.waitForSelector('[data-xmt-tempo]',{timeout:30000});await p.waitForTimeout(800);
  assert.equal(await asks(),false,'Multitrack open, nothing recording: no question');
  await p.locator('[data-xmt-rec]').click();await p.waitForSelector('[data-xmt-input-meter]',{timeout:20000});await p.waitForTimeout(800);
  assert.equal(await asks(),true,'Multitrack input recording: the browser asks before closing');
  await p.locator('[data-xmt-rec]').click();await p.waitForFunction(()=>!document.querySelector('[data-xmt-input-meter]'),null,{timeout:20000});await p.waitForTimeout(1500);
  assert.equal(await asks(),false,'Multitrack recording stopped: no question');
  assert.deepEqual(errors,[]);console.log('PASS AUDIT-1117 unload question only while a take (Live Room) or an input recording (Multitrack) runs');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
