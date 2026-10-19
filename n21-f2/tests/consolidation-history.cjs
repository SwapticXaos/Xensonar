'use strict';
const assert=require('node:assert/strict'),{load}=require('./offline_runtime.cjs');
const h=load(process.cwd());assert.equal(h.run('typeof __ForgeHistoryBudget'),'object');
const checks=h.run(`(()=>{
 const budget=__ForgeHistoryBudget.create({maxBytes:10000,maxEntries:3});
 const shared=new Float32Array(100),entry=id=>({id,spectralSnapshot:new Float32Array(200),sourceAsset:{monoSamples:shared}});
 const limited=budget.limit([entry(1),entry(2),entry(3),entry(4)],[],'undo');
 const mixed=budget.limit([entry(1),entry(2)],[entry(3),entry(4)],'redo');
 const unique=budget.measure([{x:shared,y:shared.subarray(2)}]);
 const huge=budget.limit([{spectralSnapshot:new Float32Array(4000)}],[],'undo');
 return {ids:limited.undoStack.map(x=>x.id),mixedUndo:mixed.undoStack.map(x=>x.id),mixedRedo:mixed.redoStack.map(x=>x.id),unique,hugeCount:huge.undoStack.length};
})()`);
assert.deepEqual(Array.from(checks.ids),[2,3,4]);assert.deepEqual(Array.from(checks.mixedUndo),[2]);assert.deepEqual(Array.from(checks.mixedRedo),[3,4]);assert(checks.unique<1000,'shared ArrayBuffer counted once');assert.equal(checks.hugeCount,0);
const runtime=h.run(`(()=>{
 const s=pe.getState(),g=s.spectralData;ys().resize(g.width,g.height);ys().initialized=true;
 for(let i=0;i<7;i++){pe.getState().pushUndo();g.set(0,0,(i+1)/10);ys().bodyMass[0]=(i+1)/10;}
 const usage=pe.getState().getHistoryUsage();pe.getState().undo();const undo=[g.get(0,0),ys().bodyMass[0]];
 pe.getState().redo();const redo=[g.get(0,0),ys().bodyMass[0]];
 return {usage,undo,redo,after:pe.getState().getHistoryUsage()};
})()`);
assert(runtime.usage.bytes<=runtime.usage.maxBytes);assert(runtime.usage.undoEntries===7);assert(Math.abs(runtime.undo[0]-.6)<1e-6);assert(Math.abs(runtime.undo[1]-.6)<1e-6);assert(Math.abs(runtime.redo[0]-.7)<1e-6);assert(Math.abs(runtime.redo[1]-.7)<1e-6);assert(runtime.after.bytes<=runtime.after.maxBytes);
console.log('PASS shared-buffer accounting, combined count/byte limits, oldest-first eviction, oversized entry and full-size Body Undo/Redo');
console.log(JSON.stringify(runtime));
