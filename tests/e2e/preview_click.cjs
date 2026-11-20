'use strict';
// PREVIEW-CLICK-01 (real app, Spectral Forge preview player): a source cut mid-waveform is a click. Stopping a playing preview must end with a
// ramp to 0 before the source stops; a start inside the buffer (resume, applying a donor while the melody plays) must begin at 0 and ramp up.
// The Web Audio calls are recorded in the page. Usage: node tests/e2e/preview_click.cjs [html]
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const wav=null;if(0){const sr=48000,n=sr*3,buf=Buffer.alloc(44+n*2);buf.write('RIFF',0);buf.writeUInt32LE(36+n*2,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(1,22);buf.writeUInt32LE(sr,24);buf.writeUInt32LE(sr*2,28);buf.writeUInt16LE(2,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(n*2,40);for(let i=0;i<n;i++){const t=i/sr;buf.writeInt16LE(Math.round(9000*Math.sin(2*Math.PI*220*t)),44+i*2)}fs.writeFileSync(wav,buf)}
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const ctx=await b.newContext({viewport:{width:1500,height:950}});
 await ctx.addInitScript(()=>{window.__aud=[];const log=(k,o)=>window.__aud.push({k,t:Math.round(performance.now()),...o});
  const set=AudioParam.prototype.setValueAtTime,ramp=AudioParam.prototype.linearRampToValueAtTime,stop=AudioBufferSourceNode.prototype.stop,start=AudioBufferSourceNode.prototype.start;
  AudioParam.prototype.setValueAtTime=function(v,t){log('set',{v,at:t,gain:this.defaultValue===1&&this.maxValue>1e6&&this.minValue<-1e6});return set.call(this,v,t)};
  AudioParam.prototype.linearRampToValueAtTime=function(v,t){log('ramp',{v,at:t});return ramp.call(this,v,t)};
  AudioBufferSourceNode.prototype.stop=function(t){log('stop',{at:t===undefined?null:t,looping:this.loop});return stop.call(this,t)};
  AudioBufferSourceNode.prototype.start=function(w,o){log('start',{offset:o||0});return start.call(this,w,o)};});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(4000);
 const clkX=t=>p.evaluate(t=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&(n(b.innerText)===t||n(b.innerText).endsWith(' '+t)));if(b){b.click();return true}return false},t);
 const clkS=t=>p.evaluate(t=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&n(b.innerText).startsWith(t));if(b){b.scrollIntoView();b.click()}return !!b},t);
 await clkX('MATERIAL FORGE');await p.waitForTimeout(3000);await clkS('SPECTRALFORGE');await p.waitForTimeout(4000);
 const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
 await E(`(async()=>{const c=xt.getContext(),b=c.createBuffer(1,c.sampleRate*3,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=.4*Math.sin(2*Math.PI*220*i/c.sampleRate);window.__xenTestBuf=b;await xt.playBufferInternal(b,3,0,null,null,{loopPreview:true});})()`);await p.waitForTimeout(500);
 assert.equal(await E('String(xt.isPlaying)'),'true','the preview is playing');
 // 1. stop while playing
 await p.evaluate(()=>{window.__aud.length=0});await E('xt.stop(),1');await p.waitForTimeout(300);
 let log=await p.evaluate(()=>window.__aud),rampAt=log.findIndex(e=>e.k==='ramp'&&e.v===0),stopAt=log.findIndex(e=>e.k==='stop');
 assert(rampAt>=0,'stop ramps the gain to 0 '+JSON.stringify(log));assert(stopAt>rampAt,'the source stops after the ramp starts, and with a time (not immediately) '+JSON.stringify(log));assert(log[stopAt].at!==null&&log[stopAt].at>0,'stop is scheduled');
 // 2. start inside the buffer
 const ok=await E(`(async()=>{await xt.playBufferInternal(window.__xenTestBuf,3,.5,null,null,{loopPreview:true});return 'started'})()`);
 await p.waitForTimeout(100);
 log=await p.evaluate(()=>window.__aud);const si=log.findLastIndex(e=>e.k==='start');
 assert.equal(ok,'started','a mid-buffer start works');
 const setZero=log.slice(0,si).findLast(e=>e.k==='set'&&e.v===0),rampUp=log.slice(0,si).findLast(e=>e.k==='ramp'&&e.v>0);
 assert(setZero&&rampUp,'a start at 50 % begins at gain 0 and ramps up '+JSON.stringify(log.slice(-8)));assert(log[si].offset>.5,'offset '+log[si].offset);
 // 3. a start at the beginning keeps its immediate full gain (the buffer carries its own edge fade)
 await E('xt.stop(),1');await p.waitForTimeout(100);await p.evaluate(()=>{window.__aud.length=0});
 await E(`(async()=>{await xt.playBufferInternal(window.__xenTestBuf,3,0,null,null,{loopPreview:false})})()`);await p.waitForTimeout(100);
 log=await p.evaluate(()=>window.__aud);assert(!log.some(e=>e.k==='ramp'&&e.v>0),'a start at 0 is not ramped '+JSON.stringify(log));
 assert.deepEqual(errs,[]);console.log('PASS PREVIEW-CLICK stop ramps to 0 before the source stops; mid-buffer start ramps up from 0');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
