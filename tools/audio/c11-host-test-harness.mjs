import vm from 'node:vm';
import {bundle,load,kernelModule} from './c11-test-harness.mjs';
const source=bundle('src/features/xensonar/browserImplant/worklet/processor.ts','iife');
const {XensonarBrowserC11Host}=await load('src/features/xensonar/browserImplant/worklet/browserC11Host.ts');
const pump=()=>new Promise(resolve=>setImmediate(resolve));
export function installAudioClock({sab=false,sr=48000}={}) {
 globalThis.window={setTimeout,clearTimeout,setInterval,clearInterval,addEventListener(){},removeEventListener(){},
  location:{pathname:'/test',protocol:'http:',search:'?browserWaveStarter=1&browserEntrophon=1'}};
 globalThis.crossOriginIsolated=sab;
 const clock={currentFrame:12800},instances=[],messages=[];
 const ctx={state:'running',sampleRate:sr,audioWorklet:{async addModule(){}},destination:{},get currentTime(){return clock.currentFrame/sr;}};
 globalThis.AudioWorkletNode=class {
  constructor(_ctx,_name,opts){
   const node=this;
   this.port={start(){},postMessage(message,transfer=[]){const data=structuredClone(message,{transfer});queueMicrotask(()=>node.processor.port.onmessage({data}));}};
   let Processor;
   const realm=vm.createContext({sampleRate:sr,currentFrame:clock.currentFrame,WebAssembly,ArrayBuffer,SharedArrayBuffer,Uint32Array,Float32Array,Atomics,
    AudioWorkletProcessor:class {port={start(){},postMessage(message,transfer=[]){
     const data=structuredClone(message,{transfer});messages.push(data);queueMicrotask(()=>node.port.onmessage?.({data}));
    }};},registerProcessor:(_name,ctor)=>{Processor=ctor;}});
   vm.runInContext(source,realm);this.realm=realm;this.processor=new Processor(opts);
   this.outputs=Array.from({length:opts.numberOfOutputs},()=>[new Float32Array(128),new Float32Array(128)]);
   instances.push(this);
  }
  connect(){}disconnect(){}
 };
 return {ctx,realm:clock,instances,messages,pump,
  async render(){for(const node of instances){node.realm.currentFrame=clock.currentFrame;node.processor.process([],node.outputs);}
   clock.currentFrame+=128;await pump();return instances[0]?.outputs;}
 };
}
export async function createHostedClock({sab=false,profile=0,sr=48000}={}) {
 const rig=installAudioClock({sab,sr});
 const host=new XensonarBrowserC11Host(rig.ctx,{},profile);
 if(!await host.createNode({compiledModule:kernelModule}))throw new Error('host not ready');
 host.unmute();await pump();
 return {...rig,host,outputs:rig.instances[0].outputs,get processor(){return rig.instances[0].processor;},
  async stop(){host.destroy();await pump();}};
}
