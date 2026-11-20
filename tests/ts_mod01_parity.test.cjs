'use strict';
// TS-MOD-01: the typed module src/ts/nodal/nodalModulationMatrix.ts behaves exactly like the minified area it replaces
// (tests/fixtures/ts_mod01_legacy_07.js): same constants, same results for random and edge-case inputs.
const test=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');
const fs=require('node:fs');const path=require('node:path');const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const legacy=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,'tests/fixtures/ts_mod01_legacy_07.js'),'utf8')+
 ';globalThis.L={Uae,Kae,$ae,R0,Xae,Yae,Jae,Zae,eoe};',legacy);
const L=legacy.L;
const mod=vm.createContext({});vm.runInContext(execFileSync('node',[path.join(root,'tools/ts_module.cjs'),path.join(root,'src/ts/nodal/nodalModulationMatrix.ts')]).toString()+
 ';globalThis.M=__XenTs_nodalModulationMatrix;',mod);
const M=mod.M;
const same=(a,b,msg)=>assert.deepEqual(JSON.parse(JSON.stringify(b)),JSON.parse(JSON.stringify(a)),msg);
let seed=7;const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;
const edge=[undefined,null,NaN,Infinity,-Infinity,-1,0,.22,.5,1,2,-0.3,'0.4'];
const num=()=>rnd()<.3?edge[Math.floor(rnd()*edge.length)]:rnd()*2.4-.6;
test('constants are identical',()=>{
 same(L.Uae,M.NODAL_MOD_TARGET_IDS,'target ids');same(L.Kae,M.NODAL_MOD_SOURCE_LABELS,'source labels');
 same(L.$ae,M.NODAL_MOD_TARGET_LABELS,'target labels');same(L.R0,M.DEFAULT_NODAL_MOD_ROUTES,'default routes');
});
test('curves',()=>{for(const c of ['linear','expo','softKnee','inverse','threshold','unknown'])for(let i=0;i<400;i++){const v=num();assert.ok(Object.is(L.Yae(v,c),M.applyNodalModCurve(v,c)),c+' '+v)}});
test('source values, routes and matrix (5000 random cases)',()=>{
 const keys=['myzelPrimaryRelationInterference','myzelTopologicalRelationCount','myzelRelationTension','constellationTension','myzelVoidPressure','myzelClusterMass','constellationFlux','myzelPrimaryRelationSparkle','myzelGestaltLinearity','myzelGestaltAsymmetry','constellationCentroidX'];
 const obj=ks=>{const o={};for(const k of ks)if(rnd()<.7)o[k]=num();return o};
 for(let i=0;i<5000;i++){
  const snap=obj(keys),sem=rnd()<.2?null:obj(['envObsession','envRaw','symbiosis']),tel=rnd()<.2?undefined:obj(['relationEnergy','primaryInterference','primarySparkle']);
  const a=L.Jae(snap,sem,tel),b=M.deriveNodalModSourceValues(snap,sem,tel);same(a,b,'sources');
  const routes=rnd()<.3?(rnd()<.5?null:[]):L.R0.slice(0,1+Math.floor(rnd()*10)).map(r=>{const o={};for(const k of Object.keys(r))if(rnd()<.6)o[k]=k==='source'||k==='target'||k==='id'||k==='label'||k==='curve'?r[k]:k==='bipolar'||k==='enabled'?rnd()<.5:num();return o});
  same(L.Xae(routes),M.normalizeNodalModRoutes(routes),'normalize');
  same(L.eoe(a,routes),M.evaluateNodalModulationMatrix(b,routes),'matrix');
  for(const r of L.Xae(routes))assert.ok(Object.is(L.Zae(r,a),M.evaluateNodalModRoute(r,b)),'route');
 }
 same(L.eoe(L.Jae({})),M.evaluateNodalModulationMatrix(M.deriveNodalModSourceValues({})),'default argument');
});
