'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8'),config=read('src/runtime/instrument/10_entrophon_and_voice_control.js'),app=read('src/01_app_runtime.js'),live=read('src/audio/05_live_voice_runtime.js'),backend=read('src/audio/entrophon/02_worklet_and_voice_backend.js');
const storage=new Map(),plain=x=>JSON.parse(JSON.stringify(x));
const ctx=vm.createContext({Math,Map,Set,WeakMap,WeakSet,AbortController,console,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},__XenNodalModel:{normalize:x=>x,serialize:JSON.stringify},Tp:id=>id.startsWith('import:'),qS:()=>4,sR:()=>[{hz:220}],WS:x=>x,ll:()=>[],QS:(_,x)=>x,am:()=> 'octave',LF:()=>null});
vm.runInContext('const __entConfigCache=new WeakMap();'+app.slice(app.indexOf('function __entPreparedConfig('),app.indexOf('// F3_41 visual donor workbench'))+config.slice(0,config.indexOf('const Fb='))+read('src/instruments/01_entrophon_definition.js')+read('src/nodal/03_library.js')+read('src/instruments/02_entrophon_library.js')+read('src/instruments/05_entrophon_integration.js')+read('src/nodal/06_melodic_bridge.js'),ctx);
const boot=read('src/app/forge/02_boot_and_workspace_tools.js');
vm.runInContext(boot.slice(boot.indexOf('function Lp('),boot.indexOf('function Xa('))+boot.slice(boot.indexOf('function uR('),boot.indexOf('function Bo('))+';this.api={save:n=>__XenEntrophonLibrary.save(captureEntrophonInstrument(n)),clone:$n,menu:nodalInstrumentMenu,remove:__XenEntrophonLibrary.remove,find:entrophonFindInstrument};',ctx);
const entry=ctx.api.save('Integration Purple'),id='entrophon:'+entry.id+'@'+entry.revision;
const composer={tracks:[{id:'bass',label:'Instrument 1',enabled:true,instrumentPreset:id}],notes:[],activeTrackIds:['bass'],bars:4,stepsPerBar:16,pitchLines:[{hz:220}],pitchSteps:[{hz:220}],selectedTrackId:'bass'};
composer.entrophonInstruments={'entrophon:unused@1':entry.instrument};
const cloned=ctx.api.clone(composer);assert(!cloned.entrophonInstruments['entrophon:unused@1'],'unused replaced definitions are pruned');assert.equal(cloned.tracks[0].instrumentPreset,id);assert.equal(cloned.entrophonInstruments[id].name,'Integration Purple');assert(ctx.api.menu(cloned).some(g=>g.id==='entrophon'));
ctx.api.remove(entry.id,entry.revision);const restored=ctx.api.clone(plain(cloned));assert.deepEqual(plain(restored.entrophonInstruments[id]),plain(cloned.entrophonInstruments[id]));assert(ctx.api.find(id,restored));assert(ctx.api.menu(restored).some(g=>g.id==='entrophon'&&g.options.some(o=>o.id===id&&o.label.includes('in project'))));
const liveEntry=ctx.api.save('Live Purple'),liveId='entrophon:'+liveEntry.id+'@'+liveEntry.revision;
vm.runInContext('const S8="tape_halo",rAe=new Set();'+live.slice(live.indexOf('function $w('),live.indexOf('function GW(')),ctx);
const dispatches=[];Object.assign(ctx,{$W:()=>false,__entCanPrepare:()=>true,__XenP3CWaveFXFor:()=>({targets:[],prefixes:[]}),pL:()=>({playbackFreq:221.731,volume:.3,microVoiceDemandMul:1,waveGradient:{amount:0}}),GW:()=>1,CAe:()=>0,kxe:()=>false,fr:()=>{},VW:params=>{dispatches.push(params);return true;},nq:params=>params.callbacks.playGradientTone({toneFreq:221.731,delay:0,duration:.2,waveform:'sine',gain:.3,resonance:.7,cutoffHz:2400,prominence:1})});
vm.runInContext(live.slice(live.indexOf('function Ixe('),live.indexOf('function Fxe('))+';this.dispatch={Ixe,Exe};',ctx);
const event={runtime:{enabled:true,preset:liveId,volume:.3},options:{waveStarterPresetOverride:liveId,keyboardGestureSource:'keyboard-direct'},transientRuntime:{canAdmitVoice:()=>true},cursor:{cursorX:0,cursorY:0},nexusSound:{},getWaveOutput:()=>({}),primeMyzelFromY:()=>{},fxTargets:{},beginTransientEvent:()=>({})};
ctx.dispatch.Ixe(event);ctx.dispatch.Exe(event);assert.equal(dispatches.length,2);assert(dispatches.every(d=>d.entrophonWaveActive&&d.entrophonDefinition.name==='Live Purple'));
assert(live.includes('entrophonDefinition:e.entrophonDefinition'),'VW forwards actual recipe to scheduled tone');
const particleCalls=[];Object.assign(ctx,{gwe:()=>{},vwe:()=>({allowed:true,volume:.2}),Cwe:()=>[],__entWasAdmitted:x=>!!x});
vm.runInContext(backend.slice(backend.indexOf('function qwe('),backend.indexOf('function Qwe('))+';this.particle=qwe;',ctx);
const result=ctx.particle({ctx:{state:'running',currentTime:1},particlePreset:liveId,playScheduledTone:(...args)=>{particleCalls.push(args);return true;}},{freq:221.731,volume:.2});assert(result.admitted);assert.equal(particleCalls[0][8].entrophonDefinition.name,'Live Purple');assert.equal(particleCalls[0][8].source,'particle');
vm.runInContext('this.controller={start:beginEntrophonMelodicPreparation,stop:cancelEntrophonMelodicPreparation};',ctx);const signal=ctx.controller.start();ctx.controller.stop();assert(signal.aborted);
const records=[];
Object.assign(ctx,{XMe:()=>{},Hd:()=>false,Jp:()=>true,h9:.02,$ie:()=>.02,g9:()=>({now:1,ticket:null,overloadSoftening:1,gainScale:1,auxTargets:[]}),Zxe:()=>({activeEntrophonWaveVoiceCost:0}),Jq:()=>0,oMe:()=>0,sMe:()=>false,__ent29Gradient:x=>x,cMe:k=>({baseFreqs:k.oscillatorFreqs,colorFreqs:k.colorFreqs,delayScale:1,pressure:0}),lMe:()=>1,f9:()=>.02,uMe:()=>1,$Me:()=>{throw Error('Must not use legacy synthesis')},__entResult:(t,result)=>result==='admitted'});
// N21 also tracks finite live Wave voices; include the real control handle.
Object.assign(ctx,{rg:new WeakMap()});
vm.runInContext(config.slice(config.indexOf('function Xx('),config.indexOf('function mT(')),ctx);
vm.runInContext(app.slice(app.indexOf('function __ent29HeldHandle('),app.indexOf('// F3.28: processing ownership')),ctx);
vm.runInContext(backend.slice(backend.indexOf('function twe('),backend.indexOf('class ML'))+';this.actualTone=twe;',ctx);
const definition=ctx.api.find(liveId);
for(const source of ['wave','particle']){
 const accepted=ctx.actualTone({ctx:{state:'running',sampleRate:48000,currentTime:1},activeScheduledTonesRef:{current:[]},transientRuntime:{releaseVoice(){}},recordCount:()=>{},recordAdaptiveAction:()=>{},submitEntrophonC11:(audio,record)=>{records.push(record);return{owned:true,submitted:true,token:1};}}, {freq:221.731,offset:0,dur:.3,type:'sine',volume:.2,options:{source,entrophonDefinition:definition,entrophonWaveActive:false}});
 assert(accepted);assert.equal(records.at(-1).baseFreqs.length,definition.config.unison);assert.equal(records.at(-1).waveform,{sine:0,triangle:1,sawtooth:2,square:3}[definition.config.waveform]);
}
console.log('PASS P4B integration: actual composer snapshot/reload, project-only sound after deletion, category, Wave/Keyboard+Particle recipe dispatch, stop cancellation');
