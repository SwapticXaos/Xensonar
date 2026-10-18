'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
const calls=[],ctx={sampleRate:48000};
let failEnt=false,abortEnt=null,sampleWait=null;
const env=vm.createContext({console,Map,Set,AbortController,
 uD:(_,n)=>n.channelIndex??0,yW:(t,n)=>n.instrumentPresetOverride??t.instrumentPreset,Zr:x=>x,
 pg:async id=>{calls.push('sample:'+id);if(sampleWait)await sampleWait;return {buffer:{},baseHz:220};},
 nodalLoadMelodicSources(request,sources){calls.push('nodal');for(const note of request.composer.notes){const t=request.composer.tracks.find(t=>t.id===note.trackId),id=note.instrumentPresetOverride??t.instrumentPreset;if(id.startsWith('nodal:'))sources.set(id,{kind:'nodal',plan:{kernelVersion:'coupled-modal-v2',cost:1,nodes:[{},{},{}],nonlinearNodes:[]}});}return sources;},
 async prepareEntrophonMelodicSources(request,sources){calls.push('entrophon');if(abortEnt)abortEnt.abort();for(const note of request.composer.notes){const t=request.composer.tracks.find(t=>t.id===note.trackId),id=note.instrumentPresetOverride??t.instrumentPreset;if(!id.startsWith('entrophon:'))continue;let src=sources.get(id);if(!src){src={kind:'entrophon',noteBuffers:new Map()};sources.set(id,src);}src.noteBuffers.set(note.id,{buffer:{length:128,numberOfChannels:2}});}if(failEnt)throw Error('kernel failure');return sources;}
});
vm.runInContext(read('src/nodal/04_audio_runtime.js').split('function nodalWorkletProcessorFactory')[0]+read('src/instruments/06_source_preparation.js')+';this.api={load:loadMelodicInstrumentSources,prepare:prepareMelodicInstrumentSources,release:releasePreparedInstrumentSources,select:instrumentPreparationSelection,resources:nodalPreparationResources};',env);
const api=env.api;
const composer={bars:7,stepsPerBar:13,pitchSteps:[{}, {muted:true}],tracks:[
 {id:'n',enabled:true,instrumentPreset:'nodal:n@1'}, {id:'e',enabled:true,instrumentPreset:'entrophon:e@1'},
 {id:'s',enabled:true,instrumentPreset:'sample:s'}, {id:'off',enabled:false,instrumentPreset:'entrophon:missing@1'}],
 notes:[{id:'nn',trackId:'n'},{id:'en',trackId:'e'},{id:'sn',trackId:'s'}, {id:'offn',trackId:'off'},
 {id:'muted',trackId:'e',channelIndex:1,instrumentPresetOverride:'entrophon:missing@1'}]};
const request={composer,trackIds:['n','e','s','off'],bpm:137},before=JSON.stringify(request);
(async()=>{
 const sources=await api.load(request,ctx);
 assert.deepEqual(calls,['sample:s','nodal','entrophon']);assert.equal(sources.size,3);
 assert.equal(JSON.stringify(request),before,'selection cannot rewrite time, tuning, enable state or notes');
 const n=sources.get('nodal:n@1').resources,e=sources.get('entrophon:e@1').resources;
 assert.equal(n.physicalVoicesPerNote,1);assert.equal(n.dsp.units,1);assert.equal(n.surfaceDsp.units,1.7);
 assert.equal(e.physicalVoicesPerNote,1);assert.equal(e.dsp.units,null);assert.equal(e.frames,128);assert.equal(e.pcmBytes,1024);
 assert.notEqual(n.dsp.unit,e.dsp.unit,'engine cost currencies must not become one false universal unit');
 assert(Object.isFrozen(n)&&Object.isFrozen(n.dsp));
 calls.length=0;const single=await api.load({...request,noteId:'en'},ctx);
 assert.deepEqual(calls,['entrophon']);assert.equal(single.size,1,'note audition cannot prepare unrelated engines');
 calls.length=0;await api.load({...request,drumPreviewOnly:true},ctx);assert.deepEqual(calls,[]);
 const aborted=new AbortController();aborted.abort();calls.length=0;
 await assert.rejects(api.load({...request,signal:aborted.signal},ctx),{name:'AbortError'});assert.deepEqual(calls,[]);
 let unblock;sampleWait=new Promise(resolve=>unblock=resolve);calls.length=0;
 const late=new AbortController(),pending=api.load({...request,signal:late.signal},ctx);late.abort();unblock();
 await assert.rejects(pending,{name:'AbortError'});assert.deepEqual(calls,['sample:s'],'stop during sample load must prevent synthetic preparation');sampleWait=null;
 const oldBuffers=new Map([['old',{buffer:{length:3,numberOfChannels:2}}]]),oldSource={kind:'entrophon',noteBuffers:oldBuffers};
 const existing=new Map([['entrophon:e@1',oldSource]]);
 failEnt=true;await assert.rejects(api.prepare(request,ctx,existing),/kernel failure/);failEnt=false;
 assert.equal(existing.size,1);assert.equal(oldBuffers.size,1);assert(!oldBuffers.has('en'),'failed transaction cannot publish into previous material');
 abortEnt=new AbortController();await assert.rejects(api.prepare({...request,signal:abortEnt.signal},ctx,existing),{name:'AbortError'});abortEnt=null;
 assert.equal(oldBuffers.size,1,'cancelled result cannot damage prior owner');
 api.release(sources);api.release(sources);assert.equal(sources.size,0);assert.equal(oldBuffers.size,1);
 const fold=api.resources({kernelVersion:'legacy',cost:9,nodes:[{},{},{}],nonlinearNodes:[0]},96000);
 assert.equal(fold.dsp.units,9);assert.equal(fold.surfaceDsp.units,18);assert.equal(fold.nonlinearNodeCount,1);
 await assert.rejects(api.load(request,{sampleRate:Infinity}),/sample rate/);
 console.log('PASS P4C1 source transaction: mixed engines, scoped selection, unchanged geometry, resource currencies, abort barriers, rollback and idempotent release');
})().catch(error=>{console.error(error);process.exitCode=1});
