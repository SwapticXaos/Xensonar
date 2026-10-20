'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{load}=require('./offline_runtime.cjs');
const source=fs.readFileSync('src/runtime/instrument/01_voice_gradients_and_effects.js','utf8'),before=fs.readFileSync('docs/forge-smoothness/reference/live-grid-snap.js','utf8');
const a=source.indexOf('const lZ='),line=source.slice(a,source.indexOf('\n',a));
function make(code,frequencies){return new Function('Qa','Zs','Fx','Me','ir',code+';return lZ')(x=>x,x=>x,()=>frequencies,(x,a,b)=>Math.max(a,Math.min(b,x)),10000)}
const list=Array.from({length:2048},(_,i)=>15*Math.pow(2,i/256));let reads=0;
const watched=new Proxy(list,{get(target,key){if(typeof key==='string'&&/^\d+$/.test(key))reads++;return target[key]}}),snap=make(line,watched);const selected=snap(217.731);const cost=reads;assert(list.includes(selected));console.log(JSON.stringify({frequencies:list.length,reads:cost}));
// All supported frequency-distance semantics, including empty grid and lower tie.
for(const frequencies of [[],[55],[55,110,220],[55,55,110],[15,15.001,19,333.333,3500],list]){
 const original=make(before,frequencies),current=make(line,frequencies),cases=[-Infinity,Infinity,NaN,-1,0,55,82.5,165,217.731,10000];
 for(let i=0;i<frequencies.length;i+=Math.max(1,Math.floor(frequencies.length/37))){cases.push(frequencies[i]);if(i+1<frequencies.length)cases.push((frequencies[i]+frequencies[i+1])/2)}
 for(const x of cases)assert(Object.is(current(x),original(x)),JSON.stringify({x,frequencies:frequencies.slice(0,6)}));
}
const h=load(process.cwd());h.context.originalGridSnap=before;
const actual=h.run(`(()=>{const original=new Function('Qa','Zs','Fx','Me','ir',originalGridSnap+';return lZ')(Qa,Zs,Fx,Me,ir);let checks=0;for(const tuning of ['ji','12edo','19edo','31edo','bp'])for(const base of [55,220,440])for(const mutes of [[],[0,2,4,6]])for(let y=-10;y<=ir+10;y+=17){const a=lZ(y,base,tuning,mutes,[0,3,-2]),b=original(y,base,tuning,mutes,[0,3,-2]);if(!Object.is(a,b))throw Error('changed live pitch mapping '+[tuning,base,y,a,b]);checks++}return checks})()`);
console.log('PASS original live cursor/raster mapping for '+actual+' real tuning cases and empty/boundary/midpoint/NaN semantics');
const old=make(before,list),current=make(line,list),points=Array.from({length:1024},(_,i)=>15*Math.pow(2,8*i/1023));
function time(fn){let result=0;const start=performance.now();for(let i=0;i<50000;i++)result+=fn(points[i&1023]);return {milliseconds:performance.now()-start,result}}
const baseline=[],changed=[];for(let i=0;i<5;i++){const pair=i%2?[time(current),time(old)]:[time(old),time(current)];const b=pair[i%2?1:0],c=pair[i%2?0:1];assert.equal(b.result,c.result);baseline.push(b.milliseconds);changed.push(c.milliseconds)}
const median=a=>[...a].sort((x,y)=>x-y)[2];const result={entry:require('../source-manifest.json').entry,sha256:require('../source-manifest.json').sha256,frequencies:list.length,reads:cost,realCases:actual,queriesPerRun:50000,baseline,changed,speedup:median(baseline)/median(changed),scope:'Nearest-frequency lookup within an already compiled live grid; not total audio engine throughput'};
fs.writeFileSync('results/forge-smoothness/live-grid-snap.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));assert(cost<=16,'live snap must inspect logarithmically many prepared frequencies');assert(result.speedup>1.5,'lookup improvement must exceed timing noise');
