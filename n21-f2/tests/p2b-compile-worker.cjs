'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const vm=require('node:vm'),{Worker}=require('node:worker_threads');
const root='src/nodal/';
const modelText=fs.readFileSync(root+'01_instrument_model.js','utf8');
const kernelText=fs.readFileSync(root+'02_synthesis_kernel.js','utf8');
const workerText=fs.readFileSync(root+'03_preparation_worker.js','utf8');
const resolverText=fs.readFileSync(root+'06_melodic_bridge.js','utf8').split('function nodalComposerSourceFields(')[0];
const sandbox={};vm.createContext(sandbox);vm.runInContext(modelText+'\n'+kernelText+'\n'+resolverText+'\n'+workerText+'\n;globalThis.TestNodalModel=__XenNodalModel;',sandbox);
assert.equal(typeof sandbox.nodalPrepareWorkerEntry,'function');
const source=`const {parentPort}=require('node:worker_threads');globalThis.self=globalThis;globalThis.postMessage=x=>parentPort.postMessage(x);parentPort.on('message',data=>globalThis.onmessage({data}));(${sandbox.nodalPrepareWorkerEntry.toString()})(${sandbox.createNodalInstrumentModel.toString()},${sandbox.createNodalSynthesisKernel.toString()});`;
const worker=new Worker(source,{eval:true});let seq=0;const jobs=new Map();
worker.on('message',data=>{const j=jobs.get(data.id);if(j){jobs.delete(data.id);data.error?j.reject(Error(data.error)):j.resolve(data);}});
worker.on('error',error=>{for(const job of jobs.values())job.reject(error);jobs.clear();});
function inWorker(instrument,rate,contours){const id=++seq;return new Promise((resolve,reject)=>{jobs.set(id,{resolve,reject});worker.postMessage({id,instrument,sampleRate:rate,contours});});}
function starter(version,n){return sandbox.TestNodalModel.normalize({schema:'xensonar.nodal-instrument',schemaVersion:version,kernelVersion:'coupled-modal-v'+version,name:'parity',referenceHz:220,seed:42,nodes:Array.from({length:n},(_,i)=>({id:'n'+i,role:i%4===0?'fold':i%3===0?'formant':'resonator',ratio:1+i*.17,cents:0,x:i/n,y:.3, radius:.7,strength:.7,excitation:.6,pickup:.8})),blockedEdges:[],excitation:{kind:'tone',level:.5},coupling:.02,material:{wave:'saw'},articulation:{attackSec:.005,releaseSec:.12,durationSec:.5}});}
(async()=>{
 let count=0;
 for(const version of [1,2])for(const n of [1,3,7,12])for(const rate of [44100,48000,96000]){
  const instrument=starter(version,n),contours={volumeCurve:null,pitchCurve:null};
  const baseline=sandbox.TestNodalModel.compile(instrument);
  const result=await inWorker(instrument,rate,contours);
  assert.equal(JSON.stringify(result.plan),JSON.stringify(baseline),`plan identical v${version} n${n} ${rate}`);
  const baselinePrepared=sandbox.createNodalSynthesisKernel().preparePacket(baseline,[220],rate,true);
  assert.equal(JSON.stringify(result.prepared),JSON.stringify(baselinePrepared),`prepared packet identical v${version} n${n} ${rate}`);
  count++;
 }
 await assert.rejects(inWorker({schema:'broken'},48000,{}),/Unsupported instrument version/);
 await worker.terminate();
 console.log('PASS worker compile + prepared payload parity '+count+' combinations');
})().catch(async e=>{console.error(e);await worker.terminate();process.exitCode=1;});
