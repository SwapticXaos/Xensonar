'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{performance}=require('node:perf_hooks'),{createEngine}=require('../tests/helpers/p4c2-n3-entrophon.cjs');
const read=p=>fs.readFileSync(p,'utf8'),cut=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)+a.length));
const nodal=new Function(read('src/nodal/01_instrument_model.js')+read('src/nodal/07_sound_designer.js')+read('src/nodal/02_synthesis_kernel.js')+';return {model:__XenNodalModel,dsp:__XenNodalDSP,kernel:createNodalSynthesisKernel,starter:nodalOpenStarter};')();
const factory=new Function(cut(read('src/nodal/04_audio_runtime.js'),'function nodalWorkletProcessorFactory(','// One main-side decision')+';return nodalWorkletProcessorFactory;')();
const cSource=JSON.parse(read('src/audio/entrophon/02_worklet_and_voice_backend.js').match(/const T8=("(?:[^"\\]|\\.)*")/)[1]);
const bytes=new Function(read('src/audio/entrophon/01_wasm_asset.js')+';return GMe();')();
class Base{constructor(){this.messages=[];this.port={postMessage:m=>this.messages.push(m),start(){}}}}
const ent=createEngine(false,false);ent.enableRendering();
const median=a=>a.slice().sort((a,b)=>a-b)[Math.floor(a.length/2)],rows=[];
(async()=>{const module=await WebAssembly.compile(bytes);
for(const rate of [48000,96000]){
 const blockCount=Math.floor(.14*rate/128);
 const loadC=new Function('environment','AudioWorkletProcessor','sampleRate','registerProcessor',cSource.replace(/\bcurrentFrame\b/g,'environment.frame')+';return U;');
 for(const spec of [{engine:'nodal',preset:'hollow',nodes:3},{engine:'nodal',preset:'reed',nodes:3},{engine:'nodal',preset:'prism',nodes:3},{engine:'nodal',preset:'mixed7',nodes:7},{engine:'nodal',preset:'mixed12',nodes:12},{engine:'entrophon',preset:'default',unison:1},{engine:'entrophon',preset:'default',unison:3},{engine:'entrophon',preset:'default',unison:6}]){
 const count=2; // Matched physical voices across engines and rates; stays below both real admission ceilings.
 for(const phase of ['held','gliss','lateTail','lateTailGliss']){
 const elapsed=[],blocksP95=[];let peak=0,live=0;
 for(let trial=0;trial<7;trial++){
 let processor,env={frame:0},release,frequency,output;
 if(spec.engine==='nodal'){
  let instrument=nodal.starter(spec.nodes>3?'hollow':spec.preset);
  if(spec.nodes>3)instrument=nodal.model.normalize({...instrument,nodes:Array.from({length:spec.nodes},(_,i)=>({...instrument.nodes[i%3],id:'n'+i,ratio:1+i*.071,excitationKind:['tone','impulse','breath'][i%3]}))});
  // Same .12s dry release for all configurations; natural modal tail retained.
  instrument=nodal.model.normalize({...instrument,articulation:{...instrument.articulation,releaseSec:.12}});
  const plan=nodal.model.compile(instrument),prepared=nodal.dsp.preparePacket(plan,Array.from({length:count},(_,i)=>220+i*13.137),rate,true);
  let Proc;factory(nodal.kernel,(_,C)=>Proc=C,Base,rate,()=>env.frame);processor=new Proc({processorOptions:{maxCost:128,maxVoices:32,separateLanes:true,tailCostScale:1}});
  processor.port.onmessage({data:{type:'plan',id:'p',plan,prepared}});
  for(let i=0;i<count;i++)processor.port.onmessage({data:{type:'note',id:'v'+i,planId:'p',startSec:0,lane:'wave',options:{frequency:220+i*13.137,gain:.15,held:true}}});
  assert.equal(processor.slots.filter(Boolean).length,count);
  release=()=>{for(let i=0;i<count;i++)processor.port.onmessage({data:{type:'release',id:'v'+i}})};
  frequency=block=>{for(let i=0;i<count;i++)processor.port.onmessage({data:{type:'frequency',id:'v'+i,frequency:220+i*13.137+block*.71}})};
  output=Array.from({length:2},()=>[new Float32Array(128),new Float32Array(128)]);
 }else{
  ent.api.set('wave',{...ent.api.defaults.wave,enabled:true,unison:spec.unison,detune:23.7,colorAmount:.35,delayAmount:.15});const sound=ent.api.capture('benchmark','wave');
  const Proc=loadC(env,Base,rate,()=>{});processor=new Proc({});await processor.onMessage({type:'INIT',compiledModule:module,profile:1,completionBatchVersion:1});await processor.onMessage({type:'SET_MUTED',muted:false});assert(processor.ready);
  for(let i=0;i<count;i++){const record=ent.api.record(sound,{frequency:220+i*13.137,velocity:.8,durationSec:20,releaseSec:.8,volumeCurve:[1]},rate).record;record[1]=i+1;record[2]=processor.bridge.epoch;await processor.onMessage({type:'HOT_TONE_PLAN',buffer:record.buffer});}
  release=()=>{for(let i=0;i<count;i++)processor.onMessage({type:'ENTROPHON_CONTROL',epoch:processor.bridge.epoch,token:i+1,op:2,releaseFrames:Math.round(.8*rate)})};
  frequency=block=>{for(let i=0;i<count;i++)processor.onMessage({type:'ENTROPHON_CONTROL',epoch:processor.bridge.epoch,token:i+1,op:1,pitch:Math.pow(2,block*.001),gain:1,ramp:128})};
  output=Array.from({length:9},()=>[new Float32Array(128),new Float32Array(128)]);
 }
 const process=()=>{processor.process([],output);env.frame+=128;};for(let i=0;i<32;i++)process();
 if(phase.startsWith('lateTail')){release();for(let i=0;i<Math.ceil(.14*rate/128);i++)process();}
 const times=[];for(let block=0;block<blockCount;block++){
  const at=performance.now();if(phase==='gliss'||phase==='lateTailGliss')frequency(block);process();times.push(performance.now()-at);
  for(const v of output[0][0])peak=Math.max(peak,Math.abs(v));
 }
 live=spec.engine==='nodal'?processor.slots.filter(Boolean).length:processor.reservations.count;
 assert.equal(live,count,'Every benchmarked voice must remain live through the measured window');assert(peak>1e-6,'Actual sounding PCM required');
 if(trial>=2){elapsed.push(times.reduce((a,b)=>a+b,0));times.sort((a,b)=>a-b);blocksP95.push(times[Math.floor(times.length*.95)]);}
 processor.bridge?.destroy();
 }
 const row={...spec,rate,phase,voices:count,renderedFrames:blockCount*128,medianMs:median(elapsed),perVoiceMs:median(elapsed)/count,p95BlockMs:median(blocksP95),peak,live,runs:elapsed};rows.push(row);console.log(spec.engine,spec.preset,rate,phase,row.medianMs.toFixed(2),row.perVoiceMs.toFixed(2));
 fs.writeFileSync('results/p4c2-n5-runtime-bench.json',JSON.stringify({scope:'Actual Nodal JS AudioWorkletProcessor versus actual embedded C11 WASM processor; 128-frame blocks; matched rate, live voice counts and timed PCM rendering. C11 has its production nine output pairs; Nodal two. C11 release .8s, Nodal dry release .12s plus natural body; not timbrally equivalent. 2 warmup and 5 measured trials, order explicit in rows. Includes frequency messages for gliss. Excludes UI, browser scheduling, device deadlines and the other instruments; no burst-free or equal-cost claim.',rows},null,2)+'\n');
 }
 }
}
await ent.dispose();
})().catch(e=>{console.error(e);process.exitCode=1});
