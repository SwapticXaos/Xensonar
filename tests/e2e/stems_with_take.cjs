'use strict';
// STEMS-05 (real app, the user's flow): Rec → Enough! → Send to Multitrack. With "Rec also records stems" ON the take arrives as the chosen stems on SEPARATE tracks; OFF it is ONE stereo track.
// Usage: node tests/e2e/stems_with_take.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1440,height:900}})).newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
  const E=code=>p.evaluate(c=>window.__xenProbe.draw.evalInBundle(c),code);
  const header=t=>p.evaluate(t=>{const x=[...document.querySelectorAll('header button')].find(b=>new RegExp(t).test(b.innerText.trim()));if(!x)throw Error('no header button '+t);x.click()},t);
  const room=name=>p.evaluate(n=>{[...document.querySelectorAll('button')].find(b=>new RegExp(n).test(b.innerText)&&b.offsetParent).click()},name);
  const tracks=()=>p.evaluate(async()=>{const db=await __XenMultitrackInbox.db();return await new Promise(ok=>{const q=db.transaction('projects').objectStore('projects').get('current');q.onsuccess=()=>ok(q.result?q.result.tracks.filter(t=>t.clips.length).map(t=>t.name):[])})});
  const sw=p.locator('[data-xen-stems-withtake]');await sw.scrollIntoViewIfNeeded();assert.equal(await sw.getAttribute('data-xen-stems-withtake'),'off','off by default');
  const take=async()=>{await header('^Rec$');await p.waitForTimeout(1200);await p.keyboard.down('KeyA');await p.waitForTimeout(2500);await p.keyboard.up('KeyA');await p.waitForTimeout(300);await header('Enough');await p.waitForTimeout(3000)};
  // ---- ON: separate tracks ----
  await sw.click();assert.equal(await sw.getAttribute('data-xen-stems-withtake'),'on');
  await take();
  assert.equal(await p.evaluate(()=>__XenStemRecorder.snapshot().phase),'kept','the stems ran along with the take and are kept');
  const mt=p.locator('[data-xen-send-multitrack]');await mt.scrollIntoViewIfNeeded();await mt.click();
  await p.waitForFunction(()=>/Multitrack/i.test(document.body.innerText)&&!!document.querySelector('[data-xmt-tempo]'),null,{timeout:60000});
  let t=[];for(let k=0;k<40&&t.length<2;k++){await p.waitForTimeout(500);t=await tracks()}
  assert(t.length>=2,'the take arrived as separate stem tracks, not one: '+JSON.stringify(t));assert(t.every(n=>/ · /.test(n)),'tracks are named by stem: '+t);
  assert.equal(await E('__xenLongMasterPCM.purgeStems(0)'),0,'no stem archives left');
  // ---- OFF: one stereo track (as before) ----
  await room('LIVE ROOM');await p.waitForTimeout(1500);
  const p2=await p.evaluate(()=>document.body.innerText.includes('OFFLINE - ENABLE'));if(p2){await p.getByRole('button',{name:/^(Power|Have you tried turning it off and on again\?)$/}).first().click();await p.waitForTimeout(2500)}
  const sw2=p.locator('[data-xen-stems-withtake]');await sw2.scrollIntoViewIfNeeded();assert.equal(await sw2.getAttribute('data-xen-stems-withtake'),'on');await sw2.click();assert.equal(await sw2.getAttribute('data-xen-stems-withtake'),'off');
  const before=(await tracks()).length;await take();assert.notEqual(await p.evaluate(()=>__XenStemRecorder.snapshot().phase),'kept','no stems when off');
  const mt3=p.locator('[data-xen-send-multitrack]');await mt3.scrollIntoViewIfNeeded();await mt3.click();
  await p.waitForFunction(()=>!!document.querySelector('[data-xmt-tempo]'),null,{timeout:60000});let t2=[];for(let k=0;k<40&&t2.length<before+1;k++){await p.waitForTimeout(500);t2=await tracks()}
  assert.equal(t2.length,before+1,'off: exactly ONE new (stereo) track: '+before+' → '+t2.length);
  assert.deepEqual(errors,[]);console.log('PASS STEMS-05 Rec also records stems: '+JSON.stringify(t)+' · off: one track');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
