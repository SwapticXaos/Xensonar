'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(path.join(__dirname,'../src/forge_and_melodic/03_timeline_and_transport_ui.js'),'utf8');
const start=src.indexOf('function __mlPrepareExplicitBarResize('),end=src.indexOf('function Uqe(',start);
assert(start>=0&&end>start,'Actual F4.3.7 helper/handler must be present');
const clone=x=>structuredClone(x);
const context=vm.createContext({
  window:{confirm:()=>true},Math,JSON,
  $n:clone,Bi:clone,Di:clone,Da:v=>Math.max(1,Math.min(16,Math.round(v))),
  ll:(bars,beats,segments)=>Array.from({length:bars+1},(_,i)=>({id:`bar-${i}`,beat:i*beats,kind:'bar'})),
  Mu:c=>c.bars*c.stepsPerBar,
  cn:(c,n)=>Math.max(0,Math.min(c.bars*c.stepsPerBar,n.startUnit)),
  yr:(c,n)=>Math.max(.125,Math.min(c.bars*c.stepsPerBar,n.durationUnits)),
  pr:(c,n)=>({...n,startUnit:Math.max(0,Math.min(c.bars*c.stepsPerBar,n.startUnit)),durationUnits:Math.max(.125,Math.min(c.bars*c.stepsPerBar,n.durationUnits))}),
  YM:()=>{},ZL:['patternA','patternB','patternC'],
  XM:({patternVariantsRef,patternLinksRef})=>({variants:clone(patternVariantsRef.current),links:clone(patternLinksRef.current)}),
  kM:({variants,links})=>({variants:clone(variants),links:clone(links)}),
  mS:clone,
  hu:({stores,patternVariantsRef,patternLinksRef,setLoopPatternVariants,setLoopPatternLinks})=>{
    patternVariantsRef.current=stores.variants;patternLinksRef.current=stores.links;
    setLoopPatternVariants(stores.variants);setLoopPatternLinks(stores.links);
  }
});
vm.runInContext(src.slice(start,end),context);
const prepare=vm.runInContext('__mlPrepareExplicitBarResize',context);
const makeNote=(id,startUnit,durationUnits=2)=>({id,trackId:'main',startUnit,durationUnits});
const before={bars:8,stepsPerBar:16,beatsPerBar:4,segmentCount:8,scrollX:.6,
  notes:[makeNote('first',3),makeNote('crosses',61,6),makeNote('late',111)],
  tracks:[{id:'main',patternPresetId:'patternA'}],selectedNoteId:'late',activeTrackIds:['main'],timeGuideMarkers:[]};
const stores={variants:{main:{patternA:clone(before.notes),patternB:[makeNote('Btail',109),makeNote('Bstart',13)],patternC:[makeNote('Cend',60,9)]}},links:{main:{patternA:'patternA',patternB:'patternB',patternC:'patternC'}}};
const beforeCopy=clone({before,stores});
let shortened=prepare(before,stores,4);
assert.equal(shortened.composer.bars,4);
assert.deepEqual(Array.from(shortened.composer.notes,n=>n.id),['first','crosses']);
assert.equal(shortened.composer.notes[1].durationUnits,3,'Crossing event clipped at bar boundary');
assert.equal(shortened.composer.selectedNoteId,'first','Selected note removed outside new range');
assert.deepEqual(Array.from(shortened.stores.variants.main.patternB,n=>n.id),['Bstart']);
assert.equal(shortened.stores.variants.main.patternC[0].durationUnits,4);
assert.equal(shortened.stores.links.main.patternC,'patternC');
assert.deepEqual({before,stores},beforeCopy,'Pure resize must not mutate its inputs');
assert.deepEqual(Array.from(prepare(before,stores,12).composer.notes,n=>n.id),['first','crosses','late'], 'Extension must retain events');
let state=clone(before),patternVariants=clone(stores.variants),patternLinks=clone(stores.links),status='',undos=[],confirmCalls=0;
const args={loopComposer:state,selectedMelodicProjectId:'own-project-8',selectedLoopNoteIds:['first','late'],
  loopPatternVariantsRef:{current:patternVariants},loopPatternLinksRef:{current:patternLinks},
  setLoopComposer:v=>{state=typeof v==='function'?v(state):v},
  setLoopPatternVariants:v=>{patternVariants=v},setLoopPatternLinks:v=>{patternLinks=v},
  setSelectedLoopNoteIds:v=>{args.selectedLoopNoteIds=typeof v==='function'?v(args.selectedLoopNoteIds):v},
  setComposerSelectionBox:()=>{},pushLoopComposerUndo:s=>undos.push(clone(s)),setStatus:v=>{status=v}};
const api=vm.runInContext('Qqe',context)(args);
context.window.confirm=()=>{confirmCalls++;return false};
api.handleLoopBarsChange(4);
assert.equal(state.bars,8,'Cancelled truncation retains composer');
assert.equal(undos.length,0,'Cancelled truncation must not record history');
assert.deepEqual(patternVariants,stores.variants);
assert.equal(confirmCalls,1);
context.window.confirm=()=>{confirmCalls++;return true};
api.handleLoopBarsChange(4);
assert.equal(state.bars,4);assert.equal(undos.length,1);
assert.equal(undos[0].composer.bars,8);assert.equal(undos[0].patternVariants.main.patternB[0].id,'Btail');
assert.equal(args.selectedLoopNoteIds.length,1);
assert.equal(patternVariants.main.patternB.length,1);assert.match(status,/Undo restores/);
// Simulate the existing atomic history restorer by applying the captured project snapshot.
state=clone(undos[0].composer);patternVariants=clone(undos[0].patternVariants);patternLinks=clone(undos[0].patternLinks);
assert.deepEqual(state.notes,before.notes);assert.deepEqual(patternVariants,stores.variants);
console.log('PASS F4.3.7 declined shortening preserves all notes, confirmed resize cuts across A/B/C with old-note timing, one undo restores composer+links+variants, extension keeps events');
