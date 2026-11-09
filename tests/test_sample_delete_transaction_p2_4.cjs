'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src/runtime/instrument/03_selection_and_recording_tools.js'),'utf8');
const match=source.match(/async function __xenP24SampleDeleteStrict\(id\)\{[\s\S]*?\n\}/);
assert(match,'strict Sample DB delete port missing');
async function run({abort=false,missing=false,promoteError=false}={}){
 const log=[];
 const fakeDb={transaction(store,mode){
   const tx={error:null,oncomplete:null,onabort:null,onerror:null,objectStore(){return {
     get(){const req={onsuccess:null,onerror:null,result:missing?undefined:{id:'old',blob:new Blob(['x'])}};
       queueMicrotask(()=>{log.push('lookup');req.onsuccess?.()});return req;},
     delete(id){assert.equal(id,'old');log.push('delete-request');
       setTimeout(()=>{log.push(abort?'abort':'tx-complete');
         if(abort){tx.error=Error('QuotaError');tx.onabort?.();}else tx.oncomplete?.();},1);
       return {};
     }
   }}};
   assert.equal(store,'samples');assert(['readonly','readwrite'].includes(mode));
   return tx;
 }};
 const ctx={Error,TypeError,Promise,Blob,by:'samples',BP:{delete:()=>log.push('cache')},
  pw:()=>log.push('notify'),__xenM6Invalidate:()=>log.push('invalidate'),gee:async()=>fakeDb,
  __F3569SampleDonor:{detachBeforeSampleDelete:async()=>{log.push('promote');if(promoteError)throw Error('promotion failed');}}};
 const fn=vm.runInNewContext('('+match[0]+')',ctx);
 try{return {value:await fn('old'),log}}catch(error){return {error,log}};
}
(async()=>{
 let r=await run();assert.equal(r.value,true);assert.deepEqual(r.log,['lookup','promote','delete-request','tx-complete','invalidate','cache','notify']);
 r=await run({abort:true});assert.match(String(r.error),/QuotaError/);assert(!r.log.includes('notify'));
 r=await run({missing:true});assert.equal(r.value,false);assert.deepEqual(r.log,['lookup']);
 r=await run({promoteError:true});assert.match(String(r.error),/promotion failed/);assert(!r.log.includes('delete-request'));
 console.log('P2.4 IDB port PASS: completion vs request, abort propagation, no-op absent, promotion-before-delete');
})().catch(e=>{console.error(e);process.exitCode=1;});
