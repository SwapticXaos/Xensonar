'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),read=p=>fs.readFileSync(p,'utf8');
const common=read('src/nodal/01_instrument_model.js')+'\n'+read('src/nodal/07_sound_designer.js');
function controller(file){return new Function(common+'\n'+read(file)+';return {model:__XenNodalModel,dsp:__XenNodalDSP,starter:nodalOpenStarter};')();}
function renderer(file){const counts={exp:0,log:0,pow:0,sqrt:0,sin:0,cos:0},math=Object.create(Math);for(const key of Object.keys(counts))math[key]=(...args)=>{counts[key]++;return Math[key](...args);};return {dsp:new Function('Math',read(file)+';return createNodalSynthesisKernel();')(math),counts,clear(){for(const key of Object.keys(counts))counts[key]=0;}};}
const files=['tests/fixtures/p4c2_n3_baseline/02_synthesis_kernel.js','src/nodal/02_synthesis_kernel.js'],controllers=files.map(controller),rows=[];let samples=0;
for(const nodes of [3,7,12])for(const rate of [44100,48000,96000]){
 const raw=controllers[0].starter('hollow'),inst={...raw,material:{...raw.material,follow:.37,register:1},nodes:Array.from({length:nodes},(_,i)=>({...raw.nodes[i%3],id:'n'+i,ratio:1+i*.137}))};
 const plans=controllers.map(c=>c.model.compile(c.model.normalize(inst)));
 const count=Math.min(8,Math.floor(16/(Math.max(plans[0].cost,Math.ceil(nodes/2))*Math.max(1,rate/48000)))),pools=[];
 const frequencies=Array.from({length:count},(_,i)=>plans[0].referenceHz*Math.pow(2,i/17)),packets=controllers.map((c,i)=>structuredClone(c.dsp.preparePacket(plans[i],frequencies,rate,true))),renderers=files.map(renderer);
 for(let i=0;i<2;i++){const r=renderers[i];r.dsp.installPrepared(plans[i],packets[i],rate);r.clear();pools.push(Array.from({length:count},(_,k)=>r.dsp.voice(plans[i],{frequency:frequencies[k],held:true},rate)));}
 assert(Object.values(renderers[0].counts).some(n=>n>0));assert(Object.values(renderers[1].counts).every(n=>n===0),'prepared V2 states must not recompute immutable log/exp/pow/sqrt or seed trigonometry');
 rows.push({nodes,rate,poolStates:count,before:{...renderers[0].counts},after:{...renderers[1].counts}});
 for(let i=0;i<count;i++){const a=new Float32Array(1024),b=new Float32Array(1024),c=new Float32Array(1024),d=new Float32Array(1024);pools[0][i].process(a,b);pools[1][i].process(c,d);assert.deepEqual(c,a);assert.deepEqual(d,b);assert.deepEqual(pools[1][i].snapshot(),pools[0][i].snapshot());samples+=2048;}
 // The new renderer still accepts N3's template/7-array pitch packet. It may
 // calculate missing immutable fields once, preserving the existing protocol.
 const compatible=renderer(files[1]);compatible.dsp.installPrepared(plans[0],packets[0],rate);const legacyVoice=compatible.dsp.voice(plans[0],{},rate),reference=controllers[0].dsp.voice(plans[0],{},rate);
 const a=new Float32Array(2048),b=new Float32Array(2048),c=new Float32Array(2048),d=new Float32Array(2048);legacyVoice.process(a,b);reference.process(c,d);assert.deepEqual(a,c);assert.deepEqual(b,d);samples+=4096;
}
const report={cases:rows.length,channelSamples:samples,scope:'actual V2 state construction after controller/Worker template installation; no sample-path approximations',legacyN3TemplateCompatible:true,rows};fs.writeFileSync('results/p4c2-n4-template-placement.json',JSON.stringify(report,null,2)+'\n');console.log('PASS N4 prepared V2 pool: 9 configurations, no constructor transcendentals, old templates accepted; '+samples+' exact PCM values');
