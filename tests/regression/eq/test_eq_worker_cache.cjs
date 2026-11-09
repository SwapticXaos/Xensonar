'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const code=fs.readFileSync(path.resolve(__dirname,'../../../src/quickrack/equalizer/eq-core.js'),'utf8');
let source='',posted=0,active=0,maxActive=0;
class B { constructor(parts){this.src=parts.join('')} }
const context={self:{},console,Float32Array,Float64Array,setTimeout,clearTimeout,Math,Number,Array,Object,Map,Set,WeakMap,WeakSet,JSON};
class W {
 constructor(url){source=url;this.vm=vm.createContext({...context,self:{postMessage:r=>{setTimeout(()=>{active--;this.onmessage({data:r})},0)}}});vm.runInContext(source,this.vm);}
 postMessage(job){if(job.cancel===undefined){posted++;active++;maxActive=Math.max(maxActive,active)}setTimeout(()=>this.vm.self.onmessage({data:job}),0)}
 terminate(){}
}
const s={localStorage:{getItem:()=>null,setItem(){}},window:{addEventListener(){}},requestAnimationFrame:()=>1,Worker:W,Blob:B,URL:{createObjectURL(blob){return blob.src},revokeObjectURL(){}},console,Math,Number,Array,Object,Set,WeakMap,WeakSet,Map,Date,setTimeout,clearTimeout};
vm.runInNewContext(code+'\nglobalThis.eq=__XenEQ;',s);const eq=s.eq;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const key='material:worker-test';
const c=Array.from({length:360},(_,i)=>i<100?1:i<180?-1:i<260?.5:-.6);
async function main(){
 eq.set(key,{mode:'adaptive',bands:12,a:c,b:c});
 const cfg=eq.get(key);
 const first=eq.livePlan(cfg,48000,key);
 assert.equal(first.provisional,true,'must return instant nonblocking preview');
 assert.equal(posted,0,'fit is debounced');
 const events=[];
 function param(label){return {value:0,setTargetAtTime(v){this.value=v;events.push(label)},cancelScheduledValues(){},cancelAndHoldAtTime(){}}}
 function gain(){return {gain:param('base'),connect(){},disconnect(){}}}
 function biquad(){return {frequency:param('frequency'),Q:param('Q'),gain:param('gain'),connect(){},disconnect(){}}}
 const ctx={state:'running',sampleRate:48000,currentTime:0,createGain:gain,createBiquadFilter:biquad,addEventListener(){},removeEventListener(){}};
 const device=eq.create(ctx,key);
 assert.equal(device.filterCount,12);
 // Rapid gestures (including an identical repeated get) should be coalesced.
 eq.set(key,{morph:.1});eq.livePlan(eq.get(key),48000,key);
 eq.set(key,{morph:.2});eq.livePlan(eq.get(key),48000,key);
 await sleep(900);
 assert.equal(posted,1,'debounced requests for one source should yield one completed fit');
 assert.equal(maxActive,1,'fit queue must remain single flight');
 const final=eq.livePlan(eq.get(key),48000,key);
 assert.equal(final.provisional,undefined,'worker result must replace preview');
 assert.ok(Number.isFinite(final.fitError),'must include real fit error');
 events.length=0;
 eq.refresh();
 assert.ok(events.length>0,'completed fit must be applied to the audio device even when cfg reference did not change');
 assert.ok(eq.diagnostics().fitCache>=1,'finished fit cached for reuse');
 const before=posted;
 eq.set(key,{morph:.1});
 const readyBefore=eq.livePlan(eq.get(key),48000,key);
 await sleep(450);
 eq.set(key,{morph:.2});
 const readyAgain=eq.livePlan(eq.get(key),48000,key);
 assert.equal(readyAgain.provisional,undefined,'cache hit should return ready result without wait');
 assert.equal(posted,before+1,'only uncached morph should dispatch');
 device.dispose();console.log('PASS EQ worker caching, async audio refresh, debounce, reuse');
}
main().catch(e=>{console.error(e);process.exitCode=1});
