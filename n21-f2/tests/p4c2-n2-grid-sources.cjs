'use strict';
// Production grid, keyboard, cursor and pitch functions; scale catalog supplied
// as deterministic fixtures. No browser, JSX or AudioNode simulation is called audio testing.
const fs=require('node:fs'),assert=require('node:assert/strict'),read=p=>fs.readFileSync(p,'utf8');
function section(file,start,end){const s=read(file),a=s.indexOf(start),b=s.indexOf(end,a);assert(a>=0&&b>a);return s.slice(a,b);}
const scales={edo12:{period:2,cents:Array.from({length:12},(_,i)=>i*100)},edo31:{period:2,cents:Array.from({length:31},(_,i)=>i*1200/31)},edo72:{period:2,cents:Array.from({length:72},(_,i)=>i*1200/72)},bp:{period:3,cents:Array.from({length:13},(_,i)=>i*1200*Math.log2(3)/13)}};
const fixture={Kp:t=>scales[t]?.cents??[],AF:t=>scales[t]?.period??2,hc:()=>({family:'test'}),fc:[1,16/15,9/8,6/5,5/4,4/3,3/2,8/5,5/3,15/8,2].map(ratio=>({ratio,label:String(ratio)})),Up:1760,ir:777,Me:(x,a,b)=>Math.min(b,Math.max(a,x))};
const grid=section('src/audio/03_rfl_transport_legacy.js','const QSe=48','const xa=');
const keyboard=section('src/runtime/instrument/01_voice_gradients_and_effects.js','const sZ=64','const RP=');
const cursor='const '+section('src/runtime/01_instrument_state.js','tZ=3','const k5=');
const pitch=section('src/audio/01_voice_and_rfl_ownership.js','function DT(','function NT(');
const surface=read('src/nodal/12_surface_runtime.js').replace('const __XenNodalSurfaces=createNodalSurfaceRuntime({library:__XenNodalLibrary,live:__XenNodalLive,model:__XenNodalModel});','');
const api=new Function(...Object.keys(fixture),[grid,keyboard,cursor,pitch,surface].join('\n')+';return {$Se,Fx,uw,lZ,wF,Qa,Zs,nZ,zhe,surface:createNodalSurfaceRuntime};')(...Object.values(fixture));
let params={gridBase:1760,gridTuning:'edo31',manualGridMutedSteps:[],manualGridStepOffsets:[]},conversions=0,sourceReads=0;
const ctx={state:'running',currentTime:0},calls=[],instrument={};
const player={prepare:async()=>{},isPrepared:()=>true,prepareGridFrequencies:(inst,hzs)=>{calls.push({inst,hzs});return true;},prepareFrequencies:()=>true,pin(){},unpin(){},route(){},dispose(){},snapshot:()=>({disposed:false})};
const runtime=api.surface({library:{list:()=>[{id:'A',revision:1,instrument}]},live:{createPlayer:async()=>player},model:{}});
const canonical=()=>[params.gridBase,params.gridTuning,params.manualGridMutedSteps,params.manualGridStepOffsets];
runtime.configure({getContext:()=>ctx,ensureReady:async()=>ctx,getOutput:()=>({}),acquire:()=>null,
 readWaveGridParams:()=>params,readWaveGridLines:()=>{sourceReads++;return api.$Se(params);},readWaveGridFrequencies:()=>api.Fx(...canonical()),readKeyboardGridFrequencies:()=>api.uw(...canonical()),readWaveGridTopFrequency:()=>api.Qa(0),
 gridFrequencyToWaveBase:hz=>{conversions++;return api.Qa(api.Zs(hz));},resolveWaveFrequency:(baseFreq,isSector,octaveHeld)=>api.zhe({baseFreq,isSector,octaveHeld}).playbackFreq});
let checked=0;
function verify(){
 api.nZ(params.gridBase);runtime.warmWaveField(ctx);const got=new Set(calls.at(-1).hzs);
 // Simulate actual snaps (lZ), every keyboard index/window (wF), visible line
 // cursor commits and all four launch variants through the production resolver.
 const expectedYs=[...api.$Se(params).filter(l=>!l.manualMuted&&!l.modeMuted).map(l=>api.Zs(l.freq)),...api.Fx(...canonical()).map(hz=>api.lZ(api.Zs(hz),...canonical()))];
 const keys=api.uw(...canonical());for(let window=0;window<keys.length;window++)for(const index of [0,3,11]){const hz=api.wF(params.gridBase,params.gridTuning,window,index,params.manualGridMutedSteps,params.manualGridStepOffsets);if(hz!==null)expectedYs.push(api.Zs(hz));}
 for(const y of expectedYs)for(const isSector of [false,true])for(const octaveHeld of [false,true]){const hz=api.zhe({baseFreq:api.Qa(y),isSector,octaveHeld}).playbackFreq;assert(got.has(hz),'exact live Hz absent: '+hz+' / '+params.gridTuning);checked++;}
 const oldCalls=calls.length,oldConversions=conversions,oldReads=sourceReads;for(let i=0;i<100;i++)runtime.warmWaveField(ctx);assert.equal(calls.length,oldCalls,'unchanged raster does not submit');assert.equal(conversions,oldConversions,'cursor motion cannot rebuild the grid');assert.equal(sourceReads,oldReads,'unchanged frames skip even the source-list cache keys');
}
(async()=>{
 await runtime.select('keyboard','nodal:A@1'); // Works even with a Classic Wave selection.
 for(const tuning of ['edo12','edo31','edo72','bp','ji'])for(const base of [932.327,1760])for(const edited of [false,true]){
  params={gridBase:base,gridTuning:tuning,manualGridMutedSteps:edited?[1,4]:[],manualGridStepOffsets:edited?[0,.731,-.419,0,0,1.13]:[]};verify();
 }
 await runtime.select('wave','nodal:A@1');const last=calls.at(-1).hzs;assert(last.length>64);
 runtime.dispose();const previous=calls.length;runtime.warmWaveField(ctx);assert.equal(calls.length,previous);
 const shell=read('src/app/forge/01_room_shell.js');for(const callback of ['readWaveGridLines:()=>Xn()','readWaveGridFrequencies:()=>Fx(','readKeyboardGridFrequencies:()=>uw(','gridFrequencyToWaveBase:frequency=>Qa(Zs(frequency))'])assert(shell.includes(callback),'actual app must supply '+callback);
 console.log('PASS N2 production grid/Snap/Keyboard/resolver: '+checked+' exact variant hits, 20 tuning/edit cases, keyboard-only selection, stable cursor, disposal');
})().catch(e=>{runtime.dispose();console.error(e);process.exitCode=1});
