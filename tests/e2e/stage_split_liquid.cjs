'use strict';
// UI-LIQUID-01/02 (real app): opening the Mixing Desk docks the playfield beside it right away
// (same canvas element, no remount, no thumb any more), the border and the playfield height are draggable and
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
  assert.equal(await p.getAttribute('.xen-stage-split','data-dock'),'side','desk open (persisted) → playfield already beside it');
  assert.equal(await p.$('.xen-stage-split-thumb'),null,'no thumb any more');
  // close + reopen: the canvas moves up and back beside the desk without a remount
  await p.evaluate(()=>window.__XenDjStage.setExpanded(false));await p.waitForTimeout(300);
  assert.equal(await p.getAttribute('.xen-stage-split','data-dock'),'top');
  await p.evaluate(()=>window.__XenDjStage.setExpanded(true));await p.waitForTimeout(600);
  assert.equal(await p.getAttribute('.xen-stage-split','data-dock'),'side','opening the desk docks the playfield beside it');
  assert.ok(await p.evaluate(()=>document.querySelector('canvas[data-xen-play-area]')===window.__canvas0),'same canvas element (no remount)');
  const pos=await p.evaluate(()=>{const d=document.querySelector('.xen-dj-stage').getBoundingClientRect(),c=document.querySelector('canvas[data-xen-play-area]').getBoundingClientRect();return{deskRight:d.right,canvasLeft:c.left}});
  assert.ok(pos.deskRight<pos.canvasLeft,'desk left of playfield');
  await p.waitForTimeout(300);
  const fb=await p.evaluate(()=>{const q=s=>document.querySelector(s).getBoundingClientRect();const d=q('.xen-stage-split-desk'),c=q('canvas[data-xen-play-area]'),below=q('.xen-mainroom-shell'),head=q('.xen-h1-tonal-stage > :first-child'),play=q('.xen-h1-tonal-stage > :nth-child(2)'),dock=q('.xen-power-loop-dock');
   return{vw:document.documentElement.clientWidth,sw:document.documentElement.scrollWidth,deskLeft:d.left,deskH:d.height,deskTop:d.top,canvasRight:play.right,canvasTop:c.top,dockBottom:dock.bottom,dockLeft:dock.left,canvasLeft:c.left,headTop:head.top,canvasH:play.bottom-head.top,shellLeft:below.left}});
  assert.ok(fb.deskLeft<=12&&fb.deskLeft<fb.shellLeft,'desk flush with the window edge, not the block column: '+JSON.stringify(fb));
  assert.ok(fb.canvasRight>=fb.vw-12,'playfield reaches the right window edge');
  assert.equal(fb.sw,fb.vw,'no horizontal scroll');
  assert.ok(Math.abs(fb.canvasH-fb.deskH)<=4,'default: head + playfield as tall as the Mixing Desk '+fb.canvasH+' / '+fb.deskH);
  assert.ok(fb.canvasTop-fb.dockBottom>=0&&fb.canvasTop-fb.dockBottom<=61&&fb.dockLeft>fb.canvasLeft,'the playfield sits right under its power / Loop-Rec dock: '+JSON.stringify(fb));
  assert.ok(Math.abs(fb.headTop-fb.deskTop)<=2,'head starts level with the desk');
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
  // double-click on the height grip: back to the desk height
  await p.dblclick('.xen-stage-split-vgrip');await p.waitForTimeout(400);
  const back=await p.evaluate(()=>({c:document.querySelector('.xen-h1-tonal-stage > :nth-child(2)').getBoundingClientRect().bottom-document.querySelector('.xen-h1-tonal-stage > :first-child').getBoundingClientRect().top,d:document.querySelector('.xen-stage-split-desk').getBoundingClientRect().height,ls:__XenStageLayout.snapshot().playH.side}));
  assert.equal(back.ls,0);assert.ok(Math.abs(back.c-back.d)<=4,'reset = desk height');
  await p.mouse.move(bb.x+bb.width/2,bb.y+5);
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
  // UI-SWAP-01: the swap rings move the desk | playfield row up between the side rails and back (same canvas, persisted)
  await p.evaluate(()=>__XenStageLayout.setDock('side'));await p.waitForTimeout(400);
  const sw=await p.$('.xen-stage-split-swap');assert.ok(sw,'swap button in side mode');
  const kb=await p.evaluate(()=>{const k=document.querySelector('.xen-power-loop-dock .xen-qc-wrap').getBoundingClientRect(),b=document.querySelector('.xen-stage-split-swap').getBoundingClientRect();return{dx:k.left-b.right,dy:b.top-k.top}});
  assert.ok(kb.dx>=0&&kb.dx<20&&Math.abs(kb.dy)<30,'swap button sits left of the power knob: '+JSON.stringify(kb));
  const yBelow=await p.evaluate(()=>document.querySelector('.xen-stage-split-desk').getBoundingClientRect().top+scrollY);
  await sw.click();await p.waitForTimeout(700);
  const up=await p.evaluate(()=>{const d=document.querySelector('.xen-stage-split-desk').getBoundingClientRect(),pr=document.querySelector('.xen-performance').getBoundingClientRect(),qr=document.querySelector('.xen-quick-dock').getBoundingClientRect(),c=document.querySelector('canvas[data-xen-play-area]').getBoundingClientRect();
    return{top:d.top+scrollY,deskLeft:d.left,perfRight:pr.right,canvasRight:c.right,quickLeft:qr.left,ghost:getComputedStyle(document.querySelector('.xen-stage-split-ghost')).display,ls:__XenStageLayout.snapshot().sideTop,sw:document.documentElement.scrollWidth,vw:document.documentElement.clientWidth}});
  assert.ok(up.top<yBelow-200,'the row moved up: '+yBelow+' -> '+up.top);assert.equal(up.ghost,'none');assert.equal(up.ls,true);
  assert.ok(up.deskLeft>=up.perfRight&&up.canvasRight<=up.quickLeft,'between the side rails: '+JSON.stringify(up));assert.equal(up.sw,up.vw,'no horizontal scroll');
  assert.ok(await p.evaluate(()=>document.querySelector('canvas[data-xen-play-area]')===window.__canvas0),'same canvas after the swap');
  await p.click('.xen-stage-split-swap');await p.waitForTimeout(600);
  assert.equal(await p.evaluate(()=>__XenStageLayout.snapshot().sideTop),false,'second click swaps back');
  assert.ok(Math.abs(await p.evaluate(()=>document.querySelector('.xen-stage-split-desk').getBoundingClientRect().top+scrollY)-yBelow)<3,'back below');
  // desk closed: top layout; reopening docks beside again
  await p.evaluate(()=>window.__XenDjStage.setExpanded(false));await p.waitForTimeout(300);
  assert.equal(await p.getAttribute('.xen-stage-split','data-desk-open'),'false');
  await p.evaluate(()=>window.__XenDjStage.setExpanded(true));await p.waitForTimeout(400);
  assert.equal(await p.getAttribute('.xen-stage-split','data-dock'),'side');
  assert.ok(await p.evaluate(()=>document.querySelector('canvas[data-xen-play-area]')===window.__canvas0),'still the same canvas');
  assert.deepEqual(errors,[]);console.log('PASS UI-LIQUID-01/02 stage split (auto side dock), grips, grid spacing');
  await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
