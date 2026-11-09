'use strict';
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const ctx=vm.createContext({console,Math,Uint8Array,Blob,ArrayBuffer,Map,Set,Error,TypeError,globalThis:{},window:undefined});
for(const f of ['04_import_coordinator.js','05_sample_recovery.js','06_sample_destructive_import.js']){
  vm.runInContext(fs.readFileSync(path.join(root,'src/contracts',f),'utf8'),ctx,{filename:f});
}
const api=vm.runInContext('__XenSampleImportP24',ctx);
const fp=vm.runInContext('__XenImportCoordinatorV1.fingerprint("pkg-P24")',ctx);
const incoming=[{archivedId:'a',name:'New',contentHash:'new-h',dataBase64:'AQID',sizeBytes:3,mimeType:'audio/wav'}];
const makeBlob=s=>new Blob([Buffer.from(s.dataBase64,'base64')],{type:s.mimeType});
const identityOf=x=>x.contentHash;
async function main(){
 assert.throws(()=>api.preflight([...incoming,incoming[0]],'replace'),/duplicate/i);
 assert.throws(()=>api.preflight([{...incoming[0],dataBase64:'%%'}],'differential'),/base64/i);
 assert.throws(()=>api.preflight(incoming,'merge'),/mode/i);
 assert.throws(()=>api.preflight([{...incoming[0],dataBase64:'AA=A'}],'replace'),/base64/i);
 const old={id:'legacy-a',name:'Old',contentHash:'old-h',blob:new Blob([Buffer.from([10])])};
 let rows=[old],failed=false,deleted=[],writes=0;
 const ports=()=>({samples:incoming,existing:rows.slice(),fingerprint:fp,packageId:'pkg',identityOf,makeBlob,
   readBlob:async id=>rows.find(x=>x.id===id)?.blob??null,
   write:async(s,{blob,replaceSampleId})=>{writes++;const r={id:replaceSampleId,name:s.name,contentHash:s.contentHash,blob};rows.push(r);if(failed)throw Error('write failure');return r;}});
 failed=true;
 await assert.rejects(api.stageReplace(ports()),/write failure/);
 assert(rows.some(r=>r.id==='legacy-a'),'old sample must survive incomplete stage');
 failed=false;
 const stage=await api.stageReplace(ports());
 assert.equal(stage.mapping[0][1],api.targetId(fp,'a'));
 const mapping=new Map(stage.mapping);
 const result=await api.pruneOld({original:[old],mapping,deleteOld:async id=>{deleted.push(id);rows=rows.filter(r=>r.id!==id);return true;}});
 assert.equal(result.deleted,1);
 assert(!rows.some(r=>r.id==='legacy-a'));
 assert.equal(rows.filter(r=>r.id===api.targetId(fp,'a')).length,1);
 const again=await api.stageReplace(ports());
 assert.equal(again.mapping[0][1],stage.mapping[0][1]);
 assert.equal(writes,1,'repeating import should not write again');
 await api.pruneOld({original:rows,mapping:new Map(again.mapping),deleteOld:()=>{throw Error('must not delete retained asset');}});
 // A failed deletion must remain an error and must never erase the staged replacement.
 // Identical PCM under different archive IDs must retain two distinct Sample records.
 const duplicates=[...incoming,{...incoming[0],archivedId:'b'}];
 const second=await api.stageReplace({...ports(),samples:duplicates});
 assert.notEqual(second.mapping[0][1],second.mapping[1][1]);
 assert.equal(rows.filter(r=>r.id===api.targetId(fp,'b')).length,1);
 // Explicitly empty replace may remove old contents, but implicit empty mappings fail closed.
 await assert.rejects(api.pruneOld({original:[old],mapping:new Map(),deleteOld:async()=>true}),/verified target/i);
 assert.equal((await api.pruneOld({original:[old],mapping:new Map(),verifiedEmpty:true,deleteOld:async()=>true})).deleted,1);
 const original={id:'leftover',contentHash:'left',blob:new Blob(['old'])};rows.push(original);
 await assert.rejects(api.pruneOld({original:[original],mapping,deleteOld:async()=>{throw Error('IDB abort');}}),/IDB abort/);
 assert(rows.some(r=>r.id===api.targetId(fp,'a')));
 const runtime=fs.readFileSync(path.join(root,'src/runtime/instrument/03_selection_and_recording_tools.js'),'utf8');
 const importer=fs.readFileSync(path.join(root,'src/app/forge/03_spectral_grid_and_archives.js'),'utf8');
 assert(runtime.includes('async function __xenP24SampleDeleteStrict('),'strict delete port must be connected');
 assert(importer.includes('__XenSampleImportP24.stageReplace('),'replace must stage before deleting');
 assert(importer.includes('__XenSampleImportP24.pruneOld('),'replace must only prune after stage');
 assert(importer.includes('__xenP24SampleDeleteStrict'),'importer must use strict delete');
 const differentialVerify=importer.indexOf("throw new Error('P2.4 differential Sample write was not committed");
 const differentialDelete=importer.indexOf('for(const fe of ie.slice(1)){if(await __xenP24SampleDeleteStrict');
 assert(differentialVerify>=0&&differentialDelete>differentialVerify,'differential cleanup must follow strict persisted-write verification');
 console.log('P2.4 PASS: preflight, copy-before-delete, replay, collision guard, strict error propagation');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
