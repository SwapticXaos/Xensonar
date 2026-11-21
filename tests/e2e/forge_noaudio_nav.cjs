'use strict';
// NOAUDIO-NAV-01 (real app, Spectral Forge without imported audio): the old display stays (NO SIGNAL / NO SOUND, all buttons in their normal look),
// the buttons that cannot do anything yet do nothing (inert), the buttons that can (UP, UPPER: only scrolling) work.
// Usage: node tests/e2e/forge_noaudio_nav.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch();const p=await(await b.newContext({viewport:{width:1920,height:1100}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(3500);
 await p.locator('button',{hasText:'MATERIAL FORGE'}).first().click();await p.waitForTimeout(2500);
 await p.locator('[data-xen-tile="forge"]').click();await p.waitForTimeout(4000);
 const rack=p.locator('[data-p33-inactive-rack]');await rack.scrollIntoViewIfNeeded();await p.evaluate(()=>window.scrollBy(0,200));await p.waitForTimeout(500);
 const st=await p.evaluate(()=>{const root=document.querySelector('[data-p33-inactive-rack]');const all=[...root.querySelectorAll('button')];const nav=all.filter(b=>b.matches('.xen-forge-upper-triangle,.xen-forge-up-triangle'));
  const others=all.filter(b=>!nav.includes(b));return {nav:nav.length,navInert:nav.filter(b=>b.inert).length,others:others.length,othersInert:others.filter(b=>b.inert).length,
   dimmed:others.filter(b=>+getComputedStyle(b).opacity<.9).length,rackOpacity:+getComputedStyle(root).opacity,y:scrollY}});
 assert.equal(st.nav,2,'UP and UPPER are there');assert.equal(st.navInert,0,'UP and UPPER are not inert');
 assert(st.others>=8&&st.othersInert===st.others,'every other control of the rack is inert: '+JSON.stringify(st));
 assert.equal(st.dimmed,0,'the controls keep their normal look (not greyed out): '+JSON.stringify(st));assert.equal(st.rackOpacity,1,'the rack itself is not dimmed');
 assert(st.y>300,'the page is scrolled down: '+st.y);
 // a click on a control that cannot work yet does nothing; UPPER scrolls to the top
 const apply=p.locator('[data-p33-inactive-rack] button',{hasText:'Apply Raw'}).first();const ab=await apply.boundingBox();
 await p.mouse.click(ab.x+ab.width/2,ab.y+ab.height/2);await p.waitForTimeout(400);
 assert.equal(await p.evaluate(()=>scrollY),st.y,'Apply Raw without audio does nothing');
 const ub=await p.locator('.xen-forge-upper-triangle').boundingBox();
 await p.mouse.click(ub.x+ub.width*.8,ub.y+ub.height*.55);await p.waitForTimeout(1800);
 assert.equal(await p.evaluate(()=>scrollY),0,'UPPER scrolls to the very top without any audio');
 assert.deepEqual(errs,[]);console.log('forge_noaudio_nav OK',JSON.stringify(st));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
