'use strict';
// Exercise the real FLAC control bridge and real diagnostic stamping algorithm.
// The Worker protocol is mocked so copied PCM is observable before encoding.
// This is a source-identity test, not a claim of Float32 lossless FLAC coding:
// the current FLAC encoder intentionally stores signed 16-bit PCM.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const encoder=fs.readFileSync(path.join(root,'src/audio/03_flac_encoder.js'),'utf8');
const acoustic=fs.readFileSync(path.join(root,'src/audio/03_acoustic_sync.js'),'utf8');
const recording=fs.readFileSync(path.join(root,'src/audio/03_recorder.js'),'utf8');
const workers=[],urls=new Set();let serial=0,stampCalls=0;
class Worker {
 constructor(url){assert(urls.has(url));this.blocks=[];this.frames=0;this.bytes=0;this.terminated=false;workers.push(this)}
 emit(data){queueMicrotask(()=>this.onmessage?.({data}))}
 postMessage(message,transfer=[]){
  const m=structuredClone(message,{transfer});
  if(m.type==='init'){this.frames=m.frames;this.emit({type:'need',offset:0,frames:Math.min(65536,m.frames)});return}
  assert.equal(m.type,'pcm');
  this.blocks.push({offset:m.offset,left:new Float32Array(m.left),right:new Float32Array(m.right)});
  const encoded=new ArrayBuffer(8);this.bytes+=encoded.byteLength;this.emit({type:'encoded',data:encoded});
  const offset=m.offset+m.left.length;
  if(offset<this.frames)this.emit({type:'need',offset,frames:Math.min(65536,this.frames-offset)});
  else{const header=new ArrayBuffer(42);new Uint8Array(header,0,4).set([102,76,97,67]);this.emit({type:'done',frames:this.frames,bytes:this.bytes,header})}
 }
 terminate(){this.terminated=true}
}
const scope={Worker,ArrayBuffer,Blob,Float32Array,Uint8Array,Math,Number,Date,Array,Object,Map,Set,
 console,performance:{now:()=>0},setTimeout:()=>0,
 URL:{createObjectURL(){const u='blob:flac-'+(++serial);urls.add(u);return u},revokeObjectURL(u){urls.delete(u)}},
 TW(buffer){return{left:buffer.getChannelData(0),right:buffer.getChannelData(1)}}};
vm.createContext(scope);vm.runInContext(acoustic+'\n'+encoder+'\nglobalThis.encode=f319RecorderFlacEncode;globalThis.plan=f319AcousticPlan;globalThis.originalStamp=f319AcousticStampBlock;',scope);
scope.f319AcousticStampBlock=(...args)=>{stampCalls++;return scope.originalStamp(...args)};
const n=70031,left=Float32Array.from({length:n},(_,i)=>Math.sin(i*.173)*.1),right=Float32Array.from({length:n},(_,i)=>Math.cos(i*.113)*.15);
const originalLeft=left.slice(),originalRight=right.slice();
const buffer={sampleRate:48000,length:n,getChannelData:ch=>ch?right:left};
function assertSourceUnchanged(){assert.deepEqual(left,originalLeft);assert.deepEqual(right,originalRight)}
function flatten(worker,lane){const result=new Float32Array(n);for(const block of worker.blocks)result.set(block[lane],block.offset);return result}
(async()=>{
 const clean=await scope.encode(buffer,null,null),plainWorker=workers.at(-1);
 assert.equal(stampCalls,0,'ordinary export must not inject diagnostic sound');
 assert.equal(plainWorker.blocks.length,2,'copy protocol must cross the 65536-frame boundary');
 assert.deepEqual(flatten(plainWorker,'left'),originalLeft);assert.deepEqual(flatten(plainWorker,'right'),originalRight);
 assertSourceUnchanged();assert.equal(clean.type,'audio/flac');assert(plainWorker.terminated);
 // Marker at 64800 crosses a Worker chunk boundary, testing absolute offsets.
 const plan=scope.plan(buffer,null,[{id:'diagnostic-only',timeMs:1350}]);
 assert.equal(plan.stamps.length,1);
 const diagnostic=await scope.encode(buffer,null,null,plan),markedWorker=workers.at(-1);
 assert.equal(stampCalls,2,'explicit diagnostic plan must stamp both copied blocks');
 const changedL=flatten(markedWorker,'left'),changedR=flatten(markedWorker,'right');
 let altered=0;
 for(let i=0;i<n;i++){
  if(changedL[i]!==originalLeft[i]||changedR[i]!==originalRight[i]){altered++;assert(i>=64800&&i<64800+1536,'diagnostic mutation escaped its marker window')}
 }
 assert(altered>800,'explicit diagnostic export did not add its fingerprint');
 assertSourceUnchanged();assert.equal(diagnostic.type,'audio/flac');assert(markedWorker.terminated);
 assert.equal(urls.size,0,'Worker URLs must be released');
 // Stufe 2b (09.11.2026): signature gained bitDepth (24-bit FLAC, MRU01/FF01); the contract is unchanged:
 // diagnostic sync tones default to off.
 assert(/downloadFlac=async\(Q="full",\{syncTones=false(?:,[^}]*)?\}=\{\}\)/.test(recording),'product export must default diagnostic tones off');
 assert(recording.includes('syncTones?f.current:[]'),'ordinary product export must supply no acoustic markers');
 // Stufe 2b: filename now carries the bit depth (`-${bitDepth}bit-diagnostic-sync.flac`, MRU01/FF01).
 assert(recording.includes("${syncTones?'-diagnostic-sync':''}.flac"),'diagnostic file must have an explicit filename');
 console.log('PASS ordinary FLAC preserves copied program PCM; explicit diagnostic stamping spans chunks without mutating source buffers');
})().catch(error=>{console.error(error);process.exitCode=1});
