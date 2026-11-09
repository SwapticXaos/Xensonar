'use strict';
// Run the actual PCM2 processor and recorder bridge, including transferred
// buffers and recycling, across signal/silence/signal and final partial chunks.
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
(async()=>{
 const ctx=makeContext(),tap=graphNode(),liveDestination=graphNode();tap.connect(liveDestination);
 const recorder=await scope.pcm.create(ctx,null,tap);recorder.start();
 const worker=nodes.at(-1).processor,expectedL=[],expectedR=[];
 for(let block=0;block<230;block++){
  const silent=block>=140&&block<147;
  const left=new Float32Array(128),right=new Float32Array(128);
  for(let i=0;i<128;i++){
   const frame=block*128+i;
   left[i]=silent?0:frame%3===0?1.25:Math.sin(frame*.173)*.9234567;
   right[i]=silent?0:frame%7===0?-1.5:-left[i]*.37;
   expectedL.push(left[i]);expectedR.push(right[i]);
  }
  const input=silent?(block<143?[[]]:[[new Float32Array(0)]]):[[left,right]];
  worker.process(input,[[new Float32Array(128)]]);
  scope.currentFrame+=128;
  await drain();
 }
 let stops=0;recorder.onstop=()=>stops++;
 recorder.stop();await drain();
 assert.equal(stops,1,'recording must stop exactly once');
 assert.equal(recorder.frames,expectedL.length,'absent-input silence must occupy its full timeline frames');
 assert.equal(scope.pcm.status.firstFrame,2048,'first captured frame must be preserved');
 assert.equal(scope.pcm.status.frameGaps,0,'continuous quanta must not produce a false frame gap');
 assert.equal(scope.pcm.status.lastFrame-scope.pcm.status.firstFrame,recorder.frames,'capture span must equal retained frames');
 assert.equal(scope.pcm.status.missingFrames,0);assert.equal(scope.pcm.status.overlapFrames,0);
 assert(recycles>=4,'all full/partial transfer buffers must be recycled');
 const rendered=await recorder.toAudioBuffer(ctx),left=rendered.getChannelData(0),right=rendered.getChannelData(1);
 assert.equal(left.length,expectedL.length);
 for(let i=0;i<left.length;i++){
  assert.equal(left[i],expectedL[i],`left Float32/timeline mismatch at ${i}`);
  assert.equal(right[i],expectedR[i],`right Float32/timeline mismatch at ${i}`);
 }
 const wav=await recorder.toWavBlob().arrayBuffer(),v=new DataView(wav);
 assert.equal(v.getUint16(20,true),3,'WAV must declare IEEE Float');assert.equal(v.getUint16(34,true),32);
 assert.equal(v.getUint32(24,true),48000);assert.equal(v.getUint32(40,true),left.length*8);
 assert.equal(wav.byteLength,44+left.length*8);
 for(let i=0;i<left.length;i++){
  assert.equal(v.getFloat32(44+i*8,true),expectedL[i]);assert.equal(v.getFloat32(48+i*8,true),expectedR[i]);
 }
 assert(tap.edges.has(liveDestination),'capture cleanup disconnected the live master');
 assert.equal(tap.edges.size,1,'capture tap edge leaked');assert.equal(tap.allDisconnects,0,'shared master must never be disconnected wholesale');
 assert(nodes.at(-1).closed,'capture MessagePort must close');
 recorder.release();assert.equal(recorder.chunks.length,0,'release must drop retained chunks');
 assert.throws(()=>recorder.start(),/cannot restart/);
 // MediaStream capture remains the compatibility route when no direct tap exists.
 const streamRecorder=await scope.pcm.create(ctx,{getAudioTracks:()=>[{}]});streamRecorder.start();streamRecorder.abort();
 assert.equal(streamRecorder.state,'inactive');assert.equal(streamRecorder.chunks.length,0);
 assert.equal(ctx.mediaSources.length,1);assert(ctx.mediaSources[0].allDisconnects>0,'owned stream source was not released');
 await assert.rejects(scope.pcm.create({sampleRate:48000},null),/not supported/,'unsupported browser must reject so app can select MediaRecorder');
 assert(portCloses>=2);
 console.log(`PASS PCM2 exact Float32 stereo and WAV (${left.length} frames), absent-input silence, chunk recycling, direct/master ownership, release and compatibility rejection`);
})().catch(error=>{console.error(error);process.exitCode=1});
