'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const text=fs.readFileSync('src/mix/03_meta_menu.js','utf8');
const take=(a,b)=>{const i=text.indexOf(a),j=text.indexOf(b,i);assert(i>=0&&j>i);return text.slice(i,j)};
// Source-order: library-to-session insertion is required, not only appending.
const create=take('function __createXenMetaSessionStore(', 'const __XenMetaSessions=');
let nextId=0;
const sandbox=vm.createContext({__xenMetaValidateItems:xs=>xs.map(e=>({...e})),__xenMetaValidateColors:()=>({}),__xenMetaColorKey:e=>e.kind+'\0'+e.id,crypto:{randomUUID:()=> 'unique-'+(++nextId)},console,JSON,Math,Set,Error,Number,Object});
require('./sessions-test-helpers.cjs').install(sandbox);
vm.runInContext(create+';this.make=__createXenMetaSessionStore',sandbox);
const saved=new Map(),storage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},quick={getItems:()=>[],replaceItems(){}};
const store=sandbox.make(storage,quick);
let a={kind:'grid',id:'a',name:'A'},b={kind:'grid',id:'b',name:'B'},c={kind:'grid',id:'c',name:'C'};
assert(store.addItem(a));assert(store.addItem(c));[a,c]=store.snapshot().items;
assert(store.addItem(b,c.instanceId),'library drop before C must insert B');
assert.deepEqual(Array.from(store.snapshot().items,e=>e.id),['a','b','c'],'library drop must preserve visible insertion position');
b=store.snapshot().items[1];
// Same line-order procedure for motion of existing entries.
assert(store.moveItem(c,b.instanceId));assert.deepEqual(Array.from(store.snapshot().items,e=>e.id),['a','c','b']);
assert(store.undo());assert.deepEqual(Array.from(store.snapshot().items,e=>e.id),['a','b','c']);
assert(store.redo());assert.deepEqual(Array.from(store.snapshot().items,e=>e.id),['a','c','b']);
console.log('PASS Meta Menu Prototype parity: insertion at indicated position, reorder, Undo/Redo');
