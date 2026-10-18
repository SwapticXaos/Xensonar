'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync('src/forge/fractalia/15_hearing_spectrum.js','utf8');
const sets=Array.from({length:8},()=>new Set()),timers=new Map();let next=0,version=1,draws=0,renders=0,release;
const subscribe=i=>f=>{sets[i].add(f);return()=>sets[i].delete(f)};
const state={renderVersion:version,spectralData:{width:2,height:2,data:new Float32Array(4)},materialExport:{bars:1,bpm:120,beatsPerBar:4}};
const context={console,DOMException,performance:{now:()=>0},setTimeout:(f,delay)=>{timers.set(++next,{f,delay});return next},clearTimeout:id=>timers.delete(id),document:{contains:()=>true,createElement:()=>({getContext:()=>({createImageData:()=>({data:new Uint8ClampedArray(4)}),putImageData(){}})})},pe:{getState:()=>state,subscribe:subscribe(0)},Vt:{getSnapshot:()=>({selected:false}),subscribe:subscribe(1)},__ForgeListeningMode:{value:()=> 'antonia',subscribe:subscribe(2)},__F3564Master:{getSnapshot:()=>({tuning:0}),subscribe:subscribe(3)},__Fractalia:{snapshot:()=>null,subscribe:subscribe(4)},__Emilia:{snapshot:()=>null,subscribe:subscribe(5)},__F341Workbench:{subscribe:subscribe(6)},__FractaliaSpectralView:{subscribe:subscribe(7)},__f333Signature:()=> 'grid',__f333Route:()=> 'hearing',__f333RenderCurrentRaw:async()=>{renders++;await new Promise(r=>release=r);return{buffer:{sampleRate:8000,getChannelData:()=>new Float32Array(8)}}},__FractaliaMaterialRuntime:{run:async()=>({})},fractaliaSpectrumPixels:()=>({width:1,height:1,data:new Uint8ClampedArray(4)}),D5e:()=>draws++};
vm.createContext(context);vm.runInContext(source+';globalThis.api=__ForgeHearingSpectrum',context);const a=context.api;
(async()=>{
 a.refresh();assert.equal(sets.reduce((n,s)=>n+s.size,0),8);
 const job=a.testFlush();await Promise.resolve();assert.equal(renders,1);
 a.suspend();assert.equal(sets.reduce((n,s)=>n+s.size,0),0,'leave Forge must remove all eight subscriptions');assert.equal(timers.size,0,'leave Forge must remove debounce/repaint timers');
 release();await job;assert.equal(a.snapshot().hasImage,false,'late PCM cannot repopulate a suspended view');
 a.refresh();assert.equal(sets.reduce((n,s)=>n+s.size,0),8);const b=a.testFlush();await Promise.resolve();release();await b;
 assert.equal(a.snapshot().hasImage,true);a.suspend();assert.equal(a.snapshot().hasImage,true,'navigation retains prepared spectrum');
 a.refresh();assert.equal(a.snapshot().hasImage,true);a.suspend();a.suspend();assert.equal(timers.size,0);
 console.log('PASS hearing subscriptions/timers owned by view, late result veto, retained spectrum, reversible re-entry');
})().catch(e=>{console.error(e);process.exitCode=1});
