'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=file=>fs.readFileSync(file,'utf8');
const handoff=read('src/handoff/00_chat_feature_addons.js');
const bass=handoff.slice(handoff.indexOf('const __XenBassGrid=(()=>{'),handoff.indexOf('function __XenBassGridRuntime'));
let quick=read('src/mix/03_quick_menu.js'),meta=read('src/mix/03_meta_menu.js');
if(process.env.P738_REFERENCE_HTML){
 const reference=read(process.env.P738_REFERENCE_HTML),start=reference.indexOf('const __XenSongKinds='),middle=reference.indexOf('/* 🎧 Meta-Menu',start),end=reference.indexOf(read('src/mix/04_melodic_spatial.js').slice(0,100),middle);
 assert(start>=0&&middle>start&&end>middle,'reference source boundaries');quick=reference.slice(start,middle);meta=reference.slice(middle,end);
}
const memory=new Map();let failedKey=null;
const storage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>{if(key===failedKey)throw Error('quota '+key);memory.set(key,value)}};
const context=vm.createContext({console,localStorage:storage,window:{},crypto:require('node:crypto').webcrypto,
 setTimeout:()=>1,clearTimeout:()=>{},__xenGridStepLimit:256,Kp:id=>Array.from({length:19},(_,i)=>1200*i/19),vF:()=>1200,
 Au:mode=>Array.from({length:19},(_,i)=>mode==='chromatic'||i%2===0),Ka:()=>[{value:'chromatic'},{value:'dorian'}],
 sj:()=>[{id:'19edo',label:'19 EDO'}]});
