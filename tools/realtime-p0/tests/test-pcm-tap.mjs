import assert from 'node:assert/strict';
import {tapWire,processor} from './pcm-test-support.mjs';
import {P0_TAP_BYTES,P0_TAP_PROTOCOL} from '../web/p0-pcm-contract.js';
const results=[];
async function check(id,fn){results.push({id,pass:true,...await fn()});}
await check('P01-real-transfer-exact-and-block-profiles',async()=>{
 for(const size of [64,128,256]){const w=tapWire(),t=w.c.startCapture(64,5000);w.pump();while(w.frame<5200){w.render(size);w.pump();}const done=await t.done;
  assert.equal(done.validation.frameExact,true);assert.equal(done.validation.receivedFrames,5000);assert.equal(w.c.takes.size,0);
  for(let i=0;i<5000;i++){assert.equal(done.data[2*i],Math.fround(((i+64)%101)/202));assert.equal(done.data[2*i+1],Math.fround(-((i+64)%101)/202));}
 }return {framesPerTake:5000,actualTransferDetachment:true};
});
await check('P02-16-slot-overflow-and-passthrough',async()=>{
 const w=tapWire(),t=w.c.startCapture(0,90000);w.pump();w.c.holdBufferReturns(true);
 while(w.frame<80000){w.render();w.pump();}assert.equal(w.p.slots.filter(x=>x?.state===3).length,16);
 const ownedBefore=w.p.slots.slice();w.raw({kind:'pool-init',buffers:Array.from({length:16},(_,bufferId)=>({bufferId,buffer:new ArrayBuffer(P0_TAP_BYTES)}))});assert.deepEqual(w.p.slots,ownedBefore);
 w.c.holdBufferReturns(false);w.pump();while(w.frame<90100){w.render();w.pump();}const done=await t.done;
 assert.equal(done.validation.integrity,true);assert.equal(done.validation.frameExact,false);assert.ok(done.validation.gapFrames>0);assert.equal(done.end.poolDroppedFrames,done.validation.gapFrames);
 assert.ok(done.data.subarray(82000*2).some(x=>x!==0));return {captured:done.end.capturedFrames,dropped:done.end.droppedFrames,registeredSlots:w.p.poolSize};
});
await check('P03-clock-gap-has-correct-position',async()=>{
 const w=tapWire(),t=w.c.startCapture(0,1000);w.pump();w.render();w.pump();w.frame+=128;while(w.frame<1100){w.render();w.pump();}
 const done=await t.done;assert.equal(done.validation.frameExact,false);assert.equal(done.end.timelineGapFrames,128);assert.equal(done.validation.gapFrames,128);assert.equal(done.chunks[0].frames,128);assert.equal(done.chunks[1].firstFrame,256);
});
await check('P04-clock-overlap-rejected',async()=>{
 const w=tapWire(),t=w.c.startCapture(0,1000);w.pump();w.render();w.frame=0;while(w.frame<1100){w.render();w.pump();}
 const done=await t.done;assert.equal(done.validation.frameExact,false);assert.equal(done.end.timelineOverlapFrames,128);
});
await check('P05-no-PCM-view-allocation-in-process',async()=>{
 const w=tapWire(),t=w.c.startCapture(0,9000);w.pump();const Original=Float32Array;
 const l=new Original(128),r=new Original(128),out=[[new Original(128),new Original(128)]];
 globalThis.Float32Array=new Proxy(Original,{construct(){throw new Error('view allocation inside process');}});
 try{for(let f=0;f<9200;f+=128){globalThis.currentFrame=f;w.p.process([[l,r]],out);}}finally{globalThis.Float32Array=Original;}
 w.pump();assert.equal((await t.done).validation.frameExact,true);
});
await check('P06-single-capture-replay-and-loan-fencing',async()=>{
 const w=tapWire(),t=w.c.startCapture(0,5000);w.pump();
 w.raw({kind:'capture-start',captureId:2,startFrame:0,frameCount:5000});assert.ok(w.ba.some(m=>m.kind==='capture-rejected'&&m.reason==='capture-busy'));
 while(w.frame<5200){w.render();w.pump();}await t.done;
 w.raw({kind:'capture-start',captureId:1,startFrame:w.frame,frameCount:5000});assert.ok(w.ba.some(m=>m.kind==='capture-rejected'&&m.reason==='capture-id'));
 const slot=w.p.slots[0],view=slot.view;w.raw({kind:'buffer-return',bufferId:0,bufferGeneration:slot.generation,buffer:new ArrayBuffer(P0_TAP_BYTES)});assert.equal(slot.view,view);
});
await check('P07-monitor-branch-zero-output-captures-original',async()=>{const w=tapWire(48000,true),t=w.c.startCapture(0,16);w.pump();w.render();w.pump();const d=await t.done;assert.equal(d.validation.frameExact,true);assert.ok(d.data.some(x=>x!==0));});
console.log(JSON.stringify({pass:true,scope:'Tap with real structuredClone transfers, simulated AudioWorklet/render callbacks; no browser proof',results},null,2));
