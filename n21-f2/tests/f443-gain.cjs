'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
function make(baseline){let logs=0;const math=Object.create(Math);math.log=v=>{logs++;return Math.log(v)};const ctx=vm.createContext({Math:math,Float32Array,Float64Array,DOMException,setTimeout});const file=(baseline?'tests/fixtures/f442_forge_baseline/':'')+'src/forge/dsp/01_material_tools.js';vm.runInContext(fs.readFileSync(path.join(root,file),'utf8')+';globalThis.tools=__forgeMaterialToolsFactory();',ctx);return{tools:ctx.tools,logs:()=>logs};}
const old=make(true),next=make(false);assert.equal(typeof next.tools.gainAt,'function','gain-only entry missing');
let checked=0;
for(const count of [1,2,7,33,121])for(const length of [1,2,31,16000]){
 const gainCurve=Float64Array.from({length:count},(_,i)=>i%5===0?0:i%3===0?Number.MIN_VALUE:.7+i*.001),carrier={rootReferenceHz:173,bands:[{gainCurve,centerRatioCurve:Float64Array.from({length:count},(_,i)=>Math.exp(i*.014))}]};
 for(const sample of [-1,0,.001,.5,1,2,7,15,length/3,length-1,length,length+100]){
  const a=old.tools.control(carrier,0,sample,length),b=next.tools.control(carrier,0,sample,length),gain=next.tools.gainAt(carrier,0,sample,length);
  assert.equal(gain,a?.gain??null);assert.deepEqual(b?{...b}:null,a?{...a}:null);checked++;
 }
}
const carrier={rootReferenceHz:220,bands:[{gainCurve:new Float32Array(121).fill(.6),centerRatioCurve:Float64Array.from({length:121},(_,i)=>1+i*.005)}]};
const before=next.logs();for(let i=0;i<10000;i++)next.tools.gainAt(carrier,0,i,10000);assert.equal(next.logs(),before,'gain-only loop must not calculate unused log pitch');
function bench(fn){let sum=0;const start=performance.now();for(let i=0;i<200000;i++)sum+=fn(carrier,0,i%48000,48000);return{ms:performance.now()-start,sum};}
const times=[[],[]];for(let run=-1;run<5;run++)for(const idx of run%2?[0,1]:[1,0]){const r=bench(idx?next.tools.gainAt:(...args)=>old.tools.control(...args).gain);if(run>=0)times[idx].push(r.ms)}
const median=a=>[...a].sort((a,b)=>a-b)[2],report={checked,unusedPitchLogs:0,oldMedianMs:median(times[0]),newMedianMs:median(times[1]),times,scope:'gain sampling microbenchmark only; not full render'};
fs.writeFileSync(path.join(root,'results/f443-gain.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
