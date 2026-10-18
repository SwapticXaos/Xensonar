'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const loaderText=fs.readFileSync(path.join(__dirname,'../src/runtime/instrument/05_timing_and_admission.js'),'utf8');
const loader=loaderText.slice(loaderText.indexOf('async function jF('),loaderText.indexOf('const dne=',loaderText.indexOf('async function jF(')));
const source = fs.readFileSync(path.join(__dirname, '../src/nodal/04_audio_runtime.js'), 'utf8');
const from = source.indexOf('function createNodalLiveRuntime(');
const to = source.indexOf('const __XenNodalLive', from);
assert(from >= 0 && to > from, 'real Nodal Worklet loader must be available');

async function exercise({protocol, failedMethods=[]}) {
  const attempted = [], revoked = [];
  const destination={};
  const context = {state:'running',sampleRate:48000, currentTime:1, destination,
    audioWorklet:{async addModule(url){
      const method = url.split(':',1)[0]; attempted.push({method,url});
      if (failedMethods.includes(method)) throw new Error(`Unable to load a worklet's module (${method})`);
    }}, addEventListener(){}, removeEventListener(){}};
  const vmContext={
    location:{protocol}, Blob:global.Blob,
    URL:{createObjectURL(){return 'blob:fail-under-file-origin'},revokeObjectURL(url){revoked.push(url)}},
    AudioWorkletNode:class {constructor(ctx,name,options){assert.equal(ctx,context);assert.equal(name,'xensonar-nodal-instrument-v1');this.port={postMessage(){},close(){}};} connect(dest){assert.strictEqual(dest,destination);}disconnect(){}},
    nodalWorkletProcessorFactory(){}, createNodalSynthesisKernel(){},
    __XenNodalModel:{}, setTimeout,clearTimeout, WeakMap, Map, Promise, Object, Error,
  };
  vmContext.window=vmContext;
  vm.runInNewContext(loader+'\n'+source.slice(from,to)+'\nthis.make=createNodalLiveRuntime;', vmContext, {filename:'src/nodal/04_audio_runtime.js'});
  const runtime=vmContext.make({model:{},kernelFactory:vmContext.createNodalSynthesisKernel});
  const admission={acquire(){return {release(){}}}};
  let player, error;
  try{player=await runtime.createPlayer(context,destination,admission);}catch(e){error=e;}
  player?.dispose();
  return {attempted,revoked,error};
}
(async()=>{
 const file = await exercise({protocol:'file:',failedMethods:['blob']});
 assert.ifError(file.error);
 assert.equal(file.attempted[0].method,'data', 'file:// must prefer data: over blob: for Nodal Worklet, like the main XenSonar worklet');
 assert(decodeURIComponent(file.attempted[0].url).includes('registerProcessor,AudioWorkletProcessor'), 'data URL must include original Nodal processor source');
 const server = await exercise({protocol:'https:'});
 assert.ifError(server.error);
 assert.equal(server.attempted[0].method,'blob', 'served HTTPS should retain its existing Blob module path');
 assert.equal(server.revoked.length,1, 'blob: object URLs must be revoked');
 const serverFallback = await exercise({protocol:'https:',failedMethods:['blob']});
 assert.ifError(serverFallback.error);
 assert.deepEqual(serverFallback.attempted.map(x=>x.method),['blob','data'], 'served blob failures should fall back to data:');
 const failure = await exercise({protocol:'file:',failedMethods:['data','blob']});
 assert(failure.error,'both module loading failures must be surfaced');
 assert.match(failure.error.message,/Nodal|worklet|module/i);
 console.log('PASS FIX6B Nodal Worklet: file:// data-first, https blob-first, fallback, explicit errors');
})().catch(e=>{console.error('FAIL FIX6B Nodal Worklet:',e.stack);process.exitCode=1});
