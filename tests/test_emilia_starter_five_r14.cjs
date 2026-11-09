'use strict';
// Legacy R14 compatibility: deterministic factory, stored user instruments preserved.
// Layout requirements from R14 are superseded by the R16 screenshot contract.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const root='src/forge/emilia/01_nodal_carrier.js';
const emilia=fs.readFileSync(root,'utf8');
const nodal=fs.readFileSync('src/nodal/07_sound_designer.js','utf8');
const starterSource=nodal.slice(nodal.indexOf('const __NodalOrgans'),nodal.indexOf('/* xen-lazy:nodal */'));
const coreSource=fs.readFileSync('src/nodal/01_instrument_model.js','utf8');
const intro=emilia.slice(emilia.indexOf('const __Emilia = (() => {'),emilia.indexOf('  let instrument=starter();'));
assert(intro.includes('function starter()'),'starter exists');
const ctx=vm.createContext({console,Float32Array,Uint8Array,Math,JSON,Number,Object,Map,WeakMap,WeakSet,Set});
const recipe=vm.runInContext(`${coreSource}\n${starterSource}\n${intro}\nreturn {starter,MAX_NODES};})();
__Emilia;`,ctx);
assert.equal(recipe.MAX_NODES,7,'editor maximum remains seven');
const first=recipe.starter(),second=recipe.starter();
assert.equal(first.model.nodes.length,7,'seven nodes in current factory');
assert.equal(JSON.stringify(first),JSON.stringify(second),'deterministic start scene');
assert.equal(new Set(first.model.nodes.map(n=>n.id)).size,7,'unique IDs');
for(const n of first.model.nodes){
  assert(n.x>=.05&&n.x<=.95&&n.y>=.05&&n.y<=.95,'node inside field');
  assert(n.radius>0&&n.strength>0,'real audible network node, not decoration');
}
const nodes=first.model.nodes;
for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
  assert(Math.hypot(nodes[i].x-nodes[j].x,nodes[i].y-nodes[j].y)>=.20,'startup nodes visibly separated');
}
for(const role of ['resonator','formant','tilt'])assert(nodes.some(n=>n.role===role),'core organ role retained: '+role);
assert(emilia.includes("'xensonar.forge.emilia-hx-reciprocal.v4'"),'persistence ID not migrated');
assert(emilia.includes('instrument=normalized(saved.instrument??saved)'),'saved user recipes stay authoritative');
console.log('PASS: Emilia seven active nodes; previous user recipes retained; seven-node cap and persisted drafts unchanged');
