'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
function fixture(){
 const text=fs.readFileSync(path.join(__dirname,'../src/handoff/00_chat_feature_addons.js'),'utf8');
 const a=text.indexOf('const __XenBassGrid='),b=text.indexOf('function __XenBassGridRuntime',a);
 const disk=new Map();const c={console,window:{},localStorage:{getItem:k=>disk.get(k)??null,setItem:(k,v)=>disk.set(k,v)},
  sj:()=>[{id:'main',label:'Main'},{id:'nested',label:'Nested'}],xp:()=>[],Kp:id=>id==='nested'?[0,500,900]:[0,400,700],vF:()=>1200};
 vm.createContext(c);vm.runInContext(text.slice(a,b)+';globalThis.grid=__XenBassGrid',c);return c;
}
test('explicit Main Grid snaps only the root; legacy original pitch remains unchanged',()=>{
 const {grid:g}=fixture(),params={gridTuning:'main',gridBase:55,manualGridMutedSteps:[],manualGridStepOffsets:[]};
 g.prepare(params);assert.equal(g.resolveBassRoot('fixed',60,60),60);
 g.setSource('main-grid');g.prepare(params);
 assert.equal(g.resolveBassRoot('fixed',60,60),55);
 const ratio=1.23456;assert.equal(g.resolveBassRoot('fixed',60,60)*ratio,55*ratio);
});
test('nested reference restores per-clip root table without writing grid definitions',()=>{
 const c=fixture(),g=c.grid,params={gridTuning:'main',gridBase:55,manualGridStepOffsets:[0,.5,0]};
 g.prepare(params);g.set('main',{sourceMode:'linked',linkedTuningId:'nested'});g.setSource('bass');
 const ref=g.captureTuning(params),before=JSON.stringify(g.exportAll());
 assert.equal(ref.source,'nested');assert.equal(ref.tuningId,'nested');
 g.setSource('main-grid');g.applyTuning(ref,params);g.prepare(params);
 assert.equal(JSON.stringify(g.exportAll()),before);
 assert.equal(g.effectiveSource(),'bass');assert.ok(Math.abs(g.resolveBassRoot('fixed',72,72)-55*Math.pow(2,500/1200))<1e-9);
});
test('direct preview resolves a saved nested reference without changing the active grid',()=>{
 const {grid:g}=fixture(),p={gridTuning:'main',gridBase:55};g.prepare(p);g.setSource('main-grid');
 const before=JSON.stringify(g.snapshot());
 const root=g.resolveTuningRoot({version:1,source:'nested',tuningId:'nested'},'fixed',72,72,p);
 assert.ok(Math.abs(root-55*Math.pow(2,500/1200))<1e-9);
 assert.equal(JSON.stringify(g.snapshot()),before);assert.equal(g.effectiveSource(),'main-grid');
});
test('missing nested tuning never silently plays the previous or fallback grid',()=>{
 const {grid:g}=fixture(),params={gridTuning:'main',gridBase:55};g.prepare(params);
 g.applyTuning({version:1,source:'nested',tuningId:'deleted-grid'},params);g.prepare(params);
 assert.equal(g.status().missing,true);assert.ok(Number.isNaN(g.resolveBassRoot('fixed',60,60)));
});
test('stage degree offsets remain part of a captured nested clip identity',()=>{
 const {grid:g}=fixture(),p={gridTuning:'main',gridBase:55};g.prepare(p);g.setSource('bass');
 assert.equal(g.editVisualDegree(0,'offset',100),true);
 const before=g.resolveBassRoot('fixed',55,55),ref=g.captureTuning(p);
 g.applyTuning(ref,p);g.prepare(p);assert.equal(g.resolveBassRoot('fixed',55,55),before);
});
test('selecting a Bass reference preserves current Drone/RFL grid-use flags',()=>{
 const {grid:g}=fixture(),p={gridTuning:'main',gridBase:55};g.prepare(p);
 g.set('main',{droneEnabled:true,rflEnabled:true});
 g.applyTuning({version:1,source:'nested',tuningId:'nested',config:{droneEnabled:false,rflEnabled:false}},p);
 assert.equal(g.droneUsesGrid(p),true);assert.equal(g.rflUsesGrid(p),true);
});
test('a saved Nested Bass reference survives Main Grid changes while ordinary stage profiles retain their lifecycle',()=>{
 const {grid:g}=fixture(),p={gridTuning:'main',gridBase:55};g.prepare(p);
 g.applyTuning({version:1,source:'nested',tuningId:'nested'},p);g.prepare(p);
 const root=g.resolveBassRoot('fixed',72,72),next={...p,gridTuning:'nested'};
 g.syncTuningOwner(next);g.prepare(next);
 assert.equal(g.effectiveSource(),'bass');assert.equal(g.captureTuning(next).tuningId,'nested');assert.equal(g.resolveBassRoot('fixed',72,72),root);
 g.setLiveOverride({tuningId:'main',instanceId:'ordinary-stage',profile:{bassEnabled:true,bassConfig:{}}});
 g.syncTuningOwner(next);assert.equal(g.liveOverride(),null);
});
test('Main Grid cents changes invalidate the root cache even with a stored linked Bass profile',()=>{
 const {grid:g}=fixture(),p={gridTuning:'main',gridBase:55,manualGridStepOffsets:[]};
 g.prepare(p);g.set('main',{sourceMode:'linked',linkedTuningId:'nested'});g.setSource('main-grid');g.prepare(p);
 g.prepare({...p,manualGridStepOffsets:[10]});
 assert.ok(Math.abs(g.resolveBassRoot('fixed',55,55)-55*Math.pow(2,100/1200))<1e-9);
});
