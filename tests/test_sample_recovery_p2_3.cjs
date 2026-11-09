'use strict';
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
function load(file,ctx){vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});}
const storageMap=new Map();
const storage={getItem:k=>storageMap.get(k)??null,setItem:(k,v)=>storageMap.set(k,v),removeItem:k=>storageMap.delete(k)};
const ctx=vm.createContext({localStorage:storage,globalThis:{localStorage:storage},console,Math,Uint8Array,Blob,ArrayBuffer,Map,Set,Error,TypeError});
load('src/contracts/04_import_coordinator.js',ctx);
load('src/contracts/05_sample_recovery.js',ctx);
const coordinator=vm.runInContext('__XenImportCoordinatorV1',ctx);
const samples=vm.runInContext('__XenSampleImportP23',ctx);
const archive=[{archivedId:'old-01',name:'One',contentHash:'h1',dataBase64:'AQID',mimeType:'audio/wav',sizeBytes:3},
 {archivedId:'old-02',name:'Two',contentHash:'h2',dataBase64:'BAUG',mimeType:'audio/wav',sizeBytes:3}];
let records=[],writes=0,crash=false;
const makeBlob=s=>new Blob([Uint8Array.from(Buffer.from(s.dataBase64,'base64'))],{type:s.mimeType});
const identityOf=s=>'hash:'+s.contentHash;
async function save(s,opts){writes++;const row={id:opts.replaceSampleId,name:s.name,contentHash:s.contentHash,sizeBytes:s.sizeBytes,blob:makeBlob(s)};records.push(row);if(crash){crash=false;throw Error('crash after durable sample write');}return row;}
const plan={fingerprint:coordinator.fingerprint('archive 1'),mode:'merge',sampleMapSignature:'pending:p2.3',phases:['samples','donor','forge']};
function args(){return {samples:archive,existing:records.slice(),fingerprint:plan.fingerprint,packageId:'pkg-123',
   write:save,makeBlob,readBlob:async id=>records.find(r=>r.id===id)?.blob??null,identityOf};}
