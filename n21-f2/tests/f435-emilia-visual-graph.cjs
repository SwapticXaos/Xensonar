'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const s=fs.readFileSync('src/forge/emilia/02_lab_ui.js','utf8');
const graphFn=s.slice(s.indexOf('function __emiliaVisualGraph('),s.indexOf('function EmiliaForgeLab()'));
const engine=fs.readFileSync('src/nodal/01_instrument_model.js','utf8');
const ctx={};vm.createContext(ctx);vm.runInContext(engine+'\n'+graphFn+'\nglobalThis.api={normalize:__XenNodalModel.normalize,compile:__XenNodalModel.compile,edges:__emiliaVisualGraph};',ctx);
const a=ctx.api;
for(const x of [.12,.25,.39,.64,.87]){
 const model=a.normalize({schema:'xensonar.nodal-instrument',schemaVersion:1,kernelVersion:'coupled-modal-v1',name:'Test',referenceHz:220,seed:1,nodes:[
  {id:'A',role:'resonator',x,y:.4,ratio:1,cents:0,radius:.38,strength:.85,excitation:.6,pickup:.8},
  {id:'B',role:'formant',x:.49,y:.54,ratio:1.3,cents:0,radius:.38,strength:.85,excitation:.6,pickup:.8},
  {id:'C',role:'tilt',x:.86,y:.45,ratio:.75,cents:0,radius:.32,strength:.85,excitation:.6,pickup:.8}],
  blockedEdges:[['A','C']],excitation:{kind:'tone',level:.65},coupling:.16,articulation:{durationSec:4,attackSec:.004,releaseSec:.08}});
 const slow=a.compile(model),fast=a.edges(model);
 assert.equal(fast.edges.length,slow.edges.length);
 for(let i=0;i<slow.edges.length;i++){
  assert.equal(fast.edges[i].a,slow.edges[i].a);assert.equal(fast.edges[i].b,slow.edges[i].b);
  assert.ok(Math.abs(fast.edges[i].weight-slow.edges[i].weight)<1e-12);
 }
}
console.log('PASS lightweight Emilia drag-link graph equals full modal-plan connectivity and weights for 5 configurations');
