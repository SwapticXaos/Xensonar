'use strict';
// GRID-DRAG-SEL (Live Room): while a blue grid triangle is dragged, the selection highlight stays on THAT triangle (it used to jump to whichever triangle was nearest to the pointer,
// which wandered far from the slowly moving dragged triangle). Usage: node tests/e2e/grid_drag_selection.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1440,height:1000}});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
  const E=code=>p.evaluate(c=>window.__xenProbe.draw.evalInBundle(c),code);
  const handle=await p.evaluateHandle(()=>[...document.querySelectorAll('canvas')].filter(c=>c.offsetParent).sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0]);const bx=await handle.boundingBox();
  const sx=bx.width/1100,sy=bx.height/580;
  const rowsNow=async()=>JSON.parse(await E('JSON.stringify(__NodalBallGrid.rows().map(r=>({step:r.stepIndex,freq:r.freq,y:Zs(r.freq)})))'));
  const rows=await rowsNow();const iso=rows.filter(r=>r.step!==undefined&&r.y>60&&r.y<300&&rows.every(o=>o===r||Math.abs(o.y-r.y)>14));assert(iso.length>=1,'an isolated triangle exists');
  const D=iso[0];
  await p.evaluate(()=>{const o=CanvasRenderingContext2D.prototype.lineTo;window.__hov=[];CanvasRenderingContext2D.prototype.lineTo=function(x,y){if(x===64)window.__hov.push(y);return o.apply(this,arguments)}});
  await p.mouse.move(bx.x+8*sx,bx.y+D.y*sy);await p.waitForTimeout(150);await p.mouse.down();
  // drag downwards: 1 unit per 25 px, the triangle follows only that slowly while the pointer runs ahead
  for(let k=1;k<=12;k++){await p.mouse.move(bx.x+8*sx,bx.y+(D.y+k*16)*sy);await p.waitForTimeout(40)}
  await p.evaluate(()=>{window.__hov.length=0});await p.waitForTimeout(350);
  const moved=(await rowsNow()).find(r=>r.step===D.step),hov=await p.evaluate(()=>window.__hov.slice());
  const pointerY=D.y+12*16;
  assert(Math.abs(moved.y-D.y)>10,'the dragged triangle really moved: '+D.y+' → '+moved.y);
  assert(Math.abs(moved.y-pointerY)>14,'the pointer is far away from the dragged triangle (test setup): triangle '+moved.y+' pointer '+pointerY);
  assert(hov.length>0,'a highlight is drawn while dragging');
  assert(hov.every(y=>Math.abs(y-moved.y)<1),'the highlight stays on the dragged triangle (y '+moved.y+'), drawn at '+[...new Set(hov.map(y=>Math.round(y)))]);
  await p.mouse.up();await p.waitForTimeout(300);
  // after the drag the highlight follows the pointer again
  await p.evaluate(()=>{window.__hov.length=0});await p.mouse.move(bx.x+bx.width*.5,bx.y+bx.height*.5);await p.waitForTimeout(300);assert.equal(await p.evaluate(()=>window.__hov.length),0,'no highlight once the drag is over and the pointer is away');
  assert.deepEqual(errors,[]);console.log('PASS GRID-DRAG-SEL the highlight stays on the dragged triangle');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
