'use strict';
// PCM-CLOCK: the Loop-Rec / take PCM recorder (src/audio/03_pcm_master_recorder.js, processor xensonar-master-pcm-v2) under a
// stale AudioWorklet clock. Measured in Chromium under main-thread graph changes (drum hits, bass notes): process() is now and
// then called with the previous quantum's currentFrame (F, F+128, F+128, F+384) although the input is the next real quantum.
// Before the fix the recorder logged that as an overlap of 128 and a gap of 128; the Loop-Rec projection then dropped one real
// block as a "duplicate" and left 128 frames of silence in its place (a click in the exported loop).
// A real gap (frames really missing) must still be reported and left unfilled.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const file=process.argv[2]||path.join(__dirname,'../src/audio/03_pcm_master_recorder.js');
const source=fs.readFileSync(file,'utf8');
const processors=new Map(),urls=new Map(),nodes=[];
const transfer=(message,list=[])=>structuredClone(message,{transfer:list});
const graphNode=()=>({gain:{value:1},edges:new Set(),allDisconnects:0,
 connect(target){this.edges.add(target);return target},
 disconnect(target){if(target)this.edges.delete(target);else{this.edges.clear();this.allDisconnects++}}});
let portCloses=0,recycles=0;
const scope={ArrayBuffer,Blob,DataView,Float32Array,WeakMap,Promise,Math,Number,Error,
 setTimeout,clearTimeout,encodeURIComponent,console,currentFrame:2048,
 registerProcessor(name,Processor){processors.set(name,Processor)},
 AudioWorkletProcessor:class{constructor(){this.port={onmessage:null,postMessage(){}}}},
 URL:{createObjectURL(blob){const url='blob:pcm-test-'+urls.size;urls.set(url,blob);return url},revokeObjectURL(url){urls.delete(url)}}};
scope.AudioWorkletNode=class{
 constructor(ctx,name,options){
  assert.equal(name,'xensonar-master-pcm-v2');assert.equal(options.channelCount,2);
  const Processor=processors.get(name);assert(Processor,'actual processor registration missing');
  this.processor=new Processor();this.graph=graphNode();this.closed=false;
  this.port={onmessage:null,postMessage:(data,list)=>{
   if(data.kind==='recycle')recycles++;
   const cloned=transfer(data,list);
   queueMicrotask(()=>this.processor.port.onmessage?.({data:cloned}));
  },close:()=>{this.closed=true;portCloses++}};
  this.processor.port.postMessage=(data,list)=>{
   const cloned=transfer(data,list);
   queueMicrotask(()=>this.port.onmessage?.({data:cloned}));
  };
  nodes.push(this);
 }
 connect(target){return this.graph.connect(target)}
 disconnect(target){this.graph.disconnect(target)}
};
const context=vm.createContext(scope);
vm.runInContext(source+'\nglobalThis.pcm={create:__xenCreateMasterPCMRecorder,status:__XenPcmCaptureStatus};',context);
const makeContext=()=>({sampleRate:48000,destination:graphNode(),
 audioWorklet:{async addModule(url){const code=url.startsWith('blob:')?await urls.get(url).text():decodeURIComponent(url.slice(url.indexOf(',')+1));vm.runInContext(code,context)}},
 mediaSources:[],
 createMediaStreamSource(stream){assert.equal(stream.getAudioTracks().length,1);const node=graphNode();this.mediaSources.push(node);return node},
 createGain:graphNode,
 createBuffer(channels,frames,rate){assert.equal(channels,2);const data=[new Float32Array(frames),new Float32Array(frames)];return{numberOfChannels:2,length:frames,sampleRate:rate,duration:frames/rate,getChannelData:ch=>data[ch]}}
});
const drain=async()=>{for(let i=0;i<5;i++)await Promise.resolve()};
const sig=(f,ch)=>ch?-Math.sin(f*.0731)*.55:Math.sin(f*.173)*.9;
async function record(clockFor,blocks){ // clockFor(block) -> currentFrame the browser reports; input is always the real block
 const ctx=makeContext(),tap=graphNode();const recorder=await scope.pcm.create(ctx,null,tap);recorder.onstop=()=>{};recorder.start();await drain();
 const worker=nodes.at(-1).processor;
 for(let b=0;b<blocks;b++){
  const fr=clockFor(b);if(fr===null)continue; // null = this quantum never reached the recorder (real gap)
  const L=new Float32Array(128),R=new Float32Array(128);for(let i=0;i<128;i++){L[i]=sig(2048+b*128+i,0);R[i]=sig(2048+b*128+i,1)}
  scope.currentFrame=fr;worker.process([[L,R]],[[new Float32Array(128)]]);await drain();
 }
 recorder.stop();await drain();await drain();return{recorder,status:{...scope.pcm.status}};
}
(async()=>{
 const B=200,clean=b=>2048+b*128;
 const staleAt=new Set([37,38,90,151]); // 37/38: two stale calls in a row
 const stale=b=>staleAt.has(b)?(()=>{let k=b;while(staleAt.has(k))k--;return 2048+k*128})():clean(b);
 // Loop-Rec interval that does not start at the first captured frame -> the timeline projection path
 const start=2048+10*128+17,end=2048+190*128-5;
 const ref=await record(clean,B),refPCM=await ref.recorder.toTimelinePCM(start,end);
 assert.equal(refPCM.report.projection,'original');
 const got=await record(stale,B);
 assert.equal(got.status.frameGaps,0,'a stale clock is not a frame gap');assert.equal(got.status.overlapFrames,0);assert.equal(got.status.missingFrames,0);
 const pcm=await got.recorder.toTimelinePCM(start,end);
 assert.equal(pcm.report.reconstructedFrames,0,'no silent hole');assert.equal(pcm.report.duplicateFrames,0,'no real block dropped');
 for(let i=0;i<refPCM.left.length;i++){assert.equal(pcm.left[i],refPCM.left[i],'left sample '+i);assert.equal(pcm.right[i],refPCM.right[i],'right sample '+i)}
 // a real gap: quantum 120 never arrives, the clock jumps on -> still reported and not concealed
 const gap=await record(b=>b===120?null:clean(b),B);
 assert.equal(gap.status.frameGaps,1,'real gap reported');assert.equal(gap.status.missingFrames,128,'128 frames really missing');
 const gp=await gap.recorder.toTimelinePCM(start,end);assert.equal(gp.report.reconstructedFrames,128,'real missing frames stay marked as missing');
 console.log('PASS PCM-CLOCK stale worklet clock keeps every recorded sample; a real gap is still reported');
})().catch(error=>{console.error(error);process.exitCode=1});
