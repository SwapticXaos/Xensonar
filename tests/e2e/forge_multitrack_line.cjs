'use strict';
// MT-ALIGN-01 (real app, Spectral Forge rack): Send to Multitrack hangs at the right edge of the Import Audio tab and stays in one line with the other Send-to keys,
// also in a wide window (the gap opens above, between Project Name / Figure Projects and the Import tab). Figure Projects keeps its place under Project Name.
// Usage: node tests/e2e/forge_multitrack_line.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch();
 // widths where the rack fits (between about 1300 and 1900 px the rack overflows sideways, unchanged by this patch)
 for(const w of [1920,1280]){
  const p=await(await b.newContext({viewport:{width:w,height:1100}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+html);await p.waitForTimeout(3500);
  await p.locator('button',{hasText:'MATERIAL FORGE'}).first().click();await p.waitForTimeout(2500);
  await p.locator('[data-xen-tile="forge"]').click();await p.waitForTimeout(4000);
  const g=await p.evaluate(()=>{const R=s=>{const r=document.querySelector(s).getBoundingClientRect();return {l:r.left,r:r.right,t:r.top+scrollY,b:r.bottom+scrollY,w:r.width}};
   return {tab:R('.xen-vertical-import-audio'),multi:R('.f35-rack-send-multitrack'),pink:R('[data-f318-export-target=pink]'),fig:R('.f33-figure-projects'),save:R('.f33-project-save'),rack:R('.f31-play-rack')}});
  const sameRowAsTab=g.tab.t<g.multi.b&&g.tab.b>g.multi.t&&g.tab.l<g.multi.l+1; // the tab lies LEFT of Multitrack's column (in layouts where the rack overflows and the tab lies right of it there is nothing to hang on)
  if(sameRowAsTab){
   assert(g.multi.l>=g.tab.r&&g.multi.l-g.tab.r<=12,w+' px: Send to Multitrack hangs at the Import Audio tab (gap '+(g.multi.l-g.tab.r).toFixed(1)+' px)');
   assert(Math.abs(g.multi.t-g.pink.t)<3||g.pink.t>g.multi.t-120,w+' px: one line with the other Send-to keys');
   assert(g.multi.r<=g.rack.r+1,w+' px: ends inside the rack');
  }
  assert(g.fig.l>=g.save.l-1&&g.fig.l<=g.save.l+1,w+' px: Figure Projects stays under Project Name ('+g.fig.l.toFixed(0)+' / '+g.save.l.toFixed(0)+')');
  assert.deepEqual(errs,[]);console.log(w,'px OK sameRowAsTab',sameRowAsTab,'gap',(g.multi.l-g.tab.r).toFixed(1));await p.close();
 }
 console.log('forge_multitrack_line OK');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
