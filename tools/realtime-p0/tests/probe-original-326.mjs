import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {P0PcmTapClient,P0_TAP_BYTES} from '../artifacts/original-sol-326/source/web/p0-pcm-tap-client.js';
const scope={sessionId:'probe',engineEpoch:'e',ownerEpoch:1};
const protocol='p0-pcm-tap/326-v1';const results=[];
function client(){return new P0PcmTapClient({postMessage(){}},scope);}
function recv(c,m){c.handle({...scope,protocol,...m});}
function buf(frames,value=.25){const b=new ArrayBuffer(P0_TAP_BYTES);new Float32Array(b).fill(value);return b;}
{
 const c=client(),t=c.startCapture(100,16);recv(c,{kind:'pcm-chunk',captureId:1,sequence:70,firstFrame:100,frames:16,sampleRate:96000,channels:1,buffer:buf(16)});
 recv(c,{kind:'capture-end',captureId:1,startFrame:0,endFrame:999,expectedFrames:900,capturedFrames:0,droppedFrames:0,chunks:800});
 const done=await t.done;results.push({id:'F01-unchecked-metadata',actualFrameExact:done.validation.frameExact,required:false});
 recv(c,{kind:'pcm-chunk',captureId:1,sequence:71,firstFrame:100,frames:16,sampleRate:48000,channels:2,buffer:buf(16,.75)});
 results.push({id:'F02-finalized-data-mutation',sampleAfterCompletion:done.data[0],required:.25});
}
{
 const c=client();for(let i=0;i<32;i++)c.startCapture(0,16);
 results.push({id:'F03-unbounded-active-takes',retained:c.takes.size,required:'one active bounded take'});
}
{
 const c=client();c.startCapture(0,16);let error=null;try{recv(c,{kind:'pcm-chunk',captureId:1,sequence:1,firstFrame:0,frames:16,sampleRate:48000,channels:2,buffer:new ArrayBuffer(4)});}catch(e){error=e.name;}
 results.push({id:'F04-short-buffer-throws',actual:error,required:'reject with invalid evidence and no uncaught exception'});
}
{
 const source=fs.readFileSync(new URL('../artifacts/original-sol-326/source/web/main.js',import.meta.url),'utf8');
 const start=source.indexOf('report.pass=[100,250,500]'),end=source.indexOf('window.__P0_STALL_CAPTURE_RESULT__',start);
 const takes={baseline:{validation:{frameExact:false},peak:0}};
 for(const ms of [100,250,500])takes['stall'+ms]={validation:{frameExact:true},compare:{lengthEqual:true,maxAbs:0,rms:0},stallActualMs:ms,peak:0};
 const context={report:{takes},overflow:{validation:{gapFrames:1},end:{droppedFrames:1},proof:{frame:2},captureStartFrame:0}};
 vm.runInNewContext(source.slice(start,end),context);
 results.push({id:'F05-silent-suite-pass',actual:context.report.pass,required:false});
}
{
 globalThis.currentFrame=0;globalThis.sampleRate=48000;let Processor;const sent=[];
 globalThis.AudioWorkletProcessor=class{constructor(){this.port={onmessage:null,postMessage:(m,t=[])=>sent.push(structuredClone(m,{transfer:t}))};}};
 globalThis.registerProcessor=(_n,c)=>{Processor=c;};
 await import('../artifacts/original-sol-326/source/worklet/p0-pcm-tap.js');
 const p=new Processor({processorOptions:scope});const send=m=>p.onMessage({...scope,protocol,...m});
 send({kind:'pool-init',buffers:Array.from({length:16},()=>new ArrayBuffer(P0_TAP_BYTES))});send({kind:'capture-start',captureId:1,startFrame:0,frameCount:100000});
 for(let k=0;k<65536;k+=128){globalThis.currentFrame=k;const x=new Float32Array(128);p.process([[x,x]],[[new Float32Array(128),new Float32Array(128)]]);}
 const inFlight=sent.filter(x=>x.kind==='pcm-chunk').length;
 send({kind:'pool-init',buffers:Array.from({length:16},()=>new ArrayBuffer(P0_TAP_BYTES))});
 results.push({id:'F06-physical-pool-inflation',inFlight,available:p.pool.length,total:inFlight+p.pool.length,maximum:16});
}
{
 const bytes=fs.readFileSync(new URL('../artifacts/original-sol-326/source/artifacts/p0_core.wasm',import.meta.url));const e=(await WebAssembly.instantiate(bytes,{})).instance.exports;
 e.p0_init(48000);e.p0_arm(1,72000n);for(let n=0;n<86400;n+=128)e.p0_render(Math.min(128,86400-n));
 results.push({id:'F07-1800ms-exceeds-lease',elapsedMs:1800,leaseMs:1500,ownerClosed:e.p0_owner_closed(),interpretation:'Render clock progress is compatible with terminally closed silent synthesis.'});
}
console.log(JSON.stringify({scope:'Executed counterexamples against original Sol 326; no browser navigation',results},null,2));
