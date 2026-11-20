'use strict';
// TILES-ART-01 (real app, Material Forge): both entry tiles carry their artwork, and the "More ↗" button of the Spectral Forge tile stays visible, is not covered by the artwork, and opens its text.
// Usage: node tests/e2e/tiles_more_button.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch();const p=await(await b.newContext({viewport:{width:1500,height:950}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(3500);
 await p.locator('button',{hasText:'MATERIAL FORGE'}).first().click();await p.waitForTimeout(2500);
 assert.equal(await p.locator('[data-xen-tile="forge"] .xen-tile-art svg').count(),1,'the Spectral Forge tile has its artwork');
 assert.equal(await p.locator('[data-xen-tile="melodic"] .xen-tile-art svg').count(),1,'the Melodic Loop tile has its artwork');
 assert(/SPECTRALFORGE/i.test(await p.locator('[data-xen-tile="forge"]').innerText()),'the tile still starts with its title text');
 await p.locator('[data-xen-tile="forge"]').first().click();await p.waitForTimeout(3000);
 const more=p.locator('[data-xen-workflow-more]');assert.equal(await more.count(),1,'the More button exists on the selected Spectral Forge tile');
 await more.scrollIntoViewIfNeeded();assert(await more.isVisible(),'More is visible');
 // the topmost element at the middle of the button is the button itself (not the artwork)
 const top=await more.evaluate(el=>{const r=el.getBoundingClientRect(),t=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return el===t||el.contains(t)});
 assert(top,'the artwork does not cover More');
 await more.click();await p.waitForTimeout(1000);
 assert(await p.locator('#xen-creative-workflow').isVisible(),'More opens its text');
 assert.deepEqual(errs,[]);console.log('tiles_more_button OK');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