require('./sessions-test-helpers.cjs').installBootSnapshot(context);
vm.runInContext(bass+'\n'+quick+'\n'+meta+'\n'+read('src/mix/03_legacy_song_import.js')+'\nthis.api={quick:__XenQuick,meta:__XenMetaSessions,room:__XenMainRoomSessionBridge,bass:__XenBassGrid,legacy:__xenLegacySongParts,make:__createXenMetaSessionStore};',context);
const {api}=context,run=text=>vm.runInContext(text,context),json=value=>JSON.parse(JSON.stringify(value));
run(`this.live={gridTuning:'19edo',gridBase:110,gridMode:'chromatic',manualGridMutedSteps:[]};
this.owner={nParamsUI:live,updateNParams:patch=>{Object.assign(live,patch);api.bass.prepare(live)}};
api.room.attach(owner);this.chooseCalls=0;
api.quick.register('grid',{entries:[{id:'19edo',name:'19 EDO'}],choose:()=>{chooseCalls++;live.gridMode='chromatic';live.manualGridMutedSteps=[]}});
api.meta.addItem({kind:'grid',id:'19edo',name:'19 EDO'});this.first=api.meta.snapshot().items[0];
api.meta.patchGridProfile(first,{modeId:'dorian',mainMutedDegrees:[2],bassEnabled:true,bassConfig:{mutedDegrees:[4]}});
this.second=api.meta.cloneGrid(api.meta.snapshot().items[0]);
api.meta.patchGridProfile(second,{modeId:'chromatic',mainMutedDegrees:[3],bassEnabled:true,bassConfig:{mutedDegrees:[5]}});
this.rows=api.meta.snapshot().items;`);
const rows=json(run('rows'));assert.notEqual(rows[0].instanceId,rows[1].instanceId);
const bassDisk=memory.get('xensonar:grid-tuning-library:derived-v1');
for(const index of [0,1,0]){
 assert.equal(run(`api.quick.activate(rows[${index}])`),true);
 assert.equal(run('live.gridMode'),index?'chromatic':'dorian');
 assert.deepEqual(json(run('live.manualGridMutedSteps')),index?[3]:[2]);
 assert.equal(api.quick.snapshot().selectedByKind.grid,rows[index].instanceId);
 assert.deepEqual(json(api.bass.liveOverride().profile.bassConfig.mutedDegrees),index?[5]:[4]);
}
if(!process.env.P738_FOCUS)assert.equal(run('chooseCalls'),0,'profile activation must never enter native choose/reset path');
assert.equal(memory.get('xensonar:grid-tuning-library:derived-v1'),bassDisk,'profile switching cannot persist global Bass Grid');
assert.equal(run('api.meta.use()'),true);
const palette=json(api.quick.getItems());
run("api.meta.patchGridProfile(rows[0],{mainMutedDegrees:[8]})");
assert.deepEqual(json(api.quick.getItems()),palette,'editing must not leak into live Quick palette');
if(process.env.P738_FOCUS!=='rollback'){
run("api.meta.captureRoomSettings();api.meta.clearRoomSettings();api.meta.undo()");
assert.equal(api.meta.snapshot().roomSettings.nParamsUI.gridTuning,'19edo','settings clear participates in Undo');
run("api.meta.redo()");assert.equal(api.meta.snapshot().roomSettings,null);
}
// Failure in the second persistence owner rolls back already prepared Quick Access.
run("api.quick.replaceItems([{kind:'bass',id:'clip:original',name:'Original'}])");
const before=json(api.quick.getItems());api.meta.save('Pending Engage');
const previousActive=json(api.meta.snapshot().activePalette);const observed=[];
const unsubscribe=api.meta.subscribe(()=>observed.push(json(api.meta.snapshot().activePalette)));failedKey='xensonar.meta-sessions.v2';
assert.equal(api.meta.use(),false);assert.deepEqual(json(api.quick.getItems()),before);assert.deepEqual(json(api.meta.snapshot().activePalette),previousActive);assert(observed.every(value=>JSON.stringify(value)===JSON.stringify(previousActive)),'failed commit must not notify a false Engaged palette');assert.match(api.meta.snapshot().error,/quota/);unsubscribe();failedKey=null;
// A room setter may reject a snapshot after Quick persisted; restore both owners.
run("api.meta.captureRoomSettings();live.gridMode='chromatic';this.oldUpdate=owner.updateNParams;owner.updateNParams=p=>{if(p.gridMode==='dorian')throw Error('reject');oldUpdate(p)}");
assert.equal(api.meta.use(),false);assert.deepEqual(json(api.quick.getItems()),before);assert.equal(run('live.gridMode'),'chromatic');
run('owner.updateNParams=oldUpdate');
// A tuning variation has a new library identity; the original tuning and twin
// tile remain byte-identical. A failed Session write removes the new orphan.
run(`this.libraryOriginal=Object.freeze({periodFamily:'octave',periodCents:1200,stepCents:Object.freeze(Array.from({length:19},(_,i)=>i*1200/19))});
this.variations=new Map();this.variationSerial=0;this.x2=()=>libraryOriginal;
this.SF=()=> 'church_projection';this.z6=()=>({family:'custom',divisionKind:'irregular'});
this.Voe=()=> 'custom:variation-'+(++variationSerial);this.LJ=entry=>{variations.set(entry.id,entry);return entry};this.BJ=id=>variations.delete(id);
this.variationDraft={periodFamily:'octave',periodCents:1200,stepCents:[0,200,400,710,900],name:'Edited Custom'};`);
const originalTuning=json(run('libraryOriginal')),twin=json(api.meta.snapshot().items[1]);
assert.equal(run('api.meta.createTuningVariation(api.meta.snapshot().items[0],variationDraft)'),true);
assert.notEqual(api.meta.snapshot().items[0].id,'19edo');
assert.deepEqual(json(api.meta.snapshot().items[1]),twin,'variation cannot modify its twin tile');
assert.deepEqual(json(run('libraryOriginal')),originalTuning,'original library tuning stays unchanged');
assert.equal(run('variations.size'),1);
failedKey='xensonar.meta-sessions.v2';
assert.equal(run('api.meta.createTuningVariation(api.meta.snapshot().items[1],variationDraft)'),false);
assert.equal(run('variations.size'),1,'failed Session write removes newly-created tuning');failedKey=null;
// Preserve both saved and edited drafts, repeated Part IDs, order and unknown refs.
const song={version:1,id:'song-a',name:'Long Song',activePartId:'verse',parts:[{id:'intro',name:'Intro',items:[{kind:'bass',id:'missing',name:'Retained missing'}]},{id:'verse',name:'Verse',items:[]}]};
const draft=json(song);draft.parts[0].name='Edited Intro';
const original=JSON.stringify({version:1,saved:[song],drafts:[draft],selectedId:'song-a'});memory.set('xensonar.song-projects.v1',original);
const imported=api.legacy(storage);assert.equal(imported.parts.length,4);
assert.equal(imported.parts[0].origin.variant,'saved');assert.equal(imported.parts[2].origin.variant,'drafts');
assert.equal(api.meta.importLegacyPart(imported.parts[0]),true);
assert.equal(api.meta.importLegacyPart(imported.parts[2]),true);
assert.equal(api.meta.importLegacyPart(imported.parts[0]),false,'copy-once provenance prevents duplicate imports');
assert.equal(memory.get('xensonar.song-projects.v1'),original,'never rewrite original Song data');
const saved=api.make(storage,api.quick);assert.equal(saved.snapshot().saved.filter(x=>x.legacyOrigin).length,2);
assert.equal(saved.snapshot().saved.at(-1).items[0].id,'missing');
assert.equal(saved.importLegacyPart(imported.parts[0]),false,'idempotence survives store recreation');
console.log('PASS P7.38 same-tuning A→B→A modes/mutes, isolated Bass Grid, editor/live, settings Undo, Engage rollback and lossless legacy Part access');
