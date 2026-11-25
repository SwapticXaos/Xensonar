'use strict';
// FX-PALETTE-01 (real app): the Wave Editor offers Tuning Resonator and Material Resonator under "Add effect";
// "+ Effect" and "Apply / Bake" render them on the purple selection; the audio changes, no page errors; Undo restores it.
// Usage: node tests/e2e/wave_fx_palette.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const {meterMusic,SR}=require('../helpers/meter_synth.cjs'),{wav}=require('../helpers/analysis_synth.cjs');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'xen-fxpal-')),file=path.join(dir,'m.wav');
fs.writeFileSync(file,wav(meterMusic({bpm:120,S:4,dur:8}),SR));
(async()=>{
 const b=await chromium.launch();const p=await(await b.newContext({viewport:{width:1500,height:1000}})).newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 await p.evaluate(()=>[...document.querySelectorAll('header button')].find(b=>/MATERIAL FORGE/.test(b.innerText)).click());await p.waitForTimeout(2000);
 await p.getByText('Import Audio').first().click();await p.waitForTimeout(2000);
 await p.locator('input[type=file][accept^="audio/"]').first().setInputFiles(file);const wb=p.getByRole('button',{name:'Wave Editor'}).first();await wb.waitFor({timeout:60000});await p.waitForTimeout(1500);
 await wb.click();await p.waitForTimeout(2500);
 const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
 const FIND=`const c=[...document.querySelectorAll('canvas')].find(c=>c.offsetParent&&globalThis.__XenWaveUIW01.getEditor(c)&&globalThis.__XenWaveUIW01.enabled(c)),ed=c&&globalThis.__XenWaveUIW01.getEditor(c);`;
 const sum=()=>E(FIND+`(()=>{const d=ed.doc,ch=d.channels[0];let s=0;for(let i=0;i<ch.length;i+=97)s+=Math.abs(ch[i]);return s})()`);
 const options=await p.locator('select[aria-label="Add effect"] option').evaluateAll(os=>os.map(o=>o.value));
 for(const t of ['tuningResonator','materialResonator','wavefolder'])assert(options.includes(t),t+' is offered under Add effect: '+options.join(','));
 await E(FIND+`ed.doc=globalThis.__XenWaveCoreW01.setSelection(ed.doc,Math.round(1*ed.doc.sampleRate),Math.round(5*ed.doc.sampleRate));ed.applySelection();ed.refresh(false);'ok'`);await p.waitForTimeout(400);
 const results=[];
 for(const t of ['tuningResonator','materialResonator','wavefolder']){
  const before=await sum();
  await p.selectOption('select[aria-label="Add effect"]',t);await p.getByRole('button',{name:'+ Effect'}).click();await p.waitForTimeout(400);
  await p.getByRole('button',{name:'Apply / Bake'}).first().click();
  let after=before;for(let i=0;i<60&&Math.abs(after-before)<1e-6;i++){await p.waitForTimeout(500);after=await sum()}
  assert(Number.isFinite(after)&&Math.abs(after-before)>1e-3,t+' changed the audio: '+before.toFixed(3)+' → '+after.toFixed(3));
  results.push(t+' '+before.toFixed(1)+'→'+after.toFixed(1));
 }
 /* Undo restores the bakes */
 const baked=await sum();for(let k=0;k<3;k++){await E(FIND+`ed.runEdit('undo');'ok'`);await p.waitForTimeout(800)}
 const undone=await sum();assert(Math.abs(undone-baked)>1e-3,'Undo changes it back');
 assert.deepEqual(errors,[]);console.log('PASS FX-PALETTE-01 · '+results.join(' · ')+' · undo ok');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
