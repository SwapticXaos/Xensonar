'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),{Worker}=require('worker_threads');
const {harness}=require('./emilia3_harness.cjs');
const {context,api}=harness();vm.runInContext(fs.readFileSync('src/forge/analysis/04_painted_voices.js','utf8'),context);
const file='src/forge/emilia/06_preview_worker.js';
assert(fs.existsSync(file),'Emilia preview requires a dedicated worker owner');
vm.runInContext(fs.readFileSync(file,'utf8'),context);
const helpers=fs.readFileSync('src/forge/emilia/01_nodal_carrier.js','utf8');
const trim=helpers.slice(helpers.indexOf('  function recipeTrim('),helpers.indexOf('  async function renderPCM('));
vm.runInContext('const trimCache=new Map();'+trim+';globalThis.recipeTrimForTest=recipeTrim;',context);
const create=vm.runInContext('createEmiliaPreviewWorker',context),kernel=vm.runInContext('createNodalSynthesisKernel',context);
let workers=0,terminated=0;
function makeWorker(source){workers++;const w=new Worker(`const {parentPort}=require('worker_threads');globalThis.postMessage=(v,t)=>parentPort.postMessage(v,t);parentPort.on('message',data=>globalThis.onmessage({data}));`+source,{eval:true});const wrapper={postMessage:v=>w.postMessage(v),terminate(){terminated++;w.terminate();}};w.on('message',data=>wrapper.onmessage?.({data}));w.on('error',error=>wrapper.onerror?.({message:error.message}));return wrapper;}
const renderer=create({kernelFactory:kernel,renderPCM:api.renderPCM,recipeTrim:context.recipeTrimForTest,audibleHz:vm.runInContext('__carrierAudibleHz',context),engine:'emilia-hx-reciprocal-v4',createWorker:makeWorker});
(async()=>{
 for(const rate of [16000,44100,48000]){const recipe=api.snapshot();context.recipe=recipe;const plan=vm.runInContext('compileEmiliaNetworkColor(recipe.model)',context),durationSec=.18;
  const expected=await api.renderPCM({instrument:recipe,tracks:[{at:t=>({hz:220,gain:t<1.48?.72:0}),gainAt:t=>t<1.48?.72:0}],durationSec,sampleRate:rate});
  const actual=await renderer.render({instrument:recipe,plan,durationSec,sampleRate:rate});assert.deepEqual(actual.left,expected.left);assert.deepEqual(actual.right,expected.right);
 }
 const stale=renderer.render({instrument:api.snapshot(),plan:vm.runInContext('compileEmiliaNetworkColor(recipe.model)',context),durationSec:2,sampleRate:48000}).catch(e=>e.name);renderer.cancel();assert.equal(await stale,'AbortError');assert.equal(workers,terminated);renderer.dispose();console.log('PASS exact Emilia preview PCM at 16/44.1/48 kHz; cancellation terminates worker; zero worker left behind');
})().catch(e=>{renderer.dispose();console.error(e);process.exitCode=1});
