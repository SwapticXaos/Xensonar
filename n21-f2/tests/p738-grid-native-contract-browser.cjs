'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright'),manifest=require('../source-manifest.json');
const hook=`window.__gridNative={audition:__XenMetaAudition,pitches:__xenMetaGridPreviewPitches,entries:()=>__xenMetaLibraryEntries('grid'),period:AF};`;
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.XEN_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage(),errors=[],rows=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.__gridPCM={buffers:[],starts:[],osc:[],hold:false,release:null,envelopes:[]};const state=window.__gridPCM;
   const render=OfflineAudioContext.prototype.startRendering;
   OfflineAudioContext.prototype.startRendering=async function(...args){const buffer=await render.apply(this,args);state.buffers.push(buffer);if(state.hold)await new Promise(r=>state.release=r);return buffer};
   const createGain=OfflineAudioContext.prototype.createGain;OfflineAudioContext.prototype.createGain=function(...args){const node=createGain.apply(this,args),ramp=node.gain.linearRampToValueAtTime.bind(node.gain);node.gain.linearRampToValueAtTime=(value,time)=>{if(value===.12)state.envelopes.push(time-.012);return ramp(value,time)};return node};
   const create=OfflineAudioContext.prototype.createOscillator;
   OfflineAudioContext.prototype.createOscillator=function(...args){const node=create.apply(this,args),set=node.frequency.setValueAtTime.bind(node.frequency);node.frequency.setValueAtTime=(freq,time)=>{state.osc.push({freq,time});return set(freq,time)};return node};
   const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){state.starts.push({when:args[0],duration:this.buffer?.duration});return start.apply(this,args)};
  });
  const html=fs.readFileSync(manifest.entry,'utf8'),marker='const kEe=CEe("root");';assert.equal(html.split(marker).length,2);
  await page.route('https://grid-native.test/**',r=>r.fulfill({contentType:'text/html',body:html.replace(marker,hook+marker)}));await page.goto('https://grid-native.test/review');await page.waitForFunction(()=>window.__gridNative?.entries().length>0);
  const entries=await page.evaluate(()=>__gridNative.entries());const non12=entries.find(e=>e.id==='19edo');assert(non12,'native 19 EDO library entry');
  const tritave=await page.evaluate(()=>__gridNative.entries().find(e=>Math.abs(__gridNative.period(e.id)-3)<1e-6));assert(tritave,'native tritave library entry');
  for(const entry of [non12,tritave]){
   const before=await page.evaluate(()=>({starts:__gridPCM.starts.length,buffers:__gridPCM.buffers.length,osc:__gridPCM.osc.length,envelopes:__gridPCM.envelopes.length}));
   await page.evaluate(e=>{void __gridNative.audition.toggle(e)},entry);await page.waitForFunction(n=>__gridPCM.starts.length>n,before.starts);
   const row=await page.evaluate(({entry,before})=>{
    const buffer=__gridPCM.buffers[before.buffers],pcm=buffer.getChannelData(0),rate=buffer.sampleRate,pitches=__gridNative.pitches(110,entry.id),power=(a,b)=>{let energy=0,n=0;for(let i=Math.floor(a*rate);i<Math.min(pcm.length,Math.floor(b*rate));i++){energy+=pcm[i]*pcm[i];n++}return Math.sqrt(energy/Math.max(n,1))};
    const osc=__gridPCM.osc.slice(before.osc),attacks=__gridPCM.envelopes.slice(before.envelopes),baseFreq=osc[0].freq,lastFreq=osc[osc.length-3].freq;
    return {id:entry.id,period:__gridNative.period(entry.id),pitchCount:pitches.length,seconds:buffer.duration,rate,starts:__gridPCM.starts.length-before.starts,attacks,ratio:lastFreq/baseFreq,oscillatorCount:osc.length,energy:pitches.map((_,i)=>power(i*.155+.023,i*.155+.055)),peak:pcm.reduce((m,x)=>Math.max(m,Math.abs(x)),0)};
   },{entry,before});
   assert.equal(row.starts,1);assert.equal(row.attacks.length,row.pitchCount);assert.equal(row.oscillatorCount,row.pitchCount*3,'three native Bowed Glass partials per note');assert(Math.abs(row.ratio-row.period)<1e-6);assert(row.energy.every(x=>x>.001));assert(row.peak<1);
   row.attacks.forEach((t,i)=>assert(Math.abs(t-i*.155)<1e-9,'native offline attack uses precise 155 ms sample-clock schedule'));
   await page.evaluate(()=>__gridNative.audition.stop());rows.push(row);
  }
  const before=await page.evaluate(()=>{__gridPCM.hold=true;return {starts:__gridPCM.starts.length,buffers:__gridPCM.buffers.length}});
  await page.evaluate(e=>{void __gridNative.audition.toggle(e)},non12);await page.waitForFunction(()=>typeof __gridPCM.release==='function');
  await page.evaluate(()=>{__gridNative.audition.stop();__gridPCM.hold=false;__gridPCM.release()});await page.evaluate(()=>new Promise(r=>setTimeout(r,80)));
  const cancelled=await page.evaluate(()=>({starts:__gridPCM.starts.length,status:__gridNative.audition.snapshot()}));assert.equal(cancelled.starts,before.starts,'Stop while native offline rendering resolves must never start late PCM');assert.equal(cancelled.status,null);assert.deepEqual(errors,[]);
  fs.mkdirSync('results/sessions-reviewed',{recursive:true});fs.writeFileSync('results/sessions-reviewed/grid-native-contract.json',JSON.stringify({entry:manifest.entry,rows,cancelled,errors,scope:'Real native Chromium OfflineAudioContext buffers, real mounted Grid provider, 19 EDO and tritave attacks/period endpoints; Stop during deliberately delayed native render completion. No device/latency claim.'},null,2)+'\n');
  console.log('PASS native 19 EDO + tritave PCM: all notes, exact 155 ms attacks, period endpoints, one source and render-time Stop cancellation');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
