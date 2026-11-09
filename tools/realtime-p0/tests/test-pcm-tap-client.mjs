import assert from 'node:assert/strict';
import {tapWire} from './pcm-test-support.mjs';
import {P0_TAP_PROTOCOL,P0_TAP_BYTES} from '../web/p0-pcm-contract.js';
const results=[];
async function check(id,fn){results.push({id,pass:true,...await fn()});}
function sampleChunk(w,changes={}){return {...w.scope,protocol:P0_TAP_PROTOCOL,kind:'pcm-chunk',bufferId:0,bufferGeneration:1,captureId:1,sequence:1,firstFrame:0,frames:16,sampleRate:48000,channels:2,buffer:new ArrayBuffer(P0_TAP_BYTES),...changes};}
function end(w,changes={}){return {...w.scope,protocol:P0_TAP_PROTOCOL,kind:'capture-end',captureId:1,startFrame:0,endFrame:16,expectedFrames:16,sampleRate:48000,channels:2,capturedFrames:16,droppedFrames:0,poolDroppedFrames:0,timelineGapFrames:0,timelineOverlapFrames:0,formatErrorFrames:0,nonfiniteFrames:0,chunks:1,aborted:false,...changes};}
await check('C01-wrong-rate-channels-and-end-counters',async()=>{
 for(const mutation of [{sampleRate:96000},{channels:1},{sequence:2}]){const w=tapWire(),t=w.c.startCapture(0,16);w.pump();w.c.handle(sampleChunk(w,mutation));w.c.handle(end(w));assert.equal((await t.done).validation.frameExact,false);}
 for(const mutation of [{capturedFrames:0},{startFrame:1},{expectedFrames:15},{chunks:8},{aborted:true}]){const w=tapWire(),t=w.c.startCapture(0,16);w.pump();w.c.handle(sampleChunk(w));w.c.handle(end(w,mutation));assert.equal((await t.done).validation.frameExact,false);}
});
await check('C02-completed-take-cannot-change',async()=>{
 const w=tapWire(),t=w.c.startCapture(0,16);w.pump();w.render();w.pump();const done=await t.done,copy=done.data.slice();
 const b=new ArrayBuffer(P0_TAP_BYTES);new Float32Array(b).fill(.75);w.c.handle(sampleChunk(w,{bufferGeneration:2,buffer:b}));assert.deepEqual(done.data,copy);assert.equal(w.c.takes.size,0);
});
await check('C03-active-count-size-and-cancel-bounds',async()=>{
 const w=tapWire();assert.throws(()=>w.c.startCapture(0,480001));const t=w.c.startCapture(0,16);assert.throws(()=>w.c.startCapture(0,16));assert.equal(w.c.takes.size,1);w.pump();w.c.cancel('test-cancel');assert.equal((await t.done).validation.frameExact,false);w.pump();assert.equal(w.c.takes.size,0);assert.equal(w.c.drainingId,null);
 const u=w.c.startCapture(0,16);w.pump();w.render();w.pump();assert.equal((await u.done).validation.frameExact,true);
});
await check('C04-malformed-buffer-no-throw',async()=>{
 const w=tapWire(),t=w.c.startCapture(0,16);w.pump();assert.doesNotThrow(()=>w.c.handle(sampleChunk(w,{buffer:new ArrayBuffer(4)})));w.c.handle(end(w));assert.equal((await t.done).validation.frameExact,false);
});
await check('C05-duplicate-sequence-foreign-and-nonfinite',async()=>{
 for(const mutation of [{sessionId:'foreign'},{sequence:0},{bufferGeneration:0}]){const w=tapWire(),t=w.c.startCapture(0,16);w.pump();w.c.handle(sampleChunk(w,mutation));w.c.handle(end(w));assert.equal((await t.done).validation.frameExact,false);}
 const w=tapWire(),t=w.c.startCapture(0,16);w.pump();const b=new ArrayBuffer(P0_TAP_BYTES);new Float32Array(b)[0]=NaN;w.c.handle(sampleChunk(w,{buffer:b}));w.c.handle(end(w));assert.equal((await t.done).validation.frameExact,false);
});
await check('C06-close-settles-inflight-and-disables-start',async()=>{
 const w=tapWire(),t=w.c.startCapture(0,16);w.pump();w.c.close();const done=await t.done;assert.equal(done.validation.reason,'context-closed');assert.equal(w.c.takes.size,0);assert.throws(()=>w.c.startCapture(0,16));
});
console.log(JSON.stringify({pass:true,scope:'Main-side PCM ownership/validation, simulated transport; no browser proof',results},null,2));
