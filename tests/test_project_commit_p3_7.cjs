'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function api(){const context=vm.createContext({Object,JSON,Map,Set,Error,TypeError});vm.runInContext(read('src/contracts/16_project_commit_boundary.js'),context);return vm.runInContext('__XenProjectCommitP37',context);}
const base=[{id:'old',name:'Pulse',sourcePackageId:null,contentHash:'old-hash'}];
const imported=[{id:'imported',name:'New',sourcePackageId:'pack',contentHash:'new-hash'}];
function storage(initial=base){let raw=JSON.stringify(initial);let writes=0;return {readRaw:()=>raw,write:projects=>{writes++;raw=JSON.stringify(projects);return true},get raw(){return raw},get writes(){return writes},set raw(v){raw=v}};}
function opts(s,mode='merge',extra={}){return {mode,existing:base,incoming:imported,expectedRaw:JSON.stringify(base),readRaw:s.readRaw,write:s.write,...extra};}
const p=api(),s=storage();const done=p.commit(opts(s));
assert.equal(done.stored,true);assert.deepEqual(JSON.parse(s.raw),[...imported,...base]);
assert.equal(s.writes,1);
for(const mode of ['replace','differential']){
 const x=storage();const result=p.commit(opts(x,mode));
 assert.deepEqual(JSON.parse(x.raw),mode==='replace'?imported:[...imported,...base]);
 assert.equal(result.stored,true);
}
const same=[...base,imported[0]];const replayStore=storage(same);
const replay=p.commit({mode:'merge',existing:same,incoming:imported,expectedRaw:replayStore.raw,
 reserved:true,mergeReserved:(old,incoming)=>old,readRaw:replayStore.readRaw,write:replayStore.write});
assert.equal(replay.stored,true);assert.equal(replayStore.writes,1);
const conflict=storage();conflict.raw=JSON.stringify([{id:'other',name:'Other'}]);
assert.throws(()=>p.commit(opts(conflict)),/changed|concurrent|stale/i);assert.equal(conflict.writes,0);
const blocked=storage();blocked.write=()=>false;
assert.throws(()=>p.commit(opts(blocked)),/persist|storage|save/i);
const quota=storage();quota.write=()=>{throw Error('quota exceeded')};
assert.throws(()=>p.commit(opts(quota)),/quota|persist|storage/i);
const falsified=storage();falsified.write=()=>true;
assert.throws(()=>p.commit(opts(falsified)),/verification|readback|persist|storage/i);
const throwsRead=storage();throwsRead.readRaw=()=>{throw Error('storage denied')};
assert.throws(()=>p.commit(opts(throwsRead)),/storage denied/);
const broken=storage();broken.write=()=>{broken.raw='corrupt';return true};
assert.throws(()=>p.commit(opts(broken)),/verification|readback/i);
const bad=storage();assert.throws(()=>p.commit(opts(bad,'unknown')),/mode/i);
const duplicated=storage();assert.throws(()=>p.commit(opts(duplicated,'replace',{incoming:[imported[0],imported[0]]})),/duplicate/i);
// A second tab may have committed new projects before this handler captured storage.
const staleReact=storage([...base,...imported]);
assert.throws(()=>p.assertBaseline(staleReact.readRaw(),base),/stale|different|out of sync/i);
p.assertBaseline(JSON.stringify(base),base);p.assertBaseline(null,[]);
assert.throws(()=>p.assertBaseline('{bad',base),/corrupt|invalid/i);
assert.throws(()=>p.assertBaseline(JSON.stringify([{id:'dupe'},{id:'dupe'}]),base),/duplicate/i);
(async()=>{
 let live=false;
 const locks={request:async(key,options,callback)=>{assert.equal(key,'xensonar.workspace-import.v1');
 assert.equal(options.ifAvailable,true);if(live)return callback(null);live=true;
 try{return await callback({name:key})}finally{live=false}}};
 let finish;const pending=p.runExclusive(()=>new Promise(resolve=>{finish=resolve}),locks);
 await assert.rejects(p.runExclusive(async()=>true,locks),/another|parallel|busy/i);
 finish('complete');assert.equal(await pending,'complete');
 assert.equal(await p.runExclusive(async()=>42,null),42,'fallback for browsers without Web Locks');
 let finishLocal;const inTab=p.runExclusive(()=>new Promise(resolve=>{finishLocal=resolve}),null);
 await assert.rejects(p.runExclusive(async()=>false,null),/another|busy/i);
 finishLocal('in-tab complete');assert.equal(await inTab,'in-tab complete');
})().catch(e=>{console.error(e);process.exitCode=1});
const source=read('src/rooms/canonical.js');
assert(source.includes('__XenProjectCommitP37.commit('),'UI import must use synchronous commit barrier');
assert(source.includes('__xenP37RawBefore'), 'must snapshot storage BEFORE async importer');
assert(source.includes('e.setSavedMelodicProjects(__p37Commit.projects)'),'React updates must consume verified saved state');
const manifest=JSON.parse(read('source-manifest.json'));
const files=manifest.sources.flatMap(s=>s.files);
assert(files.indexOf('src/contracts/16_project_commit_boundary.js')>files.indexOf('src/contracts/15_melodic_project_reservations.js'));
assert(files.indexOf('src/contracts/16_project_commit_boundary.js')<files.indexOf('src/rooms/canonical.js'));
console.log('P3.7 PASS: project storage commit barrier, readback, stale writes, rollback boundary and React wiring');
