'use strict';
// LIVE-GF-01: the call-free block loops of the EQ worklet must be bit-identical to the
// pre-patch per-sample processor (output PCM, filter state, counters) on every render path:
// identity, stable bank, warm/fade transition, sleep/wake, missing input, NaN/Infinity input.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
function make(file){
 const scope={sampleRate:44100,currentFrame:0,console};const posted=[];
 scope.AudioWorkletProcessor=class{constructor(){this.port={onmessage:null,postMessage:m=>posted.push(JSON.stringify(m))}}};
 scope.registerProcessor=(n,k)=>scope.Processor=k;
 vm.createContext(scope);vm.runInContext(fs.readFileSync(file,'utf8')+'\n__xenEqLiveModule();globalThis.live=__XenEqLive;',scope);
 return{scope,posted};
}
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function scenario(file){
 const{scope,posted}=make(file);const r=rng(1234);
 const plan=(k,base)=>({base,filters:Array.from({length:24},(_,i)=>({frequency:30*Math.pow(500,i/23),q:.7+((i*7+k)%9)*.4,gain:k<0?0:Math.sin(i*1.3+k)*9}))});
 const coeff=(k,base)=>scope.live.coefficients(plan(k,base),24,44100);
 const identity=coeff(-1,0);assert.equal(identity.count,0);assert.equal(identity.gain,1);
 const p=new scope.Processor({processorOptions:{initial:{...identity,revision:0}}});
 const L=new Float32Array(128),R=new Float32Array(128),oL=new Float32Array(128),oR=new Float32Array(128);
 const hash=new Float64Array(4);let rev=1,frames=0;const pcm=[];
 for(let tick=0;tick<2600;tick++){
  const silent=(tick>900&&tick<1400)||tick>2300;
  for(let i=0;i<128;i++){L[i]=silent?0:(r()*2-1)*(tick%97===0?1.4:.4);R[i]=silent?0:(r()*2-1)*.3}
  if(tick===1700){L[5]=NaN;R[9]=Infinity;L[64]=-Infinity}
  if(tick===300)p.port.onmessage({data:{...coeff(1,-3),revision:rev++}});
  if(tick===500)p.port.onmessage({data:{...coeff(2,2),revision:rev++,intent:'morph'}});
  if(tick>=600&&tick<640&&tick%3===0)p.port.onmessage({data:{...coeff(tick,-1),revision:rev++,intent:'paint'}});
  if(tick===1500)p.port.onmessage({data:{...coeff(7,0),revision:rev++,intent:'settle'}});
  if(tick===1900)p.port.onmessage({data:{...identity,revision:rev++}});
  if(tick===2000)p.port.onmessage({data:{...coeff(3,-6),revision:rev++}});
  scope.currentFrame=frames;frames+=128;
  // a mono-only input and a missing input (inactive upstream) are real Web Audio situations
  const input=tick>2100&&tick<2150?[]:tick>2150&&tick<2200?[L]:[L,R];
  assert.equal(p.process([input],[[oL,oR]]),true);
  pcm.push(Buffer.from(new Uint8Array(oL.buffer.slice(0))),Buffer.from(new Uint8Array(oR.buffer.slice(0))));
 }
 const s={...p.stats};return{pcm:Buffer.concat(pcm),stats:JSON.stringify(s),posted,z0:Buffer.from(new Uint8Array(new Float64Array(p.banks[0].z).buffer)),z1:Buffer.from(new Uint8Array(new Float64Array(p.banks[1].z).buffer)),sleeping:p.sleeping,applied:p.stats.applied,dual:p.stats.dualFrames,nonfinite:p.stats.nonfinite};
}
const before=scenario(path.join(root,'tests/fixtures/eq_worklet_pre_livegf01.js'));
const after=scenario(path.join(root,'src/quickrack/equalizer/eq-worklet.js'));
assert(before.applied>=6&&before.dual>3000,'scenario must exercise transitions: '+before.applied+'/'+before.dual);
assert(before.pcm.some(x=>x!==0),'scenario must produce sound');
assert(before.pcm.equals(after.pcm),'output PCM must be bit-identical');
assert(before.z0.equals(after.z0)&&before.z1.equals(after.z1),'filter state must be bit-identical');
assert.equal(after.stats,before.stats,'diagnostic counters must be identical');
assert.deepEqual(after.posted,before.posted,'posted stats must be identical');
// Negative control: the comparison is sensitive (one flipped sample is detected).
const tampered=Buffer.from(after.pcm);tampered[tampered.length>>1]^=1;assert(!before.pcm.equals(tampered));
// The render paths must not call helper methods per sample any more.
const src=fs.readFileSync(path.join(root,'src/quickrack/equalizer/eq-worklet.js'),'utf8');
const body=src.slice(src.indexOf('process(inputs,outputs){'),src.indexOf("registerProcessor('xensonar-eq-live-v2'"));
assert(!/this\.run\(/.test(body),'process() must stay call-free per sample');
console.log('PASS LIVE-GF-01 EQ worklet block loops bit-identical',{bytes:after.pcm.length,applied:after.applied,dualFrames:after.dual,nonfinite:after.nonfinite});
