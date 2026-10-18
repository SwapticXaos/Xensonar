'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../src/app/forge/02_boot_and_workspace_tools.js'),'utf8');
const start=src.indexOf('let __mlLibraryStorageProtected=false;');
const end=src.indexOf('function H7(',start);
assert.ok(start>0&&end>start,'F4.3.8 storage source present');
const events=[];
let raw=null,writes=0,brokenReads=false,brokenWrites=false;
const browser={localStorage:{getItem(){if(brokenReads)throw Error('read denied');return raw},setItem(key,val){if(brokenWrites)throw Error('quota denied');assert.equal(key,'xensonar-melodic-loop-projects-v1');writes++;raw=val}}};
const ctx={window:browser,D7:'xensonar-melodic-loop-projects-v1', console:{warn(...args){events.push(args)}},
 $n:x=>structuredClone(x),Bi:x=>structuredClone(x),Di:x=>structuredClone(x),aB:()=>({}),nB:()=>({})};
vm.createContext(ctx);vm.runInContext(src.slice(start,end)+'\nthis.load=j7;this.save=G7;this.status=__mlSavedProjectsStorageStatus;',ctx);
function proj(id){return{id,composer:{bars:4,notes:[{id:'N1',startUnit:55}],tracks:[{id:'bass'}]},patternVariants:{bass:{patternA:[{id:'N1'}]}},patternLinks:{bass:{}}}}
function reset(v){raw=v;writes=0;brokenReads=false;brokenWrites=false;events.length=0}
reset(JSON.stringify([proj('alpha')]));assert.equal(ctx.load()[0].composer.notes[0].startUnit,55);assert.equal(ctx.status().protected,false);assert.equal(ctx.save([proj('beta')]),true);assert.equal(JSON.parse(raw)[0].id,'beta');
reset('{broken-json');assert.equal(ctx.load().length,0);assert.equal(ctx.status().protected,true);assert.equal(ctx.save([]),false);assert.equal(raw,'{broken-json');assert.equal(writes,0);
reset(JSON.stringify([proj('alpha'),{id:'broken',composer:null}]));assert.equal(ctx.load().length,0);assert.equal(ctx.save([]),false);assert.equal(writes,0);
reset(JSON.stringify([proj('alpha'),proj('alpha')]));assert.equal(ctx.load().length,0);assert.equal(ctx.save([]),false);assert.equal(writes,0);
reset(JSON.stringify({not:'a project list'}));assert.equal(ctx.load().length,0);assert.equal(ctx.save([]),false);assert.equal(writes,0);
reset(JSON.stringify([proj('alpha')]));brokenReads=true;assert.equal(ctx.load().length,0);assert.equal(ctx.status().protected,true);assert.equal(ctx.save([]),false);assert.equal(writes,0);
reset(JSON.stringify([proj('alpha')]));assert.equal(ctx.load().length,1);brokenWrites=true;assert.equal(ctx.save([proj('beta')]),false);assert.equal(ctx.status().protected,false);assert.equal(JSON.parse(raw)[0].id,'alpha');assert.equal(writes,0);
reset(null);assert.equal(ctx.load().length,0);assert.equal(ctx.save([proj('new')]),true);assert.equal(JSON.parse(raw)[0].id,'new');
console.log('PASS F4.3.8 valid/legacy structural load, corrupted JSON, schema, duplicate IDs, denied read/write, raw bytes preserved');
