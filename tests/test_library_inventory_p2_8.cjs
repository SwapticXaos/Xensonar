'use strict';
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const ctx=vm.createContext({Map,Set,Object,Array,Error,TypeError,Promise,console});
vm.runInContext(read('src/contracts/07_reference_integrity.js'),ctx);
vm.runInContext(read('src/contracts/08_reference_graph.js'),ctx);
vm.runInContext(read('src/contracts/09_reference_graph_extensions.js'),ctx);
// RED: production implementation intentionally absent on P2.7 base.
vm.runInContext(read('src/contracts/10_library_inventory_ports.js'),ctx);
const inventory=vm.runInContext('__XenLibraryInventoryP28',ctx);
const graph=vm.runInContext('__XenReferenceGraphP27',ctx);
const archive={samples:[],projects:[{name:'A',composer:{tracks:[
  {instrumentPreset:'nodal:local@2'}, {instrumentPreset:'nodal:missing@1'},
  {instrumentPreset:'nodal:embedded@1'}],
  nodalInstruments:{'nodal:embedded@1':{name:'inline'}}}}],
  rootFollowBank:{memberIds:['stored-material','missing-material','incoming']},
  materialLibrary:{entries:[{archivedId:'incoming'}]},
  drumConfigLibrary:{entries:[{id:'packed'}],playlist:{
    orderedIds:['exported:stored-drum','exported:missing-drum','exported:packed','preset:factory'],hiddenIds:[]}}};
const original=JSON.stringify(archive);
const p27=graph.inspect({archive,mode:'merge'});
(async()=>{
  const ports={
    material:async()=>['stored-material','old-material-not-in-hot-cache'],
    drum:async()=>['stored-drum'],
    nodal:async()=>[{id:'local',revision:2},{id:'older',revision:1}]
  };
  const merged=await inventory.inspect({graph:p27,mode:'merge',ports});
  const status=id=>merged.edges.find(x=>x.targetId===id)?.status;
  assert.equal(status('incoming'),'packaged');
  assert.equal(status('packed'),'packaged');
  assert.equal(status('nodal:embedded@1'),'embedded');
  assert.equal(status('stored-material'),'local-present-now');
  assert.equal(status('stored-drum'),'local-present-now');
  assert.equal(status('nodal:local@2'),'local-present-now');
  assert.equal(status('nodal:missing@1'),'absent-in-snapshot');
  assert.equal(status('missing-material'),'absent-in-snapshot');
  assert.equal(status('missing-drum'),'absent-in-snapshot');
  assert.equal(merged.inventories['material-library'].count,2);
  assert.equal(merged.inventories['nodal-instrument'].count,2);
  const emptyArchive={samples:[],projects:[]};
  let unnecessaryReads=0;
  const idle=await inventory.inspect({graph:graph.inspect({archive:emptyArchive,mode:'merge'}),mode:'merge',ports:{
    material:()=>{unnecessaryReads++;return[]},
    drum:()=>{unnecessaryReads++;return[]},
    nodal:()=>{unnecessaryReads++;return[]}
  }});
  assert.equal(unnecessaryReads,0,'no cold-store openings without unresolved edges');
  assert.equal(idle.inventories['material-library'].state,'not-needed');
  assert(Object.isFrozen(merged.edges) && merged.edges.every(Object.isFrozen));
  assert.equal(JSON.stringify(archive),original,'index must not mutate source');
  const replaced=await inventory.inspect({graph:graph.inspect({archive,mode:'replace'}),mode:'replace',ports});
  assert.equal(replaced.edges.find(e=>e.targetId==='stored-material').status,'local-at-risk-on-replace');
  assert.equal(replaced.edges.find(e=>e.targetId==='stored-drum').status,'local-at-risk-on-replace');
  assert.equal(replaced.edges.find(e=>e.targetId==='nodal:local@2').status,'local-present-now');
  let failures=0;
  const failed=await inventory.inspect({graph:p27,mode:'merge',ports:{
    material:()=>{failures++;throw Error('quota / open blocked')},
    drum:()=>Promise.reject(Error('IDB unavailable')),
    nodal:()=>ports.nodal()
  }});
  assert.equal(failures,1);
  assert.equal(failed.edges.find(e=>e.targetId==='stored-material').status,'inventory-unavailable');
  assert.equal(failed.edges.find(e=>e.targetId==='stored-drum').status,'inventory-unavailable');
  assert.equal(failed.counts.absentInSnapshot,1,'only the successfully loaded Nodal inventory can establish absence');
  assert.equal(failed.edges.find(e=>e.targetId==='missing-material').status,'inventory-unavailable');
  assert.equal(failed.inventories['material-library'].state,'unavailable');
  assert.equal(failed.inventories['drum-config-library'].state,'unavailable');
  assert.equal(failed.inventories['nodal-instrument'].state,'available');
  assert.throws(()=>inventory.inspect({graph:p27,mode:'overwrite',ports}),/mode/i);
  const invalid=await inventory.inspect({graph:p27,mode:'merge',ports:{material:async()=>[null],drum:ports.drum,nodal:ports.nodal}});
  assert.equal(invalid.inventories['material-library'].state,'unavailable','bad provider result must not turn missing into a false positive or block import');
  assert.equal(invalid.edges.find(e=>e.targetId==='stored-material').status,'inventory-unavailable');
  const source=read('src/app/forge/03_spectral_grid_and_archives.js');
  const begin=source.indexOf('async function _Q(e)');
  const wiring=source.indexOf('__XenLibraryInventoryP28.inspect(',begin);
  const firstWrite=source.indexOf('NLe({records:o,mode:e.mode})',begin);
  assert(wiring>begin && wiring<firstWrite,'cold inventory inspect precedes first import write');
  assert(source.includes('store=>store.getAllKeys()'),'IDB key-only inventory, not cached display rows');
  const manifest=JSON.parse(read('source-manifest.json'));
  const files=manifest.sources.flatMap(v=>v.files);
  assert(files.indexOf('src/contracts/10_library_inventory_ports.js')>files.indexOf('src/contracts/09_reference_graph_extensions.js'));
  assert(files.indexOf('src/contracts/10_library_inventory_ports.js')<files.indexOf('src/01_app_runtime.js'));
  console.log('P2.8 PASS: material/drum IDB key inventories + versioned Nodal, unavailable-safe advisory status, and cold wiring');
})().catch(e=>{console.error(e);process.exitCode=1});
