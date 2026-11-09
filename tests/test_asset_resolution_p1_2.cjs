'use strict';
/* P1.2 acceptance/negative gates: read-only borrowed PCM resolver and real donor load seam. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root,file),'utf8');
const ctx = vm.createContext({Float32Array, Object, Number, Set, Map});
vm.runInContext(read('src/contracts/01_asset_contract.js'),ctx);
vm.runInContext(read('src/contracts/02_asset_resolution.js'),ctx);
const contracts = vm.runInContext('__XenDataContractsV1',ctx);
const references = vm.runInContext('__XenAssetResolutionV1',ctx);
const legacyId = 'asset:Vokal Ä|48000|1|2.000000|4|0|ab12cdef';
const monoSamples = new Float32Array([0.1,0.2,-0.5,0.4]);
const pcm = {sampleRate:48000,monoSamples,channelCount:1};
assert.equal(references.parse(legacyId).namespace,'asset');
assert.equal(references.parse(legacyId).key,legacyId.slice(6));
assert.equal(references.parse('melodic-sample:s1').key,'s1');
assert.equal(references.parse(legacyId).id,legacyId,'Legacy IDs must not be rewritten');
assert.throws(()=>references.validate({...references.parse(legacyId),schemaVersion:2}),/version/i);
assert.throws(()=>references.validate({...references.parse(legacyId),key:'other'}),/match/i);
assert.equal(contracts.describeLegacyPCM(pcm,{producer:'donor-library',assetId:legacyId}).payload.assetRef,legacyId);
for(const invalid of [null,'','unknown:x','asset:','melodic-sample:','asset:\0binary','asset:bad\nline','asset:x'.repeat(260)]) {
 assert.throws(()=>references.parse(invalid),/reference|namespace|length|empty|invalid/i,String(invalid));
}
assert.throws(()=>references.createResolver([
 {namespace:'asset',producer:'donor-library',load:async()=>pcm},
 {namespace:'asset',producer:'donor-library',load:async()=>pcm}
]),/duplicate/i);
assert.throws(()=>references.createResolver([{namespace:'unknown',producer:'unknown',load:async()=>pcm}]),/namespace/i);
const resolver = references.createResolver([
 {namespace:'asset',producer:'donor-library',load:async()=>pcm},
 {namespace:'melodic-sample',producer:'melodic-sample',load:async()=>pcm}
]);
(async()=>{
  const resolved = await resolver.resolve(legacyId);
  assert.strictEqual(resolved.asset,pcm,'Must return identical original audio object (no copy)');
  assert.strictEqual(resolved.asset.monoSamples,monoSamples);
  assert.equal(resolved.xenData.payload.assetRef,legacyId);
  assert.equal(resolved.xenData.kind,'audio/pcm');
  assert.equal((await resolver.resolve('melodic-sample:s1')).xenData.payload.assetRef,'melodic-sample:s1');
  const missing=references.createResolver([{namespace:'asset',producer:'donor-library',load:async()=>null}]);
  await assert.rejects(missing.resolve(legacyId),/missing/i);
  await assert.rejects(missing.resolve('melodic-sample:s1'),/provider/i);
  const bad=references.createResolver([{namespace:'asset',producer:'donor-library',load:async()=>({blob:{}})}]);
  await assert.rejects(bad.resolve(legacyId),/PCM|audio|samples/i);
  // Exercise the actual DonorLibrary load implementation with adapter-backed storages.
  const donorSource=read('src/storage/01_donor_library.js');
  const from=donorSource.indexOf('function createDonorLibrary(storage, ports) {');
  const to=donorSource.indexOf('const records =',from);
  assert.ok(from>-1&&to>from);
  let linkedReads=0,materialReads=0;
  const donorCtx=vm.createContext({Float32Array, Object, Number, Set, Map,Date,
    __XenAssetResolutionV1:references,
    __F35614AudioRef:{isLinkedSample:id=>id.startsWith('melodic-sample:'),sampleIdFromAsset:id=>id.slice(15),sampleId:id=>'melodic-sample:'+id,marker:id=>({__materialIntakeAssetRef:id})},
    __f35612Finite:Number,
  });
  vm.runInContext('const PREFIX = \"donor-library:preset:\"; const smallClone = x => JSON.parse(JSON.stringify(x));',donorCtx);
  vm.runInContext(donorSource.slice(from,to),donorCtx);
  const fn=vm.runInContext('createDonorLibrary',donorCtx);
  let currentRef=legacyId;
  const fakeStore={get:async key=>{
    if(key.startsWith('donor-library:preset:'))return {value:{id:'d1',version:'donor-library-v1',assetId:currentRef,source:{},selection:{fineLoopRange:{startSec:0,durationSec:1}}}};
    materialReads++;return key===legacyId?{value:pcm}:null;
  }};
  assert.throws(()=>fn(fakeStore),/read port/i);
  const api=fn(fakeStore,{loadLinkedSample:async ref=>{
    linkedReads++;assert.equal(ref,'melodic-sample:s1');return pcm;
  }});
  const donor=await api.load('d1');
  assert.strictEqual(donor.source.sourceAsset,pcm);
  assert.equal(materialReads,1);assert.equal(linkedReads,0);
  currentRef='melodic-sample:s1';
  const linked=await api.load('d1');
  assert.strictEqual(linked.source.sourceAsset,pcm);
  assert.equal(linkedReads,1);assert.equal(materialReads,1);
  currentRef='asset:not-in-store';
  await assert.rejects(api.load('d1'),/missing/i);
  assert.equal(materialReads,2);
  console.log('P1.2 ASSET RESOLUTION PASS: legacy fingerprint, namespaces, missing/duplicate refs, zero-copy, real donor load');
})().catch(error=>{console.error(error);process.exitCode=1;});
