'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const script=fs.readFileSync('src/forge/fractalia/15_hearing_spectrum.js','utf8');
let selected='antonia',version=1,rendered=[],listeners=[];
let tick=0;
const state=()=>({renderVersion:version,spectralData:{width:32,height:32,data:new Float32Array(1024)},materialExport:{bars:1,bpm:120,beatsPerBar:4},carrierIntegralSelection:{machineId:selected},carrierIntegralSynthLab:{},carrierIntegralHarmonicXplore:{},synthMode:'additive',waveformMix:{sine:1}});
const storage={};
const context={console,performance:{now:()=>tick},setTimeout:(f)=>{storage.scheduled=f;return 1},clearTimeout:()=>{},requestAnimationFrame:()=>{},document:{contains:()=>true,createElement:()=>({width:0,height:0,getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:()=>{}})})},pe:{getState:state,subscribe:f=>(listeners.push(f),()=>{})},
 __ForgeListeningMode:{value:()=>selected,subscribe:f=>(listeners.push(f),()=>{})},__F3564Master:{getSnapshot:()=>({tuning:0}),subscribe:f=>(listeners.push(f),()=>{})},Vt:{getSnapshot:()=>({selected:false,sourceRevision:1}),subscribe:f=>(listeners.push(f),()=>{})},__Fractalia:{semanticKey:()=>'',snapshot:()=>({}),subscribe:()=>()=>{}},__Emilia:{semanticKey:()=>'',snapshot:()=>({}),subscribe:()=>()=>{}},
 __f333Route:()=> 'hearing',__f333Signature:()=> 'a', __f333RenderCurrentRaw:async()=>({buffer:{sampleRate:1000,getChannelData:()=>new Float32Array(1200)}}),
 __FractaliaMaterialRuntime:{run:async(_kind,payload)=>{rendered.push(selected);return {width:12,height:8,values:new Float32Array(96).fill(selected==='antonia'?0.3:0.7),maximum:1}}},
 fractaliaSpectrumPixels:(measure)=>({width:measure.width,height:measure.height,data:new Uint8ClampedArray(measure.width*measure.height*4)}),
 D5e:()=>{},};
vm.createContext(context);
vm.runInContext(script+'\nglobalThis.spectrumTest=__ForgeHearingSpectrum;',context);
const view=context.spectrumTest;
(async()=>{
 assert.equal(view.pulseRed(0),0);assert.ok(view.pulseRed(700)>.3);assert.ok(view.pulseRed(1400)>.79);assert.ok(view.pulseRed(2800)<.00001);
 view.refresh();assert.equal(view.snapshot().status,'pending');
 await view.testFlush();assert.equal(view.snapshot().status,'ready');assert.equal(view.snapshot().mode,'antonia');
 selected='bert';tick=0;view.refresh();assert.equal(view.snapshot().status,'pending');assert.equal(view.snapshot().visibleMode,'antonia','old image remains visible while new listener computes');
 tick=700;await view.testFlush();assert.equal(view.snapshot().status,'pending','prepared new spectrum waits for turquoise pulse endpoint');
 tick=1400;view.refreshFrame();assert.equal(view.snapshot().visibleMode,'antonia');
 tick=2800;view.refreshFrame();assert.equal(view.snapshot().visibleMode,'bert');assert.equal(view.snapshot().status,'ready');
 assert.deepEqual(rendered,['antonia','bert']);
 selected='antonia';view.refresh();assert.equal(view.snapshot().visibleMode,'antonia','cached variant is shown directly');
 console.log('PASS listener-scoped PCM spectrograms, old-image continuity, slow red-turquoise pulse, clean commit, cache recall');
})().catch(e=>{console.error(e);process.exitCode=1});
