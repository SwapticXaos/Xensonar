'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),crypto=require('node:crypto');
const {read,declaration}=require('./p37_test_tools.cjs');
const gridFile='src/app/forge/02_boot_and_workspace_tools.js',inputFile='src/forge/editor/02_tools_and_audio_inputs.js',routeFile='src/forge/editor/05_machine_and_carrier_projection.js',hearingFile='src/forge_and_melodic/10_audition_and_persistence.js';
const listeners=new Set(),events=[],renders=[];let mainCancelled=0,privateCancelled=0,wait=null;
const instrument=Object.freeze({}),fractalia=Object.freeze({}),subscribe=fn=>(listeners.add(fn),()=>listeners.delete(fn));
let state={carrierIntegralSelection:{machineId:'raw-darkpsy-oscillator',source:'user'},carrierIntegralSynthLab:{readerSettings:{}},carrierIntegralHarmonicXplore:{},synthMode:'additive',waveformMix:{sine:1},materialExport:{bpm:120,beatsPerBar:4,bars:4},sourceAsset:{keep:true},spectralData:{keep:true}};
const buf=()=>({length:100,numberOfChannels:1,sampleRate:48000,duration:.01,getChannelData:()=>new Float32Array(100).fill(.1)});
const ctx={sampleRate:48000,currentTime:0,destination:{},resume:()=>Promise.resolve(),createGain:()=>({gain:{value:1,setTargetAtTime(){}},connect(){},disconnect(){}}),createBufferSource:()=>({connect(){},disconnect(){},start(){events.push('start')},stop(){events.push('stop')}})};
const render=async(type,args)=>{renders.push({type,args});args.check?.();if(wait)await wait.promise;args.check?.();args.onProgress?.(1);return buf();};
const raw={cancel(){mainCancelled++},render:args=>render('raw-main',args),create:()=>({cancel(){privateCancelled++},render:args=>render('raw-private',args)})};
const sandbox={console,Float32Array,Float64Array,Uint32Array,Uint8Array,Math,Object,Array,Map,Set,WeakMap,Number,DOMException,AbortController,Promise,
 pe:{getState:()=>state,subscribe},xt:{getContext:()=>ctx},__f333Epoch:0,__PureDieter:raw,__Emilia:{snapshot:()=>instrument,semanticKey:()=>'',subscribe,renderCarrier:args=>render('emilia',args)},__ForgeVoices:{is:()=>false,engineOf:()=>null,snapshot:()=>Object.freeze({}),semanticKey:()=>'',subscribe},__Fractalia:{snapshot:()=>fractalia,semanticKey:()=>'',subscribe,renderCarrier:args=>render('fractalia',args)},
 Vt:{getSnapshot:()=>({selected:false}),subscribe},__F341Workbench:{getConfig:()=>({}),fingerprint:()=>'',subscribe},__F352Session:{export:()=>({}),subscribe},__F3564Master:{subscribe,getSnapshot:()=>({volume:100})},__f3565PitchSemis:()=>0,__f3565PitchRatio:()=>1,__f3564SafeGain:()=>1,__f333AudiblePCM:()=>true,__f333Route:()=> 'hearing',Ti:JSON.stringify,Zp:(bars,bpm,bpb)=>bars*bpb*60/bpm,
 __forgeDetuneRenderGrid:g=>g,mo:()=>({}),G4e:e=>e.valueSource,W4e:e=>e.sourceSelection,H4e:()=>'',ZS:()=>({}),QQ:()=>'',Rg:e=>e,oi:e=>e,NM:()=>({}),$U:()=>'',z4e:6,y_e:6,LR:x=>x,JU:()=>220,DR:()=>({rootFollowBuild:{summary:{eligible:true,baseHz:220}}}),AK:x=>x,
 vK:async args=>({buffer:await render('polytrace-'+args.timbre,args)}),DB:async args=>({buffer:await render('spectral',args)}),BR:async args=>({buffer:await render('hx',args)}),__f3565PitchGrid:g=>g,fractaliaDonorSnapshot:()=>({key:'none'})};
