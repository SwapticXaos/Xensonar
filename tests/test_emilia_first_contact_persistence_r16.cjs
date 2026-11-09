'use strict';
// Fresh profile loads factory. Existing draft remains authoritative; never migrate it silently.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const emilia=fs.readFileSync('src/forge/emilia/01_nodal_carrier.js','utf8');
const model=fs.readFileSync('src/nodal/01_instrument_model.js','utf8');
const nodal=fs.readFileSync('src/nodal/07_sound_designer.js','utf8');
const organs=nodal.slice(nodal.indexOf('const __NodalOrgans'),nodal.indexOf('/* xen-lazy:nodal */'));
const source=`${model}\n${organs}\n${emilia}\n__Emilia;`;
function boot(entries={}){
 const store=new Map(Object.entries(entries));
 const ctx=vm.createContext({console,Float32Array,Uint8Array,Float64Array,Map,WeakMap,WeakSet,Set,Math,JSON,Number,Object,Date,
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}});
 return {api:vm.runInContext(source,ctx),store};
}
const fresh=boot();
assert.equal(fresh.api.snapshot().model.nodes.length,7);
assert.equal(fresh.api.snapshot().model.nodes.find(n=>n.id==='emilia-3').role,'formant');
const prior=fresh.api.snapshot();
// Emulate a real older, separately saved five-node sketch.
const oldRecipe=JSON.parse(JSON.stringify(prior));
oldRecipe.model.nodes=oldRecipe.model.nodes.slice(0,5);
oldRecipe.model.nodes[0].x=.51;
const recovered=boot({'xensonar.forge.emilia-hx-reciprocal.v4':JSON.stringify(oldRecipe)}).api.snapshot();
assert.equal(recovered.model.nodes.length,5,'do not silently replace an existing user draft');
assert.equal(recovered.model.nodes[0].x,.51,'user coordinates preserved');
assert.equal(fresh.api.snapshot().model.nodes.length,7,'fresh profile remains seven');
console.log('PASS fresh browser factory 7 / preserved saved user draft 5');
