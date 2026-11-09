'use strict';
// Acceptance: header Package Station exports all stored projects without a mounted Melodic room.
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const forge=fs.readFileSync(path.join(root,'src/app/forge/03_spectral_grid_and_archives.js'),'utf8');
const station=fs.readFileSync(path.join(root,'src/runtime/instrument/05_timing_and_admission.js'),'utf8');
const boot=fs.readFileSync(path.join(root,'src/app/forge/02_boot_and_workspace_tools.js'),'utf8');
const canonicalSource=fs.readFileSync(path.join(root,'src/rooms/canonical.js'),'utf8');
const segment=(src,start,end)=>{const a=src.indexOf(start),b=src.indexOf(end,a+start.length);assert(a>=0&&b>a,`missing segment ${start} .. ${end}`);return src.slice(a,b)};
(async()=>{
 let handlerCalls=0;
 const live={loopComposer:{tracks:[{id:'track',name:'Session Track'}],notes:[{id:'N',pitch:72}]},loopPatternVariants:{track:{patternA:{notes:[{id:'N'}]}}},loopPatternLinks:{track:{patternA:'patternA'}},selectedMelodicProjectId:'p2'};
 const projects=[{id:'p1',name:'Saved One',composer:{tracks:[{id:'old'}]},patternVariants:{},patternLinks:{}},{id:'p2',name:'Saved Two',composer:{tracks:[{id:'old2'}]},patternVariants:{},patternLinks:{}}];
 const storage=new Map([['xensonar-melodic-loop-projects-v1',JSON.stringify(projects)]]);
 const ctx={Date,Promise,console,D7:'xensonar-melodic-loop-projects-v1',window:{localStorage:{getItem:key=>storage.get(key)??null}},
   EQ:()=>live,$n:x=>JSON.parse(JSON.stringify(x)),Bi:x=>JSON.parse(JSON.stringify(x)),Di:x=>JSON.parse(JSON.stringify(x)),
   oB:()=>({tracks:[{id:'default'}],notes:[]}),aB:()=>({}),nB:()=>({}),
   __mlLibraryStorageProtected:false,
   NQ:async arg=>{handlerCalls++;return{download:{filename:'complete.json'},archive:{workspace:arg.loopComposer,projects:arg.savedMelodicProjects,patternVariants:arg.patternVariants},statusMessage:'OK'}},
 };
 const from=forge.indexOf('function __xenP313StationSnapshot('),to=forge.indexOf('/* P3.1 composition root:');
 assert(from>=0,'P3.13 must define headless stationary export state');
 vm.runInNewContext(segment(boot,'function j7(){','function G7(projects){'),ctx);
 vm.runInNewContext(forge.slice(from,to).split('async function _Q(')[0],ctx);
 const runtime=ctx;runtime.vw=x=>x||'Test';runtime.V0=()=>null;runtime.Wte=async()=>null;
 runtime.Ute=options=>runtime.__xenP313StationHeadlessDownload(options);
 const outcome=await runtime.Ute({packageLabel:'Complete Export'});
 assert.equal(outcome.download.filename,'complete.json');
 assert.equal(handlerCalls,1);
 assert.equal(outcome.archive.projects.length,2,'both saved projects must be in archive');
 assert.equal(outcome.archive.workspace.notes[0].pitch,72,'cached unsaved current melodic session must not be discarded');
 assert.equal(outcome.archive.patternVariants.track.patternA.notes[0].id,'N','pattern variants survive');
 assert.equal(outcome.archive.projects[1].name,'Saved Two');
 assert.equal(outcome.archive.workspace.tracks[0].name,'Session Track');
 // The cached session must actually receive the editor's independent A/B/C patterns.
 assert.match(canonicalSource,/loopComposer:Ke,loopPatternVariants:Fe,loopPatternLinks:an,selectedMelodicProjectId:tr/, 'live snapshot must include pattern stores and current project identity');
 assert.match(canonicalSource,/loopComposer:\$n\(te\),loopPatternVariants:Bi\(/, 'session cache must preserve independent pattern variants');
 // No active UI session must still export saved project inventory with empty default composer.
 runtime.EQ=()=>null;
 const empty=await runtime.Ute({packageLabel:'Library only'});
 assert.equal(empty.archive.projects.length,2);
 assert.equal(empty.archive.workspace.tracks[0].id,'default');
 // Corrupt storage must never be interpreted as an empty library.
 storage.set('xensonar-melodic-loop-projects-v1','{bad json');
 await assert.rejects(runtime.Ute({packageLabel:'Protected'}),/corrupt|geschützt|nicht lesbar|protected|fehler/i);
 assert.equal(handlerCalls,2,'protected library must not start package download');
 console.log('P3.13 PASS: legacy JSON snapshot works without Melodic mounting and preserves persisted projects + cached workspace');
})().catch(err=>{console.error(err);process.exitCode=1});
