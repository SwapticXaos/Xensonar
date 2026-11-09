'use strict';
const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/app/forge/02_boot_and_workspace_tools.js'),'utf8');
const extract=(start,end)=>{const i=source.indexOf(start);const j=source.indexOf(end,i+start.length);assert(i>=0&&j>i,start);return source.slice(i,j)};
const projectsCode=extract('async function MFe(e){','const wFe='),stampsCode=extract('async function DFe(e){','class ph{');
async function run(kind,mode,abort=false){
 const before=[{id:'old',name:'Old',updatedAt:1,createdAt:1}];
 const persisted=new Map(before.map(x=>[x.id,x]));let snapshotCount=0,attempted=0,txs=0;
 const ctx={console,Map,Set,Date,
  pE:async()=>[...persisted.values()],eQ:x=>x,yO:x=>x,lB:x=>x,kk:x=>x.toLowerCase(),pR:64,mh:{},
  rQ:async()=>[...persisted.values()].map(x=>({...x,width:1,height:1,data:new Float32Array([1]),grainData:new Float32Array([1])})),
  XS:()=>{},nQ:x=>({...x,stamp:{width:1,height:1,data:new Float32Array([1]),grainData:new Float32Array([1])}}),
  sQ:x=>x,iQ:x=>x,BFe:x=>x,Pk:x=>x.toLowerCase(),uB:{},tQ:96,
  PM:x=>x,kFe:x=>({...x,data:new Float32Array([1]),grainData:new Float32Array([1])}),
  hR:()=>snapshotCount++,fR:()=>snapshotCount++,gFe:()=>attempted++,gFeOld:()=>attempted++,fFe:()=>attempted++,fE:()=>attempted++,aQ:()=>attempted++,PFe:()=>attempted++,IFe:()=>attempted++,
  __xenIDBTransaction:async(schema,access,fn)=>{
   assert.equal(access,'readwrite');txs++;
   const staged=new Map(persisted);const store={clear:()=>staged.clear(),delete:id=>staged.delete(id),put:row=>staged.set(row.id,row)};
   fn(store);if(abort)throw Error('IDB commit aborted');persisted.clear();for(const [k,v] of staged)persisted.set(k,v);
  }};
 vm.runInNewContext(kind==='project'?projectsCode:stampsCode,ctx);
 const payload=kind==='project'?{projects:[{id:'new',name:'New',createdAt:2,updatedAt:2}]}:{stamps:[{id:'new',name:'New',stamp:{width:1,height:1,data:new Float32Array([1]),grainData:new Float32Array([1])}}]};
 let result=null,error=null;
 try{result=await ctx[kind==='project'?'MFe':'DFe']({payload,mode})}catch(e){error=e}
 return {ids:[...persisted.keys()],snapshotCount,attempted,txs,result,error};
}
(async()=>{
 for(const kind of ['project','stamp']){
  const aborted=await run(kind,'replace',true);
  assert.match(String(aborted.error),/IDB commit aborted/,kind);
  assert.deepEqual(aborted.ids,['old'],kind+' old content must survive transaction abort');
  assert.equal(aborted.snapshotCount,0,kind+' cache must not publish before commit');
  assert.equal(aborted.attempted,0,kind+' legacy per-item writes/deletions forbidden');
  const accepted=await run(kind,'replace');assert.equal(accepted.error,null);
  assert.deepEqual(accepted.ids,['new']);assert.equal(accepted.txs,1);
  const differential=await run(kind,'differential');assert.equal(differential.error,null);assert.equal(differential.txs,1);
 }
 console.log('P3.8 PASS: Forge project/stamp atomic replace and differential, rollback, cache isolation');
})().catch(e=>{console.error(e);process.exitCode=1});
