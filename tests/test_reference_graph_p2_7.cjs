'use strict';
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const ctx=vm.createContext({Map,Set,Object,Array,Error,TypeError,console});
vm.runInContext(read('src/contracts/07_reference_integrity.js'),ctx);
vm.runInContext(read('src/contracts/08_reference_graph.js'),ctx);
// RED: P2.7 extended index not yet implemented.
vm.runInContext(read('src/contracts/09_reference_graph_extensions.js'),ctx);
const graph=vm.runInContext('__XenReferenceGraphP27',ctx);
const archive={samples:[],projects:[{name:'Melodic one',composer:{tracks:[
  {instrumentPreset:'nodal:a@1'},{instrumentPreset:'nodal:external@2'},{instrumentPreset:'sample:s'}],
  nodalInstruments:{'nodal:a@1':{name:'embedded'}}}}],workspace:{composer:{tracks:[]}},
  materialLibrary:{entries:[{archivedId:'mat1'},{archivedId:'mat2'}]},
  rootFollowBank:{memberIds:['mat1','mat-locally-present'],orderedIds:['mat1'],aliases:{mat1:'one'}},
  drumConfigLibrary:{entries:[{id:'d1'}],playlist:{orderedIds:['exported:d1','exported:local','preset:classic'],hiddenIds:['exported:d1'],aliases:{'exported:d1':'My Kit'}}}};
const before=JSON.stringify(archive);
const r=graph.inspect({archive,mode:'merge'});
assert.equal(r.schemaVersion,1);
assert.equal(r.adapters.length,3);
assert.equal(r.edges.filter(e=>e.kind==='root-follow.material').length,2);
assert.equal(r.edges.filter(e=>e.kind==='drum-playlist.exported').length,3);
assert.equal(r.edges.filter(e=>e.kind==='composer.nodal').length,2);
assert(r.edges.some(e=>e.targetScope==='material-library'&&e.targetId==='mat1'&&e.status==='packaged'));
assert(r.edges.some(e=>e.targetId==='mat-locally-present'&&e.status==='external-possible'));
assert(r.edges.some(e=>e.targetScope==='drum-config-library'&&e.targetId==='d1'&&e.status==='packaged'));
assert(r.edges.some(e=>e.targetId==='local'&&e.status==='external-possible'));
assert(r.edges.some(e=>e.targetScope==='nodal-instrument'&&e.targetId==='nodal:a@1'&&e.status==='embedded'));
assert(r.edges.some(e=>e.targetId==='nodal:external@2'&&e.status==='external-possible'));
assert(!r.edges.some(e=>e.targetId==='classic'));
assert(Object.isFrozen(r.edges)&&Object.isFrozen(r.edges[0]));
assert.equal(JSON.stringify(archive),before,'P2.7 must not modify incoming data');
assert.equal(r.unresolved.length,3);
assert.equal(r.counts.unresolved,3);
assert.equal(r.counts.definitivelyMissing,0,'unknown external inventory must never be declared missing');
assert.equal(graph.inspect({archive,mode:'replace'}).unresolved.length,3);
const empty=graph.inspect({archive:{samples:[],projects:[]},mode:'merge'});
assert.equal(empty.edges.length,0,'optional libraries should remain optional');
assert.throws(()=>graph.inspect({archive,mode:'delete'}),/mode/i);
assert.throws(()=>graph.inspect({archive:{...archive,rootFollowBank:{memberIds:'bad'}},mode:'merge'}),/Root Follow|memberIds/i);
assert.throws(()=>graph.inspect({archive:{...archive,drumConfigLibrary:{entries:[],playlist:{orderedIds:null}}},mode:'merge'}),/Drum playlist|orderedIds/i);
const app=read('src/app/forge/03_spectral_grid_and_archives.js');
const begin=app.indexOf('async function _Q(e)');
const guard=app.indexOf('__XenReferenceGraphP27.inspect(',begin);
const firstWrite=app.indexOf('NLe({records:o,mode:e.mode})',begin);
assert(guard>begin&&guard<firstWrite,'new read-only graph check must precede workspace writes');
const manifest=JSON.parse(read('source-manifest.json'));
const files=manifest.sources.flatMap(v=>v.files);
assert(files.indexOf('src/contracts/09_reference_graph_extensions.js')>files.indexOf('src/contracts/08_reference_graph.js'));
assert(files.indexOf('src/contracts/09_reference_graph_extensions.js')<files.indexOf('src/01_app_runtime.js'));
console.log('P2.7 PASS: three advisory adapters, external awareness, immutability and cold import wiring');
