const fs=require('fs'), vm=require('vm'),assert=require('node:assert/strict');
const htmlPath=process.argv[2] || '/mnt/data/XenSonar_P7_38_11_Starter_Sessions_Test.html';
const source=fs.readFileSync(htmlPath,'utf8');
const extract=(start,end)=>{const a=source.indexOf(start);if(a<0)throw Error('Missing '+start);const b=source.indexOf(end,a+start.length);if(b<0)throw Error('Missing '+end);return source.slice(a,b);};
async function exportTest(reject=false){
 const events=[], err=new Error('IndexedDB quota exhausted');let resolveWrite,rejectWrite;
 const persisted=new Promise((resolve,reject)=>{resolveWrite=resolve;rejectWrite=reject});
 const env={
  VR:async()=>({blob:{size:50000},bars:4,bpm:108}),I9e:()=>({name:'my piece'}),$M:()=>({id:'prepared'}),Ly:(meta,blob)=>({meta,blob}),
  bu:(pkg,onPersist)=>{onPersist?.(persisted);return{id:'frozen-melody',blob:{size:50000}}},
  Uhe:async()=>({blob:{size:50000}}),QT:{},ULe:()=>{},ri:(kind,details)=>events.push(['membership',kind,details]),
  __mlNodalRflConfig:()=>({sourceKind:'material'}),__mlContainsNodalTracks:()=>true,
 };
 const sandbox=vm.createContext(env);
 vm.runInContext(extract('async function B9e(e){','async function D9e(e){'),sandbox);
 const session={loopComposer:{},materialExport:{name:'Test',role:'loop',bpm:108,adapterId:'a',rootFollowPreferred:true},activeHandoffProfile:{},referenceBpm:108,canonicalProducer:null,selectedAdapterName:'canonical',setStatus:s=>events.push(['status',s])};
 const task=sandbox.B9e(session);
 await new Promise(r=>setImmediate(r));
 assert.equal(events.length,0,'Should never claim/publish snapshot before durable audio save');
 if(reject){rejectWrite(err); await assert.rejects(task,/IndexedDB quota exhausted/);assert.equal(events.filter(e=>e[0]==='membership').length,0,'Failed save must not become an RFL member');assert.ok(events.find(e=>e[0]==='status'&&e[1].includes('NOT saved')),'Failure must be visible to user');}
 else{resolveWrite();await task;assert.equal(events.filter(e=>e[0]==='membership').length,1);assert.equal(events.filter(e=>e[0]==='status').length,1)}
}
function legacyTests(){
 const body=extract('function __mlRflLegacyNodalFallback(','function cge(');
 const scope=vm.createContext({});vm.runInContext(body,scope);
 const f=scope.__mlRflLegacyNodalFallback;
 const nodal={sourceKind:'synth',renderMode:'direct',synthPattern:{tracks:[{instrumentPreset:'nodal:glass@1'}],notes:[]},synthPatch:{a:1}};
 const regular={sourceKind:'synth',renderMode:'direct',synthPattern:{tracks:[{instrumentPreset:'deep_sub'}],notes:[]}};
 const wav={blob:{size:50000}};
 const fixed=f(wav,nodal);
 assert.equal(fixed.sourceKind,'material');assert.equal(fixed.renderMode,'flowing');assert.equal(fixed.synthPattern,null);
 assert.equal(nodal.sourceKind,'synth','Do not mutate persisted configs');
 assert.equal(f(wav,regular),regular,'Do not touch ordinary synth loops');
 assert.equal(f({blob:null},nodal),nodal,'No data means no silent fake fallback');
 assert.equal(f(wav,{sourceKind:'material'}).sourceKind,'material');
}
(async()=>{await exportTest(false);await exportTest(true);legacyTests();console.log('PASS: durable export acknowledged only after save; errors surfaced; legacy Nodal RFL fallback safely scoped');})().catch(e=>{console.error(e);process.exitCode=1});
