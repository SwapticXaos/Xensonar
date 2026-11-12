'use strict';
// ROOM5-09 (real app): a left click launches the Wave Starter ALSO while a Keyboard-Hold or Enter-Hold gesture is held.
// Before, the press was swallowed by the timbre/EQ morph gesture ("Avalanche") of the held note and never reached the Wave Starter.
// The morph drag itself must keep working. Usage: node tests/e2e/live_click_during_hold.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1440,height:1000}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
  const E=code=>p.evaluate(c=>window.__xenProbe.draw.evalInBundle(c),code);
  await E('window.__starts=0;const o=Y2e;Y2e=function(){window.__starts++;return o.apply(this,arguments)};0');
  const handle=await p.evaluateHandle(()=>[...document.querySelectorAll('canvas')].filter(c=>c.offsetParent).sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0]);const bx=await handle.boundingBox();
  const starts=()=>p.evaluate(()=>window.__starts);
  async function clicks(label,expected){const s=await starts();for(let i=0;i<3;i++){await p.mouse.click(bx.x+bx.width*(.4+.1*i),bx.y+bx.height*.5);await p.waitForTimeout(350)}assert.equal((await starts())-s,expected,label+': Wave Starter launches from 3 clicks')}
  await clicks('idle',3);
  await p.keyboard.down('KeyA');await p.waitForTimeout(600);
  await clicks('Keyboard-Hold held',3);
  // the morph gesture still starts on the same press (drag modulates the held note) and ends on release
  await p.mouse.move(bx.x+bx.width*.5,bx.y+bx.height*.5);await p.mouse.down();await p.waitForTimeout(100);
  assert.equal(await E('__XenAvalanche.dragging()'),true,'the press also starts the morph gesture of the held note');
  await p.mouse.up();await p.waitForTimeout(100);assert.equal(await E('__XenAvalanche.dragging()'),false,'the morph gesture ends on release');
  await p.keyboard.up('KeyA');await p.waitForTimeout(500);
  await p.keyboard.down('Enter');await p.waitForTimeout(600);
  await clicks('Enter-Hold held',3);
  await p.keyboard.up('Enter');await p.waitForTimeout(500);
  await clicks('after release',3);
  assert.deepEqual(errors,[]);console.log('PASS ROOM5-09 left click launches the Wave Starter during Keyboard-Hold and Enter-Hold');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
