'use strict';
// STEMS-01: the stem capture processor (AudioWorklet) in isolation: lock-step chunks for every stem, missing inputs = silence, mono = both channels,
// sample-exact stopAt, 5-minute style limit, per-stem peaks, gap counting, buffer pool (recycled buffers keep it running, no recycle = a clear error, never silent loss).
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const src=fs.readFileSync(path.resolve(__dirname,'../src/post-oct/036-xen-stem-recorder.js'),'utf8');
const i=src.indexOf('function __xenStemsWorkletModule(){'),j=src.indexOf('const __XenStemRecorder=');
const code=src.slice(i,j);
function make(opts){
  const box={Float32Array,Array,Math,Number,Infinity,ArrayBuffer};box.globalThis=box;box.currentFrame=0;
  let Cls=null;box.AudioWorkletProcessor=class{constructor(){this.port={posted:[],postMessage(m){this.posted.push(m)},onmessage:null}}};
  box.registerProcessor=(n,c)=>{assert.equal(n,'xensonar-stems-pcm-v1');Cls=c};
  vm.createContext(box);vm.runInContext(code+';__xenStemsWorkletModule();',box);
  const p=new Cls({processorOptions:opts});const send=m=>p.port.onmessage({data:m});
  return{p,send,box,posted:()=>p.port.posted};
}
const Q=128;
function run(h,quanta,gen,{recycle=true}={}){
  for(let q=0;q<quanta;q++){
    const base=h.box.currentFrame,ins=gen(base);
    h.p.process(ins);
    h.box.currentFrame+=Q;
    if(recycle)for(const m of h.posted().filter(x=>x.kind==='chunk'&&!x.recycled)){m.recycled=true;h.send({kind:'recycle',stem:m.stem,data:new ArrayBuffer(8192*8)})}
  }
}
const ramp=(base,k)=>{const l=new Float32Array(Q),r=new Float32Array(Q);for(let i=0;i<Q;i++){l[i]=(base+i)*1e-6*k;r[i]=-(base+i)*1e-6*k}return[l,r]};
// 1) lock-step chunks, content, mono, missing input, NaN
{const h=make({stems:3,maxFrames:0});h.send({kind:'start',startFrame:0});
 run(h,70,base=>{const mono=new Float32Array(Q);for(let i=0;i<Q;i++)mono[i]=(base+i)%100*1e-3;const bad=new Float32Array(Q);bad[5]=NaN;return[ramp(base,1),[mono],[]]});
 const chunks=h.posted().filter(x=>x.kind==='chunk');assert.equal(chunks.length%3,0,'every stem gets a chunk at the same time');
 const first=chunks.slice(0,3);assert.deepEqual(first.map(c=>c.stem),[0,1,2]);assert(first.every(c=>c.frames===8192&&c.data.byteLength===8192*8));
 const a=new Float32Array(first[0].data),b=new Float32Array(first[1].data),c=new Float32Array(first[2].data);
 assert.ok(Math.abs(a[2*1000]-1000*1e-6)<1e-9&&Math.abs(a[2*1000+1]+1000*1e-6)<1e-9,'stereo stem: left/right at the right sample');
 assert.equal(b[2*50],b[2*50+1],'mono input fills both channels');assert.ok(b[2*50]>0);
 assert.ok(c.every(v=>v===0),'a stem without a connected input is silence (frames stay aligned)');
 assert.equal(h.posted().filter(x=>x.kind==='error').length,0);
}
// 2) NaN input and peaks, sample-exact stopAt, done message
{const h=make({stems:2,maxFrames:0});h.send({kind:'start',startFrame:0});
 const nanIn=new Float32Array(Q);nanIn[3]=NaN;nanIn[4]=.5;
 run(h,2,base=>[[nanIn,nanIn],ramp(base,.5)]);
 h.send({kind:'stopAt',frame:1000});run(h,10,base=>[[nanIn,nanIn],ramp(base,.5)]);
 const done=h.posted().find(x=>x.kind==='done');assert(done,'done after stopAt');assert.equal(done.frames,1000,'stopAt is sample exact: '+done.frames);assert.equal(done.reason,'stopAt');
 assert.equal(done.gaps,0);assert.ok(Math.abs(done.peaks[0]-.5)<1e-6,'peak of stem 0 (NaN treated as silence): '+done.peaks[0]);assert(done.peaks[1]>.0004&&done.peaks[1]<.001,'peak of stem 1: '+done.peaks[1]);
 const chunk=h.posted().filter(x=>x.kind==='chunk'&&x.stem===0).pop();assert.equal(chunk.frames,1000,'the last chunk carries exactly the remaining frames');
 const d=new Float32Array(chunk.data);assert.equal(d[2*3],0,'NaN became 0');assert.equal(d[2*4],.5);
}
// 3) start later than the first quantum: nothing before startFrame
{const h=make({stems:1,maxFrames:0});h.send({kind:'start',startFrame:300});run(h,8,base=>[ramp(base,1)]);h.send({kind:'stop'});
 const done=h.posted().find(x=>x.kind==='done');assert.equal(done.first,300,'first captured frame = startFrame (mid-quantum start)');assert.equal(done.frames,8*Q-300);
 const d=new Float32Array(h.posted().find(x=>x.kind==='chunk').data);assert.ok(Math.abs(d[0]-300e-6)<1e-9,'the first captured sample is frame 300');
}
// 4) limit
{const h=make({stems:1,maxFrames:500});h.send({kind:'start',startFrame:0});run(h,10,base=>[ramp(base,1)]);const done=h.posted().find(x=>x.kind==='done');assert.equal(done.reason,'limit');assert.equal(done.frames,500)}
// 5) a gap in the frame clock is counted
{const h=make({stems:1,maxFrames:0});h.send({kind:'start',startFrame:0});run(h,3,base=>[ramp(base,1)]);h.box.currentFrame+=Q;run(h,2,base=>[ramp(base,1)]);h.send({kind:'stop'});const done=h.posted().find(x=>x.kind==='done');assert.equal(done.gaps,1);assert.equal(done.missing,Q)}
// 6) the buffer pool: without recycling it stops with a clear error (never silently drops audio); with recycling a long run is fine
{const h=make({stems:2,maxFrames:0});h.send({kind:'start',startFrame:0});run(h,8192*12/Q,base=>[ramp(base,1),ramp(base,1)],{recycle:false});
 const err=h.posted().find(x=>x.kind==='error');assert(err&&/pool exhausted/.test(err.message),'no recycle → explicit error');}
{const h=make({stems:2,maxFrames:0});h.send({kind:'start',startFrame:0});run(h,8192*60/Q,base=>[ramp(base,1),ramp(base,1)]);assert.equal(h.posted().filter(x=>x.kind==='error').length,0,'recycled buffers: 60 chunks per stem without error');
 assert.equal(h.posted().filter(x=>x.kind==='chunk').length,120)}
// 7) not started = nothing, dispose ends the processor
{const h=make({stems:1});run(h,5,base=>[ramp(base,1)]);assert.equal(h.posted().length,0);h.send({kind:'dispose'});assert.equal(h.p.process([ramp(0,1)]),false)}
console.log('PASS STEMS-01 capture processor (lock-step chunks, silence for missing inputs, sample-exact stop, limit, gaps, pool)');
