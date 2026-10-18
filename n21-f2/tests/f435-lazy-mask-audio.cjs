'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const script=fs.readFileSync('src/forge_and_melodic/10_audition_and_persistence.js','utf8');
const start=script.indexOf('async function __f333RenderHearing('),end=script.indexOf('// F3.56.5:',start);
assert.ok(start>=0&&end>start);
let selectedMask='A',activeDonor=null,renders=[],preparations=0;
const fixed={donor:{revision:2},name:'A',material:{field:[1]}}, cache=new Map();
const ctx={console,Map,__f333HearingCache:cache,IB:()=>({durationSec:1,previewPitchRatio:1,auditionSelection:{},synthLab:{},harmonicXplore:{}}),
 TR:()=>({}),Ti:JSON.stringify,ER:()=>'',xt:{getContext:()=>({sampleRate:24000})},xK:()=>null,
 __f3562EnsureDonor:async()=>{preparations++;activeDonor=selectedMask;return {source:'mask-prepared'}},fractaliaDonorSnapshot:()=>({key:activeDonor}),
 __Fractalia:{snapshot:()=>fixed,semanticKey:()=> 'constant-geometry',showSpectrum:()=>{},renderCarrier:async()=>{renders.push(activeDonor);return {length:24000,numberOfChannels:1,sampleRate:24000,getChannelData:()=>new Float32Array(24000)}}},
 __Emilia:{semanticKey:()=>''}};
vm.createContext(ctx);
vm.runInContext(script.slice(script.indexOf('const __f433HearingBudgetBytes'),script.indexOf('function __f333Stop'))+script.slice(start,end)+';globalThis.hear=__f333RenderHearing;',ctx);
(async()=>{
 const request={machineId:'fractalia-self-carrier',snapshot:{fractaliaInstrument:fixed}};
 const a=await ctx.hear(request);assert.equal(a.cacheHit,false);assert.deepEqual(renders,['A']);assert.ok(a.cacheKey.includes('A'));
 selectedMask='B';const b=await ctx.hear(request);assert.equal(b.cacheHit,false,'new purple mask must invalidate previous audio');assert.deepEqual(renders,['A','B']);assert.ok(b.cacheKey.includes('B'));
 selectedMask='A';const a2=await ctx.hear(request);assert.equal(a2.cacheHit,true,'reselected mask must recall the original A audio');assert.equal(renders.length,2);assert.equal(preparations,3);
 console.log('PASS lazy Fractalia mask acquisition happens before audio cache identity: A→B renders distinct PCM, B→A recovers A from cache');
})().catch(e=>{console.error(e);process.exitCode=1});
