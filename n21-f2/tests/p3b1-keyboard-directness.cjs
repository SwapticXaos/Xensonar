'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
const recorder=read('src/audio/03_recorder.js'),keys=read('src/rhythm/04_workspace_and_transport.js');
const slice=(s,name,next)=>s.slice(s.indexOf('function '+name+'('),s.indexOf(next,s.indexOf('function '+name+'(')));
const hz=(base,tuning,offset,index)=>220*Math.pow(2,index/12),toY=Math.log2;
const lane=new Function('wF','Me','Zs',read('src/mix/05_grid_runtime.js')+'\n'+slice(recorder,'a1e','function s1e')+';return {create:o1e,resolve:i1e};')(hz,(x,a,b)=>Math.max(a,Math.min(b,x)),toY);
const handle=new Function('AJ','HJ','VJ','gPe','i1e',slice(keys,'bPe','function yPe')+';return bPe;')(e=>e.index,[],[],()=>({kind:'keyboard-wsb-position'}),lane.resolve);
const events=[],state=lane.create();
for(let index=0;index<9;index++){
 assert(handle({event:{index,key:'key'+index,code:'Key'+index,repeat:false,timeStamp:1000+35*index},params:{},pitchLaneState:state,nowMs:1000+35*index,keyboardWindowOffset:0,keyboardMirrorActive:false,preventDefault(){},ensureKeyboardPitchAudioReadyOnce:()=>true,shouldEmitKeyboardHoldWavePreview:()=>true,resolveKeyboardWaveStarterSoundPreset:()=> 'clean_pluck',recordAdaptiveAction(){},commitCursorY:(y,opts)=>events.push(opts)}));
}
assert.equal(events.filter(e=>e.previewWave).length,9,'every real new key in a fast run keeps its immediate attack; inferred gliss must not become silence');
assert(events.every(e=>e.waveStarterOptions.entrophonWaveActive===false),'explicit Classic keyboard selection carries its own backend identity');
const before=events.length;handle({event:{index:8,key:'key8',code:'Key8',repeat:true,timeStamp:1350},params:{},pitchLaneState:state,nowMs:1350,keyboardWindowOffset:0,preventDefault(){},ensureKeyboardPitchAudioReadyOnce:()=>true,recordAdaptiveAction(){},commitCursorY:(y,opts)=>events.push(opts)});assert.equal(events.length,before+1);assert.equal(events.at(-1).previewWave,false,'OS repeat stays with the existing hold owner');
// The actual direct-input adapter must retain the per-event backend choice.
const wave=read('src/audio/05_live_voice_runtime.js');
const adapt=new Function(slice(wave,'Lxe','const Vq')+';return Lxe;')();
const input=adapt(events[0].waveStarterOptions);assert.equal(input.entrophonWaveActive,false);assert.equal(input.keyboardGestureSource,'keyboard-direct');
let selectedBackend;
const env={Hd:()=>true,__entCanPrepare:()=>{throw Error('Classic must not consult Entrophon preparation');},$W:()=>false,AL:()=>{},xL:()=>({targets:[],prefixes:[]}),GW:()=>1,nq:p=>selectedBackend=p.entrophonWaveActive};
const Ixe=new Function(...Object.keys(env),slice(wave,'Ixe','function Exe')+';return Ixe;')(...Object.values(env));
Ixe({runtime:{enabled:true},transientRuntime:{canAdmitVoice:()=>true},options:input,resolvedDirect:{selection:{kind:'preset',presetId:'clean_pluck'},emitState:{playbackFreq:220,volume:.2,waveGradient:{}}},cursor:{},primeMyzelFromY(){},getWaveOutput:()=>({}),fxTargets:{},fxRoutes:{},nexusSound:{},beginTransientEvent:()=>({bodyScale:1})});assert.equal(selectedBackend,false,'actual direct renderer honors explicit Classic despite global Entrophon');
console.log('PASS every distinct keyboard attack remains immediate; OS repeat stays with Hold');
