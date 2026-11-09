'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const backend=read('src/audio/entrophon/02_worklet_and_voice_backend.js'),worklet=JSON.parse(backend.match(/T8=("(?:\\.|[^"\\])*")/)[1]);
const wasm=Buffer.from(JSON.parse(read('src/audio/entrophon/01_wasm_asset.js').match(/jMe=("(?:\\.|[^"\\])*")/)[1]),'base64');
const common={console,performance,setTimeout,clearTimeout,Math,Map,Set,Uint32Array,Float32Array,Float64Array,Int16Array,Int32Array,Uint8Array,ArrayBuffer,WebAssembly,sampleRate:48000,currentFrame:0,__entFrame:0};
const bankSource=read('src/runtime/instrument/05_timing_and_admission.js').match(/ire=(`(?:\\.|[^`\\])*`)/)[1];
let bank;const bankBox={Float32Array,Float64Array,Math,self:{close(){},postMessage:m=>{if(m.bank)bank=m.bank}}};
vm.createContext(bankBox);vm.runInContext('const source='+bankSource+';eval(source);',bankBox);bankBox.self.onmessage({data:{type:'prepare',session:1}});assert.equal(bank.length,782718);
const tanh=Float64Array.from({length:65537},(_,i)=>Math.tanh(i*8/65536)),init={profile:1,wasmBytes:wasm.buffer.slice(wasm.byteOffset,wasm.byteOffset+wasm.byteLength),waveBank:bank,waveTanh:tanh};
function box(){const b={...common,AudioWorkletProcessor:class{constructor(){this.port={events:[],postMessage(m){this.events.push(m)},start(){}}}},registerProcessor(n,C){b.Processor=C;b.__entProcessor=C}};vm.createContext(b);vm.runInContext(worklet.replace(/\bcurrentFrame\b/g,'globalThis.__entFrame'),b);return b;}
async function live(){const b=box(),h=new b.Processor({});await h.onMessage({type:'INIT',...init});assert(h.ready);await h.onMessage({type:'SET_MUTED',muted:false});return {b,h};}
const source=read('src/instruments/04_entrophon_melodic_audio.js'),iWorker=source.indexOf('function __entrophonRenderWorkerMain'),jWorker=source.indexOf('function __entrophonCreateRenderWorker',iWorker);
async function prepared(record){const b=box();let result;b.postMessage=x=>{result=x};vm.runInContext(source.slice(iWorker,jWorker)+'\n__entrophonRenderWorkerMain();',b);
 await b.onmessage({data:{type:'init',wasm,holdInit:init}});assert(result.ready);
 await b.onmessage({data:{type:'hold-program',sampleRate:48000,records:[new Uint32Array(record)],offsets:[0]}});
 assert(!result.error,result.error);assert(result.tap.complete);return result.tap;}
const output=()=>Array.from({length:9},()=>[new Float32Array(128),new Float32Array(128)]);
function flatten(out,pcm,f){for(let c=0;c<18;c++)pcm[c].set(out[c>>1][c&1],f);}
async function single(record,frames){const {h,b}=await live(),out=output(),pcm=Array.from({length:18},()=>new Float32Array(frames));record=new Uint32Array(record);record[1]=1;record[2]=h.bridge.epoch;record[3]=0;await h.onMessage({type:'HOT_TONE_PLAN',buffer:record.buffer});for(let f=0;f<frames;f+=128){b.__entFrame=f;h.process([],out);flatten(out,pcm,f)}assert.equal(h.kernelAccepted,1);h.bridge.destroy();return pcm;}
(async()=>{
 const {records}=require('./avalanche_native_timbre.cjs'),frames=48000*2,iv=48000*240/(108*32);
 const [a,b]=await Promise.all(records.map(r=>prepared(r))),[ra,rb]=await Promise.all(records.map(r=>single(r,frames)));
 const {h,b:clock}=await live(),out=output(),actual=Array.from({length:18},()=>new Float32Array(frames)),expected=Array.from({length:18},()=>new Float32Array(frames));
 const p={id:1,start:0,index:0,interval:iv,pattern:Array(32).fill(1),mode:'tap',committed:true,prepared:true,nrec:1,tap:a};h.holdPlans=[p];
 const changeAt=12800;let sent=false,swappedIndex=null;
 for(let f=0;f<frames;f+=128){clock.__entFrame=f;if(!sent&&f>=changeAt){sent=true;await h.onMessage({type:'HOLD_TIMBRE',id:1,epoch:h.bridge.epoch,revision:1,tap:b});}
  h.process([],out);flatten(out,actual,f);if(swappedIndex===null){const m=h.port.events.find(x=>x.type==='HOLD_TIMBRE_APPLIED');if(m)swappedIndex=m.index;}}
 assert(swappedIndex!==null,'prepared timbre is applied by actual Hold clock');
 for(let k=0;Math.round(k*iv)<frames;k++){const ref=k<swappedIndex?ra:rb,at=Math.round(k*iv);for(let c=0;c<18;c++)for(let j=0;j<frames-at;j++)expected[c][at+j]+=ref[c][j];}
 let error=0,energy=0;for(let c=0;c<18;c++)for(let f=0;f<frames;f++){error=Math.max(error,Math.abs(actual[c][f]-expected[c][f]));energy+=actual[c][f]*actual[c][f];}
 assert(energy>0);assert(error<2e-6,'native worker + old-tail/new-attack PCM parity '+error);assert(!h.holdMissedSteps);assert(!h.holdPrefixUnderruns);
 const large=()=>({complete:true,len:512000,BASE:128,ch:Array.from({length:8},(_,idx)=>({idx,buf:new Float32Array(512000)}))});
 h.holdPlans.push({id:2,nextTap:large(),pattern:[0]},{id:3,nextTap:large(),pattern:[0]});
 const incoming=large();await h.onMessage({type:'HOLD_TIMBRE',id:1,epoch:h.bridge.epoch,revision:2,tap:incoming});
 assert(h.port.events.some(x=>x.type==='HOLD_MOD_REJECT'&&x.reason==='memory-bound'),'queued resting plans count toward memory bound');
 await h.onMessage({type:'HOLD_STOP',id:1});await h.onMessage({type:'HOLD_TIMBRE',id:1,epoch:h.bridge.epoch,revision:2,tap:a});assert(!h.holdPlans.some(x=>x?.id===1));h.bridge.destroy();
 // Execute the actual controller -> modulation coordinator -> native worker ->
 // Worklet handoff as well as the independent PCM oracle above.
 const liveHost=await live(),listeners=new Set(),callbacks={};
 const controlContext={state:'running',sampleRate:48000,currentTime:0};
 const controlBox={...common,AbortController,Worker:class{},performance:{now:()=>0},queueMicrotask,GMe:()=>wasm,
  __XenAvalanche:{observe(){},dragging:()=>true,onTimbre:(name,fn)=>{callbacks[name]=fn}},
  __entrophonCreateRenderWorker:()=>{const workerBox=box();let reply;workerBox.postMessage=data=>{reply=data};vm.runInContext(source.slice(iWorker,jWorker)+'\n__entrophonRenderWorkerMain();',workerBox);return {async send(data){await workerBox.onmessage({data});return reply;},dispose(){}};}};
 vm.createContext(controlBox);vm.runInContext(read('src/audio/hold_resident.js')+'\n'+read('src/audio/hold_modulation.js')+'\nglobalThis.H=__XenHoldResident;globalThis.M=__XenHoldMod;',controlBox);
 const host={profile:1,epoch:liveHost.h.bridge.epoch,canSubmit:true,node:{port:{addEventListener:(type,fn)=>listeners.add(fn),removeEventListener:(type,fn)=>listeners.delete(fn),postMessage:m=>liveHost.h.onMessage(m)}}};
 liveHost.h.port.postMessage=m=>{for(const fn of [...listeners])fn({data:m});};
 await controlBox.M.prepare(controlContext,init);
 const session=controlBox.H.session('klaviatur:KeyA',{intervalMs:100,startedAtMs:0,pulseCount:1},controlContext,Array(24).fill(1),'marimba',217.37);session.gradientEnabled=true;session.gradientMode='sitar_rise';
 controlBox.H.capture(session,host,new Uint32Array(records[0]),()=>new Uint32Array(records[1]));await Promise.resolve();
 for(let guard=0;!session.armed;guard++){assert(guard<100);await new Promise(resolve=>setTimeout(resolve,2));liveHost.b.__entFrame=guard*128;liveHost.h.process([],output());}
 callbacks.klaviatur(.8,1000);for(let guard=0;!liveHost.h.holdPlans.find(p=>p?.id===session.id)?.nextTap;guard++){assert(guard<100);await new Promise(resolve=>setTimeout(resolve,2));}
 controlBox.H.clear();controlBox.M.dispose(controlContext);liveHost.h.bridge.destroy();
 console.log(JSON.stringify({status:'PASS',nativeWorker:true,channels:18,steps:32,swappedIndex,maxPCMError:error,oldTailsPreserved:true,stoppedSwapIgnored:true}));
})().catch(e=>{console.error(e);process.exitCode=1});
