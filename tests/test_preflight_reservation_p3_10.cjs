'use strict';
// P3.10 regression: NO persistent project-identity journal until all read-only
// preflight and advisory inventory passes have completed successfully.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/app/forge/03_spectral_grid_and_archives.js'),'utf8');
const start=source.indexOf('async function _Q(e){');
const end=source.indexOf('let __donorImported=null', start);
assert(start>=0&&end>start,'Workspace import preflight boundary must exist');
const preflight=source.slice(start,end).replace('async function _Q(e){','async function p310Preflight(e){');
const invoke=preflight+'return {reservation:__projectReservationP36};}';
async function scenario(failAt=null){
 const calls=[];
 const fail=name=>{calls.push(name);if(name===failAt)throw Error('injected '+name)};
 const archive={packageId:'pack1',label:'Pack',warnings:[],samples:[],projects:[{id:'original',name:'Carrier'}],donorLibrary:{},forgeExperiment:null};
 const ctx={console:{warn(){}},Map,Set,
  vLe:()=>archive,zV:()=>({}),
  __XenImportCoordinatorV1:{fingerprint:()=> 'fingerprint',assertCompatible:()=>fail('coordinator-check')},
  __F3569SampleDonor:{validatePackageSampleRefs:()=>fail('package-refs')},
  __XenSampleImportP23:{preflight:()=>fail('sample-preflight')},
  __XenSampleImportP24:{preflight:()=>fail('destructive-preflight')},
  __XenMelodicProjectReservationsP36:{open:()=>{calls.push('project-reservation-WRITE');return {assignments:[]}}},
  FQ:()=> 'allocated',TQ:n=>n,
  __xenP23SampleListStrict:async()=>{fail('sample-inventory');return []},
  __XenReferenceIntegrityP25:{inspect:()=>{fail('p25-inspect');return {}},assertSafe:()=>fail('p25-assert')},
  __XenReferenceGraphP26:{inspect:()=>{fail('p26-inspect');return {localAtRisk:[]}},assertSafe:()=>fail('p26-assert')},
  __XenReferenceGraphP27:{inspect:()=>{fail('p27-inspect');return {}}},
  __XenLibraryInventoryP28:{inspect:async()=>{fail('p28-inventory');return {counts:{absentInSnapshot:0,localAtRisk:0,inventoryUnavailable:0}}}},
  __xenIDBTransaction:()=>{},QT:{},jw:{},__XenNodalLibrary:{list:()=>[]}
 };
 vm.createContext(ctx);vm.runInContext(invoke,ctx);
 let result,err;
 try{result=await ctx.p310Preflight({file:{text:async()=>'{"archive":true}'},mode:'merge',savedMelodicProjects:[],loopComposer:null});}
 catch(e){err=e;}
 return {calls,result,err};
}
(async()=>{
 for(const stage of ['coordinator-check','package-refs','sample-preflight','sample-inventory','p25-inspect','p25-assert','p26-inspect','p26-assert','p27-inspect','p28-inventory']){
  const {calls,err}=await scenario(stage);
  assert.match(String(err),new RegExp('injected '+stage));
  assert(!calls.includes('project-reservation-WRITE'),`preflight rejected at ${stage} but created an identity reservation`);
 }
 const ok=await scenario();assert(!ok.err, String(ok.err));
 assert.equal(ok.calls.filter(x=>x==='project-reservation-WRITE').length,1);
 assert(ok.calls.indexOf('p28-inventory')<ok.calls.indexOf('project-reservation-WRITE'),'project reservation must follow all preflight checks');
 assert.equal(ok.result.reservation.assignments.length,0);
 console.log('P3.10 PASS: rejected preflights leave no project identity reservation; successful validation reserves exactly once');
})().catch(e=>{console.error(e);process.exitCode=1});
