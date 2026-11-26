'use strict';
// UI-LIQUID-01 (real app): Mixing Desk shows a schematic playfield thumb; clicking it docks the playfield
// beside the desk (same canvas element, no remount), the border and the playfield height are draggable and
// persisted, the stretched canvas keeps a sharp backing store, pointer maths follows the stretched rect,
// the ghost brings the playfield back up, and Controls & Settings switches the grid to logarithmic spacing.
// Usage: node tests/e2e/stage_split_liquid.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1440,height:1000}});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{try{localStorage.setItem('xensonar.djStage.expanded.v1','1');localStorage.removeItem('xensonar.stageLayout.v1')}catch{}});
  await p.goto('file://'+html);await p.waitForTimeout(3500);
  await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(1200);
  await p.evaluate(()=>{window.__canvas0=document.querySelector('canvas[data-xen-play-area]')});
  assert.equal(await p.getAttribute('.xen-stage-split','data-dock'),'top');
  assert.ok(await p.isVisible('.xen-stage-split-thumb'),'thumb visible while desk is open');
  await p.click('.xen-stage-split-thumb');await p.waitForTimeout(600);
  assert.equal(await p.getAttribute('.xen-stage-split','data-dock'),'side');
  assert.ok(await p.evaluate(()=>document.querySelector('canvas[data-xen-play-area]')===window.__canvas0),'same canvas element (no remount)');
  const pos=await p.evaluate(()=>{const d=document.querySelector('.xen-dj-stage').getBoundingClientRect(),c=document.querySelector('canvas[data-xen-play-area]').getBoundingClientRect();return{deskRight:d.right,canvasLeft:c.left}});
  assert.ok(pos.deskRight<pos.canvasLeft,'desk left of playfield');
  // drag the border
  const h=await p.$('.xen-stage-split-handle');await h.scrollIntoViewIfNeeded();let bb=await h.boundingBox();
  await p.mouse.move(bb.x+7,bb.y+40);await p.mouse.down();await p.mouse.move(bb.x-250,bb.y+40,{steps:6});await p.mouse.up();
  const frac=await p.evaluate(()=>__XenStageLayout.snapshot().deskFrac);assert.ok(frac<0.5&&frac>=0.28,'desk narrowed: '+frac);
  // drag the playfield height
  const before=await p.evaluate(()=>document.querySelector('canvas[data-xen-play-area]').getBoundingClientRect().height);
  const g=await p.$('.xen-stage-split-vgrip');await g.scrollIntoViewIfNeeded();bb=await g.boundingBox();
  await p.mouse.move(bb.x+bb.width/2,bb.y+5);await p.mouse.down();await p.mouse.move(bb.x+bb.width/2,bb.y+205,{steps:6});await p.mouse.up();await p.waitForTimeout(400);
  const st=await p.evaluate(()=>{const c=document.querySelector('canvas[data-xen-play-area]'),r=c.getBoundingClientRect();return{h:r.height,w:r.width,bw:c.width,bh:c.height,ls:JSON.parse(localStorage.getItem('xensonar.stageLayout.v1'))}});
  assert.ok(Math.abs(st.h-(before+200))<3,'height follows the grip: '+before+' -> '+st.h);
  assert.equal(st.ls.playH.side,Math.round(st.h),'persisted');
  assert.ok(Math.abs(st.bh-Math.round(Math.min(2*580,st.h)))<=2,'backing store follows stretched height: '+st.bh);
  // pointer maths on the stretched canvas: j4 maps the rect to 1100 × 580 in x and y separately
  const map=await p.evaluate(()=>{const c=document.querySelector('canvas[data-xen-play-area]'),r=c.getBoundingClientRect();return __XenGridMapProbe.toLogical(c,r.left+r.width*.25,r.top+r.height*.75)});
  assert.ok(Math.abs(map.x-275)<1&&Math.abs(map.y-435)<1,'pointer maps to logical space '+JSON.stringify(map));
  // grid spacing switch in Controls & Settings
  assert.ok(await p.evaluate(()=>{const Q=__XenGridMapProbe.yToHz;return Math.abs(Q(290)-Q(0)/2-Q(580)/2)})<1e-6,'absolute: mid = arithmetic mean');
  await p.click('[data-xen-grid-spacing-option="log"]');
  assert.equal(await p.evaluate(()=>__XenStageLayout.snapshot().spacing),'log');
  const lg=await p.evaluate(()=>{const{yToHz:Q,hzToY:Z}=__XenGridMapProbe;return{mid:Q(290),geo:Math.sqrt(Q(0)*Q(580)),rt:Z(Q(123))}});
  assert.ok(Math.abs(lg.mid-lg.geo)<1e-6,'log: mid = geometric mean');assert.ok(Math.abs(lg.rt-123)<1e-6,'Zs inverts Qa');
  await p.click('[data-xen-grid-spacing-option="abs"]');
  // ghost brings it back up
  await p.click('.xen-stage-split-ghost');await p.waitForTimeout(400);
  assert.equal(await p.getAttribute('.xen-stage-split','data-dock'),'top');
  assert.ok(await p.evaluate(()=>document.querySelector('canvas[data-xen-play-area]')===window.__canvas0),'still the same canvas');
  // desk closed: no thumb, top layout
  await p.evaluate(()=>window.__XenDjStage.setExpanded(false));await p.waitForTimeout(300);
  assert.equal(await p.$('.xen-stage-split-thumb'),null);assert.equal(await p.getAttribute('.xen-stage-split','data-desk-open'),'false');
  assert.deepEqual(errors,[]);console.log('PASS UI-LIQUID-01 stage split, grips, grid spacing');
  await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