vm.createContext(sandbox);
let code=declaration(gridFile,'ph','class')+'\nconst _M=512,zM=2048;\n';
for(const n of ['N4e','O4e','_4e','TR','j4e','IB'])code+=declaration(inputFile,n)+'\n';
for(const n of ['A_e','OB','xK'])code+=declaration(routeFile,n)+'\n';
code+=declaration('src/app/forge/07_preview_cache_and_controls.js','ER')+'\n'+declaration(hearingFile,'__f333HearingCacheKey')+'\n'+declaration(hearingFile,'__f333SynthesizeHearing');
vm.runInContext(code+'\n'+read('src/forge/stamps/02_atlas_audition.js'),sandbox);
const api=vm.runInContext('__XenStampFigureAudition',sandbox),TR=vm.runInContext('TR',sandbox);
const preset={id:'fixture',name:'Fixture',stamp:{width:256,height:256,data:new Float32Array(65536),grainData:new Float32Array(65536).fill(.25)}};
for(let x=0;x<256;x++)preset.stamp.data[192*256+x]=x<96?.8:0;
const original=crypto.createHash('sha256').update(preset.stamp.data).digest('hex');
(async()=>{
 const mini=api.miniature(preset.stamp);assert.equal(mini.width,128);assert.equal(mini.height,128);assert(mini.get(0,96)>.5);assert.equal(mini.getGrain(0,96),.25);assert.equal(mini.get(90,96),0);
 const req=api.requestFor(preset,state).request,reconstructed=TR(req.snapshot);assert.equal(reconstructed.width,128);assert.equal(reconstructed.height,128);assert.equal(reconstructed.data.length,16384);assert.deepEqual(Array.from(reconstructed.grainData),Array.from(mini.grainData));
 const legacy=TR({spectralSnapshot:new Float32Array(2048*512*2)});assert.equal(legacy.width,2048);assert.equal(legacy.height,512);
 const player=api.create(),mainDrawing=state.spectralData,mainSource=state.sourceAsset;
 const machines={'raw-darkpsy-oscillator':'raw-private','harmonic-xplore-direct-carrier':'hx','spektral-synthese-body':'spectral','branch-a-line-traffic':'polytrace-fm','branch-b573-synth-window':'polytrace-acid','branch-c-interval-body':'polytrace-vocal','emilia-nodal-carrier':'emilia','fractalia-self-carrier':'fractalia'};
 for(const [machine,type]of Object.entries(machines)){
  state={...state,carrierIntegralSelection:{...state.carrierIntegralSelection,machineId:machine}};for(const fn of [...listeners])fn();
  assert(await player.play(preset),machine);assert.equal(renders.at(-1).type,type,machine);
  const args=renders.at(-1).args;assert(args.durationSec<=2.15||args.context?.durationSec<=2.15);assert.equal(state.spectralData,mainDrawing);assert.equal(state.sourceAsset,mainSource);
 }
 const count=renders.length;assert(await player.play(preset));assert.equal(renders.length,count);assert(player.diagnostics().cacheBytes<=4*1024*1024);assert(player.diagnostics().cacheEntries<=6);
 state={...state,carrierIntegralSelection:{machineId:'raw-darkpsy-oscillator',source:'user'}};wait={};wait.promise=new Promise(resolve=>wait.resolve=resolve);
 const old=player.play(preset);await new Promise(r=>setImmediate(r));const before=events.filter(x=>x==='start').length;
 const newer=player.play({...preset,id:'second',stamp:{...preset.stamp,data:preset.stamp.data.slice()}});wait.resolve();wait=null;
 assert.equal(await old,false);assert.equal(await newer,true);assert.equal(events.filter(x=>x==='start').length,before+1);
 const preChange=events.filter(x=>x==='stop').length;state={...state,synthMode:'ifft'};for(const fn of [...listeners])fn();assert(events.filter(x=>x==='stop').length>preChange);

 // Explicit Donor intent must supersede the stale carrier machine. Preparation
 // resolves pending -> plain donor; a second click uses that exact route/cache.
 let donor={selected:false,source:{fileName:'Donor'},model:{renderMethod:'spectral'},sourceRevision:1};
 sandbox.Vt.getSnapshot=()=>donor;sandbox.Vt.selectDonor=()=>{donor={...donor,selected:true};return true;};
 sandbox.__f3562EnsureDonor=async()=>{};sandbox.__F353SourceIdentity={key:()=> 'donor-source'};
 sandbox.__f333Route=()=>donor.selected?'donor':'donor-pending';
 let donorRenders=0;sandbox.xt.renderDonorBodyToBuffer=async()=>{donorRenders++;return buf();};
 assert(await player.play(preset));assert.equal(donorRenders,1,'pending intent resolves to plain donor, not hybrid');
 assert(await player.play(preset));assert.equal(donorRenders,1,'ready donor cache hit');
 const beforeDonor=events.filter(x=>x==='stop').length;donor={...donor,model:{renderMethod:'other'}};
 for(const fn of [...listeners])fn();assert(events.filter(x=>x==='stop').length>beforeDonor,'donor model invalidates cached playback');
 assert(await player.play(preset));assert.equal(donorRenders,2,'changed model gets a new cache key');
 assert.equal(mainCancelled,0);assert(privateCancelled>0);player.dispose();assert.equal(listeners.size,0);assert.equal(player.diagnostics().cacheBytes,0);assert.equal(crypto.createHash('sha256').update(preset.stamp.data).digest('hex'),original);
 const polyEnv={LB:()=>({}),__forgePolytraceCooperative:async args=>({buffer:args.spectralData}),
  FE:()=>{throw Error('transient must not build full cache key')},nv:()=>{throw Error('transient full cache')},rv:()=>{throw Error('transient lineage')}};
 vm.createContext(polyEnv);vm.runInContext(declaration(routeFile,'vK'),polyEnv);
 const polyArgs={request:{snapshot:{},machineId:'branch-b573-synth-window'},context:{durationSec:1,previewDurationSec:1,loopPreview:false,synthLab:{readerSettings:{}}},spectralData:mini,transient:true};
 const transient=await polyEnv.vK(polyArgs);assert.equal(transient.buffer,mini);assert.equal(transient.cacheKey,null);
 polyEnv.FE=()=>1;polyEnv.nv=()=> 'full-key';polyEnv.rv=()=> 'lineage';polyEnv.Ti=JSON.stringify;polyEnv.xR=()=>({});polyEnv.RB=async args=>({cacheHit:false,buffer:await args.renderFull()});
 const normal=await polyEnv.vK({...polyArgs,transient:false});assert.equal(normal.buffer,mini);assert.equal(normal.cacheKey,'full-key');
 console.log('P37 FIGURE PASS: actual snapshot reconstruction, 8 shared dispatch routes, duration, amplitude/grain, no project mutation, bounded cache, stale jobs, worker ownership, disposal');
})().catch(e=>{console.error(e);process.exitCode=1});
