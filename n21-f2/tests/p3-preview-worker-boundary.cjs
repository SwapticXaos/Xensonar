'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('src/nodal/12_surface_runtime.js','utf8');
const factory=new Function('__XenNodalLibrary','__XenNodalLive','__XenNodalModel',source+';return createNodalSurfaceRuntime;')({}, {}, {});
const instrument=Object.freeze({name:'A',articulation:{durationSec:.1},seed:1}),ctx={state:'running',currentTime:1,sampleRate:48000};
let preparations=0,notes=0;
const player={snapshot:()=>({disposed:false}),async prepare(i){assert.equal(i,instrument);preparations++;},route(){},noteOn(i){assert.equal(i,instrument);notes++;return {id:'preview'};},dispose(){}};
const api=factory({library:{list:()=>[{id:'A',revision:1,instrument}]},live:{createPlayer:async()=>player},model:{compile(){throw new Error('Unexpected main-thread preview compile');}}});
api.configure({getContext:()=>ctx,ensureReady:async()=>ctx,getOutput:()=>({})});
(async()=>{
 const voice=await api.preview('wave','nodal:A@1',{frequency:220},ctx);
 assert.equal(voice.id,'preview');assert.equal(preparations,1);assert.equal(notes,1);
 assert.equal(api.selectionStatus('wave').active,null,'preview never becomes the live selection');
 api.dispose();console.log('PASS Nodal preview delegates compilation to asynchronous player preparation');
})().catch(error=>{console.error(error);process.exitCode=1;});
