'use strict';
// FX-PALETTE-01 / FX-NET-01 (real app): the Wave Editor offers Tuning Resonator, Material Resonator, Wavefolder and the room devices (Psy Lab FX, Spiral, Master Strip) under "Add effect";
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
 for(const t of ['tuningResonator','materialResonator','wavefolder','psyLabFx','spiralFx','masterStripFx'])assert(options.includes(t),t+' is offered under Add effect: '+options.join(','));
 await E(FIND+`ed.doc=globalThis.__XenWaveCoreW01.setSelection(ed.doc,Math.round(1*ed.doc.sampleRate),Math.round(5*ed.doc.sampleRate));ed.applySelection();ed.refresh(false);'ok'`);await p.waitForTimeout(400);
 const results=[];
 for(const t of ['tuningResonator','materialResonator','wavefolder','psyLabFx','spiralFx','masterStripFx']){
  const before=await sum();
  await p.selectOption('select[aria-label="Add effect"]',t);await p.getByRole('button',{name:'+ Effect'}).click();await p.waitForTimeout(400);
  /* FX-NET-01: named choices are selects; the Psy Lab patch list shows the Psy Lab's patches */
  if(t==='psyLabFx'){const names=await p.locator('select[data-xwe-param="patch"] option').allInnerTexts();assert(names.includes('Barber Spiral')&&names.length>=5,'Psy Lab patches offered: '+names.slice(0,6).join(', '));await p.selectOption('select[data-xwe-param="patch"]',{label:'Barber Spiral'})}
  if(t==='materialResonator'){const names=await p.locator('select[data-xwe-param="material"] option').allInnerTexts();assert.deepEqual(names,['Glass','Metal','Resin','Fungus','Dust','Plasma'])}
  if(t==='tuningResonator'){const names=await p.locator('select[data-xwe-param="set"] option').allInnerTexts();assert(names.includes('Bohlen–Pierce'),'pitch sets: '+names.join(','))}
  await p.getByRole('button',{name:'Apply / Bake'}).first().click();
  let after=before;for(let i=0;i<60&&Math.abs(after-before)<1e-6;i++){await p.waitForTimeout(500);after=await sum()}
  assert(Number.isFinite(after)&&Math.abs(after-before)>1e-3,t+' changed the audio: '+before.toFixed(3)+' → '+after.toFixed(3));
  results.push(t+' '+before.toFixed(1)+'→'+after.toFixed(1));
 }
 /* FX-NET-01: the Psy Lab chain really works on input audio (diff to the input, per patch) */
 const psy=await p.evaluate(()=>window.__xenProbe.draw.evalInBundle(`(async()=>{const m=__xenLoadDeferred('psylab'),sr=48000,n=sr,x=new Float32Array(n);for(let i=0;i<n;i++)x[i]=.3*Math.sin(2*Math.PI*220*i/sr);
  const r=[];for(const pat of m.fxPatches().slice(0,4)){const y=(await m.fxRender({channels:[x],sampleRate:sr,params:pat.params,mix:1}))[0];let d=0,e=0,bad=0;for(let i=0;i<n;i++){if(!Number.isFinite(y[i]))bad++;d+=(y[i]-x[i])**2;e+=x[i]*x[i]}r.push({name:pat.name,diff:Math.sqrt(d/e),bad})}return JSON.stringify(r)})()`));
 /* FX-NET-03: the Live Room grid reaches the effects – crystal on the grid vs fixed 220 Hz, and the grid's degrees as a pitch set */
 const gridCheck=JSON.parse(await p.evaluate(()=>window.__xenProbe.draw.evalInBundle(`(async()=>{const m=__xenLoadDeferred('psylab'),sr=48000,n=sr,x=new Float32Array(n);for(let i=0;i<n;i++)x[i]=.3*Math.sin(2*Math.PI*220*i/sr)*((i%12000)<1500?1:.1);
  const pat=m.fxPatches().find(p=>p.name==='Crystal Cave')||m.fxPatches()[0],a=(await m.fxRender({channels:[x],sampleRate:sr,params:pat.params,res:m.gridRes(),mix:1}))[0],b=(await m.fxRender({channels:[x],sampleRate:sr,params:pat.params,res:[220],mix:1}))[0];
  let d=0,e=0;for(let i=0;i<n;i++){d+=(a[i]-b[i])**2;e+=b[i]*b[i]}return JSON.stringify({grid:m.gridHz().length,res:m.gridRes().map(h=>Math.round(h)),diff:Math.sqrt(d/Math.max(1e-12,e))})})()`)));
 assert(gridCheck.grid>=5,'the Live Room grid has degrees: '+gridCheck.grid);assert(gridCheck.diff>.05,'crystal on the grid sounds different from 220 Hz: '+JSON.stringify(gridCheck));
 /* FX-NET-04: the Mix of a room device follows an automation lane (0 → 1 over the selection): early ≈ dry, late = processed; constant 0 = untouched */
 const auto=JSON.parse(await p.evaluate(async()=>{const D=window.__XenWaveDSPW01,sr=48000,n=sr*2,x=new Float32Array(n);for(let i=0;i<n;i++)x[i]=.3*Math.sin(2*Math.PI*220*i/sr)*((i%12000)<2000?1:.2);
  const out={};for(const type of ['spiralFx','psyLabFx','masterStripFx']){const params=type==='masterStripFx'?{tape:.9,glue:.9,ceil:-12}:{};
   const r=await D.render({sampleRate:sr,channels:[new Float32Array(x)],range:{start:0,end:n},tailMode:'truncate',nodes:[{id:'a',type,params,automation:{wet:{points:[{frame:0,value:0},{frame:n,value:1}]}}}]});
   const z=await D.render({sampleRate:sr,channels:[new Float32Array(x)],range:{start:0,end:n},tailMode:'truncate',nodes:[{id:'b',type,params:{...params,wet:0},automation:{}}]});
   const y=r.channels[0],q=n/4;let e1=0,e2=0,d1=0,d2=0;for(let i=0;i<q;i++){d1+=(y[i]-x[i])**2;e1+=x[i]*x[i]}for(let i=n-q;i<n;i++){d2+=(y[i]-x[i])**2;e2+=x[i]*x[i]}
   let same=true;for(let i=0;i<n;i++)if(z.channels[0][i]!==x[i]){same=false;break}
   out[type]={early:Math.sqrt(d1/e1),late:Math.sqrt(d2/e2),zeroUntouched:same}}return JSON.stringify(out)}));
 for(const [t,q] of Object.entries(auto)){assert(q.late>q.early*2&&q.late>.05,t+': mix lane 0→1, early ≈ dry, late processed: '+JSON.stringify(q));assert(q.zeroUntouched,t+': mix 0 leaves the audio untouched')}
 for(const q of JSON.parse(await psy)){assert.equal(q.bad,0,q.name);assert(q.diff>.1,'Psy Lab patch '+q.name+' changes the input audio: '+q.diff.toFixed(3))}
 /* Undo restores the bakes */
 const baked=await sum();for(let k=0;k<6;k++){await E(FIND+`ed.runEdit('undo');'ok'`);await p.waitForTimeout(800)}
 const undone=await sum();assert(Math.abs(undone-baked)>1e-3,'Undo changes it back');
 assert.deepEqual(errors,[]);console.log('PASS FX-PALETTE-01 · '+results.join(' · ')+' · grid '+gridCheck.grid+' degrees, crystal '+gridCheck.res.join('/')+' Hz (Δ '+gridCheck.diff.toFixed(3)+') · mix automation '+Object.entries(auto).map(([t,q])=>t+' '+q.early.toFixed(2)+'→'+q.late.toFixed(2)).join(', ')+' · undo ok');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
