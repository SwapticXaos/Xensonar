'use strict';
// P3.5 RED/GREEN: replace the orchestrator's inline composer import calculation
// with a storage-free, injectable plan that preserves the historical behavior.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ctx=vm.createContext({Object,Set,Map});
vm.runInContext(read('src/contracts/14_melodic_project_restore_plan.js'),ctx);
const api=vm.runInContext('__XenMelodicProjectRestoreP35',ctx);
assert.equal(typeof api.prepare,'function');
assert.equal(typeof api.workspace,'function');
const copy=x=>JSON.parse(JSON.stringify(x));
const key=p=>p.name.trim().toLowerCase();
const decode=(p,map,meta)=>{
 const z=copy(p);z.composer.tracks=z.composer.tracks.map(t=>{
  const id=t.instrumentPreset;
  return {...t,instrumentPreset:id?.startsWith('sample:')&&map.has(id.slice(7))?'sample:'+map.get(id.slice(7)):id};
 });return {...z,origin:meta.origin,sourcePackageId:meta.sourcePackageId,syncState:meta.syncState};
};
const hash=p=>'computed:'+p.composer.tracks.map(t=>t.instrumentPreset).join(',');
const uniqueName=(name,used)=>{
 const base=name.trim()||'Imported Project';
 if(!used.has(base)){used.add(base);return base;}
 let n=2;while(used.has(`${base} (Import ${n})`))n++;
 const out=`${base} (Import ${n})`; used.add(out);return out;
};
function reference({incoming,existing,mapping,mode}){
 const used=new Set(existing.map(p=>p.name));const byName=new Map;
 for(const p of existing)byName.set(key(p),p);
 let replacedCount=0,idSeq=0;
 const projects=incoming.map(p=>{
  const out=decode(p,mapping,{origin:'importedPackage',sourcePackageId:'pkg-one',syncState:'imported'});
  out.contentHash=p.contentHash??hash(out);
  const prior=mode==='differential'?byName.get(key(p)):null;
  if(prior)replacedCount++;
  out.id=prior?.id??`allocated-${++idSeq}`;
  out.name=prior?.name??uniqueName(out.name,used);
  return out;
 });return {projects,replacedCount,idSeq};
}
function actual({incoming,existing,mapping,mode}){
 let idSeq=0;
 const x=api.prepare({incoming,existing,mapping,mode,packageId:'pkg-one',
   convert:decode,contentHash:hash,normalizeName:key,
   allocateId:()=>`allocated-${++idSeq}`,uniqueName});
 return {projects:x.projects,replacedCount:x.replacedCount,idSeq};
}
const existing=[{id:'local-1',name:'Pulse',composer:{tracks:[]}},
 {id:'local-2',name:' pulse ',composer:{tracks:[]}},
 {id:'local-3',name:'Other',composer:{tracks:[]}}];
const incoming=[
 {id:'in-1',name:'Pulse',composer:{tracks:[{instrumentPreset:'sample:old'}]},patternVariants:{x:1},patternLinks:{}},
 {id:'in-2',name:'Pulse',contentHash:'archivedHash',composer:{tracks:[{instrumentPreset:'sample:unknown'}]},patternVariants:{},patternLinks:{}},
 {id:'in-3',name:'New',composer:{tracks:[{instrumentPreset:'nodal:synth@2'}]},patternVariants:{},patternLinks:{}}
];
const mapping=new Map([['old','new']]);
Object.freeze(incoming);Object.freeze(existing);
for(const mode of ['merge','replace','differential']){
 const input={incoming,existing,mapping,mode};
 assert.deepEqual(copy(actual(input)),copy(reference(input)),mode+' unchanged historical project mapping');
 assert.equal(incoming[0].composer.tracks[0].instrumentPreset,'sample:old','archive is not modified');
 assert.equal(mapping.get('old'),'new','sample map unchanged');
}
assert.equal(actual({incoming,existing,mapping,mode:'differential'}).replacedCount,2,
 'last matching case-insensitive local project wins for differential');
assert.equal(actual({incoming,existing,mapping,mode:'merge'}).projects[1].name,'Pulse (Import 3)',
 'names are reserved in import order even for repeated incoming names');
// Plan creation performs no storage writes; its output is still applied by the existing React setState.
let writes=0;
const workspace=api.workspace({archived:incoming[0],mapping,packageId:'pkg-one',convert:decode,
 cloneComposer:x=>(writes++,copy(x)),cloneVariants:copy,cloneLinks:copy});
assert.equal(workspace.composer.tracks[0].instrumentPreset,'sample:new');
assert.equal(workspace.variants.x,1);
assert.equal(workspace.links && typeof workspace.links,'object');
assert.equal(writes,1,'keep historical second composer clone');
assert.throws(()=>api.prepare({incoming,existing,mapping,mode:'broken'}),/mode/i);
const src=read('src/contracts/14_melodic_project_restore_plan.js');
assert(!/indexedDB|localStorage|window\.|dispatchEvent|AudioContext|setSavedMelodicProjects/.test(src),
 'plan must not depend on storage, UI, or audio');
const source=read('src/app/forge/03_spectral_grid_and_archives.js');
const start=source.indexOf('async function _Q(e)');
const block=source.slice(start,source.indexOf('const I=IS().activeRack',start));
assert(block.includes('__XenMelodicProjectRestoreP35.prepare('),'production must use new preparation');
assert(block.includes('n.projects.imported=k.length,n.projects.replaced=R'));
assert(!block.includes('t.projects.map(X=>{const Q=wO('),'old direct project mapping removed');
assert(source.includes('__XenMelodicProjectRestoreP35.workspace('));
assert(source.includes('importedProjects:k'),'actual React apply contract unchanged');
const filelist=JSON.parse(read('source-manifest.json')).sources.flatMap(s=>s.files);
assert(filelist.indexOf('src/contracts/14_melodic_project_restore_plan.js')>filelist.indexOf('src/contracts/13_root_follow_import_plan.js'));
assert(filelist.indexOf('src/contracts/14_melodic_project_restore_plan.js')<filelist.indexOf('src/app/forge/03_spectral_grid_and_archives.js'));
console.log('P3.5 PASS: project plan, name/ID collisions, remapping, all modes, workspace projection and wiring');
