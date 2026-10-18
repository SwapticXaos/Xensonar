'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),read=p=>fs.readFileSync(p,'utf8');
function section(file,start,end){const s=read(file),a=s.indexOf(start),b=s.indexOf(end,a);assert(a>=0&&b>a);return s.slice(a,b);}
const scales={edo12:{period:2,cents:Array.from({length:12},(_,i)=>i*100)},edo31:{period:2,cents:Array.from({length:31},(_,i)=>i*1200/31)},bp:{period:3,cents:Array.from({length:13},(_,i)=>i*1200*Math.log2(3)/13)}};
const fixture={Kp:t=>scales[t]?.cents??[],AF:t=>scales[t]?.period??2,hc:()=>({family:'test'}),fc:[1,16/15,9/8,6/5,5/4,4/3,3/2,8/5,5/3,15/8,2].map(ratio=>({ratio,label:String(ratio)})),tj:Array.from({length:13},(_,i)=>Math.pow(3,i/13)),Up:1760,ir:777,Me:(x,a,b)=>Math.min(b,Math.max(a,x)),T2e:()=>false};
const code=[section('src/audio/03_rfl_transport_legacy.js','const QSe=48','const xa='),section('src/runtime/instrument/01_voice_gradients_and_effects.js','const sZ=64','const RP='),'const '+section('src/runtime/01_instrument_state.js','tZ=3','const k5='),section('src/audio/01_voice_and_rfl_ownership.js','function DT(','function jhe('),'const '+section('src/runtime/01_instrument_state.js','lw=e=>',',MF='),section('src/rhythm/03_live_drum_bodies.js','function D2e(','const _9=')].join('\n');
const surface=read('src/nodal/12_surface_runtime.js').replace('const __XenNodalSurfaces=createNodalSurfaceRuntime({library:__XenNodalLibrary,live:__XenNodalLive,model:__XenNodalModel});','');
const api=new Function(...Object.keys(fixture),code+'\n'+surface+';return {$Se,Fx,uw,Qa,Zs,nZ,zhe,NT,lw,D2e,surface:createNodalSurfaceRuntime};')(...Object.values(fixture));
const sameA={key:'A'},sameB={key:'A'},other={key:'B'},entries=[{id:'A',revision:1,instrument:sameA},{id:'Alias',revision:1,instrument:sameB},{id:'B',revision:1,instrument:other}];
let params={gridBase:1760,gridTuning:'edo31',manualGridMutedSteps:[],manualGridStepOffsets:[]},agents=api.lw('ji'),ctx={state:'running',currentTime:0},resolveCount=0,sourceReads=0;const calls=[],notes=[];
const player={prepare:async()=>{},isPrepared:()=>true,prepareGridFrequencies:(inst,hzs)=>{calls.push({inst,hzs});return true;},prepareFrequencies:()=>true,pin(){},unpin(){},route(){},dispose(){},snapshot:()=>({disposed:false}),noteOn:(inst,opts)=>{notes.push(opts);return{id:'n'+notes.length,noteOff(){}};}};
const runtime=api.surface({library:{list:()=>entries},live:{createPlayer:async()=>player},model:{semanticKey:inst=>inst.key}});
const canonical=()=>[params.gridBase,params.gridTuning,params.manualGridMutedSteps,params.manualGridStepOffsets];
const config={getContext:()=>ctx,ensureReady:async()=>ctx,getOutput:()=>({}),acquire:()=>null,readParticleGridAgents:()=>agents,
 readWaveGridParams:()=>params,readWaveGridLines:()=>{sourceReads++;return api.$Se(params);},readWaveGridFrequencies:()=>api.Fx(...canonical()),readKeyboardGridFrequencies:()=>api.uw(...canonical()),readWaveGridTopFrequency:()=>api.Qa(0),gridFrequencyToWaveBase:hz=>api.Qa(api.Zs(hz)),resolveWaveFrequency:(baseFreq,isSector,octaveHeld)=>api.zhe({baseFreq,isSector,octaveHeld}).playbackFreq,
 resolveParticleFrequency:(root,ratio)=>{resolveCount++;return api.NT({rootFreq:root,ratio,minHz:80,maxHz:2400}).playbackFreq;}};
