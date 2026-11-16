'use strict';
// WAVE-KEYS-03 (real app): (1) editor opened with the 'Wave Editor' button (focus stays on that button), mark on the Loop Mask, Backspace/Delete
// cut (used to do nothing); (2) room separation: in another room (Forge parked hidden) Backspace/Delete never edit the Wave Editor and reach the
// room's own handlers (Backspace = octave hold in the Live Room). Usage: node tests/e2e/wave_keys_launch_and_rooms.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
const wav=path.join(os.tmpdir(),'xen_keys_20s.wav');{const sr=48000,n=sr*20,buf=Buffer.alloc(44+n*4);buf.write('RIFF',0);buf.writeUInt32LE(36+n*4,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(2,22);buf.writeUInt32LE(sr,24);buf.writeUInt32LE(sr*4,28);buf.writeUInt16LE(4,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(n*4,40);
 for(let i=0;i<n;i++){const t=i/sr,v=Math.round(8000*Math.sin(2*Math.PI*220*t)*(.5+.5*Math.sin(t*3)));buf.writeInt16LE(v,44+i*4);buf.writeInt16LE(v,46+i*4)}fs.writeFileSync(wav,buf)}
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1440,height:1000}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+html);await p.waitForTimeout(4000);
  const clkX=t=>p.evaluate(t=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&(n(b.innerText)===t||n(b.innerText).endsWith(' '+t)));if(b){b.click();return true}return false},t);
  const clkS=t=>p.evaluate(t=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&n(b.innerText).startsWith(t));if(b){b.scrollIntoView();b.click()}return !!b},t);
  const room=t=>p.evaluate(t=>[...document.querySelectorAll('header button')].find(b=>b.innerText.toUpperCase().includes(t)).click(),t);
  await clkX('MATERIAL FORGE');await p.waitForTimeout(3000);await clkS('SPECTRALFORGE');await p.waitForTimeout(4000);
  await p.setInputFiles('input[type=file][accept^="audio"]',wav);
  const st=()=>p.evaluate(()=>{const x=globalThis.__XenWaveUIW01;const e=x&&[...document.querySelectorAll('canvas')].map(c=>{try{return x.getEditor(c)}catch{return null}}).find(Boolean);return e?.doc?{frames:e.doc.frames,open:!!e.overlay,active:document.activeElement?.className||document.activeElement?.tagName}:{frames:0}});
  for(let i=0;i<60&&!((await st()).frames>0);i++)await p.waitForTimeout(500);
  await p.locator('button.xwe-launch').click();await p.waitForTimeout(1500);assert((await st()).open,'editor panel open');
  const mask=p.locator('canvas[data-xwe-workspace-resize]');
  const drag=async(a,c)=>{await mask.scrollIntoViewIfNeeded();const lm=await mask.boundingBox();await p.mouse.move(lm.x+lm.width*a,lm.y+lm.height*.4);await p.mouse.down();await p.mouse.move(lm.x+lm.width*c,lm.y+lm.height*.4,{steps:6});await p.mouse.up();await p.waitForTimeout(500)};
  await p.evaluate(()=>{globalThis.__bsSeen=0;window.addEventListener('keydown',e=>{if(e.key==='Backspace'||e.key==='Delete')globalThis.__bsSeen++})});
  for(const key of ['Backspace','Delete']){
    await drag(.3,.5);const s0=await st();assert(/xwe-launch/.test(s0.active),'focus is still on the Wave Editor button ('+s0.active+')');
    await p.keyboard.press(key);await p.waitForTimeout(900);const s1=await st();assert(s1.frames<s0.frames,key+' cuts after opening with the Wave Editor button ('+s0.frames+' -> '+s1.frames+')');
  }
  assert.equal(await p.evaluate(()=>globalThis.__bsSeen),0,'in the Forge the edit key is consumed by the editor');
  // room separation: selection exists, Forge parked hidden
  await drag(.3,.5);
  for(const r of ['LIVE ROOM','NODAL','MULTITRACK']){
    await room(r);await p.waitForTimeout(1200);const f0=(await st()).frames;const seen0=await p.evaluate(()=>globalThis.__bsSeen);
    await p.keyboard.down('Backspace');await p.waitForTimeout(150);await p.keyboard.up('Backspace');await p.keyboard.press('Delete');await p.waitForTimeout(900);
    assert.equal((await st()).frames,f0,'no Wave Editor edit in '+r);
    assert.equal(await p.evaluate(()=>globalThis.__bsSeen)-seen0,2,'Backspace/Delete reach the room '+r);
  }
  // back in the Forge the keys work again
  await room('FORGE');await p.waitForTimeout(1500);await drag(.65,.85);/* a new mark away from the kept one (.3-.5 still exists; its edge would be a resize handle) */const g0=(await st()).frames;await p.keyboard.press('Backspace');await p.waitForTimeout(900);assert((await st()).frames<g0,'Backspace cuts again back in the Forge');
  assert.deepEqual(errs,[]);console.log('PASS WAVE-KEYS-03 Backspace/Delete cut after the Wave Editor button; other rooms keep their keys');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