async function main(){
 const flow=coordinator.open(plan,storage);
 crash=true;
 await assert.rejects(flow.execute('samples',()=>samples.importMerge(args())),/crash after durable/);
 assert.equal(records.length,1);
 // new runtime: same deterministic target ID must be reused rather than duplicated
 const resumed=coordinator.open(plan,storage);
 const result=await resumed.execute('samples',()=>samples.importMerge(args()));
 assert.equal(records.length,2);
 assert.equal(writes,2,'first row should not be written twice');
 assert.equal(result.mapping.length,2);
 const m=new Map(result.mapping); assert.notEqual(m.get('old-01'),m.get('old-02'));
 await samples.verifyMapping(result,archive,records,identityOf,async id=>records.find(r=>r.id===id)?.blob,makeBlob,plan.fingerprint);
 const mapDigest=coordinator.mappingFingerprint(new (vm.runInContext('Map',ctx))(result.mapping));
 resumed.sealSampleMap(mapDigest);
 assert.equal(coordinator.inspect(storage).resolvedSampleMapSignature,mapDigest);
 assert.throws(()=>resumed.sealSampleMap('other'),/mapping|signature/i);
 await resumed.execute('donor',async()=>({count:1}));
 await resumed.execute('forge',async()=>({count:1}));
 resumed.finish();assert.equal(coordinator.inspect(storage),null);
 // Same sample ID, different content must never overwrite previously committed audio.
 const duplicateId=samples.deterministicId(plan.fingerprint,'old-01');
 const corrupted=[{id:duplicateId,name:'One',contentHash:'WRONG',sizeBytes:3,blob:makeBlob(archive[0])}];
 await assert.rejects(samples.importMerge({...args(),existing:corrupted}),/collision/i);
 // A corrupted same-ID but same metadata and DIFFERENT PCM is also rejected.
 const byteCorrupt=[{id:duplicateId,name:'One',contentHash:'h1',sizeBytes:3,blob:new Blob([new Uint8Array([88,77,66])])}];
 await assert.rejects(samples.importMerge({...args(),existing:byteCorrupt,readBlob:async id=>byteCorrupt.find(r=>r.id===id)?.blob??null}),/collision/i);
 assert.throws(()=>samples.preflight([...archive,archive[0]]),/duplicate/i);
 await assert.rejects(samples.verifyMapping({mapping:[['old-01','absent']]},archive,records,identityOf),/mapping|missing/i);
 // committed result must be checked against actual storage, not trusted blindly
 const bad=coordinator.open(plan,storage);
 const recorded=await bad.execute('samples',async()=>({mapping:[['old-01','absent'],['old-02','sample2']],imported:2,reused:0}));
 await assert.rejects(samples.verifyMapping(recorded,archive,records,identityOf),/mapping|missing/i);
 // Strict storage reads must fail closed instead of assuming that an ID is absent.
 const writesBeforeReadFailure=writes;
 await assert.rejects(samples.importMerge({...args(),existing:[],readBlob:async()=>{throw Error('Injected IDB read failure');}}),/Injected IDB read failure/);
 assert.equal(writes,writesBeforeReadFailure);
 // Integration wiring: the actual workspace importer starts the sample phase
 // before Donor and uses strict Sample Database read ports.
 const workspaceImporter=fs.readFileSync(path.join(root,'src/app/forge/03_spectral_grid_and_archives.js'),'utf8');
 assert.ok(workspaceImporter.includes("phases:__phaseOrderP23"));
 assert.ok(workspaceImporter.indexOf("execute('samples'")<workspaceImporter.indexOf("execute('donor'"));
 assert.ok(workspaceImporter.includes('readBlob:__xenP23SampleBlobStrict'));
 assert.ok(workspaceImporter.includes('verifyMapping(__sampleResultP23'));
 // A checkpoint committed before Donor may be resumed WITHOUT invoking sample writer.
 const restartStorageMap=new Map();
 const restartStore={getItem:k=>restartStorageMap.get(k)??null,setItem:(k,v)=>restartStorageMap.set(k,v),removeItem:k=>restartStorageMap.delete(k)};
 const restartCtx=vm.createContext({localStorage:restartStore,globalThis:{localStorage:restartStore},console,Math,Uint8Array,Blob,ArrayBuffer,Map,Set,Error,TypeError});
 load('src/contracts/04_import_coordinator.js',restartCtx);
 const restartApi=vm.runInContext('__XenImportCoordinatorV1',restartCtx);
 const restartPlan={...plan,fingerprint:restartApi.fingerprint('resume-after-sample-commit')};
 let restartFlow=restartApi.open(restartPlan,restartStore);
 await restartFlow.execute('samples',async()=>({mapping:[['old-01','sample-a']],imported:1,reused:0}));
 restartFlow.sealSampleMap('digest-a');
 await assert.rejects(restartFlow.execute('donor',async()=>{throw Error('donor crash');}),/donor crash/);
 restartFlow=restartApi.open(restartPlan,restartStore);
 const checkpoint=await restartFlow.execute('samples',()=>{throw Error('Sample replay not permitted');});
 assert.equal(checkpoint.mapping[0][1],'sample-a');
 assert.equal(restartFlow.sealSampleMap('digest-a'),'digest-a');
 assert.throws(()=>restartApi.open({...restartPlan,fingerprint:'other'},restartStore),/unfinished/i);
 // When a checkpoint exists but the referenced audio disappeared, recovery must fail closed.
 await assert.rejects(samples.verifyMapping(result,archive,records,identityOf,async id=>id===m.get('old-01')?null:records.find(r=>r.id===id)?.blob,makeBlob,plan.fingerprint),/missing audio/i);
 console.log('P2.3 PASS: durable sample identity, uncertain commit replay, collision, journal digest, missing mapping');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
