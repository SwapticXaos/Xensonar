'use strict';
// LANE-EQ-01 (real app, real keys): a Keyboard note of the classic/Entrophon engine enters the KEYBOARD lane
// (own instrument EQ + Loop-Rec tap), a Wave Starter note (Enter) the WAVE lane. Before, the Entrophon C11 hold host of the
// Keyboard was wired to the Wave Starter's lane: the Keyboard EQ did nothing and the Wave EQ shaped Keyboard notes.
// Usage: node tests/e2e/keyboard_lane_eq.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await (await b.newContext({viewport:{width:1440,height:1000}})).newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{const O=window.AudioContext;window.AudioContext=class extends O{constructor(...a){super(...a);window.__ctx=this}}});
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2000);
 const E=code=>p.evaluate(c=>window.__xenProbe.draw.evalInBundle(c),code);
 const meas=kind=>E(`(async()=>{const ctx=window.__ctx,taps=__XenLoopRec.kindTaps(ctx).filter(x=>x.kind==='${kind}');if(!taps.length)return -2;let best=0;const an=taps.map(t=>{const a=ctx.createAnalyser();a.fftSize=2048;t.node.connect(a);return a});const buf=new Float32Array(2048);for(let i=0;i<10;i++){await new Promise(r=>setTimeout(r,60));for(const a of an){a.getFloatTimeDomainData(buf);let s=0;for(const v of buf)s+=v*v;best=Math.max(best,Math.sqrt(s/2048))}}return best})()`);
 const eqSet=(kind,v)=>E(`(()=>{__XenEQ.set(__XenEQ.keyFor('${kind}','instrument'),{a:Array(360).fill(${v}),enabled:true});return 1})()`);
 for(const preset of ['entrophon','default']){
  if(preset!=='default'){await p.evaluate(x=>__xenProbe.bridge.patch({keyboardHoldSoundPreset:x,waveStarterHoldSoundPreset:x}),preset);await p.waitForTimeout(1000)}
  // Keyboard key
  await p.keyboard.down('a');await p.waitForTimeout(500);
  const k=await meas('keyboard'),kw=await meas('wave');
  assert(k>.02&&kw<k*.1,preset+': a Keyboard note sounds at the KEYBOARD lane tap ('+k.toFixed(3)+'), not at the wave one ('+kw.toFixed(3)+')');
  await eqSet('keyboard',-1);await p.waitForTimeout(1500);const kcut=await meas('keyboard');await eqSet('keyboard',0);
  assert(kcut<k*.2,preset+': the Keyboard EQ shapes it ('+k.toFixed(3)+' -> '+kcut.toFixed(3)+')');
  await eqSet('wave',-1);await p.waitForTimeout(1500);const wcut=await meas('keyboard');await eqSet('wave',0);await p.waitForTimeout(800);
  assert(wcut>k*.5,preset+': the Wave Starter EQ does NOT touch Keyboard notes ('+wcut.toFixed(3)+')');
  await p.keyboard.up('a');await p.waitForTimeout(1000);
  // Wave Starter (Enter)
  await p.keyboard.down('Enter');await p.waitForTimeout(600);
  const w=await meas('wave'),wk=await meas('keyboard');
  assert(w>.005&&wk<w*.1,preset+': a Wave Starter note sounds at the WAVE lane tap ('+w.toFixed(3)+'), not at the keyboard one');
  await eqSet('wave',-1);await p.waitForTimeout(1500);const wc=await meas('wave');await eqSet('wave',0);
  assert(wc<w*.2,preset+': the Wave Starter EQ shapes it ('+w.toFixed(3)+' -> '+wc.toFixed(3)+')');
  await p.keyboard.up('Enter');await p.waitForTimeout(1000);
 }
 assert.deepEqual(errors,[]);
 console.log('PASS LANE-EQ-01: Keyboard notes (classic + Entrophon) go through the Keyboard EQ/tap, Wave Starter notes through the wave ones');
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
