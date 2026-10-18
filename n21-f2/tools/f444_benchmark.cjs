'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,'src/nodal',n),'utf8');
const shared=read('01_instrument_model.js')+'\n'+read('07_sound_designer.js');
function load(s){return new Function(shared+'\n'+s+';return {dsp:__XenNodalDSP,model:__XenNodalModel,starter:nodalOpenStarter};')();}
const old=load(fs.readFileSync(path.join(root,'tests/fixtures/f444_baseline/02_synthesis_kernel.js'),'utf8')),now=load(read('02_synthesis_kernel.js'));
const median=a=>a.slice().sort((a,b)=>a-b)[Math.floor(a.length/2)],report={hostOnly:true,steady:[],tail:[],onset:[]};
function inst(api,n){const b=api.starter('hollow');return api.model.compile(api.model.normalize({...b,nodes:Array.from({length:n},(_,k)=>({...b.nodes[k%3],id:'p'+k,ratio:1+k*.071}))}));}
function take(api,p,count,tail){const voices=Array.from({length:count},(_,k)=>api.dsp.voice(p,{durationSec:tail?.03:2,frequency:220+k*3})),l=new Float32Array(128),r=new Float32Array(128);for(let b=0;b<(tail?75:32);b++)for(const v of voices)v.process(l,r);const t=performance.now();for(let b=0;b<250;b++)for(const v of voices)v.process(l,r);return performance.now()-t;}
for(const nodes of [1,3,5,7]){
 const p=inst(old,nodes),q=inst(now,nodes);
 for(const tail of [false,true]){
  const a=[],b=[];
  for(let k=0;k<6;k++){if(k%2){b.push(take(now,q,2,tail));a.push(take(old,p,2,tail));}else{a.push(take(old,p,2,tail));b.push(take(now,q,2,tail));}}
  const record={nodes,voices:2,audioMs:250*128/48,beforeMs:median(a),afterMs:median(b),beforeRuns:a,afterRuns:b};record.changePercent=(record.afterMs/record.beforeMs-1)*100;
  (tail?report.tail:report.steady).push(record);console.log(tail?'tail':'steady',nodes,record.beforeMs.toFixed(2),'->',record.afterMs.toFixed(2),'ms',record.changePercent.toFixed(1)+'%');
 }
 const a=[],b=[],v=now.dsp.voice(q,{});
 for(let k=0;k<6;k++){
  let t=performance.now();for(let j=0;j<2000;j++)old.dsp.voice(p,{frequency:220+j%24});a.push(performance.now()-t);
  t=performance.now();for(let j=0;j<2000;j++)v.reset({frequency:220+j%24});b.push(performance.now()-t);
 }
 report.onset.push({nodes,notes:2000,beforeMs:median(a),afterMs:median(b),beforeRuns:a,afterRuns:b});
}
fs.writeFileSync(path.join(root,'results/f444-benchmark.json'),JSON.stringify(report,null,2)+'\n');
