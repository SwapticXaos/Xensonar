'use strict';
/* Tests first: durable resume, uncertain commit replay, identity & mapping guard. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../src/contracts/04_import_coordinator.js'),'utf8');
function makeStorage() {
 const m=new Map();
 return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>{m.set(k,v);},removeItem:k=>m.delete(k),raw:m};
}
function maker(storage) {
 const ctx=vm.createContext({localStorage:storage,console,JSON,Object,String,Error,TypeError,Set,Map,Date});
 vm.runInContext(src,ctx);
 return vm.runInContext('__XenImportCoordinatorV1',ctx);
}
async function main(){
 const storage=makeStorage(), api=maker(storage);
 const fp=api.fingerprint('{"archive":"one","assets":[]}');
 const desc={fingerprint:fp,mode:'merge',sampleMapSignature:'sampleA=sample1',phases:['donor','forge']};
 let session=api.open(desc), calls=[];
 const donor=()=>{calls.push('donor');return Promise.resolve({donorCount:2,audioImported:1});};
 const forge=()=>{calls.push('forge');return Promise.resolve({workspaceCount:1,audioImported:1});};
 await session.execute('donor',donor);
 let j=api.inspect();
 assert.equal(j.phases.donor.state,'committed');
 assert.equal(j.phases.forge.state,'pending');
 // interrupted import is re-opened after a simulated reload, donor is never reapplied.
 const api2=maker(storage);session=api2.open(desc);
 assert.equal((await session.execute('donor',donor)).donorCount,2);
 assert.deepEqual(calls,['donor']);
 assert.equal((await session.execute('forge',forge)).workspaceCount,1);
 assert.deepEqual(calls,['donor','forge']);
 session.finish();
 assert.equal(api2.inspect(),null);
 // A crash can happen after database commit but before journal commit.
 const storage2=makeStorage(),api3=maker(storage2);
 const base={...desc,mode:'replace'};
 let attempt=api3.open(base);
 await assert.rejects(attempt.execute('donor',async()=>{throw Error('disk full');}),/disk full/);
 assert.equal(api3.inspect().phases.donor.state,'applying');
 assert.throws(()=>api3.open({...base,fingerprint:'different'}),/unfinished|unfinished|unterbrochen/i);
 assert.throws(()=>api3.assertCompatible({fingerprint:'different',mode:'replace',phases:['donor','forge']}),/unfinished|unterbrochen/i);
 assert.ok(api3.assertCompatible({fingerprint:base.fingerprint,mode:'replace',phases:['donor','forge']}));
 assert.throws(()=>api3.open({...base,sampleMapSignature:'sampleA=different'}),/mapping|zuordnung/i);
 assert.throws(()=>api3.open({...base,mode:'merge'}),/unfinished|unterbrochen/i);
 assert.throws(()=>api3.open({...base,phases:['forge','donor']}),/unfinished|unterbrochen/i);
 let runs=0;
 attempt=api3.open(base);
 await attempt.execute('donor',async()=>{runs++;return {donorCount:1};});
 await attempt.execute('forge',forge);
 attempt.finish();
 assert.equal(runs,1);
 // Recovery abandonment explicitly preserves already committed domain records.
 const orphan=api3.open(base);
 await orphan.execute('donor',async()=>({donorCount:9}));
 assert.throws(()=>api3.abandon(base.fingerprint,'NO'),/acknowledgement/i);
 assert.throws(()=>api3.abandon('incorrect','KEEP_PARTIAL_IMPORT_DATA'),/fingerprint/i);
 assert.equal(api3.abandon(base.fingerprint,'KEEP_PARTIAL_IMPORT_DATA').partialDataMayRemain,true);
 assert.equal(api3.inspect(),null);
 // No journal store -> no false durable recovery guarantee.
 const broken={getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');}};
 assert.throws(()=>maker(broken).open(desc),/journal.*unavailable|journal.*nicht verfügbar/i);
 const poisoned=makeStorage(),api4=maker(poisoned);poisoned.setItem(api4.key,'{"schemaVersion":999}');
 assert.throws(()=>api4.open(desc),/journal|unknown/i);
 // Crash window: repository committed, but journal checkpoint write itself failed.
 // Recovery MUST replay 'applying' rather than assuming either commit/abort.
 const flakyStorage=makeStorage();
 const originalSet=flakyStorage.setItem.bind(flakyStorage);let writeNo=0;
 flakyStorage.setItem=(key,value)=>{writeNo++;if(writeNo===3)throw Error('Quota exceeded at journal checkpoint');originalSet(key,value);};
 const flakyApi=maker(flakyStorage),flakyFlow=flakyApi.open(desc);
 let actualCommits=0;
 await assert.rejects(flakyFlow.execute('donor',async()=>{actualCommits++;return {donorCount:1};}),/journal unavailable/i);
 assert.equal(actualCommits,1);
 assert.equal(flakyApi.inspect().phases.donor.state,'applying');
 const recoveredApi=maker(flakyStorage),recoveredFlow=recoveredApi.open(desc);
 await recoveredFlow.execute('donor',async()=>{actualCommits++;return {donorCount:1};});
 assert.equal(actualCommits,2,'uncertain commit was incorrectly skipped');
 await recoveredFlow.execute('forge',forge);
 recoveredFlow.finish();
 // Actual Donor/Forge domain factories run under the same persistent journal.
 // Their repository adapter simulates a whole-transaction commit (no browser IDB claim).
 const domainStore=(failFirst=false)=>{
   const records=new Map(),stats={commits:0,failed:0},ctrl={failNext:failFirst};
   return {stats,ctrl,
     get:async id=>records.get(id)||null,
     listPrefix:async prefix=>[...records.values()].filter(x=>x.id.startsWith(prefix)),
     putMany:async()=>{throw Error('Unused putMany');},
     importPackage:async ({assets,metadata,metadataPrefixes,archiveIds,mode})=>{
       if(ctrl.failNext){ctrl.failNext=false;stats.failed++;throw Error('Injected forge write failure');}
       stats.commits++;
       const rows=new Map(records);
       let audioImported=0,audioReused=0;
       for(const a of assets){if(rows.has(a.id))audioReused++;else{rows.set(a.id,a);audioImported++;}}
       const existing=new Set([...rows.keys()].filter(id=>metadataPrefixes.some(p=>id.startsWith(p))));
       const writes=mode==='merge'?metadata.filter(r=>!existing.has(r.id)):metadata;
       if(mode==='replace')for(const id of existing)if(!archiveIds.has(id))rows.delete(id);
       for(const r of writes)rows.set(r.id,r);
       records.clear();for(const [key,value] of rows)records.set(key,value);
       return {audioImported,audioReused,metadataCount:writes.length,
         metadataWrittenIds:writes.map(r=>r.id)};
     }
   };
 };
 const domainContext=vm.createContext({console,Map,Set,Date,Number,Object,JSON,Error,TypeError,
   ArrayBuffer,Float32Array,Uint8Array,btoa,atob,structuredClone,
   __f35612RecordStore:()=>domainStore()});
 const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
 const app=read('src/01_app_runtime.js');
 vm.runInContext(app.slice(0,app.indexOf('/* F3.56.12')),domainContext);
 vm.runInContext(read('src/contracts/03_package_transaction.js'),domainContext);
 vm.runInContext(read('src/storage/02_donor_packages.js'),domainContext);
 vm.runInContext(read('src/storage/03_forge_packages.js'),domainContext);
 const donorFactory=vm.runInContext('__createF3568DonorPackageBridge',domainContext);
 const forgeFactory=vm.runInContext('__createF3568ForgePackageBridge',domainContext);
 const donorRepository=domainStore(),forgeRepository=domainStore(true);
 const donorBridge=donorFactory(donorRepository),forgeBridge=forgeFactory(forgeRepository,donorBridge);
 const audio={monoSamples:new Float32Array([0.1,0.2]),sampleRate:48000};
 const donorPayload={schemaVersion:1,presets:[{id:'donor-library:preset:one',value:{
   id:'one',version:'donor-library-v1',assetId:'asset:donor-one'}}],workspaces:[],
   assets:[{id:'asset:donor-one',value:donorBridge.pack(audio)}]};
 const forgePayload={schemaVersion:1,workspaces:[{id:'workspace:autosave-v1',value:{
   mainSource:{assetId:'asset:forge-one'}}}],assets:[{id:'asset:forge-one',value:donorBridge.pack(audio)}]};
 const domainStorage=makeStorage(),domainCoordinator=maker(domainStorage);
 const domainDesc={fingerprint:domainCoordinator.fingerprint('same-package-content'),
   mode:'merge',sampleMapSignature:domainCoordinator.mappingFingerprint(new Map()),phases:['donor','forge']};
 const donorPlan=donorBridge.prepareLibrary(donorPayload,'merge',new Map());
 const forgePlan=forgeBridge.prepareState(forgePayload,'merge');
 let flow=domainCoordinator.open(domainDesc);
 assert.equal((await flow.execute('donor',()=>donorBridge.commitPrepared(donorPlan))).donorCount,1);
 await assert.rejects(flow.execute('forge',()=>forgeBridge.commitPrepared(forgePlan)),/Injected forge/);
 assert.equal(donorRepository.stats.commits,1);
 assert.equal(forgeRepository.stats.commits,0);
 assert.ok(await donorRepository.get('asset:donor-one'));
 const restored=maker(domainStorage);
 flow=restored.open(domainDesc);
 assert.equal((await flow.execute('donor',()=>donorBridge.commitPrepared(donorPlan))).donorCount,1);
 assert.equal(donorRepository.stats.commits,1,'Committed donor repo was improperly re-imported');
 assert.equal((await flow.execute('forge',()=>forgeBridge.commitPrepared(forgePlan))).workspaceCount,1);
 flow.finish();
 assert.equal(restored.inspect(),null);
 assert.ok(await forgeRepository.get('workspace:autosave-v1'));
 assert.equal(forgeRepository.stats.commits,1);
 // Fingerprint includes all text bytes, not only the package id.
 assert.notEqual(fp,api.fingerprint('{"archive":"one","assets":[1]}'));
 console.log('P2.2 PASS: journal checkpoints, interrupted replay, uncertain commit, identity/mapping guard, journal errors');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
