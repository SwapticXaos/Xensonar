'use strict';
const assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm'), path=require('node:path'), {performance}=require('node:perf_hooks');
const code=fs.readFileSync(path.resolve(__dirname,'../../../src/quickrack/equalizer/eq-core.js'),'utf8');
const global={localStorage:{getItem:()=>null,setItem:()=>{}},window:{addEventListener(){}},requestAnimationFrame:()=>1,clearTimeout,setTimeout,console,Math,Number,Array,Object,JSON,Set,WeakMap,WeakSet,Date,Map};
vm.runInNewContext(code+'\nglobalThis.eq=__XenEQ;',global);const eq=global.eq;
let seed=1234567;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32};
const failures=[],metrics=[];
for(const mode of ['raster','adaptive'])for(const rate of [22050,44100,48000,96000])for(const bands of [4,12,24])for(let run=0;run<4;run++){
 const make=()=>Array.from({length:360},(_,i)=>{
   const k=Math.min(bands-1,Math.floor(i/359*bands));
   // alternating, ramps, peaks and random bounded curves
   const values=run===0?(k%2?-1:1):run===1?(k%4<2?1:-1):run===2?(k===Math.floor(bands*.4)?1:-.8):(Math.floor(k/2)%4===0?1:rand()*2-1);
   return values;
 });
 const cfg=eq.clean({...eq.neutral(),mode,bands,a:make(),b:make(),morph:rand(),low:-36,high:12});
 const start=performance.now(),p=eq.plan(cfg,rate),dt=performance.now()-start;
 const r=eq.response(cfg,rate,1200,p),min=Math.min(...r),max=Math.max(...r),finite=p.filters.every(f=>[f.frequency,f.q,f.gain].every(Number.isFinite)) && r.every(Number.isFinite);
 assert.ok(finite,`non-finite filter ${mode} ${rate} ${bands}`);
 assert.ok(p.filters.length===24,'must allocate bounded filters');
 assert.ok(p.filters.every(f=>f.frequency<rate/2),'invalid Nyquist');
 const center=mode==='raster'?p.bandError:undefined;
 if(center!=null && center>1)failures.push({mode,rate,bands,run,center});
 metrics.push({mode,rate,bands,run,dt,min,max,center,rmse:p.fitError});
}
function summary(mode,bands){const a=metrics.filter(x=>x.mode===mode&&x.bands===bands);return {mode,bands,maxMs:Math.max(...a.map(x=>x.dt)).toFixed(1),meanMs:(a.reduce((s,x)=>s+x.dt,0)/a.length).toFixed(1),largestCenterError:Math.max(...a.map(x=>x.center??0)).toFixed(3),maxBoost:Math.max(...a.map(x=>x.max)).toFixed(1),minCut:Math.min(...a.map(x=>x.min)).toFixed(1)};}
console.log(JSON.stringify({cases:metrics.length,thresholdExceedances:failures,summary:['raster','adaptive'].flatMap(m=>[4,12,24].map(b=>summary(m,b)))},null,2));
