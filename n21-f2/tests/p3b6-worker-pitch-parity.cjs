'use strict';
const {Worker}=require('node:worker_threads'),fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const script=['01_instrument_model','02_synthesis_kernel','07_sound_designer','03_preparation_worker'].map(n=>fs.readFileSync('src/nodal/'+n+'.js','utf8')).join('\n');
const api=vm.runInNewContext(script+';({model:__XenNodalModel,kernel:createNodalSynthesisKernel,starter:nodalOpenStarter,entry:nodalPrepareWorkerEntry})');
const entrySource=`const {parentPort}=require('node:worker_threads');globalThis.self=globalThis;globalThis.postMessage=x=>parentPort.postMessage(x);parentPort.on('message',data=>globalThis.onmessage({data}));(${api.entry.toString()})(${vm.runInNewContext(script+';createNodalInstrumentModel').toString()},${api.kernel.toString()});`;
const worker=new Worker(entrySource,{eval:true});let seq=0;const jobs=new Map();
worker.on('message',m=>{const job=jobs.get(m.id);if(!job)return;jobs.delete(m.id);m.error?job.reject(Error(m.error)):job.resolve(m);});
worker.on('error',e=>{for(const j of jobs.values())j.reject(e);jobs.clear();});
function send(request){const id=++seq;return new Promise((resolve,reject)=>{jobs.set(id,{resolve,reject});worker.postMessage({...request,id});});}
(async()=>{
 let samples=0;
 for(const name of ['prism','hollow','reed']){
  const instrument=api.starter(name);
  const first=await send({type:'prepare',instrument,sampleRate:48000,contours:{volumeCurve:null,pitchCurve:null}});
  const frequencies=[61.234,173.321,253.987,501.012];
  const second=await send({type:'pitches',planId:first.id,frequencies,sampleRate:48000});
  const baseline=api.kernel().preparePacket(first.plan,frequencies,48000);
  assert.equal(JSON.stringify(second.prepared),JSON.stringify(baseline),`Worker pitch mismatch ${name}`);
  samples+=frequencies.length;
  worker.postMessage({type:'forget',planId:first.id});
  // FIFO port delivery ensures forget precedes this request.
  await assert.rejects(send({type:'pitches',planId:first.id,frequencies,sampleRate:48000}),/no longer retained/);
 }
 await worker.terminate();
 console.log('PASS P3B6 real worker pitch coefficient parity, forgotten plans fail closed, '+samples+' frequencies');
})().catch(async e=>{console.error(e);await worker.terminate();process.exitCode=1;});
