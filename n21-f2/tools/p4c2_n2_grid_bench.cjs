'use strict';
const fs=require('node:fs'),{performance}=require('node:perf_hooks'),read=p=>fs.readFileSync(p,'utf8');
const common=read('src/nodal/01_instrument_model.js')+'\n'+read('src/nodal/07_sound_designer.js');
const load=file=>new Function(common+'\n'+read(file)+';return {model:__XenNodalModel,dsp:__XenNodalDSP,starter:nodalOpenStarter};')();
const apis=[load('tests/fixtures/p4c2_n1_nodal_baseline/02_synthesis_kernel.js'),load('src/nodal/02_synthesis_kernel.js')],rows=[],median=a=>a.slice().sort((a,b)=>a-b)[Math.floor(a.length/2)];
for(const version of [1,2])for(const nodes of [3,7])for(const mode of ['grid128','unknown128','alreadyWarm16']){
 const grid=Array.from({length:128},(_,i)=>61.381+i*2.3181),frequencies=mode==='unknown128'?grid.map(hz=>hz+.00137):mode==='alreadyWarm16'?grid.slice(0,16):grid;
 let coefficientBytes=0;
 const voices=apis.map((api,index)=>{const raw=api.starter('hollow'),instrument=api.model.normalize({...raw,schemaVersion:version,kernelVersion:'coupled-modal-v'+version,nodes:Array.from({length:nodes},(_,i)=>({...raw.nodes[i%3],id:'n'+i,ratio:1+i*.073}))}),plan=api.model.compile(instrument);
  api.dsp.preparePitches(plan,mode==='alreadyWarm16'?frequencies:[220],48000);
  if(index===1)for(let i=0;i<grid.length;i+=16){const packet=api.dsp.preparePacket(plan,grid.slice(i,i+16),48000,false,'grid');coefficientBytes+=packet.pitches.reduce((sum,p)=>sum+p.arrays.reduce((n,a)=>n+a.byteLength,0),0);}
  return api.dsp.voice(plan,{},48000);
 });
 const timings=[[],[]],options=frequencies.map(frequency=>({frequency,held:true,gain:.2,seed:4711}));
 function run(index){const start=performance.now();for(let k=0;k<16000;k++)voices[index].reset(options[k%options.length]);return performance.now()-start;}
 for(let round=0;round<9;round++)for(const index of round%2?[1,0]:[0,1]){const ms=run(index);if(round>=2)timings[index].push(ms);}
 const baseline=median(timings[0]),prepared=median(timings[1]);rows.push({version,nodes,mode,resetCount:16000,baselineMs:baseline,preparedMs:prepared,changePercent:100*(prepared/baseline-1),gridCoefficientBytes128:coefficientBytes,runs:timings});
}
const report={scope:'Node '+process.version+'; CPU time for reset only, alternating order with warmup. Does not measure sustained polyphony, browser render deadlines, mix, device or audible bursts. A prepared grid reduces start work; it does not remove per-sample modal synthesis.',rows};
fs.writeFileSync('results/p4c2-n2-grid-bench.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
