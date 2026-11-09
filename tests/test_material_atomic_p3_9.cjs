'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const root=path.join(__dirname,'..');
const main=fs.readFileSync(path.join(root,'src/app/forge/03_spectral_grid_and_archives.js'),'utf8');
const audio=fs.readFileSync(path.join(root,'src/audio/01_voice_and_rfl_ownership.js'),'utf8');
const importer=main.slice(main.indexOf('async function CLe(e){'),main.indexOf('const kLe=',main.indexOf('async function CLe(e){')));
assert(importer.length>100,'importer missing');
const anchor='async function __xenMaterialImportBatchP39(plan){';const start=audio.indexOf(anchor);
assert(start>=0,'P3.9 material batch implementation missing');
const end=audio.indexOf('function $T(',start);assert(end>start,'P3.9 helper end anchor missing');
const batch=audio.slice(start,end);
const copy=x=>({...x});
async function check(mode,abort=false,hidden=false){
 const old=[{id:'old',name:'Old',role:'loop',blob:{size:80},createdAt:1},{id:'other',name:'Other',role:'loop',blob:{size:80},createdAt:2}];
 const database=new Map(old.map(e=>[e.id,copy(e)]));
 if(hidden)database.set('hidden',{id:'hidden',name:'Hidden',blob:{size:80}});
 const ui=old.map(copy);const events=[];const stages=[];
 const ctx={Map,Set,Promise,Error,DOMException,console,Date,
  QT:{},Ei:{entries:ui},Ww:new Set(),__materialWriteQueues:new Map(),__xenMaterialImportBusy:false,
  __ensureMaterialLibraryHydrated:async()=>{stages.push('hydrate')},
  __xenIDBTransaction:async(schema,access,operation)=>{
   if(access==='readonly')return [...database.keys()];
   assert.equal(access,'readwrite');const clone=new Map(database);const store={clear:()=>{stages.push('clear');clone.clear()},delete:id=>{stages.push('delete:'+id);clone.delete(id)},put:e=>{stages.push('put:'+e.id);clone.set(e.id,copy(e))}};
   operation(store);if(abort)throw Error('injected abort');database.clear();for(const [k,v] of clone)database.set(k,v);stages.push('commit');
  },
  GS:entries=>{stages.push('publish');ctx.Ei.entries=entries},
  Vw:(event,details)=>{events.push([event,details])},
  __materialNextWrite:()=>{},
  bs:()=>({entries:ctx.Ei.entries}),
  wLe:async e=>'oldHash'+e.id,xLe:e=>e.name.toLowerCase(),MLe:e=>e.name.toLowerCase(),
  q6:({preferredId,usedIds})=>usedIds.has(preferredId)?'new-'+preferredId:preferredId,
  ALe:()=> 'random',qj:()=>({size:88}),
  Yd:(meta,blob)=>({...meta,id:meta.stableId,blob,blobUrl:'url:'+meta.stableId,createdAt:Date.now()}),
  UT:e=>e,a0e:e=>e,n0e:()=>[],
  URL:{revokeObjectURL:()=>{}},
 };
 vm.runInNewContext(batch+'\n'+importer,ctx);
 let result=null,error=null;
 try{result=await ctx.CLe({mode,payload:{entries:[{archivedId:hidden?'hidden':'new',name:'New',contentHash:'newHash',dataBase64:'AA=='}]}});}catch(e){error=e;}
 return {database:[...database.keys()],ui:ctx.Ei.entries.map(x=>x.id),events,stages,result,error};
}
(async()=>{
 const abort=await check('replace',true);
 assert.match(String(abort.error),/injected abort/);
 assert.deepEqual(abort.database,['old','other']);assert.deepEqual(abort.ui,['old','other']);assert.equal(abort.events.length,0);
 assert(!abort.stages.includes('publish'));
 const replaced=await check('replace');assert.equal(replaced.error,null);assert.deepEqual(replaced.database,['new']);assert(replaced.stages.indexOf('commit')<replaced.stages.indexOf('publish'));
 const merged=await check('merge');assert.equal(merged.error,null);assert.deepEqual(merged.database,['old','other','new']);
 const differential=await check('differential');assert.equal(differential.error,null);assert.deepEqual(differential.database,['old','other','new']);
 const hidden=await check('merge',false,true);assert.equal(hidden.error,null);
 assert.deepEqual(hidden.database,['old','other','hidden','new-hidden'],'a hidden material ID must not be overwritten');
 console.log('P3.9 PASS: material import atomicity, commit-before-publication, mode preservation');
})().catch(e=>{console.error(e);process.exitCode=1});
