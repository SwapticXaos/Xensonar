'use strict';
const fs=require('node:fs'), assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
const files=['src/nodal/01_instrument_model.js','src/nodal/02_synthesis_kernel.js','src/nodal/07_sound_designer.js','src/nodal/04_audio_runtime.js'];
const api=new Function(files.map(read).join('\n')+';return {model:__XenNodalModel,starter:nodalOpenStarter,kernel:createNodalSynthesisKernel,factory:nodalWorkletProcessorFactory};')();
const a=api.starter('hollow'),b=api.model.normalize({...api.starter('prism'),name:'Cold secondary'});
const planA=api.model.compile(a),planB=api.model.compile(b),rate=48000;
const control=api.kernel();
const packetA=control.preparePacket(planA,[a.referenceHz],rate,true),packetB=control.preparePacket(planB,[b.referenceHz],rate,true);
function run(paced){
 let frame=0,Class,messages=[];
 class Base {constructor(){this.port={postMessage:m=>messages.push(m)}}}
 api.factory(api.kernel,(_,P)=>Class=P,Base,rate,()=>frame);
 const p=new Class({processorOptions:{maxCost:16,maxVoices:32,tailCostScale:.5,separateLanes:true}});
 const send=m=>p.port.onmessage({data:m});
 send({type:'plan',id:'a',plan:structuredClone(planA),prepared:structuredClone(packetA)});
 assert(messages.some(m=>m.type==='ready'&&m.id==='a'));
 send({type:'note',id:'old',planId:'a',startSec:0,options:{frequency:220,held:false,durationSec:.18,gain:.4,velocity:.8}});
 const sound=[];
 function block(){const out=[[new Float32Array(128),new Float32Array(128)],[new Float32Array(128),new Float32Array(128)]];p.process([],out);frame+=128;for(let lane=0;lane<2;lane++)for(let side=0;side<2;side++)sound.push(...out[lane][side]);}
 for(let k=0;k<4;k++)block();
 send({type:'plan',id:'b',plan:structuredClone(planB),prepared:structuredClone(packetB),paced});
 // Draw the old sound continuously while a second program's pool is built.
 let blocks=0;
 while(!messages.some(m=>m.type==='ready'&&m.id==='b')&&blocks<36){
   if(paced){const request=messages.find(m=>m.type==='stage-needed'&&m.id==='b');assert(request);messages.splice(messages.indexOf(request),1);send({type:'stage',id:'b'});}
   block();blocks++;
 }
 assert(messages.some(m=>m.type==='ready'&&m.id==='b'));
 while(blocks<32){block();blocks++;}
 send({type:'note',id:'new',planId:'b',startSec:frame/rate+.003,options:{frequency:330,held:false,durationSec:.12,gain:.35,velocity:.9}});
 for(let k=0;k<150;k++)block();
 const result=new Float32Array(sound);
 assert(result.some(n=>Math.abs(n)>1e-7),'real DSP must produce audio');
 assert(messages.some(m=>m.type==='started'&&m.id==='new'),'new source started');
 return {pcm:result,stageRequests:messages.filter(m=>m.type==='stage-needed').length};
}
const eager=run(false),paced=run(true);
assert.deepEqual(paced.pcm,eager.pcm,'Worklet pacing must not change even one Float32 sample of the performed gesture');
console.log('PASS P2 real Nodal V2 audio: eager versus paced pool samples identical across cold selection while old voice plays; samples='+paced.pcm.length);
