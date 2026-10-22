'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/forge/module_bundle/22_materialIntakePersistence.js','utf8');
const body=source.slice(source.indexOf('"use strict";'),source.lastIndexOf('}'));
let reads=[],waiting=new Map(),records=new Map(),fail=new Set(),active=0,maxActive=0;
const store={get(id){reads.push(id);return new Promise((resolve,reject)=>{waiting.set(id,()=>{waiting.delete(id);fail.has(id)?reject(Error('read failure')):resolve(records.get(id)??null)});if(id.startsWith('asset:')){active++;maxActive=Math.max(maxActive,active);const old=waiting.get(id);waiting.set(id,()=>{active--;old()})}})},listPrefix:async()=>[],put:async row=>records.set(row.id,row),has:async()=>true};
const apiExports={};vm.runInNewContext(body,{exports:apiExports,__f35612RecordStore:()=>store,__f35612Finite:(v,d=0)=>Number.isFinite(v)?v:d,__f35612MaterialFingerprint:()=>'',Map,WeakMap,Float32Array,Float64Array,Uint8Array,ArrayBuffer,Blob,DOMException,Date,console,setTimeout,clearTimeout});
const api=apiExports,tick=()=>new Promise(r=>setImmediate(r));
function workspace(key,asset='shared'){records.set('workspace:'+key,{value:{source:{label:key,sourceAsset:{__materialIntakeAssetRef:'asset:'+asset}}}})}
function release(id){assert(waiting.has(id),'pending '+id);waiting.get(id)()}
(async()=>{
 assert.deepEqual(reads,[],'module evaluation performs no storage IO');
 workspace('one');workspace('two');records.set('asset:shared',{value:{monoSamples:new Float32Array(24)}});
 const controller=new AbortController(),aborted=api.ensureMaterialIntakeState('one',{signal:controller.signal}).catch(e=>e.name),joined=api.ensureMaterialIntakeState('one'),other=api.ensureMaterialIntakeState('two');
 controller.abort();assert.equal(await aborted,'AbortError');assert.equal(reads.filter(x=>x==='workspace:one').length,1);
 release('workspace:one');release('workspace:two');await tick();assert.equal(reads.filter(x=>x==='asset:shared').length,1,'two workspace readers join shared PCM fetch');release('asset:shared');const [a,b]=await Promise.all([joined,other]);assert.notEqual(a.source.sourceAsset,b.source.sourceAsset);assert.notEqual(a.source.sourceAsset.monoSamples,b.source.sourceAsset.monoSamples);a.source.sourceAsset.monoSamples[0]=.75;assert.equal(b.source.sourceAsset.monoSamples[0],0);structuredClone(a.source.sourceAsset.monoSamples,{transfer:[a.source.sourceAsset.monoSamples.buffer]});assert.equal(b.source.sourceAsset.monoSamples.length,24);assert.equal(a.source.sourceAsset.monoSamples.length,0);assert.equal(maxActive,1);
 const count=reads.length;await api.ensureMaterialIntakeState('one');assert.equal(reads.length,count,'fulfilled cache avoids another read');
 let pending=api.ensureMaterialIntakeState('missing');release('workspace:missing');assert.equal(await pending,null);await api.ensureMaterialIntakeState('missing');assert.equal(reads.filter(x=>x==='workspace:missing').length,1,'known absence differs from unloaded');
 workspace('retry','broken');fail.add('workspace:retry');pending=api.ensureMaterialIntakeState('retry');release('workspace:retry');await assert.rejects(pending,/read failure/);await tick();fail.clear();records.set('asset:broken',{value:{monoSamples:new Float32Array(5)}});pending=api.ensureMaterialIntakeState('retry');release('workspace:retry');await tick();release('asset:broken');assert.equal((await pending).source.sourceAsset.monoSamples.length,5);
 workspace('broken','absent');pending=api.ensureMaterialIntakeState('broken');release('workspace:broken');await tick();release('asset:absent');await assert.rejects(pending,/Saved donor audio is missing/);assert.equal(api.getPreloadedMaterialIntakeState('broken'),null);
 workspace('queueA','a');workspace('queueB','b');records.set('asset:a',{value:{}});records.set('asset:b',{value:{}});const first=api.ensureMaterialIntakeState('queueA'),second=api.ensureMaterialIntakeState('queueB');release('workspace:queueA');release('workspace:queueB');await tick();assert(waiting.has('asset:a'));assert(!waiting.has('asset:b'));release('asset:a');await tick();release('asset:b');await Promise.all([first,second]);assert.equal(maxActive,1,'asset clone reads are bounded');
 console.log('PASS demand-only reads, per-key and per-asset joins, abort isolation, truthful absence, retry, missing-audio protection, bounded reader');
})().catch(e=>{console.error(e);process.exitCode=1});
