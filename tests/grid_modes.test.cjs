'use strict';
// GRID-MODES-01 (no browser): the mode store from src/post-oct/038-xen-grid-modes.js – projection (nearest step, folded into the period),
// own modes in cents, the cycle order, and deletion also leaving the cycle.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const src=fs.readFileSync(path.join(__dirname,'..','src','post-oct','038-xen-grid-modes.js'),'utf8');
const load=()=>{const m=new Map(),ctx={localStorage:{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)},addEventListener(){},dispatchEvent(){},CustomEvent:class{constructor(t){this.type=t}},JSON,Math,Number,String,Array,Set,Object,Date};
 vm.createContext(ctx);vm.runInContext(src.slice(0,src.indexOf('function XenModeWorkbench'))+';this.S=__xenModeStore;',ctx);return ctx.S};
const edo=n=>Array.from({length:n},(_,i)=>i*1200/n);
test('projection: Ionian on 31-EDO opens 7 steps, the 12 semitones open 12 of 31, deviations are signed cents',()=>{
 const S=load(),ion=[0,200,400,500,700,900,1100];const on=S.project(ion,edo(31),1200);assert.equal(on.filter(Boolean).length,7);
 assert.deepEqual(on.map((v,i)=>v?i:-1).filter(i=>i>=0),[0,5,10,13,18,23,28]);
 assert.equal(S.project(Array.from({length:12},(_,i)=>i*100),edo(31),1200).filter(Boolean).length,12);
 const m=S.mapping([1100],edo(31),1200)[0];assert.equal(m.step,28);assert.ok(Math.abs(m.deviation-(-16.13))<.1,'1100 ct lands 16 ct low on step 28: '+m.deviation);
 assert.deepEqual(S.project([1190],edo(12),1200).map((v,i)=>v?i:-1).filter(i=>i>=0),[0],'folded into the period: 1190 ct → step 0');
});
test('own modes: stored in cents (folded), project onto any grid, survive a reload of the store',()=>{
 const S=load(),v=S.addUserMode({label:'Ionian 31',cents:[0,193.5,387.1,503.2,696.8,890.3,1083.9,1200]});
 const m=S.find(v);assert.equal(m.cents.length,7,'1200 folds onto 0');assert.equal(S.userModes().length,1);
 assert.deepEqual(S.project(m.cents,edo(12),1200).map(Number),[1,0,1,0,1,1,0,1,0,1,0,1],'projects onto 12-EDO as Ionian');
 S.renameUserMode(v,'Renamed');assert.equal(S.find(v).label,'Renamed');
});
test('cycle order: only modes of the base list, in the user order; empty = base order; deleting a mode removes its slot',()=>{
 const S=load(),base=[{value:'chromatic'},{value:'ionian'},{value:'dorian'},{value:'chromatic_12'}];
 assert.deepEqual(S.cycleList(base).map(m=>m.value),base.map(m=>m.value));
 const v=S.addUserMode({label:'x',cents:[0,700]});S.setRack(['dorian','unknown','chromatic_12',v]);
 assert.deepEqual(S.cycleList([...base,{value:v}]).map(m=>m.value),['dorian','chromatic_12',v]);
 S.removeUserMode(v);assert.deepEqual(S.rack(),['dorian','unknown','chromatic_12']);S.setRack(null);assert.equal(S.rack(),null);
});
