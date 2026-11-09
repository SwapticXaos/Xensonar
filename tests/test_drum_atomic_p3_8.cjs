'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const file=fs.readFileSync(path.join(root,'src/audio/01_voice_and_rfl_ownership.js'),'utf8');
const begin=file.indexOf('async function Sfe(e){'),end=file.indexOf('async function vfe(e)',begin);
assert(begin>=0&&end>begin,'drum importer must exist');
const imported=file.slice(begin,end);
const clone=x=>JSON.parse(JSON.stringify(x));
async function exercise(mode,abortAt=null){
 const initial=[{id:'old',name:'Old'},{id:'same',name:'Keep'}];
 const stored=new Map(initial.map(x=>[x.id,clone(x)]));
 const events=[],ui=[],playlist=[],legacyWrites=[];
 let calls=0;
 const context={Map,Set,console,ZH:e=>e,JH:async()=>clone([...stored.values()]),
  nm:x=>x,YH:x=>x,_2:x=>x.name.toLowerCase(),
  KH:async x=>{legacyWrites.push('put');stored.set(x.id,x)},
  $H:async x=>{legacyWrites.push('del');stored.delete(x)},
  ch:()=>{},zS:new Set(),jS:rows=>ui.push(clone(rows)),HT:(evt,row)=>events.push([evt,row]),
  Yl:()=>({orderedIds:[]}),gfe:(old,incoming)=>incoming,
  $y:data=>playlist.push(data),jw:{},
  __xenIDBTransaction:async(schema,access,operation)=>{
    assert.equal(access,'readwrite');calls++;
    const staged=new Map([...stored].map(([k,v])=>[k,clone(v)]));
    let operations=0;
    const store={delete:id=>{staged.delete(id);operations++;},put:row=>{staged.set(row.id,clone(row));operations++;}};
    operation(store);
    if(abortAt!==null && operations>=abortAt)throw Error('injected transaction abort');
    stored.clear();for(const [k,v] of staged)stored.set(k,v);
  }};
 vm.runInNewContext(imported,context);
 const input={entries:[{id:'next',name:'New'}],playlist:{orderedIds:['next']}};
 let output=null,error=null;
 try{output=await context.Sfe({mode,payload:input})}catch(e){error=e}
 return {rows:[...stored.values()],ui,events,playlist,legacyWrites,calls,output,error};
}
(async()=>{
 const bad=await exercise('replace',1);
 assert.match(String(bad.error),/injected transaction abort/);
 assert.deepEqual(bad.rows.map(x=>x.id),['old','same'],'abort must preserve complete old DB');
 assert.equal(bad.ui.length,0,'abort must not update UI cache');
 assert.equal(bad.playlist.length,0,'abort must not publish playlist');
 assert.equal(bad.legacyWrites.length,0,'must not use old per-item writes');
 const replaced=await exercise('replace');
 assert.equal(replaced.error,null);assert.deepEqual(replaced.rows.map(x=>x.id),['next']);
 assert.equal(replaced.calls,1);assert.equal(replaced.ui.length,1);
 const diff=await exercise('differential');assert.equal(diff.error,null);
 assert.deepEqual(diff.rows.map(x=>x.id).sort(),['next','old','same']);assert.equal(diff.calls,1);
 console.log('P3.8 PASS: drum replace/differential atomic transaction, abort isolation, post-commit UI');
})().catch(e=>{console.error(e);process.exitCode=1;});
