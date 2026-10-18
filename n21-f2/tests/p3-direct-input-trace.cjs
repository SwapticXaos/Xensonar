'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8'),probe=new Function(read('src/instruments/00_diagnostics.js')+';return __XenAudioProbe;')();
const source=read('src/audio/03_recorder.js'),a=source.indexOf('function DW('),b=source.indexOf('const f1e=',a);
const create=new Function('__XenAudioProbe','XA','LW','b6','p1e','r8','h1e',source.slice(a,b)+';return DW;')(
 probe,class{observe(){}snapshot(){return{}}},[],()=>{},()=>({lastDroppedAtMs:null}),20,8);
let frame=48000,now=1000,emitted=0;
const input=create({nowMs:()=>now,getAudioFrame:()=>frame,emitDirectAttack:(hz,sector,opts)=>{assert(opts.traceId);emitted++;}});
probe.start();for(let i=0;i<10;i++){const id=probe.begin('wave',1);input.request(220,false,{traceId:id,requestedAtMs:now});}
let report=probe.read();assert.equal(emitted,8);assert.equal(report.records.filter(r=>r.stage==='direct-input'&&r.reason==='quantum-cap').length,2,'direct-input drops must retain their event ID');
const stale=probe.begin('wave',1);now+=30;input.request(220,false,{traceId:stale,requestedAtMs:1000});
assert(probe.read().records.some(r=>r.eventId===stale&&r.reason==='stale'));
frame=NaN;const inactive=probe.begin('wave');input.request(220,false,{traceId:inactive,requestedAtMs:now});
assert(probe.read().records.some(r=>r.eventId===inactive&&r.reason==='inactive'));
input.dispose();const disposed=probe.begin('wave');input.request(220,false,{traceId:disposed});
assert(probe.stop().records.some(r=>r.eventId===disposed&&r.reason==='disposed'));
console.log('PASS actual direct-input cap, stale/context/dispose decisions preserve event identity');
