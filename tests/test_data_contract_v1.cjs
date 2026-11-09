'use strict';
/** P1 red/green integration gates for the real Forge->Material WAV and Sample->Donor bridges. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const src=read('src/contracts/01_asset_contract.js');
const context=vm.createContext({Blob, Float32Array, ArrayBuffer, Object, Number, String, Set});
vm.runInContext(src,context,{filename:'src/contracts/01_asset_contract.js'});
const contract=vm.runInContext('__XenDataContractsV1',context);
const pcm={sampleRate:48000,monoSamples:new Float32Array([.2,-.1,0,.8]),channelCount:1};
const info=contract.describeLegacyPCM(pcm,{producer:'spectral-forge',assetId:'asset:forge-11'});
assert.equal(info.format,'xensonar.asset');
assert.equal(info.schemaVersion,1);
assert.equal(info.kind,'audio/pcm');
assert.equal(info.audio.sampleRate,48000);
assert.equal(info.audio.frames,4);
assert.equal(info.payload.assetRef,'asset:forge-11');
assert.equal(info.audio.channelCount,1);
assert.equal(info.audio.encoding,'f32-planar');
assert.ok(!('samples' in info.payload),'PCM must not be copied into descriptor');
assert.ok(!('tuning' in info),'No implicit 12-EDO/default tuning');
assert.equal(contract.validate(info,{kind:'audio/pcm'}).kind,'audio/pcm');
assert.equal(contract.validate(JSON.parse(JSON.stringify(info))).kind,'audio/pcm');
assert.throws(()=>contract.validate({...info,schemaVersion:5}),/version/i);
assert.throws(()=>contract.validate({...info,kind:'unknown'}),/kind/i);
assert.throws(()=>contract.describeLegacyPCM({sampleRate:0,monoSamples:new Float32Array([1])},{producer:'test'}),/sample rate/i);
assert.throws(()=>contract.describeLegacyPCM({...pcm,monoSamples:[]},{producer:'test'}),/PCM|samples|channel/i);
assert.throws(()=>contract.describeLegacyPCM(pcm,{producer:'test',assetId:'../bad'}),/reference/i);
const validWav=new Blob([Buffer.alloc(44),Buffer.from([1,2])],{type:'audio/wav'});
const transfer=contract.bindWavTransfer({blob:validWav,sourceVersion:'forge2-a',renderMode:'forge-2'},
 {producer:'spectral-forge'});
assert.strictEqual(transfer.blob,validWav,'The existing blob must be reused');
assert.ok(!Object.keys(transfer).includes('xenData'),'New contract metadata must not alter legacy enumeration/persistence');
assert.equal(transfer.xenData.kind,'audio/wav');
assert.equal(transfer.xenData.payload.byteLength,46);
assert.strictEqual(contract.forwardWav(transfer),validWav,'The material gateway receives the original WAV');
assert.throws(()=>contract.forwardWav({blob:validWav}),/contract/i);
assert.throws(()=>contract.forwardWav({...transfer,blob:new Blob([Buffer.alloc(60)],{type:'audio/wav'}),xenData:transfer.xenData}),/mismatch/i);
assert.equal(contract.validate(transfer.xenData,{kind:'audio/wav'}).kind,'audio/wav');
assert.throws(()=>contract.bindWavTransfer({blob:new Blob([])},{producer:'forge'}),/empty|WAV|audio/i);

// Isolate the real (not mocked) Forge WAV handoff function, stub only rendering dependencies.
const routing=read('src/forge/editor/06_output_routing.js');
const start=routing.indexOf('async function cS(e){'),end=routing.indexOf('const gx=ag.materialBase',start);
assert.ok(start>0&&end>start,'Forge routing function must remain discoverable');
const materialSink=read('src/rooms/canonical.js');
for(const expression of ['s','o','l','d'])assert.ok(materialSink.includes(`__XenDataContractsV1.forwardWav(${expression})`),
  `Forge->Material gateway must validate WAV transfer ${expression}`);
const forgeContext=vm.createContext({Blob, __XenDataContractsV1:contract,
 xt:{exportWAV:async()=>validWav}});
vm.runInContext(routing.slice(start,end),forgeContext,{filename:'real-forge-export.js'});
(async()=>{
 const exported=await vm.runInContext('cS({transferMode:"render",synthMode:"spectral",sourceView:"grid",activeWorkspace:"forge",spectralData:{},waveformMix:0})',forgeContext);
 assert.strictEqual(exported.blob,validWav);
 assert.equal(exported.xenData.source.producer,'spectral-forge');
 const closes=[];
 const directContext=vm.createContext({Blob,__XenDataContractsV1:contract,
   bR:()=>true, VB:()=>({}), lg:()=>validWav,
   AudioContext:class {constructor({sampleRate}){assert.equal(sampleRate,48000)} close(){closes.push(1);return Promise.resolve()}}});
 vm.runInContext(routing.slice(start,end),directContext,{filename:'real-forge-direct-source.js'});
 const direct=await vm.runInContext('cS({transferMode:"source-direct",rawSourceAsset:{sampleRate:48000},selectionStartSec:0,selectionDurationSec:0.2,sourceView:"source",activeWorkspace:"wave"})',directContext);
 assert.strictEqual(contract.forwardWav(direct),validWav);
 assert.equal(direct.sourceVersion,'source-direct-v1');
 assert.equal(closes.length,1,'Direct source AudioContext is closed after rendering');
 // Isolate the real Sample/Donor bridge factory, inject I/O only.
 const sampleSrc=read('src/storage/04_sample_donor_bridge.js');
 const bridgeSrc=sampleSrc.slice(0,sampleSrc.indexOf('const __F3569SampleDonor ='));
 const ctx=vm.createContext({Float32Array, Blob, Date, Math, crypto:{randomUUID:()=> 'v1'},
  __XenDataContractsV1:contract,
  __F35614AudioRef:{isLinkedSample:()=>false,sampleIdFromAsset:()=>null,sampleId:id=>'melodic-sample:'+id}});
 vm.runInContext(bridgeSrc,ctx);
 const api=vm.runInContext('__createF3569SampleDonorBridge',ctx)({
  getSample:async()=>({id:'s1',name:'my-sample',durationSec:1,blob:validWav}),
  decodeAudio:async()=>pcm,
  listSamples:async()=>[],listDonors:async()=>[],
 });
 const sample=await api.loadSample('s1');
 assert.equal(sample.xenData.kind,'audio/pcm');
 assert.equal(sample.xenData.source.producer,'melodic-sample');
 assert.equal(sample.xenData.payload.assetRef,'melodic-sample:s1');
 assert.ok(!Object.keys(sample).includes('xenData'),'Existing donor state persists without the new key');
 assert.strictEqual(sample.source.sourceAsset.monoSamples,pcm.monoSamples,'Decoded PCM backing array must not be copied');
 console.log('P1 DATA CONTRACT PASS: validation, zero-copy metadata, real Forge WAV & Sample-Donor handoffs');
})().catch(e=>{console.error(e);process.exitCode=1});
