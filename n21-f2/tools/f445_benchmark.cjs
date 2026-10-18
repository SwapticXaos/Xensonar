'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const shared=read('src/nodal/01_instrument_model.js')+'\n'+read('src/nodal/07_sound_designer.js');
const oldSource=read('tests/fixtures/f445_baseline/02_synthesis_kernel.js');
assert.equal(crypto.createHash('sha256').update(oldSource).digest('hex'),require('../tests/fixtures/f445_parent_hashes.json').files['src/nodal/02_synthesis_kernel.js']);
const load=s=>new Function(shared+'\n'+s+';return {dsp:__XenNodalDSP,model:__XenNodalModel,starter:nodalOpenStarter};')();
const old=load(oldSource),now=load(read('src/nodal/02_synthesis_kernel.js')),median=a=>a.slice().sort((a,b)=>a-b)[Math.floor(a.length/2)];
function plan(nodes){const b=now.starter('hollow');return now.model.compile(now.model.normalize({...b,nodes:Array.from({length:nodes},(_,k)=>({...b.nodes[k%3],id:'n'+k,ratio:1+k*.071}))}));}
const report={scope:'Node/V8 on this host; excludes browser/device scheduling, global lanes and full mix; no dropout guarantee',capacity:[],onset:[]};
for(const nodes of [1,3,7,12])for(const tail of [false,true]){
 const p=plan(nodes),count=Math.min(32,Math.floor(16/(p.cost*(tail?.5:1)))),times=[];
 for(let run=0;run<3;run++){
  const voices=Array.from({length:count},(_,k)=>now.dsp.voice(p,{frequency:220+k*.123,durationSec:tail?.025:1},48000)),l=new Float32Array(128),r=new Float32Array(128);
  for(let b=0;b<(tail?90:16);b++)for(const v of voices)v.process(l,r);
  const start=performance.now();for(let b=0;b<188;b++){l.fill(0);r.fill(0);for(const v of voices)v.process(l,r);}times.push(performance.now()-start);
 }
 const audioMs=188*128/48;report.capacity.push({nodes,voices:count,phase:tail?'natural tail':'full voice',audioMs,hostMs:median(times),runs:times,realtimeFraction:median(times)/audioMs});
}
for(const nodes of [3,7,12]){
 const p=plan(nodes),a=old.dsp.voice(p,{}),b=now.dsp.voice(p,{}),frequencies=Array.from({length:16},(_,i)=>110*Math.pow(2,i/12)),before=[],after=[];
 now.dsp.preparePitches(p,frequencies,48000);
 function take(v){const start=performance.now();for(let k=0;k<5000;k++)v.reset({frequency:frequencies[k%16]});return performance.now()-start;}
 for(let run=0;run<6;run++){if(run%2){after.push(take(b));before.push(take(a));}else{before.push(take(a));after.push(take(b));}}
 report.onset.push({nodes,resets:5000,beforeF444Ms:median(before),preparedF445Ms:median(after),beforeRuns:before,afterRuns:after});
}
fs.writeFileSync(path.join(root,'results/f445-benchmark.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
