'use strict';
// Run the actual JSX component, its Keyboard callback, direct-key adapter,
// and its renderer selection. No simulated DOM or audio output is claimed.
const fs=require('node:fs'),assert=require('node:assert/strict');
const keys=fs.readFileSync('src/rhythm/04_workspace_and_transport.js','utf8');
const audio=fs.readFileSync('src/audio/05_live_voice_runtime.js','utf8');
let wave='clean_pluck',keyboard='clean_pluck',waveHold='clean_pluck',waveEnabled=true;
let config={enabled:false,engineAmount:0,unison:3,colorAmount:1,volume:1,detune:0,unisonSpread:0,filterFreqBase:1800,filterResonance:1,filterKeytrack:0,distortion:0,foldAmount:0,delayAmount:.2,colorSet:'default'};
const {performanceMenus,flatten}=require('./helpers/performance-menus.cjs');
const menus=performanceMenus({Hd:()=>config.enabled&&config.engineAmount>1e-4,Ew:()=>({...config}),dG:(_lane,patch)=>(config={...config,...patch})});
const props={nParamsUI:{keyboardHoldSoundPreset:keyboard},updateNParams:change=>{if(change.keyboardHoldSoundPreset!==undefined)keyboard=change.keyboardHoldSoundPreset;if(change.waveStarterHoldSoundPreset!==undefined)waveHold=change.waveStarterHoldSoundPreset;},waveSoundEnabled:waveEnabled,setWaveSoundEnabled:v=>waveEnabled=v,onWaveSoundPresetChange:v=>wave=v,activeOvertoneMixer:{}};
for(const k of ['dronePresets','particlePresets','waveSoundPresets','waveTimbreGradientPresets','waveVolumeGradientPresets','particleGradientPresets','waveOvertoneModes','waveOvertoneArpRates','waveOvertoneArpPatterns','droneJiOvertones','waveOvertoneMixPresets','waveDecayPresets','metaPresets','activeParticleNodes','agentKeys'])props[k]=[];
props.waveSoundPresets=[{value:'clean_pluck',label:'Clean Pluck'},{value:'dust_pulse',label:'Dust Pulse'}];
function select(label){return menus.menu({...props,nParamsUI:{...props.nParamsUI,keyboardHoldSoundPreset:keyboard},waveSoundPreset:wave},label==='Keyboard Sound'?'keyboard':'wave');}
const keyboardSelect=select('Keyboard Sound');
const options=flatten(keyboardSelect).filter(n=>n.type==='option').map(n=>n.props.value);
assert(options.includes('entrophon'),'Keyboard Sound must offer Entrophon as explicit source');
keyboardSelect.props.onChange({target:{value:'entrophon'}});
assert.equal(keyboard,'entrophon');assert.equal(select('Keyboard Sound').props.value,'entrophon');
assert.equal(select('Wave Starter Sound').props.value,'clean_pluck','Keyboard Entrophon must not change the Wave Starter selection');
assert.equal(wave,'clean_pluck');assert.equal(waveHold,'clean_pluck');assert.equal(config.enabled,false,'do not globally enable Entrophon for the Wave lane');
assert(config.engineAmount>1e-4,'selecting Entrophon explicitly must restore audible body amount');
const slice=(s,from,to)=>s.slice(s.indexOf(from),s.indexOf(to,s.indexOf(from)));
const handle=new Function('AJ','HJ','VJ','gPe','i1e',slice(keys,'function bPe(','function yPe(')+';return bPe;')((e)=>e.index,[],[],()=>({kind:'keyboard-wsb-position'}),()=>({kind:'pitch',targetY:.3,targetHz:220}));
const captured=[];
handle({event:{index:1,key:'w',code:'KeyW',repeat:false,timeStamp:1000},params:{},pitchLaneState:{},nowMs:1000,keyboardWindowOffset:0,preventDefault(){},ensureKeyboardPitchAudioReadyOnce:()=>true,shouldEmitKeyboardHoldWavePreview:()=>true,resolveKeyboardWaveStarterSoundPreset:()=>keyboard,recordAdaptiveAction(){},commitCursorY:(y,o)=>captured.push(o)});
assert.equal(captured.at(-1).waveStarterOptions.waveStarterPresetOverride,'entrophon');assert.equal(captured.at(-1).waveStarterOptions.entrophonWaveActive,true);
const adapt=new Function(slice(audio,'function Lxe(','const Vq')+';return Lxe;')();
const input=adapt(captured.at(-1).waveStarterOptions);
let backend=null;
const env={Hd:()=>false,__entCanPrepare:()=>true,$W:()=>false,AL:()=>{},xL:()=>({targets:[],prefixes:[]}),GW:()=>1,nq:p=>backend=p.entrophonWaveActive?'entrophon':'classic'};
const Ixe=new Function(...Object.keys(env),slice(audio,'function Ixe(','function Exe(')+';return Ixe;')(...Object.values(env));
function play(preset,options){backend=null;Ixe({runtime:{enabled:true},transientRuntime:{canAdmitVoice:()=>true},options,resolvedDirect:{selection:{kind:'preset',presetId:preset==='entrophon'?'tape_halo':preset},emitState:{playbackFreq:220,volume:.2,waveGradient:{}}},cursor:{},primeMyzelFromY(){},getWaveOutput:()=>({}),fxTargets:{},fxRoutes:{},nexusSound:{},beginTransientEvent:()=>({bodyScale:1})});return backend;}
assert.equal(play(keyboard,input),'entrophon','keyboard must reach the real Entrophon backend despite Wave being Classic');
select('Keyboard Sound').props.onChange({target:{value:'dust_pulse'}});
assert.equal(keyboard,'dust_pulse');assert.equal(play(keyboard,adapt({...input,waveStarterPresetOverride:keyboard,entrophonWaveActive:false})),'classic');
assert.equal(wave,'clean_pluck');assert.equal(config.enabled,false,'reverting Keyboard to Legacy must not change Wave or leave Entrophon globally enabled');
console.log('PASS independent Keyboard Entrophon → real audio dispatch → Classic, Wave unaffected');
