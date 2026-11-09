'use strict';
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ctx=vm.createContext({Map,Set,Object,Array,Error,TypeError,console});
vm.runInContext(read('src/contracts/07_reference_integrity.js'),ctx);
vm.runInContext(read('src/contracts/08_reference_graph.js'),ctx);
const graph=vm.runInContext('__XenReferenceGraphP26',ctx);
const pack=()=>({
  samples:[{archivedId:'s1'},{archivedId:'s2'}],
  workspace:{composer:{tracks:[{instrumentPreset:'sample:s1'},{instrumentPreset:'synth:metal'}]}},
  projects:[{id:'p1',name:'melody',composer:{tracks:[{instrumentPreset:'sample:s2'}]}}],
  donorLibrary:{schemaVersion:1,presets:[
    {id:'donor-library:preset:a',value:{assetId:'melodic-sample:s1'}},
    {id:'donor-library:preset:b',value:{assetId:'asset:donor-blob'}}
  ],assets:[{id:'asset:donor-blob'}],workspaces:[{id:'workspace:material',value:{source:{sourceAsset:{__materialIntakeAssetRef:'asset:donor-blob'}}}}]},
  forgeExperiment:{schemaVersion:1,assets:[{id:'asset:forge-blob'}],workspaces:[{id:'workspace:autosave-v1',value:{mainSource:{assetId:'asset:forge-blob'},donorSource:{assetId:'asset:forge-blob'}}}]}
});
const base=pack();
const original=JSON.stringify(base);
let plan=graph.inspect({archive:base,mode:'replace',existingSamples:[{id:'old'}],
  localProjects:[{name:'old-project',composer:{tracks:[{instrumentPreset:'sample:old'}]}}]});
assert.equal(plan.schemaVersion,1);
assert.equal(plan.missing.length,0);
assert.equal(plan.localAtRisk.length,1);
assert.equal(plan.edges.length,7);
assert.equal(plan.edges.filter(x=>x.targetScope==='donor-db').length,2);
assert.equal(plan.edges.filter(x=>x.targetScope==='forge-db').length,2);
assert.equal(plan.edges.filter(x=>x.targetScope==='sample-db').length,3);
assert.equal(plan.adapters.length,4);
assert(Object.isFrozen(plan.edges));
assert(Object.isFrozen(plan.edges[0]));
assert.equal(graph.assertSafe(plan),plan);
assert.equal(JSON.stringify(base),original,'read-only graph must not mutate archive');
const absentDonor=pack();absentDonor.donorLibrary.assets=[];
plan=graph.inspect({archive:absentDonor,mode:'merge',existingSamples:[]});
assert(plan.missing.some(x=>x.targetScope==='donor-db'));
assert.throws(()=>graph.assertSafe(plan),/missing|unresolved/i);
const absentForge=pack();absentForge.forgeExperiment.assets=[];
plan=graph.inspect({archive:absentForge,mode:'replace',existingSamples:[]});
assert.equal(plan.missing.filter(x=>x.targetScope==='forge-db').length,2);
const absentLinked=pack();absentLinked.donorLibrary.presets[0].value.assetId='melodic-sample:missing';
plan=graph.inspect({archive:absentLinked,mode:'merge',existingSamples:[{id:'missing'}]});
assert(plan.missing.some(x=>x.targetId==='missing'),'linked donors require their samples in the package even in merge');
const absentComposer=pack();absentComposer.projects[0].composer.tracks[0].instrumentPreset='sample:old';
assert.equal(graph.inspect({archive:absentComposer,mode:'merge',existingSamples:[{id:'old'}]}).missing.length,0);
assert.equal(graph.inspect({archive:absentComposer,mode:'replace',existingSamples:[{id:'old'}]}).missing.length,1);
const wrongNamespace=pack();wrongNamespace.forgeExperiment.workspaces[0].value.mainSource.assetId='asset:donor-blob';
plan=graph.inspect({archive:wrongNamespace,mode:'merge',existingSamples:[]});
assert(plan.missing.some(x=>x.targetScope==='forge-db'&&x.targetId==='asset:donor-blob'),
  'same legacy asset id in donor db must not satisfy forge scoped edge');
const nullArchive=pack();nullArchive.donorLibrary=null;nullArchive.forgeExperiment=null;
assert.equal(graph.inspect({archive:nullArchive,mode:'merge',existingSamples:[]}).edges.length,2);
assert.throws(()=>graph.inspect({archive:base,mode:'oops',existingSamples:[]}),/mode/i);
assert.throws(()=>graph.inspect({archive:{...base,forgeExperiment:{assets:[],workspaces:null}},mode:'merge',existingSamples:[]}),/Forge|payload/i);
const source=read('src/app/forge/03_spectral_grid_and_archives.js');
const p=source.indexOf('async function _Q(e)');
const graphGuard=source.indexOf('__XenReferenceGraphP26.assertSafe(',p);
const firstWrite=source.indexOf('NLe({records:o,mode:e.mode})',p);
assert(graphGuard>p && graphGuard<firstWrite,'P2.6 read-only graph must run before first write');
assert(source.indexOf('__XenReferenceIntegrityP25.assertSafe(',p)<graphGuard,'P2.5 integrity gate must remain');
const manifest=JSON.parse(read('source-manifest.json'));
const sources=manifest.sources.flatMap(x=>x.files);
const g=sources.indexOf('src/contracts/08_reference_graph.js');
assert(g>sources.indexOf('src/contracts/07_reference_integrity.js'));
assert(g<sources.indexOf('src/01_app_runtime.js'));
console.log('P2.6 PASS: 4 typed adapters, scoped repositories, missing reference gates, local risk and prewrite wiring');
