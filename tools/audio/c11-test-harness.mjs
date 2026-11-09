import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const esbuild=require(process.env.XENSONAR_ESBUILD_MODULE||'esbuild');
export const root=path.resolve(import.meta.dirname,'../..');
export function bundle(file,format='esm') {
 return esbuild.buildSync({entryPoints:[path.join(root,file)],bundle:true,write:false,format,platform:'browser'}).outputFiles[0].text;
}
export async function load(file) {
 return import('data:text/javascript;base64,'+Buffer.from(bundle(file)).toString('base64'));
}
export const kernelModule=await WebAssembly.compile(fs.readFileSync(path.join(root,'tools/browser-implant/build-wasm/xensonar-c11.wasm')));
const processorSource=bundle('src/features/xensonar/browserImplant/worklet/processor.ts','iife');
const {allocateTonePlanRing,RingbufTonePlanWriter}=await load('src/features/xensonar/browserImplant/transport/ringbufTonePlan.ts');
export const {TonePlanRecordEncoder}=await load('src/features/xensonar/browserImplant/protocol/tonePlanRecord.ts');
export async function createClock({sab=false,sr=48000,quantum=128,initialFrame=0,profile=0,sourceOverride=processorSource}={}) {
 let Processor;
 const messages=[];
 const context=vm.createContext({sampleRate:sr,currentFrame:initialFrame,WebAssembly,ArrayBuffer,SharedArrayBuffer,Uint32Array,Float32Array,Atomics,
  AudioWorkletProcessor:class{port={postMessage:m=>messages.push(m),start(){}};},
  registerProcessor:(_name,ctor)=>{Processor=ctor;}});
 vm.runInContext(sourceOverride,context);
 const ring=sab?allocateTonePlanRing(32):null;
 const writer=ring?new RingbufTonePlanWriter(ring):null;
 const processor=new Processor({processorOptions:ring?{tonePlanSAB:ring}:{}});
 await processor.onMessage({type:'INIT',compiledModule:kernelModule,profile});
 const outputs=Array.from({length:profile===1?7:1},()=>[new Float32Array(quantum),new Float32Array(quantum)]);
 return {processor,context,messages,outputs,sr,quantum,
  render(){processor.process([],outputs);context.currentFrame+=quantum;return outputs[0][0];},
  send(words){if(writer)return writer.trySend(words);void processor.onMessage({type:'HOT_TONE_PLAN',buffer:words.slice().buffer});return true;},
  message(msg){return processor.onMessage(msg);},
  get epoch(){return processor.bridge.epoch;},
  get frame(){return context.currentFrame;},
  result(token){return messages.findLast(m=>m.type==='RECORD_RESULT'&&m.token===token);},
  stop(){return processor.onMessage({type:'STOP'});}
 };
}
export function toneRecord(clock,token,frame,epoch=clock.epoch,duration=4800) {
 return new TonePlanRecordEncoder().encode({token,epoch,frame,tones:[{frequencyHz:440,gain:0.1,cutoffHz:8000,resonance:0.7,delayFrames:0,durationFrames:duration,waveform:0}]});
}
