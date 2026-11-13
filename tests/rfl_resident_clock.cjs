// RFL-CLOCK: the resident Root-Follow worklet (src/audio/rfl/01_resident_worklet.js, processor xensonar-raw-resident-v1) must
// render the same audio when the browser hands process() a stale currentFrame. Measured in Chromium under main-thread graph
// changes (drum hits, bass notes): currentFrame runs F, F+128, F+128, F+384 - one call gets the previous quantum's frame and
// the next one catches up. Rendering from currentFrame repeated a block and skipped the next one = the crackle (two steps
// 2.9 ms apart). The processor keeps its own monotonic render clock.
// The test runs the real processor class (worklet module text evaluated in Node) twice on the same program: once with a clean
// clock, once with stale frames injected, and requires bit-identical output, no repeated block and no click.
'use strict';
const assert=require('assert');const fs=require('fs');const path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','src','audio','rfl','01_resident_worklet.js'),'utf8');
const a=src.indexOf('String.raw`')+11,b=src.indexOf('`;',a);
const mod=src.slice(a,b).replace(/export\s*\{[^}]*\};?\s*$/,'');
const SR=44100,Q=128;
let clock=0;Object.defineProperty(globalThis,'currentFrame',{get:()=>clock,configurable:true});globalThis.sampleRate=SR;
class AWP{constructor(){this.port={postMessage:m=>{(this.port.sent||(this.port.sent=[])).push(m)},onmessage:null}}}
let Proc=null;
new Function('AudioWorkletProcessor','registerProcessor',mod)(AWP,(n,c)=>{if(n==='xensonar-raw-resident-v1')Proc=c});
assert.ok(Proc,'resident processor registered');

// synthetic 2 s loop (the same material as the probe's test loop) and a base-mode program as the app sends it
const n=SR*2,L=new Float32Array(n);for(let i=0;i<n;i++){const t=i/SR;L[i]=.4*(Math.sin(2*Math.PI*220*t)+.5*Math.sin(2*Math.PI*330*t)+.25*Math.sin(2*Math.PI*440*t))*(0.6+0.4*Math.sin(2*Math.PI*2*t))}
const program={mode:'base',transportAnchorSec:0.5,desiredLoopDurationSec:2.2222222222222223,loopStartSec:0,loopEndSec:1.9999773242630385,stepSec:0.04,windowSec:0.07,rawTargetHz:246.9417,entryRootHz:null,sessionAnchorHz:null,smoothedRootHz:null,
  tuning:{grainWindowScale:0.9107142857142857,grainSpacingScale:1.358695652173913,jitterScale:0.12,sourceDurationScale:0.86,maxGrains:16,microCutSafety:false,microCutSearchRadiusMs:6.878,sourceStartGuardMs:1.954,grainTimeDitherMs:0.5256,grainSourceDitherMs:1.3364}};
const ids={session:'s',asset:'a',token:1,sourceId:7};
function render(frames){ // frames: the currentFrame value the browser reports at each call
  clock=0;const p=new Proc({processorOptions:ids});
  p.port.onmessage({data:{...ids,type:'load',sampleRate:SR,channels:[Float32Array.from(L),Float32Array.from(L)],map:null}});
  p.port.onmessage({data:{...ids,type:'arm',program,firstWindowSec:0.5,sequence:1}});
  assert.ok(p.port.sent.some(m=>m.type==='owned'),'armed: '+JSON.stringify(p.port.sent.map(m=>m.type+(m.reason?':'+m.reason:''))));
  const outL=new Float32Array(frames.length*Q);
  frames.forEach((f,i)=>{clock=f;const o=[new Float32Array(Q),new Float32Array(Q)];p.process([],[o]);outL.set(o[0],i*Q)});
  return outL;
}
const N=Math.ceil(6*SR/Q);const clean=Array.from({length:N},(_,i)=>i*Q);
// stale clock exactly as measured: at a few quanta the browser repeats the previous frame, the next call jumps by 256
const stale=clean.slice();for(const i of [80,431,432,1203,1777,2001])if(i<N){stale[i]=stale[i-1];}
// (two consecutive stale calls at 431/432 as a harder case: F, F, F, F+384)
for(let i=1;i<N;i++)if(stale[i]!==stale[i-1]&&stale[i]!==stale[i-1]+Q)assert.ok(stale[i]===clean[i]);
const A=render(clean),B=render(stale);
assert.ok(A.reduce((m,x)=>Math.max(m,Math.abs(x)),0)>.05,'the loop is audible');
// bit-identical output despite the stale clock
let diff=0;for(let i=0;i<A.length;i++)diff=Math.max(diff,Math.abs(A[i]-B[i]));
assert.strictEqual(diff,0,'stale currentFrame must not change the rendered audio (max diff '+diff+')');
// no repeated non-silent block
for(let q=Q;q+Q<=B.length;q+=Q){let same=true,loud=false;for(let k=0;k<Q;k++){if(B[q+k]!==B[q+k-Q]){same=false;break}if(B[q+k]!==0)loud=true}assert.ok(!(same&&loud),'repeated block at quantum '+q/Q)}
// a real skip of the browser clock (frames jump without a stale call) is still followed, the clock never runs backwards
{const jump=clean.map((f,i)=>i>=100?f+Q:f);const C=render(jump);let d2=0;for(let i=101*Q;i<C.length-Q;i++)d2=Math.max(d2,Math.abs(C[i]-A[i+Q]));assert.strictEqual(d2,0,'a forward jump of currentFrame is followed')}
console.log('rfl_resident_clock: ok (stale frames at',[80,431,432,1203,1777,2001].join(','),'-> bit-identical)');
