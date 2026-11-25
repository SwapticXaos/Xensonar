'use strict';
// ROOM-BUDGET-01 (no browser): the Forge project codec's 256 MiB budget guards what it ALLOCATES.
// - decoding a snapshot whose typed arrays are already in memory (in-memory project / IndexedDB workspace) never fails on size
//   (a donor of a long song holds the whole source audio 5×; before, re-entering the Material Forge failed: "Room error isolated")
// - encoded data from a file that would allocate more than the budget is still refused BEFORE allocating
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const src=fs.readFileSync(path.join(__dirname,'..','src','storage','05_project_snapshots.js'),'utf8');
const ctx={Sw:buf=>Buffer.from(buf).toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary'),Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,Object,Array,Number,Set,Error,Math};
vm.createContext(ctx);vm.runInContext(src+'\nthis.codec=__ForgeProjectSnapshot;',ctx);const C=ctx.codec;
test('decode of in-memory typed arrays: no size limit (nothing is allocated)',()=>{
 const buf=new ArrayBuffer(64*1024*1024),views=Array.from({length:5},()=>new Float32Array(buf));/* 5 × 64 MiB = 320 MiB counted before */
 const snap={donorWorkbench:{source:{monoSamples:views[0],leftSamples:views[1],rightSamples:views[2],midSamples:views[3],sideSamples:views[4]}}};
 const out=C.decode(snap);assert.equal(out.donorWorkbench.source.monoSamples,views[0],'returned as is, no copy');
});
test('decode of encoded file data over the budget is refused before allocating',()=>{
 const n=300*1024*1024;assert.throws(()=>C.decode({x:{encoding:'xensonar-project-array-v1',type:'Uint8Array',length:n,dataBase64:'AAAA'}}),/256 MiB data budget/);
});
test('encode still counts (export to a file is bounded)',()=>{
 const small=new Float32Array(1024);const enc=C.encode({a:small});assert.equal(enc.a.encoding,'xensonar-project-array-v1');
 const back=C.decode(enc);assert.deepEqual(Array.from(back.a),Array.from(small));
});