runtime.configure(config);let hits=0,cases=0,boundedCases=0,particleSystem='ji';const coverage=[];
function verify(){
 api.nZ(params.gridBase);runtime.warmWaveField(ctx);const got=new Set(calls.at(-1).hzs),roots=[...new Set([...api.$Se(params).filter(l=>!l.manualMuted&&!l.modeMuted).map(l=>l.freq),...api.Fx(...canonical()),...api.uw(...canonical())].map(hz=>api.Qa(api.Zs(hz))))];
 const expected=new Set();for(const root of roots)for(let i=0;i<agents.length;i++)api.D2e({candidate:{agent:agents[i],agentIndex:i,targetFreq:root,waveGain:.7,frameNowMs:123,audioTimeSec:1,x:12,y:13},params:{particleVolume:.4,agentVolumes:[]},onParticleTone:t=>expected.add(t.playbackFreq)});
 if(expected.size>2048)boundedCases++;
 const admitted=new Set([...expected].slice(0,2048));for(const hz of admitted){assert(got.has(hz),'actual collision Hz absent: '+hz);hits++;}
 assert.deepEqual(got,admitted,'particle-only selection must prepare only the bounded exact collision set');
 assert.equal(runtime.snapshot().particleGridCoverage.total,expected.size,'report full coverage demand including omitted speculation');
 coverage.push({grid:params.gridTuning,base:params.gridBase,particleSystem,roots:roots.length,desired:expected.size,requested:admitted.size});
 const before=calls.length,oldResolve=resolveCount,oldReads=sourceReads;for(let i=0;i<100;i++){for(const a of agents){a.x=i;a.y=i+1;}runtime.warmWaveField(ctx);}assert.equal(calls.length,before);assert.equal(resolveCount,oldResolve,'motion does not rebuild Root×Ratio');assert.equal(sourceReads,oldReads);cases++;
}
(async()=>{
 await runtime.select('particle','nodal:A@1');assert(calls.length>0,'prepare before any ripple/collision');
 for(const grid of ['edo12','edo31','bp','ji'])for(const particle of ['12edo','bp','ji'])for(const edit of [false,true]){
  params={gridBase:edit?1318.137:1760,gridTuning:grid,manualGridMutedSteps:edit?[1,4]:[],manualGridStepOffsets:edit?[0,.731,-.419,0,0,1.13]:[]};particleSystem=particle;agents=api.lw(particle);verify();
 }
 const old=calls.length;agents[2].ratio=1.37191;runtime.warmWaveField(ctx);assert.equal(calls.length,old+1,'in-place ratio edit invalidates; position changes do not');
 const particleSet=new Set(calls.at(-1).hzs);await runtime.select('wave','nodal:Alias@1');assert(calls.at(-1).hzs.length>=particleSet.size);for(const hz of particleSet)assert(calls.at(-1).hzs.includes(hz));assert.equal(runtime.snapshot().gridPrograms.length,1,'semantic aliases share one program');
 const sameCalls=calls.length;for(let i=0;i<30;i++)runtime.warmWaveField(ctx);assert.equal(calls.length,sameCalls,'aliased slots cannot alternate incompatible desired sets');
 await runtime.select('particle','classic');assert(calls.at(-1).hzs.some(hz=>!particleSet.has(hz)),'remaining Wave owns its own set');assert.equal(runtime.snapshot().gridPrograms[0].particle,false);
 await runtime.select('particle','nodal:B@1');assert.equal(runtime.snapshot().gridPrograms.length,2,'different timbres own separate program requests');
 // Deliberately exceed the bank. This limits speculation only; note() accepts
 // the exact omitted Hz and still owns the ordinary live path.
 const originalGrid=config.readWaveGridLines;config.readWaveGridLines=()=>Array.from({length:900},(_,i)=>({freq:221.13+i*.71937}));config.readWaveGridParams=()=>null;config.readWaveGridFrequencies=()=>[];config.readKeyboardGridFrequencies=()=>[];agents=Array.from({length:32},(_,i)=>({ratio:1+i*.07137}));runtime.configure(config);runtime.warmWaveField(ctx);
 const particleRequest=calls.filter(c=>c.inst===other).at(-1);assert.equal(particleRequest.hzs.length,2048);assert(runtime.snapshot().gridPrograms.some(p=>p.limited));
 const omitted=1399.137;assert(!particleRequest.hzs.includes(omitted));assert(runtime.note('particle','nodal:B@1',{frequency:omitted,gain:.2,durationSec:.1},ctx));assert.equal(notes.at(-1).frequency,omitted);
 const oldPlayer=player;ctx={...ctx};runtime.configure(config);await runtime.select('particle','nodal:B@1');assert(runtime.selectionStatus('particle').contextReady,'context replacement prepares the new owner');assert.equal(runtime.snapshot().gridPrograms.length,1,'retired context programs cannot appear as current coverage');
 runtime.dispose();const stopped=calls.length;runtime.warmWaveField(ctx);assert.equal(calls.length,stopped);
 assert(read('src/app/forge/01_room_shell.js').includes('readParticleGridAgents:()=>xn.current.agents'));
 const report={cases,boundedCases,coverage,exactCollisionFrequencyHits:hits,source:'production D2e/NT, grid/Snap/Keyboard/cursor/lw; deterministic scale catalog fixtures',checks:['particle-only prewarm before first collision','alias timbre sharing','independent plans','ratio edit vs motion','deselection reconciliation','2048 bound with exact uncached notes','context replacement','disposal']};fs.writeFileSync('results/p4c2-n3-particle-grid.json',JSON.stringify(report,null,2)+'\n');console.log('PASS N3 particle Root×Ratio',report);
})().catch(e=>{runtime.dispose();console.error(e);process.exitCode=1});
