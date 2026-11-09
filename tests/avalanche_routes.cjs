'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8'),created=[],events=new Set();let cancelAfterFirst=false,cancelled=false;
function node(){return {edges:[],connect(n){this.edges.push(n)},disconnect(){this.edges=[]},gain:param(),frequency:param(),Q:param()};}
function param(){return {value:0,setTargetAtTime(v){this.value=v},setValueAtTime(v){this.value=v},cancelScheduledValues(){},cancelAndHoldAtTime(){}};}
class Host{constructor(ctx,destination){this.context=ctx;this.profile=1;this.destination=destination;this.node=node();this.epoch=1;this.reservations={usedUnits:0,usedVoices:0,unitLimit:256,voiceLimit:32};this.quantumBuilds=0;this.admissionQuantum=0;created.push(this)}async createNode(){if(cancelAfterFirst)cancelled=true;return true}unmute(){this.unmuted=true}destroy(){this.destroyed=true}currentContextFrame(){return 0}}
const box={console,Math,JSON,Map,Set,WeakMap,WeakSet,Float32Array,Float64Array,ArrayBuffer,r9:Host,xMe:class{},__wave39Encoder:class{},EMe:16,rg:new WeakMap(),__XenHoldMod:{prepare(){},dispose(){}},u9(){},
 window:{addEventListener(){},removeEventListener(){}},localStorage:{getItem:()=>null,setItem(){}},requestAnimationFrame:()=>1,cancelAnimationFrame(){},setTimeout:()=>1,clearTimeout(){}};
vm.createContext(box);vm.runInContext(read('src/quickrack/equalizer/eq-core.js')+'\n'+read('src/audio/avalanche.js')+'\nglobalThis.A=__XenAvalanche;globalThis.eq=__XenEQ;',box);
const ctx={state:'running',sampleRate:48000,currentTime:0,createGain:node,createBiquadFilter:node,addEventListener:(n,f)=>events.add(f),removeEventListener:(n,f)=>events.delete(f)},normal=node(),space=node(),main={host:new Host(ctx,normal),ready:true,owned:true,token:10};box.rg.set(ctx,main);
(async()=>{
 await box.A.prepareHosts(ctx,main,{},normal,space);assert.equal(box.eq.diagnostics().devices,0,'no idle EQ processors before first assignment');const k=box.A.hostState(ctx,{key:'klaviatur:KeyA'}),e=box.A.hostState(ctx,{key:'wellenstart:Enter'});
 assert.notEqual(k.host,e.host);assert.notEqual(k.host.destination,normal);assert.notEqual(e.host.destination,k.host.destination);
 assert.equal(k.token++,10);assert.equal(e.token++,11);assert.equal(main.token,12,'one token owner across hosts');
 main.host.reservations.usedUnits=120;k.host.reservations.usedUnits=100;assert(!box.A.admit(e.host,64,1),'aggregate original unit cap');assert(box.A.admit(e.host,24,1));
 e.host.quantumBuilds=16;assert(!box.A.admit(main.host,1,1),'aggregate original quantum cap');e.host.quantumBuilds=0;
 const original={mode:'raster',morph:.2,a:Array(360).fill(.2),b:Array(360).fill(-.4)};box.eq.set('material:test',original);const before=JSON.stringify(box.eq.get('material:test'));
 box.A.assign('klaviatur','material:test','Material');assert(box.eq.get('avalanche:1:klaviatur').enabled,'assignment publishes before first drag');assert(!box.eq.get('avalanche:1:wellenstart').enabled);
 assert.equal(JSON.stringify(box.eq.get('material:test')),before);assert.equal(box.A.route(ctx,'klaviatur',normal),k.host.destination,'same route cached');
 const capture=box.eq.capture([{kind:'material',id:'test'}]);assert(capture.__avalancheBindings.klaviatur);box.A.remove('klaviatur');assert(!box.A.assignment('klaviatur'));box.eq.restore(capture);assert(box.A.assignment('klaviatur'));assert.equal(JSON.stringify(box.eq.get('material:test')),before);
 for(let i=0;i<30;i++)box.A.route(ctx,'klaviatur',node());assert.equal(box.A.diagnostics().contexts[0].routes.klaviatur.routes,16,'route count bounded');
 ctx.state='closed';for(const f of [...events])f();assert(k.host.destroyed&&e.host.destroyed);assert.equal(box.eq.diagnostics().devices,0,'all effect devices disposed on context close');
 // A cancelled async bootstrap cannot leave an untracked second host.
 const other={...ctx,state:'running'};box.rg.set(other,main);cancelAfterFirst=true;const prior=created.length;
 await assert.rejects(box.A.prepareHosts(other,main,{},normal,space,()=>cancelled));assert(created.slice(prior).every(h=>h.destroyed));assert.equal(created.length,prior+1);
 console.log('PASS actual route ownership, pre-drag EQ activation, source isolation, session bindings, shared limits, bounded devices, async cancellation');
})().catch(e=>{console.error(e);process.exitCode=1});
