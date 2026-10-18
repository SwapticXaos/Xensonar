/* A stored sample must remain linked through Saved Pattern -> Selected Config -> Shared Drum -> reload.
   Exercise actual serialized data transforms, not a source-text-only existence assertion. */
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
const room=read('src/app/forge/01_room_shell.js');
const storage=read('src/audio/01_voice_and_rfl_ownership.js');
const gridSource=read('src/rhythm/01_compact_drum_grid.js');
const mkSteps=()=>Object.fromEntries(['kick','snare','hatClosed','hatOpen','clap','perc','sample1','sample2','sample3'].map(k=>[k,Array(16).fill(k==='sample1'?0.86:0)]));
const slots={sample1:{id:'sample-20261013-a',name:'User beat A.wav',volume:1.2,pan:-0.25},sample2:{id:'',name:'',volume:1,pan:0},sample3:{id:'',name:'',volume:1,pan:0}};
const normalizeSampleSlots=input=>Object.fromEntries(['sample1','sample2','sample3'].map(k=>[k,{id:'',name:'',volume:1,pan:0,...(input?.[k]||{})}]));
const vmContext={__f52NormalizeSampleSlots:normalizeSampleSlots,
 fg:()=> 'standard',bc:x=>x||{},tm:x=>x||{},yg:x=>x||{},Sg:x=>x||{},
 vt:x=>x&&typeof x==='object'&&!Array.isArray(x),VT:x=>structuredClone(x),qH:()=> 'saved-drum-1',ffe:x=>x?.playlist,
 zT:['kick','snare','hatClosed','hatOpen','clap','perc'],
 JG:()=>({name:'Stored beat A'}),nM:()=>[],sw:[],So:[],
 et:{drumConfigMode:'exported',drumConfigId:'saved-drum-1',drumPattern:'broken_lilt',drumKit:'standard',quantizeBpm:112,drumActive:true,drumLaneKits:{},drumLaneSettings:{}},
 Q9:()=>({}),
};
function evalPart(source,start,end,ctx=vmContext){const i=source.indexOf(start),j=source.indexOf(end,i+start.length);assert(i>=0&&j>i,`${start} -> ${end} missing`);vm.runInNewContext(source.slice(i,j),ctx);}
// The real config normalization and Save-As constructor must preserve sample IDs.
evalPart(storage,'function nm(', 'function QH(');
evalPart(storage,'function ufe(', 'async function KH(');
const laneSteps=mkSteps();
const laneOrder=Object.keys(laneSteps);
const matrix={pattern:'broken_lilt',bars:1,segmentsPerBar:16,segmentMarkers:Array.from({length:15},(_,i)=>(i+1)/16),stepCount:16,laneOrder,laneSteps,stepPrograms:{},sampleSlots:slots};
const saved=vmContext.ufe({name:'Stored beat A',drumKit:'standard',matrix,sourceWorkspace:'xensonar-main-room-live',sampleSlots:slots});
assert.equal(saved.sampleSlots.sample1.id,slots.sample1.id,'Saved configuration retained uploaded Sample A');
// Rehydration from exported workspace package also must retain assignments.
evalPart(storage,'function ZH(', 'function bfe(');
const reimported=vmContext.ZH({entries:[JSON.parse(JSON.stringify(saved))],playlist:{orderedIds:[],hiddenIds:[],aliases:{}}});
assert(reimported&&reimported.entries.length===1,'workspace import has saved drum');
assert.equal(reimported.entries[0].sampleSlots.sample1.id,slots.sample1.id,'Workspace export/import retains Sample A ID');
// The real top-level React room adapter builds the shared snapshot from selected config.
vmContext.wl=saved;
const a=room.indexOf('const record={label:currentEntry?.name||"Drums"'), b=room.indexOf('__mlSharedDrumMachine.cycle=',a);
assert(a>0&&b>a,'real shared-room snapshot adapter located');
vm.runInNewContext('const selected=wl;const currentEntry={name:"Stored beat A"};'+room.slice(a,b)+'globalThis.out=record;',vmContext);
assert.equal(vmContext.out.exported.sampleSlots?.sample1?.id,slots.sample1.id,'Shared snapshot retains Sample A ID after selecting saved beat');
// The shared grid materialization cannot silently convert the reference to an empty slot.
vmContext.im=x=>structuredClone(x);
vmContext.WR=()=>{throw new Error('Saved pattern must not fall back to preset');};
vmContext._S=()=>[];
evalPart(gridSource,'function __mlGridFromSelection(', '/* F3.56.19:');
const restored=vmContext.__mlGridFromSelection(vmContext.out);
assert.equal(restored.sampleSlots.sample1.id,slots.sample1.id,'Reopened grid plays the original Sample A');
assert.equal(restored.laneSteps.sample1[0],0.86,'Sample A hit placements retained');
assert.equal(restored.sampleSlots.sample1.volume,1.2,'Sample volume retained');
assert.equal(restored.sampleSlots.sample1.pan,-0.25,'Sample pan retained');
// A fallback to an unavailable audio asset must remain explicit, not silently fabricate data.
assert.equal(typeof restored.sampleSlots.sample1.id,'string');
console.log('PASS save / library-package roundtrip / select / reload / Sample A ID + hits + volume + pan');
// Real sample-import/storage/reload functions against a minimal transaction-shaped
// in-memory IndexedDB fake. Checks that the Blob, not only its reference, is saved.
async function testBlobSurvivesLoad(){
 const samples=new Map();
 const fakeDB=async()=>({
  put(value){const req={};queueMicrotask(()=>{samples.set(value.id,value);req.onsuccess?.()});return req},
  get(id){const req={};queueMicrotask(()=>{req.result=samples.get(id);req.onsuccess?.()});return req}
 });
 const sc={AS:fakeDB,See:async()=>({duration:1.25}),Pj:()=>slots.sample1.id,
  pw:()=>{},fw:r=>({id:r.id,name:r.name}),__f52NormalizeSampleSlots:normalizeSampleSlots};
 evalPart(gridSource,'async function __f52ImportDrumSample(', 'function __f52EnsureDrumGrid(',sc);
 const assetStorage=read('src/runtime/instrument/03_selection_and_recording_tools.js');
 evalPart(assetStorage,'async function EF(', 'async function Ij(',sc);
 evalPart(assetStorage,'async function gw(', 'async function mg(',sc);
 const blob=new Blob([Buffer.from('RIFF dummy WAV data')],{type:'audio/wav'});
 blob.name='User beat A.wav';
 const descriptor=await sc.__f52ImportDrumSample(blob);
 assert.equal(descriptor.id,slots.sample1.id,'Sample import returns stored database asset ID');
 const loaded=await sc.gw(descriptor.id);
 assert(loaded instanceof Blob,'Sample DB reload returns original Blob');
 assert.deepEqual(Buffer.from(await loaded.arrayBuffer()),Buffer.from(await blob.arrayBuffer()),'WAV bytes survive DB reload');
 console.log('PASS Sample A import / indexed-blob persistence / reload bytes');
}
testBlobSurvivesLoad().catch(e=>{console.error(e);process.exitCode=1});
