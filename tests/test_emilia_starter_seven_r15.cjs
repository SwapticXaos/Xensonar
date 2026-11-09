'use strict';
// Seven-node compatibility gate, carried forward from R15; precise R16 positions have their own screenshot contract.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const emilia=fs.readFileSync('src/forge/emilia/01_nodal_carrier.js','utf8');
const core=fs.readFileSync('src/nodal/01_instrument_model.js','utf8');
const nodal=fs.readFileSync('src/nodal/07_sound_designer.js','utf8');
const header=nodal.slice(nodal.indexOf('const __NodalOrgans'),nodal.indexOf('/* xen-lazy:nodal */'));
const intro=emilia.slice(emilia.indexOf('const __Emilia = (() => {'),emilia.indexOf('  let instrument=starter();'));
const vmCtx=vm.createContext({console,Float32Array,Uint8Array,Math,JSON,Number,Object,Map,WeakMap,WeakSet,Set});
const API=vm.runInContext(`${core}\n${header}\n${intro}\nreturn {starter,MAX_NODES};})();\n__Emilia;`,vmCtx);
assert.equal(API.MAX_NODES,7,'editing cap remains seven');
const a=API.starter().model,b=API.starter().model;
assert.equal(a.nodes.length,7,'seven sound-producing nodes in starter');
assert.equal(JSON.stringify(a),JSON.stringify(b),'deterministic setup');
assert.equal(new Set(a.nodes.map(n=>n.id)).size,7);
for(const n of a.nodes){
 assert.equal(n.muted,false,'all seven sound');
 assert(n.radius>0&&n.strength>0&&n.excitation>0,'real sound node');
 assert(n.x>=.05&&n.x<=.95&&n.y>=.05&&n.y<=.95,'visible canvas margin');
}
for(let i=0;i<a.nodes.length;i++)for(let j=i+1;j<a.nodes.length;j++)assert(Math.hypot(a.nodes[i].x-a.nodes[j].x,a.nodes[i].y-a.nodes[j].y)>=.18,'not visually overlapping');
assert(a.nodes.some(n=>n.role==='formant'),'formant organs remain');
assert(a.nodes.some(n=>n.role==='tilt'),'tilt organ remains');
assert(a.nodes.some(n=>n.role==='sub'),'bass organ present');
assert(emilia.includes('instrument=normalized(saved.instrument??saved)'), 'saved drafts are never replaced by new default');
assert(emilia.includes("'xensonar.forge.emilia-hx-reciprocal.v4'"),'storage key unchanged');
console.log('PASS R15 compatibility: seven distinct sound nodes and stored drafts retained');
