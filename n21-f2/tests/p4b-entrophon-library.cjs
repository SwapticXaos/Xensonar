'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=file=>fs.readFileSync(file,'utf8');
const storage=new Map(),listeners=new Map(),events=[];
let quota=false;
const ctx=vm.createContext({console,Math,Date,Map,Set,WeakSet,Object,JSON,Event,setTimeout,clearTimeout,
 localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>{if(quota)throw Error('quota');storage.set(key,value)}},
 window:{dispatchEvent:event=>{events.push(event.type);for(const fn of listeners.get(event.type)??[])fn(event)},addEventListener:(type,fn)=>listeners.set(type,[...(listeners.get(type)??[]),fn]),removeEventListener:()=>{},confirm:()=>true},
 ES:{wave:{enabled:true,unison:1},particle:{enabled:true,unison:1},spectral:{enabled:true,unison:1}},
 zA:(surface,config)=>({enabled:true,unison:1,...config}),Ew:()=>({enabled:false,unison:3})});
vm.runInContext(`const __XenNodalModel={normalize:v=>Object.freeze({...v}),serialize:JSON.stringify};`+read('src/nodal/03_library.js')+read('src/instruments/01_entrophon_definition.js')+read('src/instruments/02_entrophon_library.js')+`;this.api={lib:__XenEntrophonLibrary,nodal:__XenNodalLibrary,capture:captureEntrophonInstrument,find:entrophonFindInstrument,setEdit:entrophonSetLibraryEditEntry,state:__XenEntrophonEditState};`,ctx);
const {lib,nodal,capture,find}=ctx.api;
const first=lib.save(capture('First','wave'));
assert.match(first.id,/^entrophon-/);assert.equal(first.revision,1);assert.equal(lib.save(capture('First','wave')).id,first.id);
assert.equal(nodal.list().length,0);nodal.save({name:'Nodal'});assert.equal(lib.list().length,1);
const preset='entrophon:'+first.id+'@1',project={entrophonInstruments:{[preset]:first.instrument}};
assert(Object.isFrozen(first.instrument));assert(Object.isFrozen(first.instrument.config));
assert.equal(find(preset,project),first.instrument);assert.equal(find(preset),first.instrument);
assert.throws(()=>lib.rename(first.id,2,'Stale'),/Entrophon revision conflict/);
assert.equal(lib.rename(first.id,1,'Renamed').revision,1);assert.equal(first.instrument.name,'First');assert.equal(find(preset,project).name,'First');assert.equal(find(preset).name,'Renamed');
const revised=lib.save(capture('Second','wave'),{id:first.id,expectedRevision:1});assert.equal(revised.revision,2);
assert.throws(()=>lib.save(capture('Stale','wave'),{id:first.id,expectedRevision:1}),/revision conflict/);
assert.equal(find(preset),null);assert.equal(find(preset,project).name,'First');
quota=true;assert.throws(()=>lib.remove(revised.id,2),/quota/);quota=false;assert.equal(lib.list().length,1);
assert.equal(lib.remove(revised.id,2),true);assert.equal(find(preset,project).name,'First');
assert.equal(find('entrophon:bad@0'),null);assert.equal(find('nodal:bad@1'),null);
assert(events.includes('xensonar:entrophon-library-changed'));assert(events.includes('xensonar:nodal-library-changed'));
// Model validation rejects wrong payloads before a storage write.
assert.throws(()=>lib.importPackage(JSON.stringify({schema:'xensonar.nodal-library',schemaVersion:1,entries:[]})),/Invalid Entrophon library/);
// Exercise inline Save Sound handlers and shared identity across a rerender.
let hooks=[],index=0,effects=[];
ctx.P={createElement:(type,props,...children)=>({type,props:props??{},children}),useState:init=>{const i=index++;if(!(i in hooks))hooks[i]=typeof init==='function'?init():init;return[hooks[i],value=>{hooks[i]=typeof value==='function'?value(hooks[i]):value}]},useEffect:fn=>{index++;effects.push(fn)}};
vm.runInContext(read('src/instruments/03_entrophon_library_ui.js')+';this.Save=EntrophonSaveSoundControls;',ctx);
function render(){index=0;effects=[];return ctx.Save({surface:'particle'})}
let ui=render();ui.children[0].props.onChange({target:{value:'Inline saved'}});ui=render();ui.children[1].props.onClick();
let saved=lib.list()[0];assert.equal(saved.instrument.name,'Inline saved');assert.equal(saved.instrument.surface,'particle');assert.equal(ctx.api.state.id,saved.id);
ui=render();assert.match(ui.children[2].children[0],/Saved/);ui.children[0].props.onChange({target:{value:'Inline revised'}});ui=render();ui.children[1].props.onClick();
assert.equal(lib.list().length,2);assert.equal(lib.list()[0].revision,1);assert.equal(lib.list()[1].instrument.name,'Inline revised');assert.equal(ctx.api.state.editing,false);
// Only opening an existing entry explicitly enables revision updates.
ctx.api.setEdit(lib.list()[0]);assert.equal(ctx.api.state.editing,true);
ui=render();ui.children[0].props.onChange({target:{value:'Explicit edit'}});ui=render();ui.children[1].props.onClick();
saved=lib.list()[0];assert.equal(saved.revision,2);assert.equal(saved.instrument.name,'Explicit edit');assert.equal(lib.list().length,2);assert.equal(ctx.api.state.editing,true);
ui=render();ui.children[0].props.onChange({target:{value:''}});ui=render();ui.children[1].props.onClick();ui=render();assert.equal(ui.children[2].props.role,'alert');assert.equal(lib.list()[0].revision,2);
console.log('PASS P4B Entrophon library: independent namespace, immutable project fallback, rename/revisions, stale and quota failures, inline save/edit identity and validation feedback');
