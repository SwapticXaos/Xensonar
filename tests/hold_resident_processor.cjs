'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),{performance}=require('perf_hooks');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const backend=fs.readFileSync(path.join(root,'src/audio/entrophon/02_worklet_and_voice_backend.js'),'utf8');
const asset=fs.readFileSync(path.join(root,'src/audio/entrophon/01_wasm_asset.js'),'utf8');
const worklet=backend.match(/T8=("(?:\\.|[^"\\])*")/),wasm=asset.match(/jMe=("(?:\\.|[^"\\])*")/);
assert(worklet&&wasm,'actual embedded renderer assets must be present');
const code=JSON.parse(worklet[1]),bytes=Buffer.from(JSON.parse(wasm[1]),'base64');
async function setup(sr,fallback=false){
 const box={sampleRate:sr,currentFrame:0,console,Uint32Array,Float32Array,Float64Array,Int16Array,Int32Array,Uint8Array,ArrayBuffer,WebAssembly,
 AudioWorkletProcessor:class{constructor(){this.port={events:[],postMessage(x){this.events.push(x)},start(){}}}},registerProcessor(n,C){box.Processor=C}};
 vm.createContext(box);vm.runInContext(code,box);const h=new box.Processor({});
 await h.onMessage({type:'INIT',wasmBytes:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),profile:1,completionBatchVersion:1});
 assert(h.ready);await h.onMessage({type:'SET_MUTED',muted:false});if(fallback)h.bridge.writeOutputs=undefined;
 return {box,h,sr};
}
function tone(sr,freq,life,mask=0,complex=false){
 const r=new Uint32Array(64),f=new Float32Array(r.buffer);r[0]=0x102;r[5]=complex?6:1;r[6]=complex?3:0;
 for(let k=0;k<r[5];k++)f[8+k]=freq*2**(k/19);for(let k=0;k<r[6];k++){f[14+k]=freq*(k+2);f[17+k]=.1;}
 f[20]=.12;f[21]=.06;r[22]=Math.round(.005*sr);r[23]=Math.round(.03*sr);r[24]=Math.round((life-.08)*sr);r[25]=Math.round(.06*sr);r[26]=Math.round(life*sr);
 f[27]=1;f[29]=2000;f[30]=5000;f[31]=1200;r[32]=240;r[33]=2400;f[34]=.7;f[35]=.7;f[36]=.1;f[37]=330;f[38]=3.2;f[39]=.1;f[43]=1/Math.max(1,(r[5]+r[6])*.7);r[44]=mask;return r;
}
function plan(records,offsets,start,interval,pattern){return {id:1,templates:records,offsets,index:0,start,interval,pattern,nrec:records.length,committed:true};}
function render(ctx,frames,mono=false){const {h,box}=ctx,out=Array.from({length:9},()=>Array.from({length:mono?1:2},()=>new Float32Array(128))),pcm=Array.from({length:18},()=>new Float32Array(frames));
 let maxMs=0;
 for(let f=0;f<frames;f+=128){box.currentFrame=f;const begin=performance.now();h.process([],out);maxMs=Math.max(maxMs,performance.now()-begin);for(let bus=0;bus<9;bus++)for(let c=0;c<2;c++)pcm[bus*2+c].set(out[bus][c]??out[bus][0],f);}
 return {pcm,maxMs};}
function compare(a,b){let max=0,energy=0;for(let c=0;c<a.length;c++)for(let i=0;i<a[c].length;i++){max=Math.max(max,Math.abs(a[c][i]-b[c][i]));energy+=a[c][i]*a[c][i];}assert(energy>0,'PCM must contain sound');assert(max<2e-6,'PCM difference '+max);return max;}
async function prepare(ctx,p){const {h}=ctx;h.holdPlans=[p];p.mode='tap';p.prepared=false;const t=performance.now();await h.holdPrepareStems(p,1,h.bridge.epoch,p.nrec);let calls=0,maxMs=0;while(!p.prepared){const t=performance.now();h.advanceHoldStemPrep();maxMs=Math.max(maxMs,performance.now()-t);assert(++calls<10000);}
 assert(p.tap);return {elapsedMs:performance.now()-t,quanta:calls,maxPrepCallMs:maxMs,allocatedPCMBytes:p.prep?.ch?.reduce((s,b)=>s+b.byteLength,0)??p.tap.len*40,retainedPCMBytes:p.tap.ch.reduce((s,c)=>s+c.buf.byteLength,0)};}
