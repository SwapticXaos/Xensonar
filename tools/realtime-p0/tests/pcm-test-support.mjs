import assert from 'node:assert/strict';
import fs from 'node:fs';
import {P0PcmTapClient,P0_TAP_PROTOCOL} from '../web/p0-pcm-tap-client.js';
export const wasmModule=await WebAssembly.compile(fs.readFileSync(new URL('../artifacts/p0_core.wasm',import.meta.url)));
export const classes=new Map();let target;
globalThis.sampleRate=48000;globalThis.currentFrame=0;
globalThis.AudioWorkletProcessor=class{constructor(){const out=target;this.port={onmessage:null,postMessage:(m,transfer=[])=>out.push(structuredClone(m,{transfer}))};}};
globalThis.registerProcessor=(name,type)=>classes.set(name,type);
await import('../worklet/p0-pcm-tap.js');
await import('../worklet/p0-worklet.js');
export function processor(name,options,out){target=out;return new (classes.get(name))({processorOptions:options});}
export function tapWire(sr=48000,monitorOnly=false){
  globalThis.sampleRate=sr;globalThis.currentFrame=0;
  const scope={sessionId:'capture-model',engineEpoch:'engine',ownerEpoch:1},ab=[],ba=[],events=[];
  const p=processor('xensonar-p0-pcm-tap',{...scope,monitorOnly},ba);
  const c=new P0PcmTapClient({postMessage:(m,transfer=[])=>ab.push(structuredClone(m,{transfer}))},scope,m=>events.push(m));
  let frame=0;
  const deliver=()=>{while(ab.length)p.port.onmessage({data:ab.shift()});};
  const receive=()=>{while(ba.length)c.handle(ba.shift());};
  const pump=()=>{let left=1000;while(ab.length||ba.length){assert.ok(--left>0);deliver();receive();}};
  const raw=m=>p.onMessage({...scope,protocol:P0_TAP_PROTOCOL,...m});
  function render(n=128,input=null){
    const l=input?.[0]??Float32Array.from({length:n},(_,i)=>((frame+i)%101)/202),r=input?.[1]??Float32Array.from(l,x=>-x);
    const out=[new Float32Array(n),new Float32Array(n)];globalThis.currentFrame=frame;
    p.process([[l,r]],[out]);if(monitorOnly){assert.ok(out.every(c=>c.every(x=>x===0)));}else{assert.deepEqual(out[0],l);assert.deepEqual(out[1],r);}frame+=n;globalThis.currentFrame=frame;return out;
  }
  pump();return {p,c,ab,ba,events,scope,pump,deliver,receive,raw,render,get frame(){return frame;},set frame(n){frame=n;globalThis.currentFrame=n;}};
}
