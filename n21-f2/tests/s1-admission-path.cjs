'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const state=fs.readFileSync('src/runtime/01_instrument_state.js','utf8');
const limiter=new Function(state.slice(0,state.indexOf('const lY'))+';return sY')();
const perf=fs.readFileSync('src/runtime/instrument/04_performance_and_output_profiles.js','utf8');
const gates=perf.slice(perf.indexOf('Cte=.16'),perf.indexOf(',Fte=!1'));
const {kte,Ete}=new Function('const Y5=(e,t,n)=>Math.min(n,Math.max(t,e));const '+gates+';return {kte,Ete}')();
const trace=[];let admitted=0;const s=limiter(),g=kte();
for(let i=0;i<20;i++){
 const first=s.tryStart('particle',1,0,true);
 const second=first?Ete(g,1,'particle',.2).allowed:false;
 trace.push({event:i,first,second});if(second)admitted++;
}
assert.equal(trace.filter(x=>x.first).length,2);
assert.equal(admitted,2);
const isolate=kte();let pass=0;
for(let i=0;i<20;i++)pass+=Ete(isolate,1,'particle',.2).allowed?1:0;
assert.equal(pass,5);
const before=Ete(isolate,1.159,'particle',.2).allowed;
const after=Ete(isolate,1.161,'particle',.2).allowed;
assert.equal(before,false);assert.equal(after,true);
console.log('PASS S1 original limiters: 20 particle attempts -> 2 (sY+Ete), 5 (Ete only); rolling-window boundaries');
