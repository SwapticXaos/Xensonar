'use strict';
const fs=require('fs'),assert=require('assert/strict'),vm=require('vm');
const source=fs.readFileSync('src/forge/module_bundle/19_donorMaterialDiagnostics.js','utf8');
let key='render-a',captured;
const context={registry:null,__F341Workbench:{captureOutput:(...args)=>{captured=args}}};
vm.createContext(context);vm.runInContext('registry={'+source+'}',context);
const api={};context.registry[Object.keys(context.registry)[0]]({},api,()=>assert.fail('no FFT module may be imported'));
api.attachDonorDiagnostics({key:()=>key,runtime:{getSnapshot:()=>({model:{renderMethod:'hybrid'},sourceRevision:2})},store:{getState:()=>({renderVersion:3})}});
const buffer={duration:1,getChannelData:()=>assert.fail('metadata must never inspect PCM')},material={version:'material-plan'},pcm={donorMaterialPlan:material};
(async()=>{
 api.captureDonorMaterialPlan(pcm,null,api.bindRenderProgressKey(null,key));
 await api.capturePreparedDonorOutput(key,buffer,{cacheHit:true});
 assert.equal(captured[1],buffer);assert.equal(captured[2],null);assert.equal(captured[3],material);
 assert.equal(api.diagnosticsSnapshot().material,material);assert.equal(api.diagnosticsSnapshot().mantle,null);
 key='render-b';assert.equal(api.diagnosticsSnapshot().current,false);captured=null;
 await api.capturePreparedDonorOutput('render-a',buffer);assert.equal(captured,null,'obsolete material publication is rejected');
 console.log('PASS material provenance and exact AudioBuffer survive without PCM reads, FFT, canvas or subscriptions');
})().catch(e=>{console.error(e);process.exitCode=1});
