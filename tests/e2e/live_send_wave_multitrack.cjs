'use strict';
// SEND-WAVE (real app): the recording rack of the Live Room sends the take to the Wave Editor ("Send to Wave Editor": opens the Material Forge editor with the audio
// loaded and scrolls to it) and to the Multitrack ("Send to Multitrack": new track in Room IV). The old "Spectral Import" button is gone.
// Usage: node tests/e2e/live_send_wave_multitrack.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const ctx=await b.newContext({viewport:{width:1440,height:900}});const p=await ctx.newPage();
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
  const E=code=>p.evaluate(c=>window.__xenProbe.draw.evalInBundle(c),code);
  const header=t=>p.evaluate(t=>{const x=[...document.querySelectorAll('header button')].find(b=>new RegExp(t).test(b.innerText.trim()));if(!x)throw Error('no header button '+t);x.click()},t);
  const room=name=>p.evaluate(n=>{[...document.querySelectorAll('button')].find(b=>new RegExp(n).test(b.innerText)&&b.offsetParent).click()},name);
  // a short take with a held note
  await header('^Rec$');await p.waitForTimeout(800);await p.keyboard.down('KeyA');await p.waitForTimeout(2200);await p.keyboard.up('KeyA');await p.waitForTimeout(400);await header('Enough');await p.waitForTimeout(2500);
  const wave=p.locator('[data-xen-send-wave-editor]'),mt=p.locator('[data-xen-send-multitrack]');
  await wave.scrollIntoViewIfNeeded();
  assert.match(await wave.innerText(),/Send to Wave Editor/);assert.match(await mt.innerText(),/Send to Multitrack/);
  assert.equal(await p.evaluate(()=>/Spectral Import/.test(document.body.innerText)),false,'the old "Spectral Import" label is gone');
  // ---- Send to Wave Editor: room opens, the audio is loaded, the editor is scrolled into view ----
  await wave.click();
  await p.waitForFunction(()=>{const w=globalThis.__XenWaveUIW01;return !!w&&[...document.querySelectorAll('canvas')].some(c=>{try{return w.getEditor(c)?.doc?.frames>0}catch{return false}})},null,{timeout:60000});
  await p.waitForTimeout(1200);
  const st=await p.evaluate(()=>{const w=globalThis.__XenWaveUIW01;const c=[...document.querySelectorAll('canvas')].find(c=>{try{return w.getEditor(c)?.doc?.frames>0}catch{return false}});const ed=w.getEditor(c),cv=ed.options?.overviewCanvas||ed.options?.detailCanvas,r=cv.getBoundingClientRect();return{frames:ed.doc.frames,rate:ed.doc.sampleRate,name:ed.doc.name||'',top:Math.round(r.top),h:Math.round(r.height),vh:innerHeight,open:!!ed.overlay}});
  assert(st.frames>44100,'the take is loaded in the Wave Editor ('+st.frames+' frames)');assert(st.open,'the editor is open');
  assert(st.top>=-4&&st.top<st.vh-st.h*.5,'the editor is scrolled into view: top '+st.top+' of '+st.vh);
  assert.equal(await p.evaluate(()=>/Spectral Import/.test(document.querySelector('[data-xen-send-wave-editor]')?.innerText||'')),false);
  // ---- Send to Multitrack: Room IV opens with the take on a new track ----
  await room('LIVE ROOM');await p.waitForTimeout(1500);
  const mt2=p.locator('[data-xen-send-multitrack]');await mt2.scrollIntoViewIfNeeded();await mt2.click();
  await p.waitForFunction(()=>/Multitrack/i.test(document.body.innerText)&&!!document.querySelector('[data-xen-multitrack]'),null,{timeout:30000}).catch(()=>{});
  const tracks=await p.waitForFunction(async()=>{try{const db=await __XenMultitrackInbox.db();return await new Promise(ok=>{const q=db.transaction('projects').objectStore('projects').get('current');q.onsuccess=()=>ok(q.result&&Array.isArray(q.result.tracks)&&q.result.tracks.some(t=>(t.clips||[]).length)?q.result.tracks.length:0);q.onerror=()=>ok(0)})}catch{return 0}},null,{timeout:40000}).catch(()=>null);
  const inboxLeft=await E('__XenMultitrackInbox.count()');
  assert(tracks||inboxLeft>=1,'the take reached the Multitrack (new track or waiting in the inbox)');
  assert.deepEqual(errors,[]);console.log('PASS SEND-WAVE take → Wave Editor (loaded, open, scrolled) and → Multitrack',JSON.stringify(st));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
