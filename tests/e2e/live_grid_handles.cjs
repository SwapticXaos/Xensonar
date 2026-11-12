'use strict';
// ROOM5-02 regression for the Live Room: the blue grid triangles (left edge) still work after their thresholds moved into __XenGridHandles:
// click = mute / unmute the step, drag = offset (1 unit per 25 px, up raises), right click = take the line as grid base.
// Usage: node tests/e2e/live_grid_handles.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1440,height:1000}});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
  const E=code=>p.evaluate(c=>window.__xenProbe.draw.evalInBundle(c),code);
  const canvas=p.locator('canvas').filter({has:p.locator('xpath=self::*')}).first();
  const handle=await p.evaluateHandle(()=>[...document.querySelectorAll('canvas')].filter(c=>c.offsetParent).sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0]);const bx=await handle.boundingBox();
  const sx=bx.width/1100,sy=bx.height/580;const grid=async()=>JSON.parse(await E('JSON.stringify((p=>({muted:p.manualGridMutedSteps,offsets:p.manualGridStepOffsets,base:p.gridBase}))(__NodalBallGrid.params()))'));
  const rows=JSON.parse(await E('JSON.stringify(__NodalBallGrid.rows().map(r=>({step:r.stepIndex,freq:r.freq,y:Zs(r.freq)})))'));
  const iso=rows.filter(r=>r.y>8&&r.y<572&&rows.every(o=>o===r||Math.abs(o.y-r.y)>14));assert(iso.length>=3);
  const g0=await grid(),mutedBefore=g0.muted.includes(iso[iso.length-1].step);const L=iso[iso.length-1];
  await p.mouse.click(bx.x+8*sx,bx.y+L.y*sy);await p.waitForTimeout(300);assert.notEqual((await grid()).muted.includes(L.step),mutedBefore,'click toggles the mute of the step');
  await p.mouse.click(bx.x+8*sx,bx.y+L.y*sy);await p.waitForTimeout(300);assert.equal((await grid()).muted.includes(L.step),mutedBefore,'second click restores it');
  const D=iso[iso.length-2];await p.mouse.move(bx.x+8*sx,bx.y+D.y*sy);await p.mouse.down();await p.mouse.move(bx.x+8*sx,bx.y+(D.y-50)*sy,{steps:6});await p.mouse.up();await p.waitForTimeout(300);
  const g2=await grid();assert(g2.offsets[D.step]>1.8&&g2.offsets[D.step]<2.2,'drag up 50 px = +2: '+g2.offsets[D.step]);
  await p.mouse.click(bx.x+8*sx,bx.y+iso[0].y*sy,{button:'right'});await p.waitForTimeout(300);const g3=await grid();assert(Math.abs(g3.base-440)>1e-6,'right click on a triangle takes the line as base: '+g3.base);
  // hovering a triangle shows the resize cursor
  await p.mouse.move(bx.x+bx.width*.5,bx.y+bx.height*.5);await p.mouse.move(bx.x+8*sx,bx.y+iso[1].y*sy);await p.waitForTimeout(100);assert.equal(await handle.evaluate(c=>c.style.cursor),'ns-resize','resize cursor over a triangle');
  assert.deepEqual(errors,[]);console.log('PASS ROOM5-02 Live Room grid triangles unchanged (click, drag, right click, cursor)');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
