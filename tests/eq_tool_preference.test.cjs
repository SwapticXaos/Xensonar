'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const ui=read('src/quickrack/equalizer/eq-ui.js');
const uiStoreStart=ui.indexOf('const __xenEqToolPreference=(()=>{');
const uiStoreEnd=ui.indexOf('})();',uiStoreStart)+5;
assert(uiStoreStart>=0&&uiStoreEnd>uiStoreStart,'P10 global EQ tool preference store must exist');

function makeStore(storage){
 const scope={localStorage:storage,Set,Object};vm.createContext(scope);
 vm.runInContext(ui.slice(uiStoreStart,uiStoreEnd)+';globalThis.preference=__xenEqToolPreference;',scope);
 return scope.preference;
}

test('EQ Draw/Morph preference defaults to Draw, persists globally across remount, and validates values',()=>{
 const map=new Map(),storage={getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,String(value))};
 const preference=makeStore(storage),key='xensonar.ui.eq.tool.v2';
 assert.equal(preference.get(),'draw','first use defaults to Draw');
 let updates=0;const unsubscribe=preference.subscribe(()=>updates++);
 preference.set('morph');
 assert.equal(map.get(key),'morph');assert.equal(preference.get(),'morph');assert.equal(updates,1);
 preference.set('invalid');assert.equal(preference.get(),'morph');
 unsubscribe();
 const remounted=makeStore(storage);
 assert.equal(remounted.get(),'morph','the global tool survives EQ panel unmount/remount');
 remounted.set('draw');assert.equal(map.get(key),'draw');

 map.set(key,'legacy-or-corrupt');
 assert.equal(makeStore(storage).get(),'draw','unsupported stored values fall back safely');
});

test('legacy session EQ restore changes per-source EQ only and leaves global tool preference untouched',()=>{
 const map=new Map([['xensonar.ui.eq.tool.v2','draw']]);
 const preference=makeStore({getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,String(value))});
 const sessionSource=read('src/sessions/v2-session-store.js');
 const start=sessionSource.indexOf('function __xenSongPerformanceApply('),end=sessionSource.indexOf('function __createXenMetaSessionStore(',start);
 assert(start>=0&&end>start,'real legacy/session EQ apply function must exist');
 const restored=[];
 const scope={Map,Number,Object,Array,
  __xenSongPerformanceSafe:value=>value,
  __XenMainRoomSessionBridge:{clearPendingSongSources(){},applySongMix(){}},
  __XenMaterialVoiceMix:{restoreSession(){}},
  __XenEQ:{restore:value=>restored.push(value)}};
 vm.createContext(scope);
 vm.runInContext(sessionSource.slice(start,end),scope);
 const legacy={version:1,entries:[],sources:null};
 const room={eq:{'material:m1':{a:[.2],b:[-.2],morph:.4,mode:'raster'}}};
 scope.__xenSongPerformanceApply(legacy,[{kind:'material',id:'m1'}],room);
 assert.equal(restored[0]['material:m1'].mode,'raster','legacy per-source frequency mapping still restores');
 assert.equal(preference.get(),'draw','legacy EQ restore cannot replace global Draw/Morph preference');
 preference.set('morph');
 scope.__xenSongPerformanceApply(legacy,[{kind:'material',id:'m1'}],room);
 assert.equal(preference.get(),'morph','session loading cannot replace a later global Morph preference');
});

test('EQ panel uses one P10 global tool owner and keeps the curve and A/B morph paths distinct',()=>{
 const panel=ui.slice(ui.indexOf('function __XenEQPanel('));
 assert.match(panel,/P\.useSyncExternalStore\(__xenEqToolPreference\.subscribe,__xenEqToolPreference\.get,__xenEqToolPreference\.get\)/);
 assert.match(panel,/eqTool:tools/);
 assert.match(panel,/editTool=\(field,value\)=>field==='mode'\?__xenEqToolPreference\.set\(value\)/);
 assert.match(panel,/onCommit:value=>change\(\{\[name\]:\[\.\.\.value\.deformation\.curve\]\}\)/);
 assert.match(ui,/__XenEQ\.startGesture\(sourceKey,'morph'\)/,'native A/B morph remains the separate fast gesture path');
});

test('old Persistence preference migrates only when v2 has no explicit selection',()=>{
 const key='xensonar.ui.eq.tool.v2',old='xensonar.quickrack.eq.tool-preference.v1';
 const oldValues=new Map([[old,'morph']]);
 const store={getItem:k=>oldValues.get(k)??null,setItem:(k,v)=>oldValues.set(k,String(v))};
 const migrated=makeStore(store);
 assert.equal(migrated.get(),'morph');
 assert.equal(oldValues.get(key),'morph','one-time import writes only P10 key');
 migrated.set('draw');
 assert.equal(oldValues.get(key),'draw');
 assert.equal(oldValues.get(old),'morph','legacy key is never mutated again');
 assert.equal(makeStore(store).get(),'draw','v2 explicit choice wins over obsolete v1');
});
