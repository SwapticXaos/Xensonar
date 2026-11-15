'use strict';
// LONG-BARS-01 (real app): drum pattern and Melodic Loop accept more than 16 bars (ceiling __xenMaxPatternBars = 64).
// Usage: node tests/e2e/long_bars.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{const b=await chromium.launch();const p=await(await b.newContext({viewport:{width:1500,height:950}})).newPage();
const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('file://'+html);await p.waitForTimeout(3500);
await p.locator('button',{hasText:'MATERIAL FORGE'}).first().click();await p.waitForTimeout(2500);
await p.locator('button',{hasText:'MELODIC LOOP'}).first().click();await p.waitForTimeout(4000);
const max=await p.evaluate(()=>__xenProbe.draw.evalInBundle('__xenMaxPatternBars'));assert.equal(max,64);
// Melodic Loop: Number of Bars input
const bars=p.getByLabel('Number of Bars').first();await bars.scrollIntoViewIfNeeded();assert.equal(await bars.getAttribute('max'),'64');
await bars.fill('40');await bars.blur();await p.waitForTimeout(800);assert.equal(await bars.inputValue(),'40','Melodic Loop keeps 40 bars (was clamped to 16)');
await bars.fill('200');await bars.blur();await p.waitForTimeout(800);assert.equal(await bars.inputValue(),'64','clamped to the ceiling');
await bars.fill('8');await bars.blur();await p.waitForTimeout(600);
// Drum machine: Pattern bars select
await p.evaluate(()=>window.dispatchEvent(new Event('xensonar:open-drum-pattern-manager')));await p.waitForTimeout(1500);
const sel=p.getByLabel('Pattern bars').first();await sel.scrollIntoViewIfNeeded();
assert.equal(await sel.locator('option').count(),64,'Pattern bars offers 1..64');
const t0=Date.now();await sel.selectOption('48');await p.waitForTimeout(1200);assert.equal(await sel.inputValue(),'48');
const state=await p.evaluate(()=>({canvases:document.querySelectorAll('canvas').length}));
await sel.selectOption('2');await p.waitForTimeout(600);assert.equal(await sel.inputValue(),'2','and back');
assert.deepEqual(errors,[]);console.log('PASS LONG-BARS-01: Melodic Loop 40 bars (clamp 64), drum pattern 48 bars selectable, no page errors ('+(Date.now()-t0)+' ms)');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
