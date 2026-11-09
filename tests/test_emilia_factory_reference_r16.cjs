'use strict';
// R16: fixed seven-node FACTORY reference, reconstructed from the user's 350x348 screenshot.
// Does not overwrite browser saves or invent hidden knob/ratio values.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const emilia=fs.readFileSync('src/forge/emilia/01_nodal_carrier.js','utf8');
const core=fs.readFileSync('src/nodal/01_instrument_model.js','utf8');
const nodal=fs.readFileSync('src/nodal/07_sound_designer.js','utf8');
const header=nodal.slice(nodal.indexOf('const __NodalOrgans'),nodal.indexOf('/* xen-lazy:nodal */'));
const intro=emilia.slice(emilia.indexOf('const __Emilia = (() => {'),emilia.indexOf('  let instrument=starter();'));
const c=vm.createContext({console,Float32Array,Uint8Array,Math,JSON,Number,Object,Map,WeakMap,WeakSet,Set});
const api=vm.runInContext(`${core}\n${header}\n${intro}\nreturn {starter,MAX_NODES,compile:__XenNodalModel.compile};})();
__Emilia;`,c);
const first=api.starter(),again=api.starter();
assert.equal(api.MAX_NODES,7);
assert.equal(JSON.stringify(first),JSON.stringify(again));
assert.equal(first.model.nodes.length,7);
const specs=[
  ['emilia-0','resonator',101,71],  // upper left
  ['emilia-1','formant',290,31],    // upper right
  ['emilia-2','tilt',236,235],      // middle right
  ['emilia-3','formant',60,202],    // middle left (not Fold)
  ['emilia-4','drive',117,295],    // lower left
  ['emilia-5','sub',255,301],      // lower right
  ['emilia-6','resonator',160,197] // central
];
// Rendered SVG field is 1000x1000, screenshot raster is 350x348.
// Screenshot antialias/centering tolerance ~ 2.5 px.
for(const [id,role,x,y] of specs){
  const n=first.model.nodes.find(n=>n.id===id);
  assert(n,`missing ${id}`);
  assert.equal(n.role,role,`${id} correct role`);
  assert(Math.abs(n.x*350-x)<2.6,`${id}: incorrect horizontal placement (${n.x*350} vs ${x})`);
  assert(Math.abs(n.y*348-y)<2.6,`${id}: incorrect vertical placement (${n.y*348} vs ${y})`);
  assert(n.strength>0 && n.excitation>0 && n.radius>0 && n.pickup>0 && !n.muted,`${id} must be audible`);
}
assert.deepEqual([...first.model.nodes].map(n=>n.role).sort(),['drive','formant','formant','resonator','resonator','sub','tilt'].sort());
assert.equal(first.model.blockedEdges.length,0,'do not invent hidden deleted connections from an image');
const compiled=api.compile(first.model);
assert(compiled.edges.length>=15,'real network remains physically coupled, not 7 isolated decorative nodes');
const nodeIndex=id=>compiled.nodes.findIndex(n=>n.id===id);
const linked=(a,b)=>compiled.edges.some(e=>[e.a,e.b].sort().join(',')===[nodeIndex(a),nodeIndex(b)].sort().join(','));
for(const pair of [['emilia-0','emilia-1'],['emilia-3','emilia-6'],['emilia-4','emilia-5'],['emilia-2','emilia-5']])
  assert(linked(...pair),`expected visible coupling ${pair.join(' ↔ ')}`);
assert(emilia.includes('instrument=normalized(saved.instrument??saved)'), 'user saved recipes retained');
assert(emilia.includes("'xensonar.forge.emilia-hx-reciprocal.v4'"),'store key unchanged');
console.log(`PASS R16 screenshot-anchored factory seven: roles, coordinates, ${compiled.edges.length} connections, saved drafts unchanged`);
