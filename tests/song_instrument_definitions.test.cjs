'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(require('node:path').join(__dirname,'..','src',p),'utf8');
const {getEventListeners}=require('node:events'),window=new EventTarget();
const eventName='xensonar:song-instrument-definitions-changed',observerCount=()=>getEventListeners(window,eventName).length;
const scope={console,Event,window,Map,Set,WeakSet,WeakMap,AbortController,nodalLivePlanCosts:()=>({attack:1,tail:1})};vm.createContext(scope);
const runtime=read('runtime/instrument/10_entrophon_and_voice_control.js');
// The real defaults + parameter normalizer, without its React presentation.
vm.runInContext(runtime.slice(0,runtime.indexOf('function dG('))+'\n'+read('instruments/01_entrophon_definition.js')+'\n'+read('nodal/01_instrument_model.js'),scope);
vm.runInContext(`let entries=[],entEntries=[];const __XenNodalLibrary={list:()=>entries};const Yx=[];function createNodalInstrumentLibrary(){return {list:()=>entEntries}}
`+read('instruments/02_entrophon_library.js'),scope);
const surf=read('nodal/12_surface_runtime.js');
vm.runInContext(read('instruments/05_entrophon_integration.js')+'\n'+surf.slice(surf.indexOf('function createNodalSurfaceRuntime('),surf.indexOf('const __XenNodalSurfaces='))+`\nthis.api=__XenSongInstrumentDefinitions;this.makeSurface=createNodalSurfaceRuntime;
this.setLibraries=(n,e)=>{entries=n;entEntries=e};this.nodal=(name,ratio)=>__XenNodalModel.normalize({schema:'xensonar.nodal-instrument',schemaVersion:1,kernelVersion:'coupled-modal-v1',name,nodes:[{id:'n',role:'resonator',x:.5,y:.5,ratio,cents:0,radius:.2,strength:1,excitation:.5}],excitation:{kind:'impulse'}});this.ent=(name,release)=>normalizeEntrophonInstrument({schema:'xensonar.entrophon-instrument',schemaVersion:1,engineVersion:'c11-v1',name,surface:'wave',config:{release}});this.resolveEnt=entrophonLiveDefinition;this.findEnt=entrophonFindInstrument;this.composerFields=entrophonComposerSourceFields;`,scope);
(async()=>{
 const a=scope.nodal('A',1),b=scope.nodal('B',2),ea=scope.ent('EA',.2),eb=scope.ent('EB',.8),ids=['nodal:n@1','entrophon:e@1'];
 scope.setLibraries([{id:'n',revision:1,instrument:a}],[{id:'e',revision:1,instrument:ea}]);
 const saved=scope.api.capture(ids);assert(Object.isFrozen(saved.nodal['nodal:n@1'].nodes[0]));scope.api.restore(saved);
 const prepared=[],context={state:'running'},player={snapshot:()=>({}),prepare:async i=>prepared.push(i),pin:()=>true,unpin(){},route(){},placement(){},dispose(){}};
 assert.equal(observerCount(),0);
 const surface=scope.makeSurface({library:{list:()=>[]},live:{createPlayer:async()=>player},model:{semanticKey:i=>i.name}});
 const config={getContext:()=>context,ensureReady:async()=>{},getOutput:()=>({})};
 assert.equal(observerCount(),1);surface.configure(config);surface.configure(config);assert.equal(observerCount(),1);await surface.select('keyboard',ids[0]);assert.equal(prepared.at(-1),a);
 scope.setLibraries([{id:'n',revision:2,instrument:b}],[{id:'e',revision:2,instrument:eb}]);assert.equal(scope.resolveEnt(ids[1]),ea);assert.equal(scope.api.capture(ids).nodal[ids[0]],a);assert(surface.options().some(o=>o.value===ids[0]));
 scope.api.restore({version:1,nodal:{[ids[0]]:b},entrophon:{[ids[1]]:eb}});await surface.select('keyboard',ids[0]);assert.equal(prepared.at(-1),b);assert.equal(scope.resolveEnt(ids[1]),eb);
 scope.api.restore(saved);await surface.select('keyboard',ids[0]);assert.equal(prepared.at(-1),a);assert.equal(scope.resolveEnt(ids[1]),ea);
 const composer={tracks:[{instrumentPreset:ids[1]}],notes:[]};const embedded=scope.composerFields(composer);assert.equal(embedded.entrophonInstruments[ids[1]],ea);
 scope.api.restore({version:1,nodal:{[ids[0]]:a},entrophon:{[ids[1]]:eb}});assert.equal(scope.findEnt(ids[1],composer),eb);assert.equal(scope.findEnt(ids[1],{...composer,...embedded}),ea);assert.equal(scope.composerFields({...composer,...embedded}).entrophonInstruments[ids[1]],ea);
 scope.api.restore(saved);
 const before=scope.api.snapshot();assert.throws(()=>scope.api.restore({version:1,nodal:{[ids[0]]:b},entrophon:{[ids[1]]:{}}}));assert.equal(scope.api.snapshot(),before);
 scope.api.restore(null);assert.throws(()=>scope.api.capture(ids),/Missing song instrument/);assert.equal(scope.resolveEnt(ids[1]),null);
 surface.dispose();assert.equal(observerCount(),0);
 const prepareCount=prepared.length;scope.api.restore(saved);await Promise.resolve();assert.equal(prepared.length,prepareCount);
 surface.configure(config);surface.configure(config);assert.equal(observerCount(),1);
 await surface.select('keyboard',ids[0]);scope.api.restore({version:1,nodal:{[ids[0]]:b},entrophon:{}});await surface.select('keyboard',ids[0]);assert.equal(prepared.at(-1),b);
 // Bank notification may precede the bridge's next source selection. Its
 // speculative old-ID request must lose ownership before asynchronous work.
 const lastCount=prepared.length;scope.api.restore(saved);await surface.select('keyboard','sine');
 await Promise.resolve();await Promise.resolve();assert.equal(prepared.length,lastCount);
 assert.equal(surface.selectionStatus('keyboard').desired,'sine');assert.equal(surface.selectionStatus('keyboard').active,null);
 surface.dispose();assert.equal(observerCount(),0);console.log('song instrument definitions: passed');
})().catch(e=>{console.error(e);process.exitCode=1});
