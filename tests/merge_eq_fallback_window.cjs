'use strict';
// Exercise the real native/worklet bridge at each lifecycle boundary. The
// mock graph preserves connection/gain ownership so an existing-but-muted
// native bank cannot satisfy this regression merely by reporting filters.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(process.argv[2]||path.join(__dirname,'../src/quickrack/equalizer/eq-core.js'),'utf8');

async function scenario(errorAt){
 let now=0,nextId=0,prepareReady,candidate;
 const timers=new Map();
 const param=(value=1)=>({value,cancelScheduledValues(){},cancelAndHoldAtTime(){},setValueAtTime(v){this.value=v},setTargetAtTime(v){this.value=v}});
 const node=(kind='gain')=>({kind,gain:param(),frequency:param(),Q:param(),edges:new Set(),
  connect(target){this.edges.add(target);return target},
  disconnect(target){if(target)this.edges.delete(target);else this.edges.clear()},
  port:{postMessage(){},close(){}}});
 function transfer(start,end,seen=new Set()){
  if(start===end)return 1;
  if(seen.has(start))return 0;
  const next=new Set(seen);next.add(start);
  let total=0;for(const target of start.edges)total+=transfer(target,end,next);
  return total*(start.kind==='gain'?start.gain.value:1);
 }
 const scope={console,localStorage:{getItem:()=>null,setItem(){}},window:{addEventListener(){}},
  requestAnimationFrame:()=>1,
  setTimeout(fn,ms=0){const id=++nextId;timers.set(id,{at:now+ms,fn});return id},clearTimeout(id){timers.delete(id)},
  __XenEqLive:{prepare:()=>new Promise(resolve=>prepareReady=resolve),create:()=>{
   candidate=node('worklet');return {node:candidate,status:{},apply(){},dispose(){candidate.disconnect()}};
  }}};
 vm.runInNewContext(source+'\nglobalThis.eq=__XenEQ;',scope);
 const ctx={state:'running',sampleRate:48000,currentTime:0,createGain:()=>node(),createBiquadFilter:()=>node('filter'),audioWorklet:{},addEventListener(){},removeEventListener(){}};
 scope.eq.set('material:bridge-regression',{mode:'raster',a:Array.from({length:360},(_,i)=>i<180?.5:-.5)});
 const d=scope.eq.create(ctx,'material:bridge-regression');
 assert(d.filterCount>0,'nonflat EQ must create a native fallback bank');
 function advance(ms){const end=now+ms;let iterations=0;
  for(;;){const due=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;
   assert(++iterations<1000,'timer runaway');timers.delete(due[0]);now=due[1].at;due[1].fn();
  }now=end;
 }
 assert.equal(typeof prepareReady,'function','live backend preparation must be registered');
 prepareReady();await Promise.resolve();await Promise.resolve();
 assert(candidate,'worklet candidate was prepared');
 advance(errorAt);
 candidate.onprocessorerror();
 assert.equal(d.backend,'native-fallback');
 assert(transfer(d.input,d.output)>0,`native signal path stayed muted after processor error at ${errorAt} ms`);
 advance(300);
 assert(transfer(d.input,d.output)>0,`delayed bridge cleanup muted recovered native path at ${errorAt} ms`);
 assert(d.filterCount>0,'recovered nonflat EQ still needs its filters');
 d.dispose();
 assert.equal(scope.eq.diagnostics().devices,0,'disposed device remained registered');
 assert.equal(transfer(d.input,d.output),0,'disposed graph still has an audible path');
}
(async()=>{for(const at of [5,80,260])await scenario(at);console.log('PASS EQ processor errors recover audible native paths before, during and after worklet bridge');})().catch(error=>{console.error(error);process.exitCode=1});
