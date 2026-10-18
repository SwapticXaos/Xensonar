'use strict';
// Diagnostic regression: stateful Classic → Entrophon → Classic changes.
// This deliberately tests routing only; it cannot prove audible attack timing or Worklet lease recovery.
const fs=require('node:fs'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
const slice=(s,name,next)=>s.slice(s.indexOf('function '+name+'('),s.indexOf(next,s.indexOf('function '+name+'(')));
const ctl=read('src/runtime/instrument/10_entrophon_and_voice_control.js');
let config={enabled:false,engineAmount:1},wave='clean_pluck',keyboard='clean_pluck',hold='clean_pluck';
const choose=new Function('Ew','dG',ctl.slice(ctl.indexOf('function __xenChooseWaveStarterSource('),ctl.indexOf('// Display the branch'))+';return __xenChooseWaveStarterSource;')(
 ()=>({...config}),(_lane,patch)=>{config={...config,...patch};});
const selectWave=s=>choose(s,{selectPreset:v=>{wave=v;},setNParams:v=>{hold=v.waveStarterHoldSoundPreset;},setWaveEnabled:()=>{}});
const Hd=()=>!!(config.enabled&&config.engineAmount>1e-4);
const source=read('src/rhythm/04_workspace_and_transport.js');
const recorder=read('src/audio/03_recorder.js');
const pitch=new Function('wF','Me','Zs',slice(recorder,'a1e','function s1e')+';return {create:o1e,resolve:i1e};')((...a)=>220,(x,a,b)=>Math.max(a,Math.min(b,x)),Math.log2);
const press=new Function('AJ','HJ','VJ','gPe','i1e',slice(source,'bPe','function yPe')+';return bPe;')(e=>e.index,[],[],()=>({kind:'keyboard-wsb-position'}),pitch.resolve);
const live=read('src/audio/05_live_voice_runtime.js');
const adapt=new Function(slice(live,'Lxe','const Vq')+';return Lxe;')();
const rendered=[];
const ingress=new Function('Hd','__entCanPrepare','$W','AL','xL','GW','nq',slice(live,'Ixe','function Exe')+';return Ixe;')(
 Hd,()=>true,()=>false,()=>{},()=>({targets:[],prefixes:[]}),()=>1,e=>rendered.push({preset:e.preset,backend:e.entrophonWaveActive?'entrophon':'classic'}));
const backend=read('src/audio/entrophon/02_worklet_and_voice_backend.js');
let classic=0,ent=0;
const dispatch=new Function('Hd','__wave39Owned','__wave39Scheduled','__entResult','d9','$ie',slice(backend,'ewe','function twe')+slice(backend,'twe','class ML')+';return twe;')(
 Hd,()=>true,()=>{classic++;return true;},(_t,why)=>({why}),()=>{ent++;return -1;},()=>10);
const ctx={state:'running',currentTime:1};
const send=(preset,options)=>{
 const adapted=adapt(options);ingress({runtime:{enabled:true},transientRuntime:{canAdmitVoice:()=>true},options:adapted,
 resolvedDirect:{selection:{kind:'preset',presetId:preset},emitState:{playbackFreq:220,volume:.2,waveGradient:{}}},cursor:{},primeMyzelFromY(){},
 getWaveOutput:()=>({}),fxTargets:{},fxRoutes:{},nexusSound:{},beginTransientEvent:()=>({bodyScale:1})});
 const backendFlag=rendered.at(-1).backend==='entrophon';
 const result=dispatch({ctx}, {freq:220,dur:.2,offset:0,volume:.2,type:'sine',options:{source:'wave',entrophonWaveActive:backendFlag,preset}});
 return {rendered:rendered.at(-1),result};
};
const state=pitch.create();let serial=0;
const keyboardAttack=()=>{
 const events=[];serial++;
 press({event:{index:serial%9,key:'key'+serial,code:'Key'+serial,repeat:false,timeStamp:1000+serial*60},params:{},pitchLaneState:state,nowMs:1000+serial*60,
 keyboardWindowOffset:0,keyboardMirrorActive:false,preventDefault(){},ensureKeyboardPitchAudioReadyOnce:()=>true,shouldEmitKeyboardHoldWavePreview:()=>true,
 resolveKeyboardWaveStarterSoundPreset:()=>keyboard,recordAdaptiveAction(){},commitCursorY:(_y,opts)=>events.push(opts)});
 assert.equal(events.length,1);assert.equal(events[0].previewWave,true);
 return send(keyboard,events[0].waveStarterOptions);
};
const shots=[];
for(let k=0;k<12;k++){
 selectWave('clean_pluck');keyboard='clean_pluck';shots.push({phase:'cold-legacy',...keyboardAttack()});
 selectWave('entrophon');assert(Hd());assert.equal(hold,'entrophon');
 shots.push({phase:'ent-wave-with-legacy-keyboard',...keyboardAttack()});
 shots.push({phase:'ent-wave',...send('clean_pluck',{entrophonWaveActive:true,requestedAtMs:1000+serial*60})});
 selectWave('clean_pluck');assert.equal(Hd(),false);assert.equal(hold,'clean_pluck');
 shots.push({phase:'returned-legacy',...keyboardAttack()});
}
for(const event of shots){assert.equal(event.rendered.backend,event.phase==='ent-wave'?'entrophon':'classic');}
assert.equal(classic,36);assert.equal(ent,12);
fs.mkdirSync('results',{recursive:true});
fs.writeFileSync('results/p3b2-transition-route-audit.json',JSON.stringify({cycles:12,events:shots.length,classic,ent,pass:true,scope:'static VM routing; NOT a physical audio path or performance measurement'},null,2)+'\n');
console.log('PASS 12 simulated source-selector cycles using production helpers: Legacy keyboard routes to Classic before, during and after Entrophon Wave; Entrophon owns only its explicit events');
