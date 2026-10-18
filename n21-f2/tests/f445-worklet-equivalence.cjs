'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const reference=read('tests/fixtures/f445_worklet_reference.js');assert.equal(crypto.createHash('sha256').update(reference).digest('hex'),'380fc39218b5b66a2cb5d15286728ad8ac48d001926ded538e08073371878a0b');
const common=['src/nodal/01_instrument_model.js','src/nodal/02_synthesis_kernel.js','src/nodal/07_sound_designer.js'].map(read).join('\n');
function load(runtime,rate){
 const api=new Function(common+'\n'+runtime+';return {kernel:createNodalSynthesisKernel,factory:nodalWorkletProcessorFactory,model:__XenNodalModel,starter:nodalOpenStarter};')();
 let frame=0,clockReads=0,Processor;const messages=[];
 class Base{constructor(){this.port={postMessage:data=>messages.push(data)};}}
 api.factory(api.kernel,(_,p)=>Processor=p,Base,rate,()=>{clockReads++;return frame;});
 const processor=new Processor({processorOptions:{maxCost:16,maxVoices:32,tailCostScale:.5}});
 return{...api,processor,messages,send:data=>processor.port.onmessage({data}),setFrame:x=>frame=x,get clockReads(){return clockReads;}};
}
let cases=0,samples=0;const checks=[];
for(const rate of [44100,48000,96000])for(const engine of [1,2])for(const nodes of [1,3,7]){
 const a=load(reference,rate),b=load(read('src/nodal/04_audio_runtime.js'),rate),base=a.starter('hollow');
 const plan=a.model.compile(a.model.normalize({...base,schemaVersion:engine,kernelVersion:'coupled-modal-v'+engine,nodes:Array.from({length:nodes},(_,k)=>({...base.nodes[k%3],id:'n'+k,ratio:1+k*.13}))}));
 const send=data=>{a.send(structuredClone(data));b.send(structuredClone(data));};
 send({type:'plan',id:'p',plan});send({type:'pitches',id:'p',frequencies:[220,330,440]});
 const note=(id,frame,freq=220)=>send({type:'note',id,planId:'p',startSec:frame/rate,options:{frequency:freq,durationSec:.025,gain:.2,velocity:.7}});
 const l=new Float32Array(128),r=new Float32Array(128),x=new Float32Array(128),y=new Float32Array(128);
 for(let block=0;block<700;block++){
  const frame=block*128;a.setFrame(frame);b.setFrame(frame);
  if(block===1)for(let k=0;k<10;k++)note('n'+k,frame+(k%3)*128,220+k*13);
  if(block===8)send({type:'release',id:'n2'});
  if(block===12)send({type:'frequency',id:'n3',frequency:443.21});
  if(block===24)send({type:'retire',id:'n2'});
  if(block===25)note('replacement',frame,330);
  if(block===40)send({type:'stop'});
  if(block===60)note('last',frame,440);
  if(block===650)send({type:'stop'});
  a.processor.process([],[[l,r]]);b.processor.process([],[[x,y]]);
  assert.deepEqual(x,l,`left ${rate}/V${engine}/${nodes}/block${block}`);assert.deepEqual(y,r);
  assert.equal(a.processor.cost,b.processor.cost);assert.equal(a.processor.slots.filter(Boolean).length,b.processor.slots.filter(Boolean).length);
  assert.deepEqual(b.messages,a.messages);a.messages.length=b.messages.length=0;samples+=256;
 }
 assert.equal(b.processor.slotEnd,0);const reads=b.clockReads;b.processor.process([],[[x,y]]);assert.equal(b.clockReads,reads,'idle block does not consult the clock');assert(x.every(v=>v===0));
 cases++;
}
checks.push('18 rate/engine/graph combinations preserve every stereo sample, reservation cost and ordered Worklet receipt across future starts, release, gliss, retirement, stop and slot reuse');
checks.push('idle blocks return after clearing output; no retirement-buffer work or 32-slot scan');
const a=load(reference,48000),b=load(read('src/nodal/04_audio_runtime.js'),48000),l=new Float32Array(128),r=new Float32Array(128),before=[],after=[];
function take(p){const start=performance.now();for(let k=0;k<200000;k++)p.process([],[[l,r]]);return performance.now()-start;}
for(let k=0;k<6;k++){if(k%2){after.push(take(b.processor));before.push(take(a.processor));}else{before.push(take(a.processor));after.push(take(b.processor));}}
const median=a=>a.slice().sort((a,b)=>a-b)[Math.floor(a.length/2)];
const report={status:'PASS',cases,comparedStereoSamples:samples,checks,idleBookkeeping:{blocks:200000,beforeMs:median(before),afterMs:median(after),beforeRuns:before,afterRuns:after,scope:'host-only idle callback bookkeeping, not total audible DSP or target-device performance'}};
fs.writeFileSync(path.join(root,'results/f445-worklet-equivalence.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
