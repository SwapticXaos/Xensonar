'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const root=path.resolve(__dirname,'..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const react=read('src/rooms/canonical.js');
const start=react.indexOf('function Z9e(e){');const end=react.indexOf('\nasync function cg(',start);
const code=react.slice(start,end).trim();
assert(code?.endsWith('}}'), 'canonical handler must be obtainable as one function');
const base=[{id:'original',name:'Original',contentHash:'before'}];
const imported=[{id:'new-id',name:'New',contentHash:'after'}];
async function scenario({writeFails=false,externalMutation=false,mode='merge',reservations=false,protectedLibrary=false}={}){
 const journal=new Map([['melodic-library',JSON.stringify(base)]]);
 const statuses=[], setCalls=[], uiEvents=[];
 const localStorage={getItem:k=>journal.get(k)??null,setItem:(k,v)=>{
   if(writeFails)throw Error('QuotaExceededError');journal.set(k,String(v));},removeItem:k=>journal.delete(k)};
 const state={savedMelodicProjects:base,selectedMelodicProjectId:null,
   setSavedMelodicProjects:x=>setCalls.push(x),setMelodicSampleEntries:x=>uiEvents.push('samples'),
   setStatus:x=>statuses.push(x),setLoopComposer:()=>uiEvents.push('composer'),
   loopPatternVariantsRef:{},loopPatternLinksRef:{},setLoopPatternVariants:()=>{},setLoopPatternLinks:()=>{},
   setSelectedMelodicProjectId:()=>{},setSelectedLoopNoteIds:()=>{},
   setActiveWorkspace:()=>{},applyLogicView:()=>{}};
 const importResult={mode,importedProjects:imported,refreshedSamples:[],statusMessage:'Import complete',
  workspaceComposer:{selectedNoteId:null},workspaceVariants:{},workspaceLinks:{},projectReservationP36:reservations};
 const ctx=vm.createContext({console:{error(){}},window:{localStorage},D7:'melodic-library',
  __mlSavedProjectsStorageStatus:()=>({protected:protectedLibrary}),
  _Q:async()=>{if(externalMutation)journal.set('melodic-library','["other tab changed"]');return importResult},
  G7:projects=>{try{localStorage.setItem('melodic-library',JSON.stringify(projects));return true;}catch{return false;}},
  __XenMelodicProjectReservationsP36:{applyMerge:(old,newP)=>[...old,...newP]},hu:()=>{}});
 vm.runInContext(read('src/contracts/16_project_commit_boundary.js'),ctx);
 vm.runInContext(code,ctx);
 const handler=vm.runInContext('Z9e',ctx)(state);
 await handler.importMelodicWorkspaceArchive({name:'fixture'},mode);
 return {statuses,setCalls,uiEvents,journal};
}
(async()=>{
 const ok=await scenario();assert.deepEqual(ok.statuses,['Import complete']);
 assert.equal(ok.setCalls.length,1);assert.deepEqual(JSON.parse(ok.journal.get('melodic-library')),[...base,...imported].sort((a,b)=>a.name.localeCompare(b.name)));
 const fail=await scenario({writeFails:true});
 assert.equal(fail.setCalls.length,0);assert(fail.statuses[0].includes('could not be loaded'));
 assert.deepEqual(JSON.parse(fail.journal.get('melodic-library')),base);
 assert.deepEqual(fail.uiEvents,[],'do not show partial UI success on persistence failure');
 const stale=await scenario({externalMutation:true});
 assert.equal(stale.setCalls.length,0);assert(stale.statuses[0].includes('could not be loaded'));
 const protectedStore=await scenario({protectedLibrary:true});
 assert.equal(protectedStore.setCalls.length,0);assert.deepEqual(protectedStore.uiEvents,[]);
 const replace=await scenario({mode:'replace'});assert.deepEqual(JSON.parse(replace.journal.get('melodic-library')),imported);
 console.log('P3.7 REACT PASS: actual import handler only applies after storage readback; failures block UI state');
})().catch(e=>{console.error(e);process.exitCode=1});
