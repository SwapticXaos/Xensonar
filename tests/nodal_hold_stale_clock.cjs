'use strict';
// NODAL-CLOCK: the Nodal hold PCM reader (src/nodal/12_surface_runtime.js, processor xen-nodal-hold-pcm-nh01) under a stale
// AudioWorklet clock. Measured in Chromium under main-thread graph changes: process() is now and then called with the previous
// quantum's currentFrame (F, F+128, F+128, F+384). Gate, gate fade, key-up release and event times are frame-based; read from a
// stale clock they jumped by a block (a step in the envelope). With its own monotonic clock the output equals a clean clock.
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'..','src','nodal','12_surface_runtime.js'),'utf8');
const a=src.indexOf('function xenNodalHoldProcessorFactory(){');assert.ok(a>=0);
let depth=0,b=src.indexOf('{',a);for(let i=b;i<src.length;i++){if(src[i]==='{')depth++;else if(src[i]==='}'){depth--;if(depth===0){b=i+1;break}}}
const factory=src.slice(a,b);
const SR=48000,Q=128;let clock=0;Object.defineProperty(globalThis,'currentFrame',{get:()=>clock,configurable:true});globalThis.sampleRate=SR;
let Proc=null;
new Function('AudioWorkletProcessor','registerProcessor',factory+';xenNodalHoldProcessorFactory();')(class{constructor(){this.port={postMessage(){}}}},(n,c)=>{if(n==='xen-nodal-hold-pcm-nh01')Proc=c});
assert.ok(Proc,'processor registered');
const F=SR,L=new Float32Array(F),R=new Float32Array(F);for(let i=0;i<F;i++){L[i]=Math.sin(i*.051)*.7;R[i]=Math.sin(i*.033)*.6}
function render(frames){
  clock=0;const p=new Proc();
  p.message({type:'template',id:'t',frames:F,left:L,right:R});
  p.message({type:'trigger',key:'k1',id:'t',frame:1000,interval:20000});   // gate ends at 21000 with a fade before it
  p.message({type:'trigger',key:'k2',id:'t',frame:3000,interval:30000});
  p.message({type:'release',key:'k2',frame:9000,releaseFrames:6000});      // key-up release envelope 9000..15000
  const out=new Float32Array(frames.length*Q);
  frames.forEach((f,i)=>{clock=f;const o=[[new Float32Array(Q),new Float32Array(Q)],[new Float32Array(Q),new Float32Array(Q)]];p.process([],o);out.set(o[0][0],i*Q)});
  return out;
}
const N=200,clean=Array.from({length:N},(_,i)=>i*Q);
const staleAt=[9,72,73,100,140,158,163];   // inside attack, release, double stale, gate fade (21000/128 = 164)
const stale=clean.map((f,i)=>{let k=i;while(staleAt.includes(k))k--;return k*Q});
const A=render(clean),B=render(stale);
assert.ok(A.reduce((m,x)=>Math.max(m,Math.abs(x)),0)>.3,'voices sound');
let d=0,at=-1;for(let i=0;i<A.length;i++){const x=Math.abs(A[i]-B[i]);if(x>d){d=x;at=i}}
assert.equal(d,0,'stale clock must not change the output (max diff '+d+' at frame '+at+')');
console.log('PASS NODAL-CLOCK hold reader output identical under a stale worklet clock');
