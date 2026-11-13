'use strict';
// FORGE-DETUNE (real app, Spectral Forge carrier): Detune is bipolar (right = compress, left = spread around the middle) and the Hz numbers on the left follow it. Usage: node tests/e2e/forge_detune_bipolar.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1440,height:1000}})).newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
  const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
  const header=t=>p.evaluate(t=>{[...document.querySelectorAll('header button')].find(b=>new RegExp(t).test(b.innerText.trim())).click()},t);
  await header('^Rec$');await p.waitForTimeout(800);await p.keyboard.down('KeyA');await p.waitForTimeout(2200);await p.keyboard.up('KeyA');await p.waitForTimeout(300);await header('Enough');await p.waitForTimeout(2500);
  const w=p.locator('[data-xen-send-wave-editor]');await w.scrollIntoViewIfNeeded();await w.click();
  await p.waitForFunction(()=>{const x=globalThis.__XenWaveUIW01;return !!x&&[...document.querySelectorAll('canvas')].some(c=>{try{return x.getEditor(c)?.doc?.frames>0}catch{return false}})},null,{timeout:60000});await p.waitForTimeout(1500);
  // ---- the render transform on a synthetic picture: two lines 102 rows apart (on the rows the centre estimate samples) ----
  const sep=await E(`(()=>{const rows=h=>{const out=[];for(let y=0;y<h.height;y++)if(h.get(10,y)>0)out.push(y);return out};const make=()=>{const g=new ph(64,300);g.set(10,99,1);g.set(10,201,1);return g};
    const span=v=>{const r=rows(__forgeDetuneRenderGrid(make(),v));return r.length>=2?r[r.length-1]-r[0]:0};return{off:span(0),compress:span(.5),spread:span(-.5),spreadMax:span(-1)}})()`);
  assert.equal(sep.off,102);assert(sep.compress<95&&sep.spreadMax>sep.spread,'compress brings the lines closer: '+JSON.stringify(sep));assert(sep.spread>105,'spread pushes the lines apart: '+JSON.stringify(sep));
  // ---- the control and the Hz numbers on the left ----
  const labels=()=>p.evaluate(()=>{const c=document.querySelector('[data-forge-carrier-canvas]').getBoundingClientRect();const o={};for(const el of [...document.querySelectorAll('div.absolute')].filter(e=>e.className.includes('text-[9px]'))){const q=el.getBoundingClientRect();if(/^(\d+k?)$/.test(el.textContent.trim())&&Math.abs(q.left-c.left)<60)o[el.textContent.trim()]=Math.round(q.top-c.top)}return o});
  const base=await labels();assert(Object.keys(base).length>=6,'axis labels exist: '+JSON.stringify(base));
  await p.getByRole('button',{name:'Expand Synth Lab'}).click();await p.waitForTimeout(800);
  const det=p.locator('[data-forge-detune]');await det.scrollIntoViewIfNeeded();const btn=det.getByRole('button',{name:/^Detune/});
  assert.equal(await p.locator('[data-forge-detune-axis]').count(),0,'no detune note while off');
  await btn.click();await p.waitForTimeout(500);const comp=await labels();const slider=det.getByLabel(/Detune amount/);assert.equal(await slider.getAttribute('min'),'-100','the slider is bipolar');
  assert.match(await det.innerText(),/compress 50 %/);assert.equal(await p.locator('[data-forge-detune-axis]').count(),1,'the axis says "detuned Hz"');
  assert(JSON.stringify(comp)!==JSON.stringify(base),'compress: the Hz numbers moved: '+JSON.stringify(comp));
  await slider.fill('-50');await p.waitForTimeout(500);const spr=await labels();assert.match(await det.innerText(),/spread 50 %/);
  assert(JSON.stringify(spr)!==JSON.stringify(comp),'spread: the numbers moved the other way: '+JSON.stringify(spr));
  const k='1k';if(base[k]!=null&&comp[k]!=null&&spr[k]!=null)assert((comp[k]-base[k])*(spr[k]-base[k])<=0,'"1k" moves in opposite directions for compress and spread: '+[base[k],comp[k],spr[k]]);
  await btn.click();await p.waitForTimeout(500);assert.deepEqual(await labels(),base,'off: the axis is back exactly');assert.equal(await p.locator('[data-forge-detune-axis]').count(),0);
  assert.deepEqual(errors,[]);console.log('PASS FORGE-DETUNE bipolar render '+JSON.stringify(sep)+', axis follows');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
