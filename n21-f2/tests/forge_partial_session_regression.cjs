'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src/forge_and_melodic/03_timeline_and_transport_ui.js'),'utf8');
const bridge=require('./nodal_sources.cjs').readNodalSources(root);
const extract=(s,from,to)=>{
  const i=s.indexOf(from),j=s.indexOf(to,i+from.length);
  assert(i>=0&&j>i,`Missing real production function ${from}`);return s.slice(i,j)
};
const defaults={brushSize:20,intensity:.4,hardness:.42,eraseMode:false,morphMode:'push'};
const storage=new Map();
const scope={
  Cp:defaults, Sx:{name:'Material'},
  kqe:()=>({tracks:[{id:'nodal'}]}),
  'M$':()=>({variants:[],links:[]}),
  vqe:s=>s?.materialExport ?? {name:'Material',bpm:120},
  Aqe:()=>({}),xqe:()=>({}),Mqe:()=>null,wqe:()=>({}),
  Rqe:()=>({}),Cqe:()=>({}),Pqe:()=>'',Iqe:()=>'',Eqe:()=>null,
  Tqe:()=> 'brush',Lqe:()=> 'forge',Bqe:()=> 'microtonal-logic',
  Dqe:()=> 'melodic',Nqe:()=>'', '$n':x=>x,
  localStorage:{getItem:k=>storage.get(k)??null},
  JSON,Math,
};
vm.createContext(scope);
vm.runInContext([
  extract(source,'function Fqe(', 'function Tqe('),
  extract(source,'function Oqe(', 'function _qe('),
  extract(bridge,'function nodalRestoreComposerSession()', 'function useNodalNavigation('),
  'globalThis.testInit=Oqe; globalThis.testRestore=nodalRestoreComposerSession; globalThis.testStamp=Fqe;'
].join('\n'),scope,{filename:'real-forge-session-functions.js'});
// Regression: persisted Nodal-only session omits unrelated Forge editor settings by design.
storage.set('xensonar.nodal.melodic-session.v1',JSON.stringify({schemaVersion:1,loopComposer:{tracks:[{id:'nodal'}]}}));
const restored=scope.testRestore();
assert(restored,'Nodal session should be restorable');
const fresh=scope.testInit({initialSession:restored,externalLogicView:'melodic'});
for(const k of ['brushSize','intensity','hardness','eraseMode','morphMode'])
 assert.equal(fresh[k],defaults[k],`${k} fallback must survive a composer-only restored session`);
assert.equal(fresh.projectName,'Material','Project fallback must work without materialExport');
assert.equal(scope.testStamp(restored),'positive','Stamp mode must work without Forge tool settings');
const existing=scope.testInit({initialSession:{toolSettings:{brushSize:17,intensity:.75,hardness:.18,eraseMode:true,morphMode:'twirlCW'},materialExport:{name:'Stored Project'},loopComposer:{tracks:[{id:'nodal'}]}}});
assert.equal(existing.brushSize,17);assert.equal(existing.intensity,.75);assert.equal(existing.hardness,.18);
assert.equal(existing.eraseMode,true);assert.equal(existing.morphMode,'twirlCW');assert.equal(existing.projectName,'Stored Project');
assert.equal(scope.testStamp({toolSettings:{eraseMode:true}}),'erase');
const empty=scope.testInit({initialSession:null,externalLogicView:'melodic'});
assert.equal(empty.brushSize,defaults.brushSize);
console.log('PASS actual Forge session initializer: sparse saved Nodal session, editor defaults, complete session and null session');
