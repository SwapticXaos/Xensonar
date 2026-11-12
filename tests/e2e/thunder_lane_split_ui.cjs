'use strict';
// ROOM5-07 (real app): the two Thunder switches (Enter / Wave Starter, Keyboard) are independent; the parameters reflect it.
// Usage: node tests/e2e/thunder_lane_split_ui.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1440,height:1000}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2000);
  const E=code=>p.evaluate(c=>window.__xenProbe.draw.evalInBundle(c),code);
  const st=async()=>JSON.parse(await E('JSON.stringify((q=>({e:q.thunderModeEnabled,k:q.thunderKeyboardEnabled}))(__NodalBallGrid.params()))'));
  // ONE switch, bound to the open tab (Enter-Hold / Keyboard-Hold); fixed width, label "ON (E)" / "OFF (K)"
  const sw=()=>p.locator('button.xen-thunder-lane-switch'),q=p.getByRole('switch',{name:'Quantize Gestural Attack'});
  const geo=async()=>({sw:await sw().boundingBox(),q:await q.boundingBox()});
  assert.equal(await sw().count(),1,'one Thunder switch');
  const tabE=p.getByRole('tab',{name:/Enter-Hold Pattern/}),tabK=p.getByRole('tab',{name:/Keyboard-Hold Pattern/});
  await tabE.click();await p.waitForTimeout(200);
  assert.equal((await sw().innerText()).trim(),'ON (E)');assert.equal(await sw().getAttribute('aria-label'),'Thunder Mode Enter / Wave Starter');
  const g0=await geo();
  await sw().click();await p.waitForTimeout(250);assert.equal((await sw().innerText()).trim(),'OFF (E)');let s=await st();assert.equal(s.e,false);assert.equal(s.k,true,'keyboard keeps its own value');
  const g1=await geo();assert.equal(g1.sw.width,g0.sw.width,'switch width is fixed');assert.equal(g1.q.x,g0.q.x,'the neighbour does not move');
  await tabK.click();await p.waitForTimeout(250);assert.equal((await sw().innerText()).trim(),'ON (K)','the keyboard tab shows the keyboard value');assert.equal(await sw().getAttribute('aria-label'),'Thunder Mode Keyboard');
  await sw().click();await p.waitForTimeout(250);assert.equal((await sw().innerText()).trim(),'OFF (K)');s=await st();assert.equal(s.k,false);assert.equal(s.e,false,'Enter stays off');
  const g2=await geo();assert.equal(g2.sw.width,g0.sw.width,'same width on the other tab');assert.equal(g2.q.x,g0.q.x,'the neighbour does not move on a tab change');
  await sw().click();await p.waitForTimeout(250);s=await st();assert.equal(s.k,true);assert.equal(s.e,false,'keyboard back on, Enter still off');
  await tabE.click();await p.waitForTimeout(250);assert.equal((await sw().innerText()).trim(),'OFF (E)');await sw().click();await p.waitForTimeout(250);s=await st();assert.equal(s.e,true);assert.equal(s.k,true);
  assert.deepEqual(errors,[]);console.log('PASS ROOM5-07 Thunder switches independent');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
