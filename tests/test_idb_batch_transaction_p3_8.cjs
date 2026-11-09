'use strict';
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../src/audio/01_voice_and_rfl_ownership.js'),'utf8');
const begin=source.indexOf('async function __xenIDBTransaction(');const end=source.indexOf('async function em(',begin);
assert(begin>=0&&end>begin);
const data=new Map([['old',{id:'old'}]]);let aborted=false;
const fakeDb={close(){},transaction(){
 const staged=new Map(data);const tx={error:null,oncomplete:null,onabort:null,onerror:null,
  abort(){aborted=true;queueMicrotask(()=>tx.onabort?.())},
  objectStore(){return{delete:id=>{staged.delete(id);return{}},put:row=>{staged.set(row.id,row);return{}}}},
 };
 setImmediate(()=>{if(aborted)return;data.clear();for(const [k,v] of staged)data.set(k,v);tx.oncomplete?.()});return tx;
}};
const ctx=vm.createContext({Promise,DOMException,Error,NS:async()=>fakeDb});vm.runInContext(source.slice(begin,end),ctx);
(async()=>{
 await ctx.__xenIDBTransaction({storeName:'test'},'readwrite',store=>{store.delete('old');store.put({id:'new'})},'batch failed');
 assert.equal(aborted,false,'batched writes must not be erroneously aborted');
 assert.deepEqual([...data.keys()],['new']);
 console.log('P3.8 PASS: real IDB wrapper supports batch writes without a single return request');
})().catch(e=>{console.error(e);process.exitCode=1});
