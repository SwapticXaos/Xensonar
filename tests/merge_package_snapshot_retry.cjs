'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../src/package_station/01_binary_archive.js'),'utf8');
const start=source.indexOf(' async function captureRollbackSnapshot(){'),end=source.indexOf(' async function importFiles(',start);
assert(start>0&&end>start);
async function run(failures,unrelated=false){
 let captured=0,flushed=0,stops=0,walked=0,attempt=0,guards=0,aborts=0;const exported=[],traces=[];
 const scope={hooks:{flush:async()=>flushed++,capture:async()=>({revision:++captured})},
  checkAbort:()=>aborts++,yieldUI:async()=>{},trace:(stage,detail)=>traces.push({stage,detail}),
  observeWrites:()=>{guards++;return{assert(){},stop(){stops++}}},
  exportSpool:async(name,runtime,validate)=>{assert.equal(name,'rollback');exported.push(runtime);attempt++;if(attempt<=failures)throw Error(unrelated?'QuotaExceededError':'Paketstation: Arbeitsstand wurde während der Sicherung geändert. Bitte erneut versuchen.');validate()},
  walk:async()=>walked++,spool:async()=>({}),setTimeout:fn=>{fn();return 0},Promise,Error,String};
 vm.runInNewContext(source.slice(start,end)+'\nglobalThis.capture=captureRollbackSnapshot;',scope);
 let result,error;try{result=await scope.capture()}catch(e){error=e}
 assert.equal(stops,guards,'restore write observers must always be released');
 return{result,error,captured,flushed,walked,attempt,exported,traces,aborts};
}
(async()=>{
 const retry=await run(1);assert(!retry.error);assert.equal(retry.attempt,2);assert.equal(retry.result.revision,2);assert.equal(retry.flushed,2);assert.equal(retry.walked,1);assert.equal(retry.traces[0].stage,'rollback-snapshot-retry');
 assert.notStrictEqual(retry.exported[0],retry.exported[1],'retry must recapture runtime');
 const bounded=await run(10);assert(bounded.error);assert.equal(bounded.attempt,3);assert.equal(bounded.walked,0);
 const quota=await run(1,true);assert(quota.error);assert.equal(quota.attempt,1,'non-mutation failures must not retry');
 console.log('PASS rollback snapshot retakes fresh flushed runtime, validates before commit, bounds retries and preserves unrelated failures');
})().catch(e=>{console.error(e);process.exitCode=1});
