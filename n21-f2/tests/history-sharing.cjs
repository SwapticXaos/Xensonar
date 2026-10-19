'use strict';
const assert=require('node:assert/strict'),{load}=require('./offline_runtime.cjs');
const h=load(process.cwd());assert.equal(h.run('typeof __ForgeHistorySnapshots'),'object');
const r=h.run(`(()=>{
 const s=pe.getState(),g=s.spectralData;ys().resize(g.width,g.height);ys().initialized=true;
 for(let i=0;i<30;i++){pe.getState().pushUndo();g.set(i,100,(i+1)/32);g.setGrain(i,100,(i+1)/64);ys().bodyMass[100*g.width+i]=(i+1)/32;g.carrierDetune=i/32;}
 const usage=pe.getState().getHistoryUsage(),last=pe.getState().undoStack.at(-1).historyData.metrics;
 for(let i=29;i>=0;i--){pe.getState().undo();const expected=i?(i-1)/32:0;if(Math.abs(g.carrierDetune-expected)>1e-7||Math.abs(g.getGrain(i,100)-.5)>1e-7)throw Error('Undo lost grain/Detune at '+i);if(Math.abs(g.get(i,100))>1e-7||Math.abs(ys().bodyMass[100*g.width+i])>1e-7)throw Error('Undo lost raster/body at '+i);}
 const undoUsage=pe.getState().getHistoryUsage();
 for(let i=0;i<30;i++){pe.getState().redo();if(Math.abs(g.getGrain(i,100)-(i+1)/64)>1e-7)throw Error('Redo lost grain at '+i);if(Math.abs(g.get(i,100)-(i+1)/32)>1e-7||Math.abs(ys().bodyMass[100*g.width+i]-(i+1)/32)>1e-7)throw Error('Redo lost raster/body at '+i);}
 return {usage,last,undoUsage,redoUsage:pe.getState().getHistoryUsage(),finalDetune:g.carrierDetune};
})()`);
assert.equal(r.usage.undoEntries,30);assert(r.usage.bytes<64*1024*1024);assert.equal(r.undoUsage.redoEntries,30);assert.equal(r.redoUsage.undoEntries,30);assert.equal(r.finalDetune,29/32);assert(r.last.copiedBytes<128*1024);
console.log('PASS 30 full-size local edits, exact grid/body/grain/Detune Undo and Redo, shared page budget');console.log(JSON.stringify(r));

const edge=h.run(`(()=>{
 const grid=new ph(17,3),body=new xDe();body.resize(17,3);body.initialized=true;body.stampMeta={width:1,height:1,...Object.fromEntries(['bodyMass','sourceTime','sourceBand','sourceWeight','bodyBias','airBias','impactBias','traceBias'].map((key,i)=>[key,new Float32Array([i/16])]))};
 const bits=new Uint32Array(grid.data.buffer);bits[0]=0x80000000;bits[1]=0x7fc01234;
 const first=__ForgeHistorySnapshots.capture(grid,body);grid.data[2]=.75;body.bodyBias[2]=.25;const second=__ForgeHistorySnapshots.capture(grid,body,first);
 grid.clear();body.clear();__ForgeHistorySnapshots.restore(first,grid,body);const exact=new Uint32Array(grid.data.buffer)[0]===0x80000000&&new Uint32Array(grid.data.buffer)[1]===0x7fc01234;
 __ForgeHistorySnapshots.restore(second,grid,body);const value=grid.data[2]===.75&&body.bodyBias[2]===.25&&body.stampMeta.traceBias[0]===7/16;
 const unchanged=__ForgeHistorySnapshots.capture(grid,body,second).metrics.copiedBytes===0;
 body.clear();const empty=__ForgeHistorySnapshots.capture(grid,body,second);__ForgeHistorySnapshots.restore(empty,grid,body);
 return {exact,value,unchanged,empty:body.width===0&&body.bodyMass.length===0};
})()`);assert(edge.exact&&edge.value&&edge.unchanged&&edge.empty);console.log('PASS bit-exact signed zero/NaN, partial last pages, stamps, empty Body and zero-copy unchanged capture');
const dense=h.run(`(()=>{pe.setState({undoStack:[],redoStack:[]});const g=pe.getState().spectralData;ys().resize(g.width,g.height);for(let n=0;n<7;n++){pe.getState().pushUndo();g.data.fill((n+1)/16);g.grainData.fill((n+2)/16);for(const key of ['bodyMass','sourceTime','sourceBand','sourceWeight','bodyBias','airBias','impactBias','traceBias'])ys()[key].fill((n+1)/16);}return pe.getState().getHistoryUsage();})()`);assert(dense.bytes<=dense.maxBytes&&dense.undoEntries>0&&dense.undoEntries<7);console.log('PASS dense changes still evict oldest snapshots within the same 192 MiB budget');
const fs=require('node:fs');fs.mkdirSync('results/shared-history',{recursive:true});fs.writeFileSync('results/shared-history/contracts.json',JSON.stringify({local:r,edge,dense},null,2)+'\n');

const portable=h.run(`(()=>{const s=pe.getState().createProjectSnapshot();return !('historyData' in s)&&s.spectralSnapshot instanceof Float32Array&&s.bodySnapshot.bodyMass instanceof Float32Array;})()`);assert(portable);console.log('PASS project/archive snapshots retain their contiguous Float32 format');
