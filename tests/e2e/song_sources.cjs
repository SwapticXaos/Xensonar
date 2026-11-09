'use strict';
// End-to-end (real app in Chromium): song sources (Particles, Wave Starter, Keyboard) are stored per
// saved song, survive "update saved from quick", reach localStorage, survive reload and restore on
// activation; a legacy archive without songPerformance still loads. Replaces the Oct-28 isolation test
// song_performance_p0 (#2/#3), which no longer loads in isolation.
// Usage: node tests/e2e/song_sources.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');const KEY='xensonar.meta-sessions.v2';
const ready=p=>p.waitForFunction(()=>window.__xenProbe&&__xenProbe.bridge.available(),null,{timeout:30000});
const slide=(p,aria,v)=>p.evaluate(([a,v])=>{const i=document.querySelector(`input[aria-label="${a}"]`);const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;s.call(i,String(v));i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}))},[aria,v]);
const val=(p,aria)=>p.evaluate(a=>Number(document.querySelector(`input[aria-label="${a}"]`).value),aria);
(async()=>{
  const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1440,height:900}});const p=await ctx.newPage();
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+html);await ready(p);await p.waitForTimeout(1500);
  const set=async(pv,kv,wv)=>{await slide(p,'Particles volume',pv);await slide(p,'Keyboard volume',kv);await slide(p,'Wave Starter volume',wv);await p.waitForTimeout(500)};
  await set(.12,.55,.4);
  assert.equal(await p.evaluate(()=>__xenProbe.meta.saveFromQuickAsNew('E2E Song 1',false)),true);
  await set(.3,.2,.8);
  assert.equal(await p.evaluate(()=>__xenProbe.meta.saveFromQuickAsNew('E2E Song 2',false)),true);
  const rows=()=>p.evaluate(()=>__xenProbe.meta.snapshot().saved.map(r=>({id:r.id,name:r.name,src:r.songPerformance?.sources})));
  let R=await rows();const S1=R.find(r=>r.name==='E2E Song 1'),S2=R.find(r=>r.name==='E2E Song 2');
  assert.equal(S1.src.particle.particleVolume,.12);assert.equal(S2.src.particle.particleVolume,.3);
  assert.equal(S1.src.keyboard.keyboardMixVolume,.55);assert.equal(S2.src.keyboard.keyboardMixVolume,.2);
  assert.equal(S1.src.waveStarter.waveSoundVolume??S1.src.waveStarter.volume,.4);
  // update saved from quick keeps the envelope
  await set(.12,.66,.4);
  assert.equal(await p.evaluate(id=>__xenProbe.meta.updateSavedFromQuick(id,'E2E Song 1',false),S1.id),true);
  R=await rows();assert.equal(R.find(r=>r.id===S1.id).src.keyboard.keyboardMixVolume,.66,'update from quick stores new keyboard volume');
  const stored=await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).saved.find(r=>r.name==='E2E Song 1')?.songPerformance,KEY);
  assert.ok(stored&&stored.sources,'songPerformance reaches localStorage');
  // activation restores the live sliders
  const act=async(id,pv,kv,wv)=>{assert.equal(await p.evaluate(id=>__xenProbe.meta.activateSaved(id),id),true);await p.waitForTimeout(800);
    assert.equal(await val(p,'Particles volume'),pv);assert.equal(await val(p,'Keyboard volume'),kv);assert.equal(await val(p,'Wave Starter volume'),wv)};
  await act(S2.id,.3,.2,.8);await act(S1.id,.12,.66,.4);
  // reload: rows and restore survive
  await p.waitForTimeout(1800);await p.reload();await ready(p);await p.waitForTimeout(1500);
  await act(S2.id,.3,.2,.8);await act(S1.id,.12,.66,.4);
  // legacy archive without songPerformance loads without errors
  await p.evaluate(k=>{const d=JSON.parse(localStorage.getItem(k));for(const r of d.saved)if(r.name==='E2E Song 2')delete r.songPerformance;delete d.songPerformance;localStorage.setItem(k,JSON.stringify(d))},KEY);
  await p.reload();await ready(p);await p.waitForTimeout(1500);
  R=await rows();const L=R.find(r=>r.name==='E2E Song 2');assert.ok(L,'legacy row still listed');assert.ok(!L.src,'legacy row has no performance envelope');
  assert.equal(await p.evaluate(id=>__xenProbe.meta.activateSaved(id),L.id),true,'legacy row activates');
  assert.deepEqual(errors,[],'no page errors');
  console.log('PASS E2E song sources: particle/keyboard/wave volumes per song, update-from-quick, localStorage, A/B, reload, legacy archive');
  await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
