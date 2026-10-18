'use strict';
// Real Nodal/C11/RFL renderers in one block loop. This is a host DSP mixture,
// not an AudioContext/device test; it neither measures XRUNs nor browser jitter.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),{performance}=require('perf_hooks'),{load}=require('./offline_runtime.cjs'),read=p=>fs.readFileSync(p,'utf8');
const nodal=new Function(read('src/nodal/01_instrument_model.js')+'\n'+read('src/nodal/07_sound_designer.js')+'\n'+read('src/nodal/02_synthesis_kernel.js')+';return {model:__XenNodalModel,starter:nodalOpenStarter,make:createNodalSynthesisKernel};')();
const c11=JSON.parse(read('src/audio/entrophon/02_worklet_and_voice_backend.js').match(/const T8=("(?:[^"\\]|\\.)*")/)[1]);
function c11Player(module,profile){const clock={frame:0};class Base{constructor(){this.port={postMessage(){},start(){}}}}
 const C=new Function('clock','AudioWorkletProcessor','sampleRate','registerProcessor',c11.replace(/\bcurrentFrame\b/g,'clock.frame')+';return U;')(clock,Base,48000,()=>{});return {p:new C({}),clock,module,profile};}
function plain(token,epoch,frame,freq,gain,duration){const u=new Uint32Array(64),f=new Float32Array(u.buffer);u[0]=1|256;u[1]=token;u[2]=epoch;u[3]=frame;u[5]=1;f[8]=freq;f[9]=gain;f[10]=2800;f[11]=.7;u[13]=duration;return u;}
function ent(token,epoch,frame){const u=new Uint32Array(64),f=new Float32Array(u.buffer);u[0]=2|256;u[1]=token;u[2]=epoch;u[3]=frame;u[5]=2;u[6]=1;f[8]=221.731;f[9]=331.137;f[14]=440;f[17]=.3;
 for(const [i,v] of [[20,.15],[21,.1],[27,1],[29,1200],[30,3500],[31,800],[34,.7],[35,1],[36,.3],[37,440],[38,1],[39,.15],[41,.1],[42,.2],[43,1]])f[i]=v;
 u[22]=144;u[23]=1440;u[24]=5760;u[25]=2880;u[26]=11520;u[28]=32;u[32]=128;u[33]=1024;u[40]=100;u[44]=63;return u;}
const h=load(require('path').resolve(__dirname,'..')),rflSource=h.run('fne').replace(/export\{[^}]*\};?\s*$/,''),sr=48000;
function rfl(){let C;const clock=vm.createContext({Float32Array,Float64Array,Uint8Array,ArrayBuffer,Math,Number,Error,sampleRate:sr,currentFrame:0,registerProcessor:(id,P)=>C=P,AudioWorkletProcessor:class{constructor(){this.port={postMessage(){}}}}});vm.runInContext(rflSource,clock);
 const p=new C({processorOptions:{session:1,asset:'mixed',token:1,sourceId:1}}),send=data=>p.port.onmessage({data:{...data,session:1,asset:'mixed',token:1,sourceId:1}});
 send({type:'load',channels:[Float32Array.from({length:24000},(_,i)=>.12*Math.sin(i*.043))],sampleRate:sr});
 const program={mode:'base',transportAnchorSec:0,desiredLoopDurationSec:1,loopStartSec:0,loopEndSec:.5,stepSec:.026,windowSec:.076,rawTargetHz:220,entryRootHz:220,sessionAnchorHz:null,smoothedRootHz:null,tuning:h.run("vG(Fw({qualityMode:'base',windowMs:76,stepMs:26,microDensity:1.15},'flowing'))")};send({type:'arm',program,sequence:1,firstWindowSec:.02});return {p,clock,send,program};}
(async()=>{
 const module=await WebAssembly.compile(new Function(read('src/audio/entrophon/01_wasm_asset.js')+';return GMe();')());
 const players=[0,1,0,1].map(profile=>c11Player(module,profile));for(const x of players){await x.p.onMessage({type:'INIT',compiledModule:module,profile:x.profile,completionBatchVersion:1});await x.p.onMessage({type:'SET_MUTED',muted:false});assert(x.p.ready);}
 const roots=[rfl(),rfl()],plan=nodal.model.compile(nodal.starter('hollow')),dsp=nodal.make(),voices=Array.from({length:9},(_,i)=>dsp.voice(plan,{frequency:173.137+i*13.731,held:true,gain:.1},sr));
 const outputs=players.map(()=>Array.from({length:9},()=>[new Float32Array(128),new Float32Array(128)])),rootOut=roots.map(()=>[new Float32Array(128),new Float32Array(128)]),nOut=[new Float32Array(128),new Float32Array(128)],blocks=[],energy=[0,0,0,0];
 for(let b=0;b<360;b++){
  for(const x of players)x.clock.frame=b*128;for(const x of roots)x.clock.currentFrame=b*128;
  if(b%45===0)for(let i=0;i<players.length;i++){
   const x=players[i],record=x.profile?ent(b+1,x.p.bridge.epoch,b*128):plain(b+1,x.p.bridge.epoch,b*128,b%90?110:55,.12,9000);
   await x.p.onMessage({type:'HOT_TONE_PLAN',buffer:record.buffer});
  }
  if(b===90){voices.forEach((v,i)=>v.setFrequency(217.731+i*11.137));for(const x of roots)x.send({type:'state',sequence:2,program:{...x.program,rawTargetHz:317.137}});}
  if(b===210)voices.forEach(v=>v.noteOff());
  const at=performance.now();players[0].p.process([],outputs[0]);players[1].p.process([],outputs[1]);roots[0].p.process([],[rootOut[0]]);
  nOut.forEach(ch=>ch.fill(0));for(const voice of voices)voice.process(...nOut,0,128,true);
  blocks.push(performance.now()-at);
  // Independently repeated primary paths run after the dense Nodal renderer.
  // Exact equality catches shared-state contamination or stolen ownership.
  players[2].p.process([],outputs[2]);players[3].p.process([],outputs[3]);roots[1].p.process([],[rootOut[1]]);
  assert.deepEqual(outputs[0],outputs[2]);assert.deepEqual(outputs[1],outputs[3]);assert.deepEqual(rootOut[0],rootOut[1]);
  for(let i=0;i<128;i++){const values=[nOut[0][i],outputs[0][0][0][i],outputs[1][0][0][i],rootOut[0][0][i]];assert(values.every(Number.isFinite));values.forEach((v,j)=>energy[j]+=Math.abs(v));assert(Number.isFinite(values.reduce((n,x)=>n+x,0)));}
 }
 assert(energy.every(x=>x>0));for(const x of players)await x.p.onMessage({type:'STOP'});for(const x of roots)x.send({type:'stop'});
 blocks.sort((a,b)=>a-b);const report={blocks:360,sampleRate:sr,nodalFullVoices:9,energy,p95HostMixtureMs:blocks[Math.floor(blocks.length*.95)],quantumMs:128/sr*1000,primaryPcmExact:true,scope:'Real C11 direct bass/pulse, Entrophon WASM and RFL resident Base plus nine full Nodal voices; host sequential render fixture, no browser scheduling/device/xrun claim'};
 fs.writeFileSync('results/p4c2-n20-mixed-render.json',JSON.stringify(report,null,2)+'\n');console.log('PASS N20 mixed render',JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1});
