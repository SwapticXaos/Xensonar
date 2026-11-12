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
  const enter=p.getByRole('switch',{name:'Thunder Mode Enter / Wave Starter'}),key=p.getByRole('switch',{name:'Thunder Mode Keyboard'});
  assert.equal(await enter.getAttribute('aria-checked'),'true');assert.equal(await key.getAttribute('aria-checked'),'true');
  await key.click();await p.waitForTimeout(250);assert.equal(await key.getAttribute('aria-checked'),'false','keyboard off');assert.equal(await enter.getAttribute('aria-checked'),'true','Enter stays on');
  let s=await st();assert.equal(s.e,true);assert.equal(s.k,false);
  await enter.click();await p.waitForTimeout(250);assert.equal(await enter.getAttribute('aria-checked'),'false');assert.equal(await key.getAttribute('aria-checked'),'false','keyboard stays off');
  await key.click();await p.waitForTimeout(250);assert.equal(await key.getAttribute('aria-checked'),'true');assert.equal(await enter.getAttribute('aria-checked'),'false','Enter stays off while the keyboard is on');
  s=await st();assert.equal(s.e,false);assert.equal(s.k,true);
  await enter.click();await p.waitForTimeout(250);assert.equal(await enter.getAttribute('aria-checked'),'true');
  assert.deepEqual(errors,[]);console.log('PASS ROOM5-07 Thunder switches independent');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
