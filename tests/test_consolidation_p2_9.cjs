'use strict';
// P2.9: P2.5 is the single composer traversal on the production preflight path.
// P2.6 must consume its immutable snapshot without weakening either prewrite gate.
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ctx=vm.createContext({Map,Set,Object,Array,Error,TypeError,console});
vm.runInContext(read('src/contracts/07_reference_integrity.js'),ctx);
vm.runInContext(read('src/contracts/08_reference_graph.js'),ctx);
const p25=vm.runInContext('__XenReferenceIntegrityP25',ctx);
const p26=vm.runInContext('__XenReferenceGraphP26',ctx);
function samplePreset(id){return {instrumentPreset:'sample:'+id};}
const base={samples:[{archivedId:'in'}],
  workspace:{composer:{tracks:[samplePreset('in')]}},
  projects:[{name:'saved',composer:{tracks:[samplePreset('old')]}}],
  donorLibrary:{assets:[{id:'asset:donor-a'}],workspaces:[],presets:[{id:'v',value:{assetId:'asset:donor-a'}}]},
  forgeExperiment:{assets:[{id:'asset:forge-a'}],workspaces:[{id:'f',value:{mainSource:{assetId:'asset:forge-a'}}}]}};
const prior=[{id:'old'}];
const localProjects=[{name:'local',composer:{tracks:[samplePreset('old')]}}];
const activeComposer={tracks:[samplePreset('old')]};
const input={archive:base,mode:'merge',existingSamples:prior,localProjects,activeComposer};
const impact=p25.inspect(input);
assert.equal(impact.incomingReferences.length,2);
assert.equal(impact.localReferences.length,2);
assert(Object.isFrozen(impact.incomingReferences));
assert(Object.isFrozen(impact.localReferences));
assert(impact.incomingReferences.every(Object.isFrozen));
const oldGraph=p26.inspect(input);
const reused=p26.inspect({...input,sampleImpact:impact});
assert.deepEqual(JSON.parse(JSON.stringify(reused)),JSON.parse(JSON.stringify(oldGraph)),
  'snapshot reuse must preserve all edges, ordering, counts, missing and local risks');
assert.throws(()=>p26.inspect({...input,mode:'replace',sampleImpact:impact}),/snapshot|impact|mode/i);
assert.throws(()=>p26.inspect({...input,sampleImpact:{...impact,incomingReferences:null}}),/snapshot|impact/i);
// Detect a second pass over the same computed property: this is the actual runtime cost removed.
let reads=0;
const counted={get instrumentPreset(){reads++;return 'sample:in';}};
const countedArchive={...base,workspace:{composer:{tracks:[counted]}},projects:[]};
const countedInput={archive:countedArchive,mode:'merge',existingSamples:[],localProjects:[],activeComposer:null};
const collected=p25.inspect(countedInput);
assert.equal(reads,1,'P2.5 parses the composer once');
p26.inspect({...countedInput,sampleImpact:collected});
assert.equal(reads,1,'P2.6 consumes the P2.5 snapshot, no second composer parse');
p25.verifyResolved({archive:countedArchive,mapping:new Map([['in','in']]),
  availableSamples:[{id:'in'}],sampleImpact:collected});
assert.equal(reads,1,'post-stage P2.5 verification reuses prewrite snapshot; no third parse');
assert.throws(()=>p25.verifyResolved({archive:countedArchive,mapping:new Map(),availableSamples:[],
  sampleImpact:collected}),/unresolved/i,'durability check is not bypassed');
assert.throws(()=>p25.verifyResolved({archive:countedArchive,mapping:new Map(),availableSamples:[],
  sampleImpact:{...collected,incomingReferences:null}}),/snapshot/i);
p26.inspect(countedInput);
assert.equal(reads,2,'standalone P2.6 retains backward-compatible self-inspection');
const missingInput={...input,archive:{...base,workspace:{composer:{tracks:[samplePreset('gone')]}},projects:[]}};
const missingImpact=p25.inspect(missingInput);
assert.throws(()=>p25.assertSafe(missingImpact),/missing sample/i);
const missingGraph=p26.inspect({...missingInput,sampleImpact:missingImpact});
assert.throws(()=>p26.assertSafe(missingGraph),/unresolved/i);
const src=read('src/app/forge/03_spectral_grid_and_archives.js');
const begin=src.indexOf('async function _Q(e)');
const firstWrite=src.indexOf('NLe({records:o,mode:e.mode})',begin);
const p25Gate=src.indexOf('__XenReferenceIntegrityP25.assertSafe(',begin);
const p26Call=src.indexOf('__XenReferenceGraphP26.inspect(',begin);
const p26Gate=src.indexOf('__XenReferenceGraphP26.assertSafe(',begin);
assert(p25Gate>begin&&p25Gate<p26Call&&p26Call<p26Gate&&p26Gate<firstWrite);
assert(src.includes('availableSamples:await __xenP23SampleListStrict(),sampleImpact:__p25Impact'),
  'post-stage durable target check must reuse the same snapshot');
assert(src.slice(p26Call,p26Gate).includes('sampleImpact:__p25Impact'),
  'real import must reuse validated composer snapshot');
assert.equal((src.match(/Local sample dependencies at risk of replace|Existing local melodic project\/active composer may reference replaced samples/g)||[]).length,1,
  'one replace-risk warning rather than two duplicates');
console.log('P2.9 PASS: composer parsed once, P2.6 report preserved, both prewrite guards retained');
