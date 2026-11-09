'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
let writes=0;const frames=new Map();let serial=0;
const box={console,Math,JSON,Map,Set,WeakMap,Float32Array,Float64Array,ArrayBuffer,window:{addEventListener(){}},
 localStorage:{getItem:()=>null,setItem(){writes++}},requestAnimationFrame:fn=>(frames.set(++serial,fn),serial),cancelAnimationFrame:id=>frames.delete(id),setTimeout:()=>1,clearTimeout(){}};
vm.createContext(box);vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/quickrack/equalizer/eq-core.js'),'utf8')+'\nglobalThis.eq=__XenEQ;',box);
const eq=box.eq;assert.equal(typeof eq.runtime,'function','transient EQ API required');
eq.set('material:source',{mode:'raster',morph:.2,a:Array(360).fill(.2),b:Array(360).fill(-.4)});
const before=JSON.stringify(eq.snapshot()),cfg=eq.clean(eq.get('material:source'));frames.clear();
eq.runtime('avalanche:1:klaviatur',cfg);eq.runtimeMorph('avalanche:1:klaviatur',.8);
assert.equal(eq.get('avalanche:1:klaviatur').morph,.8);assert.equal(JSON.stringify(eq.snapshot()),before,'source/persisted EQ state unchanged');
assert.equal(eq.get('material:source').morph,.2);assert.equal(writes,0);
const a=eq.response(eq.get('material:source')),b=eq.response(eq.get('avalanche:1:klaviatur'));
assert(a.some((v,i)=>Math.abs(v-b[i])>1),'actual existing EQ response changes');
eq.flush();assert.equal(writes,1,'only explicit source flush writes');
console.log('PASS independent runtime EQ, existing filter response, no runtime persistence');
