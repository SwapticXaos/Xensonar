'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),read=p=>fs.readFileSync(p,'utf8');
function engine(file){const work={cos:0,sin:0,tan:0,pow:0},math=Object.create(Math);for(const key of Object.keys(work))math[key]=(...args)=>{work[key]++;return Math[key](...args);};const api=new Function('Math',read('src/nodal/01_instrument_model.js')+'\n'+read(file)+'\n'+read('src/nodal/07_sound_designer.js')+';return {dsp:__XenNodalDSP,model:__XenNodalModel,starter:nodalOpenStarter};')(math);return{...api,work,clear(){for(const k of Object.keys(work))work[k]=0;},trigs(){return work.cos+work.sin+work.tan;}};}
const before=engine('tests/fixtures/p4c2_n1_nodal_baseline/02_synthesis_kernel.js'),now=engine('src/nodal/02_synthesis_kernel.js');
let samples=0,starts=0,coldTrigs=0,warmTrigs=0,seedTrigs=0;
for(const version of [1,2])for(const rate of [44100,48000,96000]){
 const raw=now.starter('hollow'),instrument=now.model.normalize({...raw,schemaVersion:version,kernelVersion:'coupled-modal-v'+version}),plan=now.model.compile(instrument);
 // Separate preparer models a Worker; renderer only installs the small packets.
 const preparer=new Function(read('src/nodal/02_synthesis_kernel.js')+';return createNodalSynthesisKernel();')();
 const dynamic=Array.from({length:32},(_,i)=>180+i*2.719),grid=Array.from({length:320},(_,i)=>49.312+i*3.17131);
 now.dsp.installPrepared(plan,preparer.preparePacket(plan,dynamic,rate,true),rate);
 for(let i=0;i<grid.length;i+=16)now.dsp.installPrepared(plan,preparer.preparePacket(plan,grid.slice(i,i+16),rate,false,'grid'),rate);
 const live=now.dsp.voice(plan,{},rate),reference=before.dsp.voice(plan,{},rate),seed=version===1?plan.nodes.length:0;
 for(const hz of [...grid,...dynamic]){
  const options={frequency:hz,gain:.3,velocity:.63,held:true,seed:instrument.seed};
  now.clear();before.clear();live.reset(options);reference.reset(options);assert.equal(now.trigs(),seed,'grid cannot evict particle bank, or older raster entries');
  coldTrigs+=before.trigs();warmTrigs+=now.trigs();seedTrigs+=seed;starts++;
  const buffers=Array.from({length:4},()=>new Float32Array(512));live.process(buffers[0],buffers[1],0,256);reference.process(buffers[2],buffers[3],0,256);live.setFrequency(hz*1.071);reference.setFrequency(hz*1.071);live.noteOff();reference.noteOff();live.process(buffers[0],buffers[1],256,256);reference.process(buffers[2],buffers[3],256,256);assert.deepEqual(buffers[0],buffers[2]);assert.deepEqual(buffers[1],buffers[3]);samples+=1024;
 }
 for(const options of [{frequency:713.1287,held:true},{frequency:grid[7],held:true,pitchCurve:[.13,-.04,.21],seed:9137}]){
  now.clear();live.reset(options);reference.reset(options);assert(now.trigs()>seed,'unpredicted or custom contour keeps ordinary DSP');
  const a=new Float32Array(512),b=new Float32Array(512),c=new Float32Array(512),d=new Float32Array(512);live.process(a,b);reference.process(c,d);assert.deepEqual(a,c);assert.deepEqual(b,d);samples+=1024;
 }
 now.dsp.installPrepared(plan,{bank:'grid',pitches:[],removeFrequencies:[grid[3]]},rate);now.clear();live.reset({frequency:grid[3]});assert(now.trigs()>seed,'obsolete grid coefficient removed');now.clear();live.reset({frequency:dynamic[0]});assert.equal(now.trigs(),seed,'pruning grid does not remove dynamic particles');
 const other=rate===44100?48000:44100;now.clear();now.dsp.voice(plan,{frequency:grid[2]},other);assert(now.trigs()>seed,'sample rates never share coefficients');
}
const report={preparedStarts:starts,channelSamples:samples,baselineResetTrigonometry:coldTrigs,preparedResetTrigonometry:warmTrigs,retainedV1SeedTrigonometry:seedTrigs,preparedPitchTrigonometry:warmTrigs-seedTrigs,gridEntriesPerPlan:320,dynamicParticleEntries:32,pcm:'bit-identical to P4C2-N1; gliss, custom contour, unknown frequency and release included'};
fs.writeFileSync('results/p4c2-n2-grid-bank.json',JSON.stringify(report,null,2)+'\n');console.log('PASS N2 grid bank',report);
