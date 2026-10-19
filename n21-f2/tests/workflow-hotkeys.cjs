'use strict';
const assert=require('assert/strict'),fs=require('fs'),vm=require('vm');
const {load}=require('./offline_runtime.cjs'),h=load(process.cwd());
const cases=[
 [{code:'Backquote',key:'`'},false],
 [{code:'Backquote',key:'^'},false],
 [{code:'Backquote',key:'°'},false],
 [{code:'Equal',key:'´'},true],
 [{code:'Quote',key:"'"},true]
];
for(const [event,expected] of cases)assert.equal(h.run('Yw('+JSON.stringify(event)+')'),expected,'physical bank switch must not become the sustain key');
const source=fs.readFileSync('src/mix/03_quick_menu.js','utf8'),start=source.indexOf('const __XenQuick=');
let next=0;const timers=new Map(),context=vm.createContext({localStorage:{getItem:()=>null,setItem(){}},setTimeout:fn=>(timers.set(++next,fn),next),clearTimeout:id=>timers.delete(id),__XenLoopHotkeys:['A','S','D','F','G','H','J','K','L']});
vm.runInContext(source.slice(start,source.indexOf('function __useQuickAdapter',start))+';globalThis.quick=__XenQuick;',context);
const q=context.quick,chosen=[];let entries=Array.from({length:11},(_,i)=>({id:'m'+i}));const unregister=q.register('material',{get entries(){return entries},choose:id=>chosen.push(id)});
assert.equal(q.snapshot().hotkeys.material.length,9);
entries=[entries[2],entries[0],entries[1]];q.syncHotkeys('material',entries);assert.equal(q.snapshot().hotkeys.material.join(','),'m2,m0,m1');
assert(q.activate({kind:'material',id:'m0'}));assert.deepEqual(chosen,['m0']);assert.equal(q.snapshot().tilePulse.id,'m0');
q.pulseEntry('rootFollow','r1');assert.equal(timers.size,1,'one transient timer even with successive input');assert.equal(q.snapshot().tilePulse.id,'r1');
for(const fn of timers.values())fn();timers.clear();assert.equal(q.snapshot().tilePulse,null);
assert.equal(q.activate({kind:'material',id:'removed'}),false);
unregister();assert.equal(q.snapshot().hotkeys.material.length,0);
fs.mkdirSync('results/workflow-integrity',{recursive:true});fs.writeFileSync('results/workflow-integrity/hotkeys.json',JSON.stringify({physicalKeyCases:cases,reorder:true,limit:9,unregister:true,unavailable:true,oneTransientTimer:true},null,2)+'\n');
console.log('PASS hotkeys: physical layout priority, canonical reorder/limit/unregister, same click activation, one transient pulse timer');
