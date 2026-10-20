'use strict';
const assert=require('node:assert/strict');const fs=require('fs');
const file=process.argv[2]||'src/instruments/05_entrophon_integration.js';const code=fs.readFileSync(file,'utf8');
const prefix=code.slice(0,code.indexOf('function entrophonSoundOptions('));
assert(prefix.includes('function entrophonLiveDefinition('));
const latest={name:'new version',config:{volume:0.8}},oldId='entrophon:entrophon-abc@1',nextId='entrophon:entrophon-abc@3';
let lookupCount=0;
const api=new Function('entrophonFindInstrument','isSavedEntrophonSound','__XenEntrophonLibrary',prefix+';return entrophonLiveDefinition')(
 id=>{lookupCount++;return id===nextId?latest:null}, id=>id.startsWith('entrophon:'), {list:()=>[{id:'entrophon-abc',revision:3,instrument:latest}]});
assert.strictEqual(api(nextId),latest,'exact current revision');
assert.strictEqual(api(oldId),latest,'retained live menu selection should follow its original instrument identity to latest revision');
assert.strictEqual(api('entrophon:entrophon-removed@1'),null,'must not replace another instrument or invent missing sound');
assert.strictEqual(api(oldId),latest);
console.log('PASS live stale revisions resolve latest same-id instrument, removed remains unavailable');
