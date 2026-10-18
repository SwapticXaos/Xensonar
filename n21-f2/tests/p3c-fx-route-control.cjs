'use strict';
// P3C real control FX cache and Nodal lane graph. No per-note connect in stable case.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.P3C_BASE||process.cwd();
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const fxSource=read('src/audio/05_live_voice_runtime.js');
const from=fxSource.indexOf('function AL('),to=fxSource.indexOf('const txe=',from);
assert(from>=0&&to>from);
const fx=new Function('aw',fxSource.slice(from,to)+';return {warm:__XenP3CPrepareWaveFX,lookup:__XenP3CWaveFXFor};')(e=>!!e);
const ctx={state:'running'};let ensureCalls=0,device=null;
const makeFx=()=>({ctx,activeMask:1,enterHoldPsyFxEnabled:false,enterHoldActive:false,
 get collectiveMemoryWaves(){return device},transientDriveWaves:null,psychedelicSpiralWaves:null,enterHoldPsyFxWaves:null,schwarmdeuterWaves:null,myzelPostFxWaves:null,
 ensureCollectiveMemoryFx(){ensureCalls++;if(!device)device={id:'reverb-A'};},ensurePsychedelicSpiralDevice(){},ensureTransientDriveDevice(){},ensureEnterHoldPsyFxDevice(){},ensureSchwarmdeuterDevice(){},ensureMyzelPostFxRouter(){}});
let desc=makeFx();const first=fx.warm(desc);
assert.equal(ensureCalls,1);assert(first.targets.includes(device),'the FIRST FX activation must use nodes created in its own ensure pass');
const direct={ctx,essentialWaveOnly:false,activeMask:1,enterHoldPsyFxEnabled:false,enterHoldActive:false,collectiveMemoryWaves:device,
 transientDriveWaves:null,psychedelicSpiralWaves:null,enterHoldPsyFxWaves:null,schwarmdeuterWaves:null,myzelPostFxWaves:null};
assert.equal(fx.lookup(direct),first,'attack reads prepared control catalog');
assert.equal(fx.warm(makeFx()),first,'unchanged render does not re-create FX');assert.equal(ensureCalls,1);
device={id:'reverb-B'};assert.equal(fx.lookup({...direct,collectiveMemoryWaves:device}),null,'changed device must invalidate cached route');
const second=fx.warm(makeFx());assert(second.targets.includes(device));assert.equal(ensureCalls,2);
assert.equal(fx.lookup({...direct,collectiveMemoryWaves:device}),second);

const nodalSource=read('src/nodal/12_surface_runtime.js');const cut=nodalSource.indexOf('const __XenNodalSurfaces=createNodalSurfaceRuntime(');
assert(cut>0);
const create=new Function(nodalSource.slice(0,cut)+';return createNodalSurfaceRuntime;')();
const inst={id:'i1',revision:1,articulation:{durationSec:.2},seed:4},ctx2={state:'running',currentTime:2},routes=[],notes=[];
const player={snapshot:()=>({disposed:false}),prepare:async()=>{},pin:()=>true,unpin:()=>{},isPrepared:()=>true,
 dispose(){},route:(lane,main,aux)=>{routes.push({lane,main,aux:aux.slice()});return true;},noteOn:(i,o,t)=>{notes.push({i,o,t});return{id:notes.length,noteOff(){}};}};
const live={createPlayer:async()=>player},source=create({library:{list:()=>[{id:'i1',revision:1,instrument:inst}]},live,model:{}}),main={name:'wave'},send1={name:'send1'},send2={name:'send2'};
source.configure({getContext:()=>ctx2,ensureReady:async()=>ctx2,getOutput:()=>main,
 prepareRoute:()=>({main,aux:[]}),acquire:()=>({release(){}})});
(async()=>{
 await source.select('wave','nodal:i1@1');
 assert(routes.length===1&&routes[0].lane==='wave');
 source.publishRoute('keyboard',main,[send1],ctx2);assert.equal(routes.length,2,'control activation is the one graph mutation');
 for(let i=0;i<20;i++)source.note('wave','nodal:i1@1',{frequency:220,gain:.3,output:main,auxTargets:[send1]},ctx2);
 assert.equal(notes.length,20);assert.equal(routes.length,2,'twenty audio attacks never revisit player.route');
 source.publishRoute('wave',main,[send1],ctx2);assert.equal(routes.length,2,'same route is idempotent');
 source.publishRoute('wave',main,[send1,send2],ctx2);assert.equal(routes.length,3,'FX topology changed on control');
 source.note('wave','nodal:i1@1',{frequency:330,output:main,auxTargets:[send1,send2]},ctx2);
 assert.equal(routes.length,3,'new targets are ready before the first attack');
 const special={name:'event-specific-target'};
 source.note('wave','nodal:i1@1',{frequency:440,output:main,auxTargets:[special]},ctx2);
 assert.equal(routes.length,4,'unprepared exceptional targets retain a safe compatibility route');
 source.publishRoute('wave',main,[send1,send2],ctx2);
 source.note('keyboard','nodal:i1@1',{frequency:440,output:main,auxTargets:[send1,send2]},ctx2);
 assert.equal(routes.at(-1).lane,'wave','keyboard shares the existing wave lane and never creates a third bus');
 source.dispose();console.log('PASS P3C FX control readiness, route invalidation, shared wave/keyboard lane, dynamic compatibility, no stable-note connect');
})().catch(e=>{console.error(e);process.exitCode=1});
