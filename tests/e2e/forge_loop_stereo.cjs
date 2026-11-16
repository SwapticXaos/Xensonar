'use strict';
// LOOP-STEREO (real app): the Forge Preview Loop (big PLAY, also the Wave Editor's Loop button) plays an imported stereo file in STEREO
// (it used to be mixed down to mono unless the asset came from the Wave Editor). Usage: node tests/e2e/forge_loop_stereo.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
// 4 s stereo WAV: 220 Hz only on the left, 330 Hz only on the right
const wav=path.join(os.tmpdir(),'xen_stereo_lr.wav');{const sr=48000,n=sr*4,buf=Buffer.alloc(44+n*4);buf.write('RIFF',0);buf.writeUInt32LE(36+n*4,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(2,22);buf.writeUInt32LE(sr,24);buf.writeUInt32LE(sr*4,28);buf.writeUInt16LE(4,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(n*4,40);
 for(let i=0;i<n;i++){const t=i/sr;buf.writeInt16LE(Math.round(9000*Math.sin(2*Math.PI*220*t)),44+i*4);buf.writeInt16LE(Math.round(9000*Math.sin(2*Math.PI*330*t)),46+i*4)}fs.writeFileSync(wav,buf)}
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1440,height:1000}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+html);await p.waitForTimeout(4000);
  const clkX=t=>p.evaluate(t=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&(n(b.innerText)===t||n(b.innerText).endsWith(' '+t)));if(b){b.click();return true}return false},t);
  const clkS=t=>p.evaluate(t=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&n(b.innerText).startsWith(t));if(b){b.scrollIntoView();b.click()}return !!b},t);
  await clkX('MATERIAL FORGE');await p.waitForTimeout(3000);await clkS('SPECTRALFORGE');await p.waitForTimeout(4000);
  await p.setInputFiles('input[type=file][accept^="audio"]',wav);await p.waitForTimeout(5000);
  await p.locator('.xen-forge-giant-play').scrollIntoViewIfNeeded();await p.locator('.xen-forge-giant-play').click();await p.waitForTimeout(1500);
  const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
  const r=JSON.parse(await E(`(()=>{const buf=Id.sourceNode&&Id.sourceNode.buffer;if(!buf)return JSON.stringify({});const l=buf.getChannelData(0),rr=buf.getChannelData(Math.min(1,buf.numberOfChannels-1));const rms=a=>{let s=0;for(let i=0;i<a.length;i+=7)s+=a[i]*a[i];return Math.sqrt(s/(a.length/7))};return JSON.stringify({ch:buf.numberOfChannels,l:rms(l),r:rms(rr)})})()`));
  assert.equal(r.ch,2,'the loop buffer is stereo, got '+JSON.stringify(r));
  assert(r.l>.05&&r.r>.05,'both channels carry their own signal '+JSON.stringify(r));
  // L and R differ (not a mono downmix): correlation of the first samples
  const diff=JSON.parse(await E(`(()=>{const buf=Id.sourceNode.buffer;const l=buf.getChannelData(0),r=buf.getChannelData(1);let d=0;for(let i=0;i<l.length;i+=11)d+=Math.abs(l[i]-r[i]);return JSON.stringify(d/(l.length/11))})()`));
  assert(diff>.05,'left and right differ (stereo kept), mean |L-R| = '+diff);
  assert.deepEqual(errs,[]);console.log('PASS LOOP-STEREO the Forge Preview Loop plays stereo: ch '+r.ch+', rms L '+r.l.toFixed(3)+' R '+r.r.toFixed(3));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
