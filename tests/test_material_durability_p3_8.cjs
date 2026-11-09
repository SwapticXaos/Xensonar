'use strict';
// P3.9 migration of the P3.8 durability regression: the former per-entry
// persistence callback has been replaced by a repository-atomic batch.
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const s=fs.readFileSync(path.join(__dirname,'../src/app/forge/03_spectral_grid_and_archives.js'),'utf8');
const a=s.indexOf('async function CLe(e){'),b=s.indexOf('const kLe=',a);assert(a>=0&&b>a);
async function run(reject){let submitted=0;const env={Map,Set,Promise,Date,URL:{revokeObjectURL:()=>{}},
 __xenMaterialImportBusy:false,__materialWriteQueues:new Map(),
 __ensureMaterialLibraryHydrated:async()=>true,
 bs:()=>({entries:[]}),wLe:async()=>'',xLe:()=>'',MLe:()=>'',q6:()=> 'new-id',ALe:()=> 'other',qj:()=>({size:88}),
 Yd:(meta,blob)=>({...meta,id:meta.stableId,blob,blobUrl:'temporary'}),UT:x=>x,a0e:x=>x,n0e:()=>[],
 QT:{},__xenIDBTransaction:async()=>[],
 __xenMaterialImportBatchP39:async()=>{submitted++;if(reject)throw Error('material disk full')}};
 vm.runInNewContext(s.slice(a,b),env);let error=null,result=null;
 try{result=await env.CLe({mode:'merge',payload:{entries:[{archivedId:'old',name:'M',contentHash:'new',dataBase64:'AA=='}]}})}catch(e){error=e}
 return {submitted,error,result};
}
(async()=>{const bad=await run(true);assert.equal(bad.submitted,1);assert.match(String(bad.error),/disk full/,'import must await actual committed batch');
 const good=await run(false);assert.equal(good.error,null);assert.equal(good.result.importedCount,1);
 console.log('P3.8/P3.9 PASS: material success awaits transaction commit');})().catch(e=>{console.error(e);process.exitCode=1});