(async()=>{
 const results=[];
 // Exercise the actual READY / GO / FIRE barriers with a real initialized kernel.
 const protocol=await setup(48000),{h,box}=protocol,epoch=h.bridge.epoch;
 const rec=tone(48000,217.37,.18,63),id=991;
 await h.onMessage({type:'HOLD_PLAN',id,epoch,start:512,interval:4800,pattern:[1,0,1,0],index:0,offset:0,slot:0,record:rec});
 h.tickHoldPlans(128);assert.equal(h.holdTapStarts||0,0,'uncommitted program cannot play');
 await h.onMessage({type:'HOLD_COMMIT',id,epoch,count:1,mode:'tap'});
 for(let guard=0;!h.holdPlans.find(p=>p?.id===id)?.prepared;guard++){assert(guard<10000);if(!h.holdPlans.find(p=>p?.id===id)?.prep)await new Promise(setImmediate);h.advanceHoldStemPrep();}
 assert(h.port.events.some(e=>e.type==='HOLD_READY'&&e.id===id));
 h.tickHoldPlans(128);assert.equal(h.holdTapStarts||0,0,'READY is not playback ownership');
 await h.onMessage({type:'HOLD_GO',id,epoch,index:0});assert(h.port.events.some(e=>e.type==='HOLD_GO_READY'&&e.id===id));
 h.tickHoldPlans(128);assert.equal(h.holdTapStarts||0,0,'GO_READY is not playback ownership');
 await h.onMessage({type:'HOLD_FIRE',id,epoch,index:0});
 for(let frame=0;frame<19200;frame+=128){box.currentFrame=frame;h.tickHoldPlans(128);}
 assert.equal(h.holdTapStarts,2,'mask has exactly two active due steps');
 box.currentFrame=48512;h.tickHoldPlans(128);assert.equal(h.holdTapStarts,3,'clock gap must not produce catch-up burst');
 await h.onMessage({type:'HOLD_STOP',id});box.currentFrame=57600;h.tickHoldPlans(128);assert.equal(h.holdTapStarts,3);
 await h.onMessage({type:'HOLD_FIRE',id,epoch,index:12});assert(h.holdPlans.every(p=>p?.id!==id),'late FIRE cannot revive STOP');
 await h.onMessage({type:'HOLD_PLAN',id:992,epoch:epoch-1,start:0,interval:4800,pattern:[1],index:0,offset:0,slot:0,record:rec});assert(h.holdPlans.every(p=>p?.id!==992),'stale epoch cannot arm');
 protocol.h.bridge.destroy();
 results.push({case:'real-kernel-barriers-mask-stop-no-catchup',status:'GREEN'});

 // Real native overlap oracle, both output paths, 44.1/48k, all six Entrophon sends.
 for(const sr of [44100,48000])for(const fallback of [false,true]){
  const native=await setup(sr,fallback),tap=await setup(sr,fallback);const make=()=>[tone(sr,217.37,.18,63)];const pattern=[1,0,1,1,0,1,1];const start=512,iv=sr*240/(108*27),frames=Math.ceil(sr*2/128)*128;
  native.h.holdPlans=[{...plan(make(),[0],start,iv,pattern),prepared:true,mode:'native'}];
  const p=plan(make(),[0],start,iv,pattern),prep=await prepare(tap,p);
  const a=render(native,frames),b=render(tap,frames);const maxError=compare(a.pcm,b.pcm);
  assert.equal(tap.h.holdTapStarts,native.h.holdCompleteSteps);assert(!tap.h.holdTapOverflow);assert.equal(tap.h.reservations.count,0,'tap must not reserve native voices');
  for(let bus=1;bus<=6;bus++){assert(a.pcm[bus*2].some(x=>x!==0),'active aux '+bus);assert.deepEqual(b.pcm[bus*2],b.pcm[bus*2+1]);}
  results.push({case:'native-overlap-oracle',sr,fallback,starts:tap.h.holdTapStarts,maxError,...prep,maxProcessMs:b.maxMs});native.h.bridge.destroy();tap.h.bridge.destroy();
 }
 // Complex 3-record response, early component and microtonal pitch. Expected
 // repetition is independently summed from the actual single-attack WASM PCM.
 for(const [steps,gallop] of [[24,false],[27,false],[27,true],[32,false]]){
  const sr=48000,ref=await setup(sr),tap=await setup(sr),make=()=>[tone(sr,62.13,1.11,1,true),tone(sr,217.37,.96,6,true),tone(sr,391.71,1.04,56,true)],offsets=[0,240,720],start=512,iv=sr*240/(108*steps),pattern=Array.from({length:steps},(_,i)=>gallop?[1,0,1,1,0][i%5]:1),frames=Math.ceil(sr*10/128)*128;
  ref.h.holdPlans=[{...plan(make(),offsets,start,iv,[1]),prepared:true,mode:'native',interval:sr*20}];
  const a=render(ref,frames),p=plan(make(),offsets,start,iv,pattern),prep=await prepare(tap,p),b=render(tap,frames);
  const expected=Array.from({length:18},()=>new Float32Array(frames));let count=0;
  for(let k=0;Math.round(start+k*iv)<frames;k++){if(!pattern[k%pattern.length])continue;count++;const shift=Math.round(start+k*iv)-start;for(let c=0;c<18;c++)for(let i=start;i<frames-shift;i++)expected[c][i+shift]+=a.pcm[c][i];}
  const maxError=compare(expected,b.pcm);assert.equal(tap.h.holdTapStarts,count);assert(!tap.h.holdTapOverflow);assert(!tap.h.holdGroupDrops);assert.equal(tap.h.kernelAccepted,0,'live kernel must not also replay tap records');
  results.push({case:'complex-shifted-WASM-oracle',steps,gallop,starts:count,maxError,...prep,maxProcessMs:b.maxMs});ref.h.bridge.destroy();tap.h.bridge.destroy();
 }
 fs.mkdirSync(path.join(root,'docs'),{recursive:true});fs.writeFileSync(path.join(root,'docs/hold_wasm_oracle.latest.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
