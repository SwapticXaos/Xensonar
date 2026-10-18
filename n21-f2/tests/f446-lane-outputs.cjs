'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const api=new Function(['src/nodal/01_instrument_model.js','src/nodal/02_synthesis_kernel.js','src/nodal/07_sound_designer.js','src/nodal/04_audio_runtime.js'].map(read).join('\n')+';return {kernel:createNodalSynthesisKernel,model:__XenNodalModel,starter:nodalOpenStarter,factory:nodalWorkletProcessorFactory};')();
let frame=0,Processor;class Base{constructor(){this.port={postMessage(){}};}}
api.factory(api.kernel,(_,p)=>Processor=p,Base,48000,()=>frame);
const plan=api.model.compile(api.starter('hollow')),control=api.kernel();
const packet=control.preparePacket(plan,[220,330],48000,true);
function setup(){const p=new Processor({processorOptions:{maxCost:16,maxVoices:32,separateLanes:true}});p.port.onmessage({data:{type:'plan',id:'p',plan:structuredClone(plan),prepared:structuredClone(packet)}});return p;}
const outputs=()=>Array.from({length:2},()=>[new Float32Array(128),new Float32Array(128)]);
function note(p,id,lane){p.port.onmessage({data:{type:'note',id,planId:'p',lane,startSec:frame/48000,options:{frequency:220,gain:.3,velocity:.7,durationSec:.02}}});}
const p=setup(),waveOnly=setup(),particleOnly=setup();note(p,'particle','particle');note(particleOnly,'particle','particle');
let nonzero=false;
for(let b=0;b<12;b++){const mixed=outputs(),reference=outputs();p.process([],mixed);particleOnly.process([],reference);assert(mixed[0][0].every(v=>v===0));assert.deepEqual(mixed[1],reference[1]);nonzero||=mixed[1][0].some(v=>Math.abs(v)>1e-6);frame+=128;}assert(nonzero);
note(p,'wave','wave');note(waveOnly,'wave','wave');
for(let b=0;b<12;b++){const mixed=outputs(),a=outputs(),bOut=outputs();p.process([],mixed);waveOnly.process([],a);particleOnly.process([],bOut);assert.deepEqual(mixed[0],a[0]);assert.deepEqual(mixed[1],bOut[1]);frame+=128;}
for(const voice of [p,waveOnly,particleOnly])voice.port.onmessage({data:{type:'stop'}});
const mixed=outputs(),a=outputs(),b=outputs();p.process([],mixed);waveOnly.process([],a);particleOnly.process([],b);assert.deepEqual(mixed[0],a[0]);assert.deepEqual(mixed[1],b[1]);
const silent=outputs();p.process([],silent);assert(silent.flat().every(channel=>channel.every(v=>v===0)));
const report={status:'PASS',independentStereoOutputs:2,sharedProcessor:true,checks:['particle does not leak to wave output','shared rendering equals independent lane references sample for sample','stop fades stay in the owning lane','next block is silent']};
fs.writeFileSync(path.join(root,'results/f446-lane-outputs.json'),JSON.stringify(report,null,2)+'\n');console.log(report);
