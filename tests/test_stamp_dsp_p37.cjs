'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),{resolveObjectURL}=require('node:buffer'),{performance}=require('node:perf_hooks');
const {read,declaration}=require('./p37_test_tools.cjs');
// Execute the actual generated Worker script in a VM message harness. This is
// a DSP/parity test, not a browser/thread/AudioContext latency measurement.
class VMWorker{
 constructor(url){this.ended=false;this.ready=resolveObjectURL(url).text().then(code=>{const seededMath=Object.create(Math);let seed=123;seededMath.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);this.context=vm.createContext({Float32Array,Float64Array,Uint8Array,Math:seededMath,performance,Promise,console,setTimeout,postMessage:data=>{if(!this.ended)this.onmessage?.({data});}});vm.runInContext(code,this.context);});}
 postMessage(data){void this.ready.then(()=>{if(!this.ended)this.context.onmessage({data});}).catch(error=>this.onerror?.({message:error.message,preventDefault(){}}));}
 terminate(){this.ended=true;}
}
function buffer(channels,length,sampleRate){const data=Array.from({length:channels},()=>new Float32Array(length));return {length,numberOfChannels:channels,sampleRate,duration:length/sampleRate,getChannelData:i=>data[i],copyToChannel:(a,i)=>data[i].set(a)};}
const ctx={sampleRate:22050,createBuffer:buffer};
const sandbox={Float32Array,Float64Array,Uint8Array,Math,Number,Object,Array,Map,Set,WeakMap,Blob,URL,Response,DecompressionStream,atob,DOMException,performance,console,setTimeout,clearTimeout,setInterval,clearInterval,Worker:VMWorker};
vm.createContext(sandbox);
let src='const EM=20,cQ=20000,Ar=10,JNe=16,ZNe=32,e5e=24,t5e=64,n5e=32768,TAU=Math.PI*2;\n';
for(const n of ['hs'])src+=declaration('src/app/forge/03_spectral_grid_and_archives.js',n)+'\n';
for(const n of ['mNe','lx'])src+=declaration('src/app/forge/05_forge_state_and_analysis.js',n)+'\n';
for(const n of ['__fSpeed2OfflineWaveform','r5e','a5e'])src+=declaration('src/app/forge/07_preview_cache_and_controls.js',n)+'\n';
src+=declaration('src/app/forge/07_preview_cache_and_controls.js','o5e','class')+'\n';
src+=declaration('src/app/forge/02_boot_and_workspace_tools.js','ph','class')+'\n';
src+=declaration('src/forge/fractalia/00_legacy_f2.js','fft')+'\nconst __Fractalia={core:{fft}};\n';
src+=read('src/forge/dsp/08_pure_dieter_worker.js')+'\n'+read('src/forge/stamps/01_atlas_2026_bridge.js')+'\n'+read('src/forge/stamps/02_atlas_audition.js');
vm.runInContext(src,sandbox);
const api=vm.runInContext('__PureDieter',sandbox),stampAPI=vm.runInContext('__XenStampFigureAudition',sandbox),atlas=vm.runInContext('__XenStampAtlas2026',sandbox);
(async()=>{
 const presets=await atlas.loadVariants([]),grid=stampAPI.miniature(presets.find(p=>p.name==='Rhythm Islands').stamp),privateRenderer=api.create();
 const mix={sine:.6,triangle:.3,sawtooth:.1,square:0},rows=[];
 for(const mode of ['additive','ifft','glyph']){
  const args={grid,durationSec:.35,mode,mix,context:ctx},start=performance.now();
  const main=api.render(args),privateJob=privateRenderer.render(args);
  const [a,b]=await Promise.all([main,privateJob]);
  assert(Buffer.from(a.getChannelData(0).buffer).equals(Buffer.from(b.getChannelData(0).buffer)),mode+' uses exactly the same DSP with identical test random seed');
  assert(b.getChannelData(0).some(v=>Math.abs(v)>.001));assert(b.getChannelData(0).every(Number.isFinite));
  rows.push({mode,durationSec:.35,sampleRate:22050,parallelPairMs:Math.round((performance.now()-start)*10)/10});
 }
 assert.equal(api.pending(),false);assert.equal(privateRenderer.pending(),false);
 console.log('P37 DSP PASS: simultaneous primary/private raw worker owners, actual Atlas miniature, exact PCM parity, finite audible output. VM timings:',JSON.stringify(rows));
})().catch(e=>{console.error(e);process.exitCode=1});
