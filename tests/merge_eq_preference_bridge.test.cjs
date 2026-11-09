'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ui=fs.readFileSync(path.resolve(__dirname,'../src/quickrack/equalizer/eq-ui.js'),'utf8');
const start=ui.indexOf('const __xenEqToolPreference=(()=>{');
const end=ui.indexOf('})();',start)+5;
assert(start>=0&&end>start,'one unified v2 preference owner exists');
function store(initial={}){
 const map=new Map(Object.entries(initial)), listeners=new Map();
 const localStorage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v))};
 const window={addEventListener:(key,cb)=>listeners.set(key,cb)};
 const scope={Set,Object,window,localStorage};vm.createContext(scope);
 vm.runInContext(ui.slice(start,end)+';globalThis.preference=__xenEqToolPreference;',scope);
 return {map,preferences:scope.preference,scope};
}
test('first use stays Paint when no stored choice exists',()=>{
 const {preferences}=store();assert.equal(preferences.get(),'draw');
});
test('a deliberate persisted v2 Morph choice wins over earlier v1',()=>{
 const {preferences}=store({'xensonar.ui.eq.tool.v2':'draw','xensonar.quickrack.eq.tool-preference.v1':'morph'});
 assert.equal(preferences.get(),'draw');
});
test('an explicit choice already saved by Persistence is upgraded to the one v2 owner',()=>{
 const {preferences,map}=store({'xensonar.quickrack.eq.tool-preference.v1':'morph'});
 assert.equal(preferences.get(),'morph');
 assert.equal(map.get('xensonar.ui.eq.tool.v2'),'morph');
 let count=0;const off=preferences.subscribe(()=>count++);
 preferences.set('draw');assert.equal(preferences.get(),'draw');assert.equal(map.get('xensonar.ui.eq.tool.v2'),'draw');assert.equal(count,1);off();
});
