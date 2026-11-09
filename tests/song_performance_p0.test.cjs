'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname,'..');
const source = (p) => fs.readFileSync(path.join(root,'src',p),'utf8');
function fixture(initialData){
 const disk=new Map(initialData||[]);const storage={getItem:k=>disk.get(k)??null,setItem:(k,v)=>disk.set(k,v),removeItem:k=>disk.delete(k)};
 const mixes={},eqs={},applied=[];
 const copy = x=>JSON.parse(JSON.stringify(x));
 let uidCounter=0;const context={storage, console,queueMicrotask:()=>{},crypto:{randomUUID:()=> 'test-new-id-'+(++uidCounter)},Math,JSON,
 __xenGridKey:e=>e.kind+':'+e.id,__xenMetaColorKey:e=>e.kind+':'+e.id,__xenQuickGlobalRows:()=>12,
 __xenMetaValidateItems:items=>{if(!Array.isArray(items))throw Error('invalid items');return copy(items)},
 __xenMetaValidateColors:(items,colors)=>colors??{},
 __XenMainRoomSessionBridge:{safe:x=>x??null,available:()=>true,capture:()=>({version:1,nParamsUI:{}}),apply:()=>true,
 captureSongMix:()=>({materialPlacement:{primaryId:null,secondaryIds:[],primaryMuted:false,enabled:false},mixer:{bass:{volume:1,pan:0,pitch:0,att:0},rootFollow:{volume:1,pan:0,pitch:0,att:0},drum:{volume:1,pan:0}},primaryMix:{volume:1,pan:0}}),
 applySongMix:(cfg,items)=>{applied.push(['songMix',copy(cfg)]);return true},
 captureSongSources:()=>({particle:{particlePreset:'p1'},waveStarter:{waveSoundPreset:'w1'},keyboard:{keyboardHoldEnabled:true}}),
 applySongSources:x=>{applied.push(['sources',copy(x)]);return true}},
 __XenMaterialVoiceMix:{get:id=>mixes[id]??{volume:1,pan:0,pitch:0,att:0,nudgeMode:'granular',nudgeFeel:'soft'},
 restoreSession:(items,values)=>{applied.push(['mix',copy(values)]);for(const i of items)if(i.kind==='material')mixes[i.id]=copy(values[i.id]??{volume:1,pan:0,pitch:0,att:0,nudgeMode:'granular',nudgeFeel:'soft'})}},
 __XenEQ:{snapshot:()=>eqs,capture:()=>eqs,restore:x=>{applied.push(['eq',copy(x)]);Object.assign(eqs,x)}},
 __XenMaterialLayers:{clear:()=>{}},__XenBassGrid:{liveOverride:()=>null},
 };
 context.globalThis=context;
 const quick={items:[{kind:'material',id:'m1',name:'Sample'}],getItems(){return copy(this.items)},replaceItems(items){this.items=copy(items)},snapshot:()=>({selectedByKind:{}}),restoreGridSelection:()=>{},clearGridSelection:()=>{}};
 context.__XenQuick=quick;
 vm.createContext(context);
 vm.runInContext(source('sessions/v2-session-store.js')+'\n globalThis.__store=__createXenMetaSessionStore(storage,__XenQuick);',context);
 return {s:context.__store,quick,storage,mixes,eqs,applied,disk};
}
test('same sample can have different Nudge, pan, volume, and EQ per saved song',()=>{
 const f=fixture(),{s,mixes,eqs}=f;
 mixes.m1={volume:.6,pan:-.5,pitch:133,att:1.25,nudgeMode:'vinyl',nudgeFeel:'hard'};
 eqs['material:m1']={a:[.5,.2],b:[0,-.5],morph:.4,bands:12,mode:'adaptive',low:-36,high:12,enabled:true};
 assert.equal(s.saveFromQuickAsNew('A',true),true);
 mixes.m1={...mixes.m1,volume:.8,pan:.7,att:-.25};eqs['material:m1']={...eqs['material:m1'],a:[-.5]};
 assert.equal(s.saveFromQuickAsNew('B',true),true);
 const [a,b]=s.snapshot().saved;
 assert.equal(a.songPerformance.entries[0].mix.att,1.25);
 assert.equal(b.songPerformance.entries[0].mix.att,-.25);
 assert.equal(s.activateSaved(a.id),true);
 assert.equal(mixes.m1.att,1.25);assert.equal(mixes.m1.pan,-.5);
 assert.equal(eqs['material:m1'].a[0],.5);
 assert.equal(s.activateSaved(b.id),true);
 assert.equal(mixes.m1.att,-.25);
});
test('song state and Wave Starter/particle/keyboard survive archive reload and quick update',()=>{
 const f=fixture(),{s,storage,quick}=f;
 assert.equal(s.saveFromQuickAsNew('C'),true);
 const id=s.snapshot().saved[0].id;
 assert.equal(s.snapshot().saved[0].songPerformance.sources.waveStarter.waveSoundPreset,'w1');
 assert.equal(s.updateSavedFromQuick(id,'C updated',false),true);
 assert.equal(s.snapshot().saved[0].songPerformance.sources.keyboard.keyboardHoldEnabled,true);
 assert.ok(JSON.parse(storage.getItem('xensonar.meta-sessions.v2')).saved[0].songPerformance);
});
test('old archives load without performance envelope and tolerate missing defaults',()=>{
 const f=fixture();assert.equal(f.s.saveFromQuickAsNew('Legacy'),true);
 const data=JSON.parse(f.storage.getItem('xensonar.meta-sessions.v2'));
 delete data.saved[0].songPerformance;delete data.songPerformance;
 const other=fixture([['xensonar.meta-sessions.v2',JSON.stringify(data)]]);
 assert.equal(other.s.snapshot().saved[0].songPerformance,null);
 assert.equal(other.s.activateSaved(data.saved[0].id),true);
});
test('removing a song entry prunes orphaned mixer/EQ data',()=>{
 const f=fixture(),{s}=f;
 assert.equal(s.saveFromQuickAsNew('A'),true);
 assert.equal(s.load(s.snapshot().saved[0].id),true);
 assert.equal(s.removeItem({kind:'material',id:'m1'}),true);
 assert.deepEqual(JSON.parse(JSON.stringify(s.snapshot().songPerformance.entries)),[]);
 assert.equal(s.save('A'),true);
 assert.deepEqual(JSON.parse(f.storage.getItem('xensonar.meta-sessions.v2')).saved[0].songPerformance.entries,[]);
});
test('package station projects category transports inline Song Performance',()=>{
 const source=fs.readFileSync(path.join(root,'src/package_station/02_export_selection.js'),'utf8');
 const ctx={};vm.createContext(ctx);
 vm.runInContext(source+'\n globalThis.packageCategories=__XenPackageSelection41;',ctx);
 assert.equal(ctx.packageCategories.keyCategory('xensonar.meta-sessions.v2'),'sessions');
 const f=fixture();assert.equal(f.s.saveFromQuickAsNew('Package Song'),true);
 const payload=JSON.parse(f.storage.getItem('xensonar.meta-sessions.v2'));
 assert.equal(payload.saved[0].songPerformance.sources.keyboard.keyboardHoldEnabled,true);
 assert.equal(payload.saved[0].songPerformance.sources.waveStarter.waveSoundPreset,'w1');
});
test('failed Engage restores the live mixer and EQ as well as the Quickrack',()=>{
 const f=fixture(),{s,mixes,eqs,storage}=f;
 mixes.m1={volume:.8,pan:.6,pitch:0,att:1,nudgeMode:'vinyl',nudgeFeel:'hard'};eqs['material:m1']={a:[.5,.5],b:[0,0],morph:.2};
 assert(s.saveFromQuickAsNew('Rollback'));assert(s.load(s.snapshot().saved[0].id));
 mixes.m1={...mixes.m1,volume:.3,pan:-.7};eqs['material:m1']={a:[-.4,-.4],b:[0,0],morph:.8};
 storage.setItem=()=>{throw Error('QuotaExceeded')};assert.equal(s.use(),false);
 assert.equal(mixes.m1.volume,.3);assert.equal(mixes.m1.pan,-.7);assert.equal(eqs['material:m1'].a[0],-.4);
});
