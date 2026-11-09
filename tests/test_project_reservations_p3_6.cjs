'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function storage(){const data=new Map;return {data,getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}
function api(store){const ctx=vm.createContext({localStorage:store,Map,Set,Date,Object,JSON,String,Error,TypeError});vm.runInContext(read('src/contracts/15_melodic_project_reservations.js'),ctx);return vm.runInContext('__XenMelodicProjectReservationsP36',ctx);}
function args(existing=[]){let seq=0;return {fingerprint:'package-fnv2',mode:'merge',packageId:'package-1',incoming:[{id:'from-1',name:'Pulse'},{id:'from-2',name:'Pulse'}],existing,
 allocateId:()=>`melodic-project-generated-${++seq}`,
 uniqueName:(name,used)=>{let value=name,n=2;while(used.has(value))value=`${name} (Import ${n++})`;used.add(value);return value;}};}
const s=storage(),a=api(s),existing=[{id:'p1',name:'Pulse',sourcePackageId:'old'}];
const initial=a.open(args(existing));
assert.deepEqual(JSON.parse(JSON.stringify(initial.assignments)),[
 {id:'melodic-project-generated-1',name:'Pulse (Import 2)'},
 {id:'melodic-project-generated-2',name:'Pulse (Import 3)'}]);
assert.equal(initial.replay,false);
let randomCalls=0;
const replay=a.open({...args(existing),allocateId:()=>{randomCalls++;throw Error('No ID allocation on replay');}});
assert.equal(randomCalls,0);assert.equal(replay.replay,true);
assert.deepEqual(JSON.parse(JSON.stringify(replay.assignments)),JSON.parse(JSON.stringify(initial.assignments)));
assert.throws(()=>a.open({...args(existing),fingerprint:'wrong'}),/unfinished|original/i);
assert.throws(()=>a.open(args([...existing,{id:'unrelated',name:'Changed'}])),/inventory changed/i);
assert.throws(()=>a.open(args([{id:'p1',name:'Pulse',sourcePackageId:'old'},
 {id:initial.assignments[0].id,name:'forged',sourcePackageId:'package-1'}])),/collision|changed project/i);
const applied=[...existing,...initial.assignments.map(x=>({...x,sourcePackageId:'package-1',contentHash:'hash'}))];
assert.equal(a.open(args(applied)).alreadyPresent,2);
const idempotent=a.applyMerge(applied,applied.slice(1));
assert.equal(idempotent.length,3,'already applied projects must not duplicate');
assert.throws(()=>a.applyMerge(applied,[{...applied[1],contentHash:'bad'}]),/conflicting/i);
assert.throws(()=>a.abandon('package-fnv2','NO'),/acknowledgement/i);
const transitioned=a.open({...args(applied),fingerprint:'new-package',packageId:'package-2',incoming:[{name:'Another'}]});
assert.equal(transitioned.assignments.length,1,'new import after all prior IDs visible');
assert.equal(a.inspect().fingerprint,'new-package');
const b=storage(),bapi=api(b);b.setItem(bapi.key,'{invalid');
assert.throws(()=>bapi.open(args(existing)),/corrupted/i);
const duplicate=storage(),duplicateApi=api(duplicate);duplicateApi.open(args(existing));
const doc=JSON.parse(duplicate.getItem(duplicateApi.key));doc.assignments[1].id=doc.assignments[0].id;
duplicate.setItem(duplicateApi.key,JSON.stringify(doc));
assert.throws(()=>duplicateApi.open(args(existing)),/unknown|reservation/i);
assert.throws(()=>api({getItem(){throw Error('restricted')},setItem(){throw Error('restricted')},removeItem(){throw Error('restricted')}}).open(args(existing)),/storage unavailable/i);
const fail=storage();fail.setItem=()=>{throw Error('quota')};
assert.throws(()=>api(fail).open(args(existing)),/failed to persist/i);
const c=storage(),capi=api(c);capi.open(args(existing));
assert.equal(capi.abandon('package-fnv2','KEEP_EXISTING_PROJECTS').existingProjectsUnaffected,true);
assert.equal(capi.inspect(),null);
// Confirm the historical P3.5 planner consumes reservations, without calling the random allocator.
const ctx=vm.createContext({Set,Map,Object,TypeError});vm.runInContext(read('src/contracts/14_melodic_project_restore_plan.js'),ctx);
const planner=vm.runInContext('__XenMelodicProjectRestoreP35',ctx);
const planned=planner.prepare({incoming:args().incoming,existing,mapping:new Map(),mode:'merge',packageId:'package-1',
 convert:p=>({...p,composer:{tracks:[]}}),contentHash:()=>'-',normalizeName:p=>p.name.toLowerCase(),
 allocateId:()=>{throw Error('random ID allocation would break replay')},uniqueName:()=>{throw Error('new name generation would break replay')},
 reservations:replay.assignments});
assert.deepEqual(planned.projects.map(x=>x.id),replay.assignments.map(x=>x.id));
assert.deepEqual(planned.projects.map(x=>x.name),replay.assignments.map(x=>x.name));
assert.throws(()=>planner.prepare({incoming:[],existing:[],mapping:new Map(),mode:'merge',packageId:'p',
 convert:()=>({}),contentHash:()=>'',normalizeName:()=>'',allocateId:()=>'',uniqueName:()=>'',
 reservations:[{id:'one',name:'A'}]}),/reservation/i);
const source=read('src/app/forge/03_spectral_grid_and_archives.js');
const start=source.indexOf('async function _Q(e)');const block=source.slice(start,source.indexOf('const I=IS().activeRack',start));
assert(block.includes('__XenMelodicProjectReservationsP36.open('),'open before writes');
assert(block.indexOf('const __p25ExistingSamples=')<block.indexOf('__XenMelodicProjectReservationsP36.open('),
  'P3.10: identity reservation must follow read-only reference checks');
assert(block.indexOf('__XenMelodicProjectReservationsP36.open(')<block.indexOf('let __donorImported=null'),
  'P3.6: identity reservation must still precede first mutable import phase');
assert(block.includes('reservations:__projectReservationP36?.assignments??null'));
const react=read('src/rooms/canonical.js');
assert(react.includes('mergeReserved:__XenMelodicProjectReservationsP36.applyMerge'),'merge replay must retain idempotent reservation port');
const manifest=JSON.parse(read('source-manifest.json'));
const files=manifest.sources.flatMap(s=>s.files);
assert(files.indexOf('src/contracts/15_melodic_project_reservations.js')>files.indexOf('src/contracts/14_melodic_project_restore_plan.js'));
assert(files.indexOf('src/contracts/15_melodic_project_reservations.js')<files.indexOf('src/app/forge/03_spectral_grid_and_archives.js'));
console.log('P3.6 PASS: durable identity reservation, crash replay, conflict guards, opt-in idempotent React merge and source wiring');
