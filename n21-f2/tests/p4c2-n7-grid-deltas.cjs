'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('src/nodal/12_surface_runtime.js','utf8').replace('const __XenNodalSurfaces=createNodalSurfaceRuntime({library:__XenNodalLibrary,live:__XenNodalLive,model:__XenNodalModel});','');
const create=new Function(source+';return createNodalSurfaceRuntime;')();
let params={gridOn:true,lockCursorToGrid:true,gridBase:100,gridTuning:'test',manualGridMutedSteps:[],manualGridStepOffsets:[]},lines=[100,200,300],ratios=[{ratio:1},{ratio:1.5}],cursor=137.173;
const ctx={state:'running',currentTime:0};const counters={wave:0,particle:0,cursor:0},calls=[];
const instrument={},player={prepare:async()=>{},pin(){},unpin(){},route(){},dispose(){},snapshot:()=>({disposed:false}),prepareGridFrequencies:(_,frequencies)=>{calls.push(frequencies);return true;},prepareFrequencies:(_,xs)=>{calls.push(xs);return true;}};
const runtime=create({library:{list:()=>[{id:'A',revision:1,instrument}]},live:{createPlayer:async()=>player},model:{}});
runtime.configure({getContext:()=>ctx,ensureReady:async()=>ctx,getOutput:()=>({}),acquire:()=>null,readWaveGridParams:()=>params,readWaveGridLines:()=>lines.map(freq=>({freq})),readWaveGridFrequencies:()=>lines,readKeyboardGridFrequencies:()=>lines,readWaveGridTopFrequency:()=>1000,gridFrequencyToWaveBase:hz=>hz,readWaveBaseFrequency:()=>{counters.cursor++;return cursor;},resolveWaveFrequency:(hz,sector,octave)=>{counters.wave++;return hz*(sector?1.25:1)*(octave?2:1);},readParticleGridAgents:()=>ratios,resolveParticleFrequency:(root,ratio)=>{counters.particle++;return root*ratio;}});
(async()=>{
 await runtime.select('wave','nodal:A@1');await runtime.select('particle','nodal:A@1');
 const initial={...counters},callCount=calls.length;
 for(let i=0;i<100;i++){cursor+=.137;ctx.currentTime+=.02;runtime.warmWaveField(ctx);}
 assert.deepEqual(counters,initial,'free cursor motion cannot reevaluate a complete active raster');assert.equal(calls.length,callCount);
 // Move exactly one step; two unchanged roots retain their projections.
 lines=[100,211,300];params={...params,manualGridStepOffsets:[0,.137,0]};runtime.warmWaveField(ctx);
 assert.equal(counters.wave-initial.wave,4,'only four launch variants of the moved step');
 assert.equal(counters.particle-initial.particle,2,'only new root times the two current particle ratios');
 const afterMove={...counters};
 ratios=[{ratio:1},{ratio:1.7}];runtime.warmWaveField(ctx);
 assert.equal(counters.wave,afterMove.wave,'a particle edit cannot redo Wave projections');
 assert.equal(counters.particle-afterMove.particle,3,'only the changed ratio for the three existing roots');
 const afterRatio={...counters};lines=[100,300];params={...params,manualGridMutedSteps:[1]};runtime.warmWaveField(ctx);
 assert.deepEqual(counters,afterRatio,'removing a step requires no new frequency calculation');
 assert(calls.at(-1).every(hz=>hz!==211),'obsolete step leaves the desired set');
 // Raster visibility and Snap are independent. With Snap disabled the exact
 // free cursor pitch must still be prepared, even while grid lines are shown.
 params={...params,lockCursorToGrid:false};ctx.currentTime+=.05;cursor=137.173;runtime.warmWaveField(ctx);const dynamicA=calls.at(-1);
 ctx.currentTime+=.05;cursor=213.137;runtime.warmWaveField(ctx);assert.notDeepEqual(calls.at(-1),dynamicA);assert(counters.cursor>0);
 runtime.dispose();fs.writeFileSync('results/p4c2-n7-grid-deltas.json',JSON.stringify({unchangedCursorFrames:100,oneStepEdit:{waveEvaluations:4,particleEvaluations:2},oneRatioEdit:{roots:3,particleEvaluations:3},removedStepEvaluations:0},null,2)+'\n');
 console.log('PASS N7 exact grid deltas: stable cursor zero work; one step 4 variants + 2 ratios; one ratio only 3 roots; mute zero calculations');
})().catch(e=>{runtime.dispose();console.error(e);process.exitCode=1});
