'use strict';const fs=require('node:fs'),assert=require('node:assert/strict');
const state=fs.readFileSync('src/runtime/01_instrument_state.js','utf8');
const sY=new Function(state.slice(0,state.indexOf('const lY'))+';return sY')();
const perf=fs.readFileSync('src/runtime/instrument/04_performance_and_output_profiles.js','utf8');
const gates=perf.slice(perf.indexOf('Cte=.16'),perf.indexOf(',Fte=!1'));
const {kte,Ete}=new Function('const Y5=(e,t,n)=>Math.min(n,Math.max(t,e));const '+gates+';return {kte,Ete}')();
const stages={requested:0,rate32Rejected:0,rate160Rejected:0,submitted:0};const gate=sY(),guard=kte();
const fixture=[...Array.from({length:12},(_,i)=>({id:'P'+i,lane:'particle',at:1,level:.2})),...Array.from({length:10},(_,i)=>({id:'W'+i,lane:'wave',at:1,level:.2}))];
const output=fixture.map(item=>{
 stages.requested++;
 if(!gate.tryStart(item.lane,item.at,0,true)){stages.rate32Rejected++;return {...item,stoppedAt:'rate32'}}
 if(item.lane==='particle'&&!Ete(guard,item.at,'particle',item.level).allowed){stages.rate160Rejected++;return {...item,stoppedAt:'rate160'}}
 stages.submitted++;return {...item,stoppedAt:'renderer-not-simulated'};
});
assert.equal(stages.requested,22);assert.equal(stages.rate32Rejected,12);assert.equal(stages.rate160Rejected,0);assert.equal(stages.submitted,10);
assert.equal(stages.requested,stages.rate32Rejected+stages.rate160Rejected+stages.submitted);
fs.mkdirSync('results',{recursive:true});fs.writeFileSync('results/s1-mixed-gate-trace.json',JSON.stringify({fixture,stages,output,limitation:'Original entry gates only. Worklet and physical audio were NOT simulated.'},null,2)+'\n');
console.log('PASS S1 mixed finite event trace (12 particle + 10 wave):',JSON.stringify(stages));
