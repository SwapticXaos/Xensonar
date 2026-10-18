'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const model=fs.readFileSync('src/nodal/01_instrument_model.js','utf8');
function load(file){
 const calls={exp:0,cos:0,sqrt:0},math=new Proxy(Math,{get(o,k){return k in calls?(...a)=>{calls[k]++;return o[k](...a);}:o[k];}});
 const api=vm.runInNewContext(model+'\n'+fs.readFileSync(file,'utf8')+'\n({model:__XenNodalModel,dsp:__XenNodalDSP})',{Math:math,Float32Array,Float64Array,Uint32Array,Int8Array,Map,Set});
 return {api,calls};
}
const before=load('tests/fixtures/p3c_d4_baseline/02_synthesis_kernel.js'),after=load('src/nodal/02_synthesis_kernel.js');
let samples=0,cases=0;
for(const count of [1,3,7,12])for(const kind of ['tone','breath','impulse'])for(const nonlinear of [false,true])for(const sr of [32000,44100,48000,96000]){
 const raw={schema:'xensonar.nodal-instrument',schemaVersion:1,kernelVersion:'coupled-modal-v1',name:'D5 parity',seed:17,referenceHz:220,
  nodes:Array.from({length:count},(_,i)=>({id:'node-'+i,role:nonlinear?(i%2?'drive':'fold'):'resonator',x:.1+i*.06,y:.4,ratio:1+i*.15,cents:0,radius:.25,strength:1,excitation:.7})),
  excitation:{kind,level:.7},coupling:.12,articulation:{durationSec:.05,attackSec:.002,releaseSec:.02}};
 const p=before.api.model.compile(before.api.model.normalize(raw)),q=after.api.model.compile(after.api.model.normalize(raw));
 assert.equal(q.cost,p.cost,'Admission cost must remain unchanged');
 const opts={frequency:117.321,held:true,gain:.4,velocity:.8};
 const a=before.api.dsp.voice(p,opts,sr),b=after.api.dsp.voice(q,opts,sr);
 function compare(frames,label){const x=new Float32Array(frames),y=new Float32Array(frames),r=new Float32Array(frames),s=new Float32Array(frames);a.process(x,r);b.process(y,s);assert.deepEqual(y,x,label);assert.deepEqual(s,r,label+' right');if(label==='attack')assert(x.some(v=>v!==0),'Parity must exercise audible PCM');samples+=frames*2;}
 compare(512,'attack');a.setFrequency(554.37);b.setFrequency(554.37);compare(512,'glide');a.noteOff();b.noteOff();compare(Math.ceil(sr*.025),'release');assert.equal(a.ended,b.ended);assert.deepEqual(JSON.parse(JSON.stringify(b.snapshot())),JSON.parse(JSON.stringify(a.snapshot())));
 // Pool reset with a different seed must rebuild cached attack phase values.
 for(const seed of [37,17]){a.reset({...opts,seed,pitchCurve:[0,2,-1],volumeCurve:[0,1,.3]});b.reset({...opts,seed,pitchCurve:[0,2,-1],volumeCurve:[0,1,.3]});compare(256,'reset '+seed);}
 cases++;
}
// Coefficient cosines remain necessary during glides; only fixed attack cosines disappear.
for(const [op,ratio] of [['exp',.8],['cos',.9],['sqrt',.2]])assert(after.calls[op]<before.calls[op]*ratio,`${op} redundant work remains: ${before.calls[op]} -> ${after.calls[op]}`);
console.log(JSON.stringify({result:'PASS',cases,samples,before:before.calls,after:after.calls},null,2));
