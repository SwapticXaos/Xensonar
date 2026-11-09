'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../src/quickrack/equalizer/eq-core.js'),'utf8');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const submitted=[];
class WorkerStub{constructor(){this.onmessage=null;this.onerror=null;}postMessage(m){submitted.push(m);}terminate(){}}
const scope={localStorage:{getItem:()=>null,setItem(){}},window:{addEventListener(){}},
 requestAnimationFrame:()=>1,setTimeout,clearTimeout,console,Blob,
 URL:{createObjectURL:()=> 'blob:eq-morph-test',revokeObjectURL(){}},Worker:WorkerStub};
vm.runInNewContext(source+'\nglobalThis.testEq=__XenEQ',scope);
const eq=scope.testEq;
const signal=Array.from({length:360},(_,i)=>Math.sin(i/9)*.7+.05);
(async()=>{
 const key='material:morph-priority-p0';
 eq.set(key,{mode:'adaptive',a:signal,b:signal.map((v,i)=>-v*.6+Math.sin(i/24)*.1)});
 eq.startGesture(key,'morph');
 for(let i=0;i<6;i++){
  eq.set(key,{morph:(i+1)/8});
  const cfg=eq.get(key),result=eq.livePlan(cfg,48000,key);
  assert.equal(result.provisional,true,'a live morph should use a cheap provisional plan');
  assert.equal(eq.diagnostics().fitQueued,0,'morph must not queue expensive optimizer');
 }
 await sleep(180); // >125ms normal Worker debounce: held gesture must still prohibit it
 assert.equal(submitted.filter(m=>m.cfg).length,0,'Worker fit must not start while slider is held');
 eq.endGesture(key);
 assert.equal(eq.diagnostics().morphHotKeys,0,'morph hold must release on pointerup');
 const snapshot=eq.get(key);
 eq.livePlan(snapshot,48000,key);
 await sleep(155);
 assert.equal(submitted.filter(m=>m.cfg).length,1,'exactly one final adaptive fit should be queued');
 assert.equal(submitted.find(m=>m.cfg)?.cfg.morph,.75,'settled fit must receive last slider value');
 // Equivalent raster preview and audio filter banks must remain calibrated.
 const rk='material:raster-p0';eq.set(rk,{mode:'raster',a:signal,b:signal.map(v=>-v)});
 eq.startGesture(rk,'morph');eq.set(rk,{morph:.52});
 const rCfg=eq.get(rk),aud=eq.livePlan(rCfg,44100,rk),vis=eq.peekPlan(rCfg,44100,rk);
 assert.equal(aud.provisional,false,'raster must retain calibrated banks');
 assert.equal(JSON.stringify(aud.filters),JSON.stringify(vis.filters),'raster preview and audio filters diverged');
 eq.endGesture(rk);
 console.log('PASS EQ morph-priority P0: no Worker fit during gesture, one post-settle fit, raster parity');
})().catch(e=>{console.error(e);process.exitCode=1});
