'use strict';
// PERSIST-OFFTHREAD-01 (real app, persistent profile): a long stereo import and a Wave Editor cut are saved by the record
// put worker (big PCM off the main thread) and come back after a page reload with the same samples; the UI does not freeze
// for the save. Usage: node tests/e2e/persist_offthread_restore.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
const wav=path.join(os.tmpdir(),'xen_persist_150s.wav');{const sr=44100,n=sr*150,buf=Buffer.alloc(44+n*4);buf.write('RIFF',0);buf.writeUInt32LE(36+n*4,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(2,22);buf.writeUInt32LE(sr,24);buf.writeUInt32LE(sr*4,28);buf.writeUInt16LE(4,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(n*4,40);
 for(let i=0;i<n;i++){const t=i/sr;buf.writeInt16LE(Math.round(8000*Math.sin(2*Math.PI*220*t)*(.5+.5*Math.sin(t*3))),44+i*4);buf.writeInt16LE(Math.round(6000*Math.sin(2*Math.PI*330*t)),46+i*4)}fs.writeFileSync(wav,buf)}
(async()=>{
  const prof=fs.mkdtempSync(path.join(os.tmpdir(),'xen-persist-'));
  const b=await chromium.launchPersistentContext(prof,{viewport:{width:1440,height:1000},args:['--autoplay-policy=no-user-gesture-required']});
  await b.addInitScript(()=>{const W=window.Worker;window.__putWorkers=0;window.Worker=function(u,o){if(o&&o.name==='xensonar-record-put'){if(localStorage.getItem('__xenTestNoPutWorker'))throw new Error('worker blocked by test');window.__putWorkers++}return new W(u,o)};window.Worker.prototype=W.prototype});
  const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(/persistent-save/.test(m.text()))errs.push(m.text())});
  const clkX=t=>p.evaluate(t=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&(n(b.innerText)===t||n(b.innerText).endsWith(' '+t)));if(b){b.click();return true}return false},t);
  const clkS=t=>p.evaluate(t=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&n(b.innerText).startsWith(t));if(b){b.scrollIntoView();b.click()}return !!b},t);
  const forge=async()=>{await clkX('MATERIAL FORGE');await p.waitForTimeout(3000);await clkS('SPECTRALFORGE');await p.waitForTimeout(4000)};
  const doc=()=>p.evaluate(()=>{const x=globalThis.__XenWaveUIW01;const c=document.querySelector('canvas[data-xwe-workspace-resize]');let e=null;try{e=c&&x?.getEditor(c)}catch{}const d=e?.doc;if(!d)return null;const sum=a=>{let s=0;for(let i=0;i<a.length;i+=31)s+=a[i]*((i%7)+1);return s};return {frames:d.frames,l:sum(d.channels[0]),r:sum(d.channels[1])}});
  await p.goto('file://'+html);await p.waitForTimeout(4000);await forge();
  await p.setInputFiles('input[type=file][accept^="audio"]',wav);for(let i=0;i<60&&!(await doc());i++)await p.waitForTimeout(500);
  const mask=p.locator('canvas[data-xwe-workspace-resize]');await mask.scrollIntoViewIfNeeded();const lm=await mask.boundingBox();
  await p.mouse.move(lm.x+lm.width*.2,lm.y+lm.height*.4);await p.mouse.down();await p.mouse.move(lm.x+lm.width*.4,lm.y+lm.height*.4,{steps:4});await p.mouse.up();await p.waitForTimeout(300);
  const d0=await doc();
  await p.evaluate(()=>{window.__gap=0;setTimeout(()=>{let l=performance.now();const t0=l;const f=()=>{const n=performance.now();window.__gap=Math.max(window.__gap,n-l);l=n;if(n-t0<6000)requestAnimationFrame(f)};requestAnimationFrame(f)},900)});// measure after the cut itself
  await p.keyboard.press('Backspace');await p.waitForTimeout(7000);
  const cut=await doc();assert(cut.frames<d0.frames,'cut applied ('+d0.frames+' -> '+cut.frames+')');
  assert(await p.evaluate(()=>window.__putWorkers)>=1,'the big PCM record was written by the put worker');
  const gap=await p.evaluate(()=>window.__gap);assert(gap<500,'no UI freeze while saving (longest frame gap '+Math.round(gap)+' ms)');
  await p.reload();await p.waitForTimeout(4000);await forge();let back=null;for(let i=0;i<60&&!(back=await doc());i++)await p.waitForTimeout(500);
  assert(back,'the Forge restores the material after reload');
  assert.equal(back.frames,cut.frames,'restored length = edited length');
  assert(Math.abs(back.l-cut.l)<1e-6&&Math.abs(back.r-cut.r)<1e-6,'restored samples = edited samples (L '+back.l+' / '+cut.l+')');
  // fallback: the put worker cannot start -> the old main-thread put saves it, restore still exact
  await p.evaluate(()=>localStorage.setItem('__xenTestNoPutWorker','1'));await p.reload();await p.waitForTimeout(4000);await forge();for(let i=0;i<60&&!(await doc());i++)await p.waitForTimeout(500);
  {await mask.scrollIntoViewIfNeeded();const m2=await mask.boundingBox();await p.mouse.move(m2.x+m2.width*.5,m2.y+m2.height*.4);await p.mouse.down();await p.mouse.move(m2.x+m2.width*.7,m2.y+m2.height*.4,{steps:4});await p.mouse.up();await p.waitForTimeout(300)}
  const f0=await doc();await p.keyboard.press('Backspace');await p.waitForTimeout(6000);const cut2=await doc();assert(cut2.frames<f0.frames,'second cut applied');
  assert.equal(await p.evaluate(()=>window.__putWorkers),0,'no put worker in the fallback run');
  await p.reload();await p.waitForTimeout(4000);await forge();let back2=null;for(let i=0;i<60&&!(back2=await doc());i++)await p.waitForTimeout(500);
  assert.equal(back2.frames,cut2.frames,'fallback: restored length = edited length');assert(Math.abs(back2.l-cut2.l)<1e-6&&Math.abs(back2.r-cut2.r)<1e-6,'fallback: restored samples = edited samples');
  await p.evaluate(()=>localStorage.removeItem('__xenTestNoPutWorker'));
  assert.deepEqual(errs,[]);console.log('PASS PERSIST-OFFTHREAD-01 cut saved off the main thread (max gap '+Math.round(gap)+' ms) and restored after reload ('+back.frames+' frames); fallback without worker restores too');
  await b.close();fs.rmSync(prof,{recursive:true,force:true});
})().catch(e=>{console.error(e);process.exit(1)});
