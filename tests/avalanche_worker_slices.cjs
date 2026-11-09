'use strict';
// The production Worker driver must yield between bounded native render slices.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/instruments/04_entrophon_melodic_audio.js'),'utf8');
const a=source.indexOf('function __entrophonRenderWorkerMain'),z=source.indexOf('function __entrophonCreateRenderWorker',a);
let advances=0,sinceYield=0,maxSlice=0,yields=0,destroyed=0,result;
const b={console,Uint32Array,Float32Array,WebAssembly:{compile:async()=>({})},sampleRate:48000,
 setTimeout:fn=>{maxSlice=Math.max(maxSlice,sinceYield);sinceYield=0;yields++;queueMicrotask(fn)},
 postMessage:m=>{result=m},__entProcessor:class{constructor(){this.bridge={epoch:1,destroy(){destroyed++}};this.holdPreps=[{}];}
 async onMessage(){} async holdPrepareStems(h){h.prep={};h.tap={complete:true,ch:[{buf:new Float32Array([.1,.2])}]};}
 advanceHoldStemPrep(){advances++;sinceYield++;if(advances===33)this.holdPreps=[];}}};
vm.createContext(b);vm.runInContext(source.slice(a,z)+'\n__entrophonRenderWorkerMain();',b);
(async()=>{await b.onmessage({data:{type:'init',wasm:new Uint8Array(),holdInit:{}}});const r=new Uint32Array(64);r[26]=100;
 await b.onmessage({data:{type:'hold-program',sampleRate:48000,records:[r],offsets:[0]}});
 assert(!result.error,result.error);assert(yields>0,'long native preparation must yield Worker CPU');assert(maxSlice<=8,'bounded native advances between yields');assert.equal(advances,33);assert.equal(destroyed,1);assert(result.tap.complete);
 console.log('PASS cooperative native Worker slices with complete tap and exact processor disposal');
})().catch(e=>{console.error(e);process.exitCode=1});
