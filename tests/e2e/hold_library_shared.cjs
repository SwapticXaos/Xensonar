'use strict';
// HOLD-LIB-01/02 (real app): Enter-Hold and Keyboard-Hold share ONE pattern library; factory arpeggios are listed (read-only) and load into the open lane.
// Usage: node tests/e2e/hold_library_shared.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1440,height:1000}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2000);
  const E=code=>p.evaluate(c=>window.__xenProbe.draw.evalInBundle(c),code);
  const params=async()=>JSON.parse(await E('JSON.stringify((q=>({k:q.keyboardHoldPitchCents,e:q.waveStarterHoldPitchCents,ks:q.keyboardHoldSegments,es:q.waveStarterHoldSegments}))(__NodalBallGrid.params()))'));
  const tabK=p.getByRole('tab',{name:/Keyboard-Hold Pattern/}),tabE=p.getByRole('tab',{name:/Enter-Hold Pattern/});
  const sel=lane=>p.locator('select[aria-label="'+lane+' saved Arpeggio Patterns"]');
  // keyboard tab: factory group, load a major arpeggio
  await tabK.click();await p.waitForTimeout(300);await sel('keyboard').focus();await p.waitForTimeout(600);
  const facK=await sel('keyboard').locator('optgroup[label="Factory"] option').allInnerTexts();assert(facK.length>=28,'factory options listed: '+facK.length);
  assert(facK.some(t=>t.startsWith('Major · triad ↑'))&&facK.some(t=>t.startsWith('Minor · triad ↑')),'major and minor present');
  await sel('keyboard').selectOption({label:facK.find(t=>t.startsWith('Major · triad ↑ ·'))});await p.waitForTimeout(150);
  assert(await p.getByRole('button',{name:'Delete'}).first().isDisabled(),'factory pattern cannot be deleted');
  await p.getByRole('button',{name:'Load',exact:true}).first().click();await p.waitForTimeout(400);
  let s=await params();assert.deepEqual(s.k.slice(0,4),[0,400,700,1200],'keyboard lane carries the major triad');assert.equal(s.ks,4);
  // save a pattern from the keyboard lane; the Enter lane sees it (one shared library)
  const nm='Shared test '+Date.now();await p.locator('input[aria-label="keyboard pattern name"]').fill(nm);await p.getByRole('button',{name:'Save As'}).first().click();await p.waitForTimeout(600);
  await tabE.click();await p.waitForTimeout(400);await sel('enter').focus();await p.waitForTimeout(700);
  const saved=await sel('enter').locator('optgroup[label^="Saved"] option').allInnerTexts();assert(saved.some(t=>t.startsWith(nm)&&t.includes('from Keyboard')),'Enter lane lists the keyboard pattern: '+JSON.stringify(saved));
  await sel('enter').selectOption({label:saved.find(t=>t.startsWith(nm))});await p.waitForTimeout(150);
  await p.getByRole('button',{name:'Load',exact:true}).first().click();await p.waitForTimeout(400);
  s=await params();assert.deepEqual(s.e.slice(0,4),[0,400,700,1200],'Enter lane loaded the keyboard pattern');assert.equal(s.es,4);assert.deepEqual(s.k.slice(0,4),[0,400,700,1200],'keyboard lane unchanged');
  // a factory minor pattern into Enter only
  const facE=await sel('enter').locator('optgroup[label="Factory"] option').allInnerTexts();await sel('enter').selectOption({label:facE.find(t=>t.startsWith('Minor · triad ↑ ·'))});await p.getByRole('button',{name:'Load',exact:true}).first().click();await p.waitForTimeout(400);
  s=await params();assert.deepEqual(s.e.slice(0,4),[0,300,700,1200]);assert.deepEqual(s.k.slice(0,4),[0,400,700,1200],'keyboard still major');
  assert.deepEqual(errors,[]);console.log('PASS HOLD-LIB-01/02 shared library + factory arpeggios in the real app');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
