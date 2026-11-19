'use strict';
// GRID-RATIO-01 + GRID-WB-FIT-01 (real app): Grid Workbench → Period Workbench "Add JI Ratio": a typed ratio becomes a step in cents above
// the root and joins the grid being edited (Enter and the Add button); folding, duplicates and bad input say why; the whole right column
// and the rack column are reachable (Save/Speichertitel and the status line are not cut off) at a normal laptop height.
// Usage: node tests/e2e/grid_ratio_add.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
  const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1600,height:760}})).newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+html);await p.waitForTimeout(3500);
  await p.locator('[title^="Click: Open Grid Workbench"]').first().click();await p.waitForSelector('[data-xen-ratio-input]',{timeout:15000});await p.waitForTimeout(300);
  const menu=p.locator('[data-xen-header-menu="grid"]');const input=p.locator('[data-xen-ratio-input]');const msg=async()=>(await menu.innerText());
  const steps=()=>p.locator('[aria-label^="Tune marker"]').count();
  const s0=await steps();assert.ok(s0>=2,'a grid is loaded: '+s0);
  // live preview while typing
  await input.fill('81/64');assert.match(await p.locator('[data-xen-ratio-preview]').innerText(),/81\/64 = 407\.8c above the root/);
  await input.press('Enter');await p.waitForTimeout(300);
  assert.equal(await steps(),s0+1,'Enter adds one step');assert.match(await msg(),/81\/64 = 407\.8c added as marker \d+/);assert.equal(await input.inputValue(),'','input cleared');
  // button + a complex ratio
  await input.fill('1001/1000');await p.locator('[data-xen-ratio-add]').click();await p.waitForTimeout(300);
  assert.equal(await steps(),s0+2,'Add button adds one step');assert.match(await msg(),/1001\/1000 = 1\.7c added/);
  // duplicate: no new step
  await input.fill('162/128');await input.press('Enter');await p.waitForTimeout(300);assert.equal(await steps(),s0+2);assert.match(await msg(),/81\/64 \(407\.8c\) is already in the current grid/);
  // folded
  await input.fill('9/4');await input.press('Enter');await p.waitForTimeout(300);assert.match(await msg(),/9\/4 = 203\.9c added as marker \d+ \(folded into the period from 1403\.9c\)/);
  // bad input / root: refused, nothing added
  const n=await steps();for(const [t,re] of [['2/1',/root or a whole number of periods/],['abc',/not a ratio/],['3/0',/positive/]]){await input.fill(t);await input.press('Enter');await p.waitForTimeout(150);assert.match(await msg(),re);assert.equal(await steps(),n)}
  // saved as a custom grid with the added steps
  await p.locator('button',{hasText:/^Save$/}).click();await p.waitForTimeout(600);
  const cents=await p.evaluate(()=>window.__xenProbe.draw.evalInBundle('JSON.stringify(FJ().map(t=>t.stepCents))')).then(JSON.parse);
  assert.ok(cents.some(c=>c.some(x=>Math.abs(x-407.8)<.06)&&c.some(x=>Math.abs(x-203.9)<.06)),'saved grid holds 81/64 and 9/8 steps');
  // nothing cut off: scroll each column to its end, the last control is fully inside the window frame
  const fit=await p.evaluate(()=>{const m=document.querySelector('[data-xen-header-menu="grid"]');const cols=[...m.querySelectorAll('.overflow-y-auto')];const out=[];for(const c of cols){c.scrollTop=c.scrollHeight;out.push({sh:c.scrollHeight,ch:c.clientHeight,end:Math.round(c.scrollTop+c.clientHeight)>=c.scrollHeight-1})}return out});
  assert.ok(fit.length>=3&&fit.every(f=>f.end),'every column scrolls to its end: '+JSON.stringify(fit));
  const save=await p.locator('button',{hasText:/^Save$/}).boundingBox(),slot=await p.locator('[data-xen-header-menu="grid"] >> text=Slot 11').first().boundingBox(),box=await menu.locator('div.rounded-2xl').first().boundingBox();
  assert.ok(save.y+save.height<=box.y+box.height+1,'Save inside the window');assert.ok(slot.y+slot.height<=box.y+box.height+1,'Slot 11 inside the window');
  assert.deepEqual(errors,[]);console.log('PASS GRID-RATIO-01 typed ratios (81/64, 1001/1000, folded 9/4), duplicate/root/garbage refused, saved; columns scroll to their end');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
