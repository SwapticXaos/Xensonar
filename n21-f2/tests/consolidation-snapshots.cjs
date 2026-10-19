'use strict';
const assert=require('node:assert/strict'),{load}=require('./offline_runtime.cjs');
const h=load(process.cwd());
const result=h.run(`(()=>{
 const state=pe.getState(),grid=state.spectralData;
 grid.set(3,8,.625);grid.setGrain(3,8,.375);grid.carrierDetune=.35;
 ys().resize(grid.width,grid.height);ys().initialized=true;
 const keys=['bodyMass','sourceTime','sourceBand','sourceWeight','bodyBias','airBias','impactBias','traceBias'];
 keys.forEach((key,i)=>ys()[key][19]=(i+1)/16);ys().bodyMass[19]=.8125;
 ys().stampMeta={width:2,height:1,...Object.fromEntries(keys.map((key,i)=>[key,new Float32Array([(i+1)/16,(i+2)/16])]))};
 const snapshot=state.createProjectSnapshot();
 const record={id:'roundtrip',name:'Roundtrip',createdAt:1,updatedAt:2,bpm:108,bars:1,snapshot};
 const incoming=iLe(JSON.parse(AQ(oLe(record))));
 grid.clear();ys().clear();state.loadProjectSnapshot(incoming.snapshot);
 return {raster:grid.get(3,8),grain:grid.getGrain(3,8),body:ys().bodyMass[19],detune:grid.carrierDetune,bodyType:ys().bodyMass.constructor.name,bodyFields:keys.map(key=>ys()[key][19]),stampFields:keys.map(key=>Array.from(ys().stampMeta[key]))};
})()`);
assert.equal(result.raster,.625);assert.equal(result.grain,.375);assert.equal(result.body,.8125);assert.equal(result.detune,.35);assert.equal(result.bodyType,'Float32Array');
assert.deepEqual(Array.from(result.bodyFields),[.8125,2/16,3/16,4/16,5/16,6/16,7/16,8/16]);
for(let i=0;i<8;i++)assert.deepEqual(Array.from(result.stampFields[i]),[(i+1)/16,(i+2)/16]);
console.log('PASS archive codec restores complete raster, grain, body arrays and Detune');
const atomic=h.run(`(()=>{
 const state=pe.getState(),snapshot=state.createProjectSnapshot(),before={grid:state.spectralData.cloneData(),body:ys().bodyMass.slice(),selection:JSON.stringify(state.carrierIntegralSelection),emilia:JSON.stringify(__Emilia.snapshot()),fractalia:JSON.stringify(__Fractalia.snapshot()),version:state.renderVersion,epoch:__f333Epoch};
 const corruptions=[s=>s.bodySnapshot.bodyMass={length:3},s=>s.bodySnapshot.sourceTime=new Float32Array(1),s=>s.spectralSnapshot=new Float32Array(1),s=>s.spectralSnapshot[0]=NaN,s=>s.materialExport=null,s=>s.materialExport.guideMarkers={},s=>s.version='future-unsupported',s=>s.fractaliaInstrument={schema:'invalid',version:999},s=>{s.bodySnapshot.stampMeta={width:1,height:1,...Object.fromEntries(['bodyMass','sourceTime','sourceBand','sourceWeight','bodyBias','airBias','impactBias','traceBias'].map(k=>[k,[0]]))};s.bodySnapshot.stampMeta.bodyMass=[1e100]}];
 let rejected=0;
 for(const corrupt of corruptions){const candidate=structuredClone(snapshot);candidate.spectralSnapshot.fill(.9);corrupt(candidate);try{pe.getState().loadProjectSnapshot(candidate)}catch{rejected++}}
 return {rejected,unchanged:state.spectralData.cloneData().every((v,i)=>v===before.grid[i])&&ys().bodyMass.every((v,i)=>v===before.body[i])&&JSON.stringify(pe.getState().carrierIntegralSelection)===before.selection&&JSON.stringify(__Emilia.snapshot())===before.emilia&&JSON.stringify(__Fractalia.snapshot())===before.fractalia&&pe.getState().renderVersion===before.version&&__f333Epoch===before.epoch};
})()`);
assert.equal(atomic.rejected,9);assert(atomic.unchanged,'invalid snapshots must not stop playback or change workspace/instruments');
console.log('PASS nine malformed snapshots rejected before any live workspace/transport/instrument mutation');
const portability=h.run(`(()=>{
 const input={float:new Float32Array([.25,-.5]),offset:new Uint16Array(new Uint16Array([1,2,65535,4]).buffer,2,2),curve:Array.from({length:20000},(_,i)=>i/20000),legacy:new Float32Array(0)};
 const encoded=__ForgeProjectSnapshot.encode(input),output=__ForgeProjectSnapshot.decode(JSON.parse(AQ(encoded)));
 let broken=false;try{__ForgeProjectSnapshot.decode({encoding:'xensonar-project-array-v1',type:'Float32Array',length:100,dataBase64:'AA=='})}catch{broken=true}
 let omitted=false;try{__ForgeProjectSnapshot.decode({xensonarArchiveOmittedTypedArray:true,type:'Float32Array',length:3000,preview:[1,2]})}catch{omitted=true}
 const oldEmpty=__ForgeProjectSnapshot.decode({xensonarArchiveOmittedTypedArray:true,type:'Float32Array',length:0,preview:[]});
 return {float:Array.from(output.float),offset:Array.from(output.offset),type:output.offset.constructor.name,curve:output.curve.length,last:output.curve.at(-1),empty:oldEmpty.length,broken,omitted};
})()`);
assert.deepEqual(Array.from(portability.float),[.25,-.5]);assert.deepEqual(Array.from(portability.offset),[2,65535]);assert.equal(portability.type,'Uint16Array');assert.equal(portability.curve,20000);assert.equal(portability.last,19999/20000);assert.equal(portability.empty,0);assert(portability.broken&&portability.omitted);
console.log('PASS typed-array offsets/types, long curves, empty legacy arrays and rejection of incomplete archive data');
const quota=h.run(`(()=>{const state=pe.getState(),snapshot=state.createProjectSnapshot(),before=state.spectralData.cloneData(),epoch=__f333Epoch; snapshot.fractaliaInstrument={...snapshot.fractaliaInstrument,name:'Quota test recipe'};const write=localStorage.setItem;localStorage.setItem=()=>{throw Error('QuotaExceededError')};let rejected=false;try{state.loadProjectSnapshot(snapshot)}catch{rejected=true}finally{localStorage.setItem=write}const after=state.spectralData.cloneData();return rejected&&epoch===__f333Epoch&&before.every((v,i)=>v===after[i]);})()`);
assert(quota);console.log('PASS Fractalia storage failure leaves active workspace and transport intact');
