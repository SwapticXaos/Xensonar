'use strict';
/**
 * P3.11 – Cross-repository package roundtrip and interrupted recovery.
 * Integrates REAL XenSonar donor/forge codecs, preflight reference graph and
 * persistent coordinator; uses transaction-faithful in-memory test stores.
 * NOT a browser IndexedDB or complete Workspace E2E certification.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const source = file => fs.readFileSync(path.join(root, file), 'utf8');
const copy = value => structuredClone(value);
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
const digest = value => crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');

function localStorageFake() {
  const values = new Map();
  return {
    values, failWhen:null,
    getItem:key=>values.get(key)??null,
    setItem(key, raw) {
      if(this.failWhen?.(key,raw)){this.failWhen=null;throw Error('Injected journal checkpoint failure');}
      values.set(key,String(raw));
    },
    removeItem:key=>values.delete(key)
  };
}
function createRuntime() {
  const ctx=vm.createContext({ console, Map, Set, WeakSet, WeakMap, ArrayBuffer,
    Float32Array, Float64Array, Uint8Array, Uint16Array, Int8Array, Int16Array,
    Int32Array, Uint32Array, Uint8ClampedArray, DataView, Blob,
    btoa, atob, structuredClone, Date, Number, String, Math, Object, JSON, Error, TypeError });
  const runtime = source('src/01_app_runtime.js').split('// F3_39 control-side')[0];
  vm.runInContext(runtime,ctx);
  for(const file of ['src/contracts/03_package_transaction.js',
    'src/contracts/04_import_coordinator.js',
    'src/contracts/07_reference_integrity.js',
    'src/contracts/08_reference_graph.js',
    'src/storage/02_donor_packages.js','src/storage/03_forge_packages.js'])
    vm.runInContext(source(file),ctx,{filename:file});
  const names=['__createF3568DonorPackageBridge','__createF3568ForgePackageBridge',
    '__XenPackageTransactionsV1','__XenImportCoordinatorV1','__XenReferenceGraphP26',
    '__XenReferenceIntegrityP25'];
  return Object.fromEntries(names.map(n=>[n,vm.runInContext(n,ctx)]));
}
function repository(runtime,{injectAt=null}={}) {
  const records = new Map();
  const stats={commits:0,attempts:0,aborts:0,writes:0};
  return {
    records,stats,
    injectAt,
    get: async id => records.has(id)?copy(records.get(id)):null,
    listPrefix:async prefix => [...records.values()].filter(r=>r.id.startsWith(prefix)).map(copy),
    putMany:async(puts,deletes)=>{
      for(const id of deletes)records.delete(id);
      for(const row of puts)records.set(row.id,copy(row));
    },
    importPackage:async function ({assets,metadata,metadataPrefixes,archiveIds,mode}){
      stats.attempts++;
      const staged=new Map([...records].map(([k,v])=>[k,copy(v)]));
      let audioImported=0,audioReused=0,metadataDeleted=0;
      for(const row of assets){
        if(staged.has(row.id)){
          if(!runtime.__XenPackageTransactionsV1.samePCM(staged.get(row.id).value,row.value))
            throw Error('Audio ID collision: '+row.id);
          audioReused++;
        }else{staged.set(row.id,copy(row));audioImported++;}
      }
      if(this.injectAt==='after-assets'){
        this.injectAt=null;stats.aborts++;throw Error('Injected transaction abort after staged PCM');
      }
      const found=[...staged.keys()].filter(id=>metadataPrefixes.some(p=>id.startsWith(p)));
      const written=[];
      if(mode==='replace')for(const id of found)if(!archiveIds.has(id)){staged.delete(id);metadataDeleted++;}
      for(const row of metadata){
        if(mode==='merge'&&staged.has(row.id))continue;
        staged.set(row.id,copy(row));written.push(row.id);
      }
      if(this.injectAt==='before-commit'){
        this.injectAt=null;stats.aborts++;throw Error('Injected transaction abort before commit');
      }
      records.clear();for(const [id,row] of staged)records.set(id,row);
      stats.commits++;stats.writes+=written.length;
      return {audioImported,audioReused,metadataDeleted,
        metadataWrittenIds:written,metadataCount:written.length};
    }
  };
}
function makeFixture(impl) {
  const donorRepo=repository(impl),forgeRepo=repository(impl);
  const donor=impl.__createF3568DonorPackageBridge(donorRepo);
  const forge=impl.__createF3568ForgePackageBridge(forgeRepo,donor);
  const audio=(values,sampleRate=48000)=>({monoSamples:new Float32Array(values),sampleRate,channelCount:1});
  return {donorRepo,forgeRepo,donor,forge,audio};
}
async function seed(impl){
 const fixture=makeFixture(impl);
 const {donorRepo,forgeRepo,audio}=fixture;
 await donorRepo.putMany([
  {id:'asset:shared',value:audio([.125,-.5,.75])},
  {id:'donor-library:preset:voice',value:{id:'voice',version:'donor-library-v1',assetId:'asset:shared',name:'Voice'}},
  {id:'donor-library:preset:linked',value:{id:'linked',version:'donor-library-v1',assetId:'melodic-sample:sample-1',name:'Linked',source:{sourceAsset:{__materialIntakeAssetRef:'melodic-sample:sample-1'}}}},
  {id:'workspace:material-1',value:{source:{sourceAsset:{__materialIntakeAssetRef:'asset:shared'}},bars:3}}
 ],[]);
 await forgeRepo.putMany([
  {id:'asset:shared',value:audio([-.625,.25,-.375],44100)},
  {id:'asset:forge-second',value:audio([.25,.0625])},
  {id:'workspace:autosave-v1',value:{mainSource:{assetId:'asset:shared'},donorSource:{assetId:'asset:forge-second'},recipe:{mix:.42}}}
 ],[]);
 return fixture;
}
function archiveFrom(donorLibrary,forgeExperiment){
 return {samples:[{archivedId:'sample-1',name:'Source sample'}],
  projects:[{id:'p',name:'Composition',composer:{tracks:[{instrumentPreset:'sample:sample-1'}]}}],
  workspace:{composer:{tracks:[{instrumentPreset:'sample:sample-1'}]}},
  donorLibrary,forgeExperiment};
}
function checkGraph(impl,archive){
 const graph=impl.__XenReferenceGraphP26.inspect({archive,mode:'merge',existingSamples:[]});
 impl.__XenReferenceGraphP26.assertSafe(graph);
 assert.equal(graph.counts.missing,0);
 assert(graph.edges.some(e=>e.targetScope==='sample-db'));
 assert(graph.edges.some(e=>e.targetScope==='donor-db'&&e.targetId==='asset:shared'));
 assert(graph.edges.some(e=>e.targetScope==='forge-db'&&e.targetId==='asset:shared'));
 return graph;
}
function descriptor(impl,archive){
 const c=impl.__XenImportCoordinatorV1;
 return {fingerprint:c.fingerprint(JSON.stringify(archive)),mode:'merge',
   sampleMapSignature:c.mappingFingerprint(new Map([['sample-1','sample-1']])),phases:['donor','forge']};
}
function snapshot(repo){return [...repo.records].map(([k,v])=>[k,canonical(v.value)]).sort((a,b)=>a[0].localeCompare(b[0]));}
const results=[];
function pass(name,details){results.push({name,status:'PASS',...details});}
async function main(){
 const impl=createRuntime();const original=await seed(impl);
 const sourceDonor=await original.donor.exportLibrary(new Set(['sample-1']));
 const sourceForge=await original.forge.exportState();
 const archive=archiveFrom(sourceDonor,sourceForge);
 const graph=checkGraph(impl,archive);
 assert.equal(sourceDonor.schemaVersion,1);assert.equal(sourceForge.schemaVersion,1);
 assert.equal(sourceDonor.presets.length,2);assert.equal(sourceForge.assets.length,2);
 pass('reference_preflight',{edges:graph.edges.length,scopes:[...new Set(graph.edges.map(e=>e.targetScope))]});
 const output=makeFixture(impl);const journal=localStorageFake();const coordinator=impl.__XenImportCoordinatorV1;
 const d=descriptor(impl,archive);
 let flow=coordinator.open(d,journal);
 assert.equal((await flow.execute('donor',()=>output.donor.importLibrary(sourceDonor,'merge',new Map([['sample-1','sample-1']])))).donorCount,2);
 assert.equal((await flow.execute('forge',()=>output.forge.importState(sourceForge,'merge'))).workspaceCount,1);
 flow.finish();assert.equal(coordinator.inspect(journal),null);
 const exportedDonor=await output.donor.exportLibrary(new Set(['sample-1']));
 const exportedForge=await output.forge.exportState();
 assert.equal(digest(exportedDonor),digest(sourceDonor),'Donor pack bytes/metadata changed across roundtrip');
 assert.equal(digest(exportedForge),digest(sourceForge),'Forge pack bytes/metadata changed across roundtrip');
 assert.equal(digest(archiveFrom(exportedDonor,exportedForge)),digest(archive));
 checkGraph(impl,archiveFrom(exportedDonor,exportedForge));
 assert.notEqual((await output.donorRepo.get('asset:shared')).value.monoSamples[0],
   (await output.forgeRepo.get('asset:shared')).value.monoSamples[0],
   'Repository-scoped reference identity was lost');
 pass('real_codec_roundtrip',{donorSha256:digest(exportedDonor),forgeSha256:digest(exportedForge),
   donorAssetCount:sourceDonor.assets.length,forgeAssetCount:sourceForge.assets.length});
 // A duplicate run cannot create new Donor/Forge records or additional PCM.
 const before=[snapshot(output.donorRepo),snapshot(output.forgeRepo)];
 await output.donor.importLibrary(sourceDonor,'merge',new Map([['sample-1','sample-1']]));
 await output.forge.importState(sourceForge,'merge');
 assert.deepEqual(snapshot(output.donorRepo),before[0]);
 assert.deepEqual(snapshot(output.forgeRepo),before[1]);
 pass('duplicate_merge_idempotence',{donorRecords:before[0].length,forgeRecords:before[1].length});

 // Destructive modes are verified at THIS repository boundary only;
 // not as an assertion about whole-workspace replace/differential atomicity.
 const replace=makeFixture(impl);
 await replace.donorRepo.putMany([{id:'donor-library:preset:stale',value:{id:'stale',version:'donor-library-v1',assetId:'asset:stale'}},{id:'asset:stale',value:replace.audio([.03125])}],[]);
 await replace.forgeRepo.putMany([{id:'workspace:stale',value:{unused:true}}],[]);
 await replace.donor.importLibrary(sourceDonor,'replace',new Map([['sample-1','sample-1']]));
 await replace.forge.importState(sourceForge,'replace');
 assert.equal(await replace.donorRepo.get('donor-library:preset:stale'),null);
 assert.equal(await replace.forgeRepo.get('workspace:stale'),null);
 assert(await replace.donorRepo.get('asset:stale'),'Shared/audio asset must not be opportunistically garbage-collected');
 assert.equal(digest(await replace.donor.exportLibrary(new Set(['sample-1']))),digest(sourceDonor));
 assert.equal(digest(await replace.forge.exportState()),digest(sourceForge));
 pass('repository_replace_semantics',{note:'metadata deleted; existing audio assets retained until a separate ownership decision'});
 const differential=makeFixture(impl);
 await differential.forgeRepo.putMany([{id:'workspace:autosave-v1',value:{recipe:{mix:999}}},{id:'workspace:unrelated',value:{recipe:{mix:0}}}],[]);
 await differential.forge.importState(sourceForge,'differential');
 assert.deepEqual((await differential.forgeRepo.get('workspace:autosave-v1')).value.recipe,{mix:.42});
 assert(await differential.forgeRepo.get('workspace:unrelated'),'Differential must retain unrelated metadata');
 pass('repository_differential_semantics');

 // Damaged graph MUST fail before opening a repository transaction.
 const invalid=archiveFrom(copy(sourceDonor),copy(sourceForge));
 invalid.forgeExperiment.workspaces[0].value.mainSource.assetId='asset:absent';
 const beforeGraphWrites=output.forgeRepo.stats.attempts;
 assert.throws(()=>checkGraph(impl,invalid),/Missing|reference/i);
 assert.equal(output.forgeRepo.stats.attempts,beforeGraphWrites);
 pass('invalid_reference_prewrite_block');
 // Abort after staging PCM: whole repository snapshot remains unchanged.
 const abort=makeFixture(impl);
 abort.forgeRepo.injectAt='after-assets';
 const originalForgeSnap=snapshot(abort.forgeRepo);
 await assert.rejects(abort.forge.importState(sourceForge,'replace'),/Injected transaction abort/);
 assert.deepEqual(snapshot(abort.forgeRepo),originalForgeSnap);
 pass('repository_abort_after_pcm_staging');
 // Pause between repository commits; durable donor must not be applied twice.
 const resume=makeFixture(impl);const store=localStorageFake();let stage=coordinator.open(d,store);
 await stage.execute('donor',()=>resume.donor.importLibrary(sourceDonor,'merge',new Map([['sample-1','sample-1']])));
 resume.forgeRepo.injectAt='before-commit';
 await assert.rejects(stage.execute('forge',()=>resume.forge.importState(sourceForge,'merge')),/Injected transaction abort/);
 assert.equal(resume.donorRepo.stats.commits,1);
 assert.equal(resume.forgeRepo.stats.commits,0);
 assert.equal(coordinator.inspect(store).phases.forge.state,'applying');
 stage=coordinator.open(d,store);
 await stage.execute('donor',()=>resume.donor.importLibrary(sourceDonor,'merge',new Map([['sample-1','sample-1']])));
 await stage.execute('forge',()=>resume.forge.importState(sourceForge,'merge'));
 stage.finish();
 assert.equal(resume.donorRepo.stats.commits,1,'Donor incorrectly replayed');
 assert.equal(resume.forgeRepo.stats.commits,1);
 assert.equal(digest(await resume.forge.exportState()),digest(sourceForge));
 pass('resume_after_forge_commit_failure',{donorCommits:1,forgeCommits:1});
 // Crash after durable forge commit but BEFORE the checkpoint is persisted.
 const uncertain=makeFixture(impl);const journal2=localStorageFake();let run=coordinator.open(d,journal2);
 await run.execute('donor',()=>uncertain.donor.importLibrary(sourceDonor,'merge',new Map([['sample-1','sample-1']])));
 journal2.failWhen=(_,value)=>{try{return JSON.parse(value).phases?.forge?.state==='committed';}catch{return false;}};
 await assert.rejects(run.execute('forge',()=>uncertain.forge.importState(sourceForge,'merge')),/journal unavailable/i);
 assert.equal(uncertain.forgeRepo.stats.commits,1);
 assert.equal(coordinator.inspect(journal2).phases.forge.state,'applying');
 run=coordinator.open(d,journal2);
 await run.execute('donor',()=>uncertain.donor.importLibrary(sourceDonor,'merge',new Map([['sample-1','sample-1']])));
 await run.execute('forge',()=>uncertain.forge.importState(sourceForge,'merge'));
 run.finish();
 assert.equal(digest(await uncertain.forge.exportState()),digest(sourceForge));
 assert.equal(uncertain.donorRepo.stats.commits,1);
 pass('uncertain_commit_replay',{forgeAttempts:uncertain.forgeRepo.stats.attempts,
   reason:'after real domain adapter returned committed, before journal checkpoint'});
 // No silent collision if same ID has different audio: prevent unrelated owner overwrite.
 const collision=makeFixture(impl);
 await collision.donorRepo.putMany([{id:'asset:shared',value:collision.audio([.99])}],[]);
 const collisionOld=snapshot(collision.donorRepo);
 await assert.rejects(collision.donor.importLibrary(sourceDonor,'merge',new Map([['sample-1','sample-1']])),/collision/i);
 assert.deepEqual(snapshot(collision.donorRepo),collisionOld);
 pass('audio_collision_guard');
 // Unsupported/malicious malformed packet: reject before *any* domain write.
 const corrupt=copy(sourceDonor);corrupt.assets[0].value.monoSamples.base64='not_base64';
 const corruptRepo=makeFixture(impl);
 await assert.rejects(corruptRepo.donor.importLibrary(corrupt,'merge',new Map([['sample-1','sample-1']])),/invalid|corrupt|audio|length|data/i);
 assert.equal(corruptRepo.donorRepo.stats.attempts,0);
 pass('malformed_pcm_preflight_guard');
 // No claim of complete workspace: no native IDB or full UI/asset graph was exercised.
 const report={schemaVersion:1,scope:'REAL Donor/Forge codecs + P2.6 graph + P2.2 coordinator; simulated atomic repositories',
   notTested:['full workspace exporter/importer including sample/material/drum/nodal','native IndexedDB and crash/reload','multi-tab concurrency','quota and audio workload'],
   fixture:{donorPresets:2,donorWorkspaces:1,forgeWorkspaces:1,distinctRepositorySharedId:true},
   tests:results,allPassed:true};
 const pathArg=process.argv.indexOf('--report');
 if(pathArg>=0){const out=process.argv[pathArg+1];if(!out)throw Error('Missing --report path');fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');}
 for(const item of results)console.log('P3.11 PASS:',item.name);
 console.log('P3.11 CROSS-REPOSITORY ROUNDTRIP PASS ('+results.length+' cases; non-browser repository adapter)');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
