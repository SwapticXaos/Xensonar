'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../src/forge/dsp/08_pure_dieter_worker.js'),'utf8');
const workers=[];
class FakeWorker{constructor(){this.terminated=false;workers.push(this)} postMessage(message){this.message=message} terminate(){this.terminated=true}}
const fakeFn=function noop(){};
const env={
 Ar:10,JNe:16,ZNe:32,e5e:24,t5e:64,n5e:32768,
 hs:fakeFn,mNe:fakeFn,lx:fakeFn,__fSpeed2OfflineWaveform:fakeFn,r5e:fakeFn,a5e:fakeFn,o5e:fakeFn,
 __Fractalia:{core:{fft:fakeFn}},URL:{createObjectURL:()=> 'blob:fake'},Blob,
 Worker:FakeWorker,Float32Array,DOMException,setInterval,clearInterval,setTimeout,clearTimeout,Math,Error
};
vm.createContext(env);vm.runInContext(source+'\nglobalThis.PureDieterTest=__PureDieter;',env);
const renderer=env.PureDieterTest;
const grid={width:2,height:2,data:new Float32Array([0,.3,.6,0]),grainData:new Float32Array(4)};
const context={sampleRate:8000,createBuffer:(ch,n,rate)=>{const pcm=new Float32Array(n);return {copyToChannel:data=>pcm.set(data),getChannelData:()=>pcm,sampleRate:rate}}};
const mix={sine:1,sawtooth:0,square:0,triangle:0};
(async()=>{
 const first=renderer.render({grid,mode:'additive',mix,durationSec:.02,context});
 assert.equal(workers[0].message.mode,'additive');assert.deepEqual(workers[0].message.mix,mix);
 assert.equal(renderer.pending(),true);
 const second=renderer.render({grid,mode:'granular',mix,durationSec:.02,context});
 await assert.rejects(first,e=>e.name==='AbortError');
 assert.equal(workers[0].terminated,true,'superseded worker should terminate');
 assert.equal(workers[1].message.mode,'granular');
 renderer.cancel();await assert.rejects(second,e=>e.name==='AbortError');
 assert.equal(workers[1].terminated,true);
 assert.equal(renderer.pending(),false);
 const third=renderer.render({grid,mode:'glyph',mix,durationSec:.02,context});
 workers[2].onmessage({data:{pcm:new Float32Array([.5,-.5])}});
 const result=await third;assert.deepEqual(Array.from(result.getChannelData(0)),[.5,-.5]);
 assert.equal(workers[2].terminated,true);assert.equal(renderer.pending(),false);
 assert.equal(workers.length,3);
 console.log('PASS Worker inputs contain chosen modes/mixes; superseding render, cancel and completion terminate Worker');
})().catch(e=>{console.error(e);process.exitCode=1});
