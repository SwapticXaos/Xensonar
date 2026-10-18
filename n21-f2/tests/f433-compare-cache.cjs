'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const core=require('../src/forge/fractalia/05_relational_core.js'),jobs=require('../src/forge/fractalia/07_compile_jobs.js');
const data=new Map(),src=fs.readFileSync('src/forge/fractalia/03_instrument.js','utf8').split('function FractaliaMaterialImage')[0];
const ctx={console,setTimeout,clearTimeout,queueMicrotask,AbortController,DOMException,crypto:require('node:crypto').webcrypto,
 createFractaliaInstrumentCore:core,createFractaliaCompileJobs:jobs,__f333Epoch:0,__f333Stop:()=>{},__f333Idle:()=>({}),
 __f333ReadCarrier:()=>null,__f333Signature:()=>'',__f333Persistence:{status:()=>({restoreComplete:true}),scheduleSave:()=>{},saveNow:async()=>true},
 localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},pe:{getState:()=>({}),setState:()=>{}},
 fractaliaDonorSnapshot:()=>({key:'donor-A'}),__Emilia:{carrierTracks:()=>[]},__paintedCarrierTracks:()=>[],xt:{getContext:()=>({sampleRate:24000})}};
vm.createContext(ctx);vm.runInContext(src+';globalThis.api=__Fractalia;',ctx);const api=ctx.api;
const binding={mode:'tile',reading:'material-relations',revision:3,recombine:.9,layers:2,amount:.8,warp:.8,exchange:.7,axis:'energy',pitchReference:'measured',evolutionSec:6};
(async()=>{
 const template=core();
 await api.importInstrument({schema:'xensonar.fractalia-instrument',version:4,engine:template.ENGINE,recipe:template.example('glass')});
 const idA=await api.saveActiveInstrument({name:'Glass A'});
 await api.importInstrument({schema:'xensonar.fractalia-instrument',version:4,engine:template.ENGINE,recipe:template.example('reed')});
 const idB=await api.saveActiveInstrument({name:'Reed B'});
 await api.loadInstrument(idA);
 const altered=template.settings({...api.snapshot(),params:{...api.snapshot().params,fold:1.33,depth:3},compilerRevision:4,donor:binding});api.set(altered);
 assert.equal(typeof api.compareInstrument,'function','compare switch must be supported');
 const soundA=api.semanticKey(api.snapshot());
 await api.compareInstrument(idB);
 assert.equal(api.snapshot().instrumentId,idB);assert.equal(api.snapshot().params.fold,1.33);assert.equal(api.snapshot().params.depth,3);
 assert.equal(api.snapshot().donor.revision,3);assert.equal(api.snapshot().material.field.length,template.example('reed').material.field.length);
 assert.equal(api.libraryEntries().length,2);assert.equal(api.libraryState().modified,true);
 await api.loadInstrument(idB);assert.notEqual(api.snapshot().params.fold,1.33,'explicit original load must restore native preset');
 await api.compareInstrument(idA);api.set(altered);api.storeSlot('A');
 await api.compareInstrument(idB);api.storeSlot('B');
 await api.recallSlot('A');assert.equal(api.semanticKey(api.snapshot()),soundA);
 await api.recallSlot('B');assert.equal(api.snapshot().instrumentId,idB);
 vm.runInContext(src.replace('const __Fractalia','const __ReloadedFractalia')+';globalThis.restored=__ReloadedFractalia;',ctx);
 assert.equal(ctx.restored.slotState().A.name,'Glass A');await ctx.restored.recallSlot('A');assert.equal(ctx.restored.semanticKey(ctx.restored.snapshot()),soundA);
 console.log('PASS compare-preserving instrument switching, exact original load, persistent A/B snapshots');

 const file=fs.readFileSync('src/forge_and_melodic/10_audition_and_persistence.js','utf8'),start=file.indexOf('async function __f333RenderHearing('),end=file.indexOf('// F3.56.5:',start);
 const hearingCache=new Map();let renders=0;
 const ctx2={__f333HearingCache:hearingCache,IB:()=>({durationSec:1,previewPitchRatio:1,auditionSelection:{},synthLab:{},harmonicXplore:{}}),
 TR:()=>({}),Ti:JSON.stringify,ER:()=>'',xt:{getContext:()=>({sampleRate:24000})},xK:()=>null,
 __Fractalia:{semanticKey:api.semanticKey,showSpectrum:()=>{},renderCarrier:async()=>{renders++;return {length:24000,numberOfChannels:1,sampleRate:24000,getChannelData:()=>new Float32Array(24000)}}}};
 vm.createContext(ctx2);const helper=file.slice(file.indexOf('const __f433HearingBudgetBytes'),file.indexOf('function __f333Stop'));
 vm.runInContext(helper+file.slice(start,end)+';globalThis.hear=__f333RenderHearing;',ctx2);
 for(let i=0;i<7;i++)await ctx2.hear({machineId:'fractalia-self-carrier',snapshot:{fractaliaInstrument:template.settings({...template.example('glass'),params:{...template.example('glass').params,fold:.1+i*.1}})}});
 const count=renders;const hit=await ctx2.hear({machineId:'fractalia-self-carrier',snapshot:{fractaliaInstrument:template.settings({...template.example('glass'),params:{...template.example('glass').params,fold:.1}})}});
 assert.equal(hit.cacheHit,true,'previously rendered combination must survive more than 3 alternatives');assert.equal(renders,count);
 // The LRU bound is explicit: stale keys are released, while frequently accessed A/B results survive.
 const memo=vm.runInContext('__f433RememberHearing',ctx2);
 hearingCache.clear();memo('pinned',{length:2000,numberOfChannels:1});
 for(let i=0;i<15;i++)memo('extra-'+i,{length:1000,numberOfChannels:1});
 memo('pinned',hearingCache.get('pinned')); // mark as recently used
 memo('extra-15',{length:1000,numberOfChannels:1});
 assert.equal(hearingCache.has('pinned'),true,'a recently reused A/B buffer should survive the next eviction');
 for(let i=16;i<35;i++)memo('extra-'+i,{length:1000,numberOfChannels:1});
 assert.ok(hearingCache.size<=16,'entry budget must be respected');
 assert.equal(hearingCache.has('pinned'),false,'old unused results must be evicted');
 memo('too-large',{length:60000000,numberOfChannels:1});
 assert.equal(hearingCache.size,1,'large buffer must evict other entries to cap resident bytes');
 console.log('PASS same carrier/settings cache identity, 7-variant reuse, LRU entry and byte bounds');
})().catch(error=>{console.error(error);process.exitCode=1});
