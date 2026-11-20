'use strict';
// GRID-VISIBLE-01 (Art Installation): "Grid Visible" checkbox next to "Edit grid / step count", default off; lines (and Hz labels) are drawn only when on.
// Usage: node tests/e2e/grid_visible.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch();const q=await(await b.newContext({viewport:{width:1440,height:1000}})).newPage();
 const errors=[];q.on('pageerror',e=>errors.push(e.message));
 await q.goto('file://'+html);await q.waitForTimeout(3500);
 await q.evaluate(()=>[...document.querySelectorAll('header button')].find(b=>/NODAL/.test(b.innerText)).click());await q.waitForTimeout(2000);
 const art=q.getByRole('button',{name:'Art Installation'});if(await art.count())await art.first().click();await q.waitForTimeout(1500);
 await q.locator('[data-installation-sound-toggle]').click();await q.waitForTimeout(6000); // NODAL-GATE-01: gate closed by default; the button opens it (seal turn + doors)
 const box=q.locator('input[data-grid-visible]');assert.equal(await box.count(),1,'one checkbox');
 assert.equal(await box.isChecked(),false,'default off');
 assert.ok(await q.getByText('Grid Visible').count(),'titled Grid Visible');
 const cyan=()=>q.evaluate(()=>{const c=[...document.querySelectorAll('canvas')].find(c=>c.width>300);const d=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<d.length;i+=4)if(d[i+1]>d[i]+25&&d[i+2]>d[i]+25&&d[i+1]>60)n++;return n;});
 await q.waitForTimeout(600);const off=await cyan();
 await box.check();await q.waitForTimeout(800);const on=await cyan();
 console.log('cyan pixels off/on:',off,on);assert.ok(on>off+200,'lines appear when on');
 await box.uncheck();await q.waitForTimeout(800);assert.ok(await cyan()<off+100,'lines gone again');
 const pt=q.locator('input[data-paint-trail]');assert.equal(await pt.count(),1,'Paint Trail checkbox');assert.equal(await pt.isChecked(),true,'Paint Trail default on');
 await pt.uncheck();await q.waitForTimeout(500);assert.equal(await pt.isChecked(),false);await pt.check();
 assert.deepEqual(errors,[]);await b.close();console.log('grid_visible OK');
})().catch(e=>{console.error(e);process.exit(1)});
