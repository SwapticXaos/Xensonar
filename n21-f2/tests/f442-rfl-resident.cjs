'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),{load}=require('./offline_runtime.cjs');
const root=path.resolve(__dirname,'..'),h=load(root),processor=h.run('fne').replace(/export\{[^}]*\};?\s*$/,''),preparation=h.run('dne').replace(/export\{[^}]*\};?\s*$/,'');
const report={checks:[],routes:[],limitations:['Worklet class executed in a VM; AudioContext scheduling, browser mixing and device xruns require browser/target hardware.','Modes intentionally differ in source slicing; timings do not rank musical quality.']};
for(const channels of [1,2]){
 const sr=48000,n=24000,pcm=Array.from({length:channels},(_,c)=>Float32Array.from({length:n},(_,i)=>.18*Math.sin(i*.043+(c?1.2:0))));
 let map;const worker=vm.createContext({Float32Array,Float64Array,Uint8Array,ArrayBuffer,Math,Number,Error,postMessage:m=>{assert.equal(m.type,'prepared');map=m.map},close(){}});
 vm.runInContext(preparation,worker);worker.onmessage({data:{type:'prepare',channels:pcm,sampleRate:sr,sourceId:1,session:1,asset:'fixture',token:1}});assert(map);
 for(const mode of ['base','fragment']){
  let Class;const context=vm.createContext({Float32Array,Float64Array,Uint8Array,ArrayBuffer,Math,Number,Error,sampleRate:sr,currentFrame:0,registerProcessor:(id,C)=>Class=C,AudioWorkletProcessor:class{constructor(){this.messages=[];this.port={postMessage:m=>this.messages.push(m)}}}});
  vm.runInContext(processor,context);const p=new Class({processorOptions:{session:1,asset:'fixture',token:1,sourceId:1}}),send=data=>p.port.onmessage({data:{...data,session:1,asset:'fixture',token:1,sourceId:1}});
  send({type:'load',channels:pcm,sampleRate:sr,...(mode==='fragment'?{map}:{})});assert(p.messages.some(m=>m.type==='ready'));
  const tuning=h.run(`vG(Fw({qualityMode:'${mode}',windowMs:76,stepMs:26,microDensity:1.15},'${mode==='base'?'flowing':'grainy'}'))`);
  const program={mode,transportAnchorSec:0,desiredLoopDurationSec:1,loopStartSec:0,loopEndSec:n/sr,stepSec:.026,windowSec:.076,rawTargetHz:220,entryRootHz:220,sessionAnchorHz:null,smoothedRootHz:null,tuning};
  send({type:'arm',program,sequence:1,firstWindowSec:.02});assert(p.messages.some(m=>m.type==='owned'));
  const out=[new Float32Array(128),new Float32Array(128)];let peak=0,stereoDelta=0;
  const started=performance.now();
  for(let block=0;block<1875;block++){
   context.currentFrame=block*128;if(block===500)send({type:'state',sequence:2,program:{...program,rawTargetHz:330}});if(block===1000)send({type:'state',sequence:3,program:{...program,rawTargetHz:165}});
   assert(p.process([],[out]));for(let i=0;i<128;i++){assert(Number.isFinite(out[0][i])&&Number.isFinite(out[1][i]));peak=Math.max(peak,Math.abs(out[0][i]),Math.abs(out[1][i]));stereoDelta=Math.max(stereoDelta,Math.abs(out[0][i]-out[1][i]));}
  }
  const renderWallMs=performance.now()-started;assert(peak>.001);if(channels===1)assert.equal(stereoDelta,0);else assert(stereoDelta>.01);
  assert(!p.messages.some(m=>m.type==='fault'));
  send({type:'stop'});assert(p.messages.some(m=>m.type==='released'));assert.equal(p.process([],[out]),false);
  report.routes.push({mode,sourceChannels:channels,renderedSec:5,renderWallMs,peak,stereoDelta,faults:0,released:true});
 }
}
report.checks.push('actual default resident Base and Fragment processors accept real PCM/map, render both channels, retune, and release');fs.writeFileSync(path.join(root,'results/f442-rfl-resident.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
