'use strict';
const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const s=fs.readFileSync(path.join(__dirname,'../src/app/forge/03_spectral_grid_and_archives.js'),'utf8');const a=s.indexOf('async function BLe(e){');const b=s.indexOf('const DLe=',a);assert(a>=0&&b>a);
async function run(abort){const rows=new Map([['old',{id:'old',name:'Old'}]]);let cache=0,legacyWrites=0;
 const env={Set,Map,BM:{},kQ:async()=>[...rows.values()],cLe:({incoming})=>({records:incoming,result:{importedCount:1}}),RQ:x=>x,CQ:()=>cache++,
  OS:async()=>legacyWrites++,bg:async()=>legacyWrites++,
  __xenIDBTransaction:async(sch,mode,callback)=>{assert.equal(mode,'readwrite');const staged=new Map(rows);callback({delete:id=>staged.delete(id),put:row=>staged.set(row.id,row)});if(abort)throw Error('abort');rows.clear();for(const [k,v] of staged)rows.set(k,v)}};
 vm.runInNewContext(s.slice(a,b),env);let error=null;try{await env.BLe({records:[{id:'new',name:'New'}],mode:'replace'})}catch(e){error=e}return{ids:[...rows.keys()],cache,legacyWrites,error};}
(async()=>{const failed=await run(true);assert.match(String(failed.error),/abort/);assert.deepEqual(failed.ids,['old']);assert.equal(failed.cache,0);assert.equal(failed.legacyWrites,0);const ok=await run(false);assert.equal(ok.error,null);assert.deepEqual(ok.ids,['new']);assert.equal(ok.cache,1);console.log('P3.8 PASS: Synthetic Forge workspace imports one atomic IDB transaction');})().catch(e=>{console.error(e);process.exitCode=1});
