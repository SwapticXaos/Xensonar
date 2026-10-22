const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {Worker:ThreadWorker}=require('node:worker_threads');
const {resolveObjectURL}=require('node:buffer');
class BlobWorker {
 constructor(url){
  this.listeners=new Map();this.queue=[];this.dead=false;
  this.loading=resolveObjectURL(url).text().then(code=>{
   if(this.dead)return;
   this.thread=new ThreadWorker(`const {parentPort}=require('node:worker_threads');globalThis.self=globalThis;globalThis.postMessage=(data,transfer)=>parentPort.postMessage(data,transfer);globalThis.close=()=>parentPort.close();parentPort.on('message',data=>globalThis.onmessage?.({data}));\n${code}`,{eval:true});
   this.thread.on('message',data=>{const event={data};this.onmessage?.(event);for(const listener of this.listeners.get('message')||[])listener(event);});
   this.thread.on('error',error=>this.onerror?.({message:error.message,error}));
   for(const [data,transfer] of this.queue)this.thread.postMessage(data,transfer);this.queue=[];
  }).catch(error=>this.onerror?.({message:error.message,error}));
 }
 postMessage(data,transfer){if(this.thread)this.thread.postMessage(data,transfer);else this.queue.push([data,transfer]);}
 addEventListener(type,listener){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(listener);}
 removeEventListener(type,listener){this.listeners.get(type)?.delete(listener);}
 terminate(){this.dead=true;this.queue=[];return this.thread?.terminate();}
}
class PCMBuffer {
 constructor({numberOfChannels,length,sampleRate}) {this.numberOfChannels=numberOfChannels;this.length=length;this.sampleRate=sampleRate;this.duration=length/sampleRate;this.channels=Array.from({length:numberOfChannels},()=>new Float32Array(length));}
 getChannelData(c){return this.channels[c];}
 copyToChannel(data,c,start=0){this.channels[c].set(data,start);}
 copyFromChannel(data,c,start=0){data.set(this.channels[c].subarray(start,start+data.length));}
}
function load(root,{speed1=false,speed3Baseline=false,nodalFix12Baseline=false,forge443Baseline=false,forge443Files=null}={}){
 const manifest=JSON.parse(fs.readFileSync(path.join(root,nodalFix12Baseline?'tests/fixtures/nodal_fix12c_manifest.json':'source-manifest.json')));
 const storage=new Map();
 const sandbox={console,crypto:require("node:crypto").webcrypto,performance,Float32Array,Float64Array,Uint32Array,Uint8Array,Int32Array,Int16Array,Uint16Array,ArrayBuffer,DataView,TextEncoder,TextDecoder,structuredClone,DOMException,URL,Blob,AudioBuffer:PCMBuffer,OfflineAudioContext:class{createBuffer(c,n,s){return new PCMBuffer({numberOfChannels:c,length:n,sampleRate:s});}},setTimeout,clearTimeout,setInterval:()=>0,clearInterval:()=>{},queueMicrotask,atob,btoa,navigator:{userAgent:'Node offline DSP harness'},location:{href:'http://localhost/',search:''},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},addEventListener:()=>{},removeEventListener:()=>{},dispatchEvent:()=>true,requestAnimationFrame:()=>0,cancelAnimationFrame:()=>{},CustomEvent:class{},Event:class{},MutationObserver:class{observe(){}},document:{createElement:()=>({relList:{supports:()=>true},style:{},setAttribute:()=>{},removeAttribute:()=>{},appendChild:()=>{},addEventListener:()=>{},getContext:()=>null}),querySelectorAll:()=>[],getElementById:()=>null,addEventListener:()=>{},removeEventListener:()=>{}}};
 sandbox.window=sandbox;sandbox.self=sandbox;sandbox.sessionStorage=sandbox.localStorage;
 sandbox.Worker=BlobWorker;sandbox.setInterval=(...args)=>{const timer=setInterval(...args);timer.unref();return timer;};sandbox.clearInterval=clearInterval;
 const context=vm.createContext(sandbox);
 require('./sessions-test-helpers.cjs').installBootSnapshot(context,root);
 const partitionFile=path.join(root,'source-partitions.json');
 const origins=new Map();
 if(fs.existsSync(partitionFile))for(const group of JSON.parse(fs.readFileSync(partitionFile)).groups)for(const file of group.files)origins.set(file,group.original);
 const emittedFrozen=new Set();
 const code=manifest.files.map(f=>{
  const original=origins.get(f)||f;
  const frozen=path.join(root,'tests/fixtures/speed2_baseline',original);
  const speed3Frozen=path.join(root,'tests/fixtures/speed3_baseline',original);
  const replacement=speed3Baseline&&fs.existsSync(speed3Frozen)?speed3Frozen:speed1&&fs.existsSync(frozen)?frozen:null;
  if(replacement&&emittedFrozen.has(original))return '';
  if(replacement)emittedFrozen.add(original);
  const forgeFrozen=path.join(root,'tests/fixtures/f442_forge_baseline',f);
  const useForgeFrozen=(forge443Baseline||forge443Files?.includes(f))&&fs.existsSync(forgeFrozen);
  let s=fs.readFileSync(useForgeFrozen?forgeFrozen:replacement||path.join(root,f),'utf8');
  if(nodalFix12Baseline)s=require('./nodal_preservation.cjs').restoreFix12C(f,Buffer.from(s)).toString();
  if(f==='src/app/forge/02_boot_and_workspace_tools.js')s=s.replace('const kEe=CEe("root");iY.createRoot(kEe).render(u.jsx(P.StrictMode,{children:u.jsx(REe,{})}));','');
  return s.replace('await __ForgeF33.preloadAllMaterialIntakeStates();','').replaceAll('import.meta','({url:"http://localhost/"})');
 }).join('\n');
 vm.runInContext(code,context,{filename:'xensonar-offline.js'});
 return {context,run:s=>vm.runInContext(s,context),PCMBuffer};
}
module.exports={load,PCMBuffer};
if(require.main===module){const r=load(path.resolve(process.argv[2]||path.join(__dirname,'..')));console.log(r.run('({BR:typeof BR,tK:typeof tK,raw:typeof o5e,donor:typeof __F356Material,wb:typeof __F341Workbench})'));}
