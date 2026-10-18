'use strict';
// Render the actual compiled JSX component as an element tree; drive its real
// onChange callback, configuration, live selection parser and dispatch branch.
// This is not a browser layout or physical audio test.
const fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('src/runtime/instrument/10_entrophon_and_voice_control.js','utf8');
const helper=source.slice(source.indexOf('function __xenChooseWaveStarterSource('));
let active='nodal:A@1',waveEnabled=true,config={enabled:false,engineAmount:.76,filterFreqBase:1900},hold=active,revision=0;
const listeners=new Set();
const P={useState:v=>[v,()=>revision++],useEffect:fn=>fn()};
const u={Fragment:'fragment',jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
const stub=()=>null,Hd=()=>config.enabled&&config.engineAmount>1e-4;
const fse=new Function('P','u','Kie','Hd','Ew','dG','lse','R4','hse',helper+';return fse;')(P,u,fn=>{listeners.add(fn);return()=>listeners.delete(fn);},Hd,()=>({...config}),(_lane,patch)=>{config={...config,...patch};for(const fn of listeners)fn();},stub,stub,stub);
const props={nParamsUI:{},updateNParams:p=>{if(p.waveStarterHoldSoundPreset)hold=p.waveStarterHoldSoundPreset;},waveSoundEnabled:true,setWaveSoundEnabled:v=>waveEnabled=v,onWaveSoundPresetChange:v=>active=v,activeOvertoneMixer:{}};
for(const key of ['dronePresets','particlePresets','waveSoundPresets','waveTimbreGradientPresets','waveVolumeGradientPresets','particleGradientPresets','waveOvertoneModes','waveOvertoneArpRates','waveOvertoneArpPatterns','droneJiOvertones','waveOvertoneMixPresets','waveDecayPresets','metaPresets','activeParticleNodes','agentKeys'])props[key]=[];
props.waveSoundPresets=[{value:'tape_halo',label:'Tape Halo'},{value:'nodal:A@1',label:'Nodal A'},{value:'sample:x',label:'Sample X',groupId:'samples'}];
function flatten(node){if(!node||typeof node!=='object')return[];return[node,...[node.props?.children].flat(Infinity).flatMap(flatten)];}
function render(){const tree=fse({...props,waveSoundPreset:active});const group=flatten(tree).find(n=>n.type==='div'&&flatten(n).some(x=>x.type==='label'&&x.props.children==='Wave Starter Sound')&&flatten(n).filter(x=>x.type==='select').length===1);assert(group);return flatten(group).find(n=>n.type==='select');}
const audio=fs.readFileSync('src/audio/05_live_voice_runtime.js','utf8');
const parse=new Function('rAe','LF','S8',audio.slice(audio.indexOf('function $w('),audio.indexOf('function GW('))+';return $w;')(new Set(['tape_halo']),()=>null,'tape_halo');
let route;
const Ixe=new Function('$w','$W','Hd','__entCanPrepare','AL','xL','XW','__XenNodalSurfaces','GW','nq',audio.slice(audio.indexOf('function Ixe('),audio.indexOf('function Exe('))+';return Ixe;')(parse,n=>n.kind==='sample',Hd,()=>true,()=>{},()=>({targets:[],prefixes:[]}),()=>route='sample',{note(){route='nodal';}},()=>1,p=>route=p.entrophonWaveActive?'entrophon':'classic');
function sound(preset){route=null;Ixe({runtime:{enabled:true,preset,volume:.2},transientRuntime:{canAdmitVoice:()=>true},resolvedDirect:{selection:parse(preset),emitState:{playbackFreq:220,volume:.2,waveGradient:{}}},cursor:{},primeMyzelFromY(){},ctx:{},getWaveOutput:()=>({}),fxTargets:{},fxRoutes:{},nexusSound:{},beginTransientEvent:()=>({bodyScale:1})});return route;}
for(const initial of ['nodal:A@1','sample:x','tape_halo']){
 active=initial;hold=initial;config.enabled=false;config.engineAmount=.76;
 let select=render();assert.equal(select.props.value,initial);assert.equal(sound(active),initial.startsWith('nodal:')?'nodal':initial.startsWith('sample:')?'sample':'classic');
 select.props.onChange({target:{value:'entrophon'}});select=render();assert.equal(select.props.value,'entrophon');
 assert.equal(sound(active),'entrophon','Entrophon menu choice must reach Entrophon, including after Nodal/Sample');
 assert.equal(sound(hold),'entrophon','Enter-Hold must use the same selected source');assert.equal(waveEnabled,true);assert.equal(config.engineAmount,.76);assert.equal(config.filterFreqBase,1900);
 select.props.onChange({target:{value:initial}});assert.equal(render().props.value,initial);assert.equal(hold,initial);assert.equal(config.enabled,false);
}
active='nodal:A@1';config.enabled=true;assert.equal(render().props.value,'nodal:A@1','UI must reflect Nodal priority even if external Entrophon config is enabled');assert.equal(sound(active),'nodal');
active='entrophon';config.enabled=false;assert.equal(render().props.value,'tape_halo');assert.equal(sound(active),'classic','disabling Entrophon externally displays the actual Classic fallback');
assert(revision>0,'external config changes notify the menu');
// The deferred/gesture entry must also honor Entrophon before the older
// Classic synth/sample Worklet bridge can claim a hold event.
const bridgeEnv={Ixe,fr:()=>{},$w:parse,pL:()=>({playbackFreq:220,volume:.2,microVoiceDemandMul:1,waveGradient:{}}),kxe:()=>true,OAe:()=> 'hold-gesture-loop',_Ae:()=>({kind:'synth'}),G1e:()=>{},xu:()=>({}),zAe:()=>{},JAe:()=>({}),b1e:()=>{},pxe:()=>null,hxe:()=>{},Cxe:()=>{route='classic-worklet';return{handledByWorklet:true};},__entCanPrepare:()=>true,AL:()=>{},xL:()=>({targets:[],prefixes:[]}),$W:n=>n.kind==='sample',XW:()=>route='sample',__XenNodalSurfaces:{note:()=>route='nodal'},GW:()=>1,CAe:()=>0,Hd,nq:p=>route=p.entrophonWaveActive?'entrophon':'classic'};
const Exe=new Function(...Object.keys(bridgeEnv),audio.slice(audio.indexOf('function Exe('),audio.indexOf('function Fxe('))+';return Exe;')(...Object.values(bridgeEnv));
config.enabled=true;route=null;Exe({runtime:{enabled:true,preset:'entrophon',volume:.2},options:{waveStarterGestureLoopWorkletBridge:true},cursor:{},primeMyzelFromY(){},ctx:{},getWaveOutput:()=>({}),fxTargets:{},fxRoutes:{},nexusSound:{},beginTransientEvent:()=>({bodyScale:1})});assert.equal(route,'entrophon','gesture/hold bridge must not substitute Classic for selected Entrophon');
console.log('PASS actual Wave menu callback → selection → renderer and Enter-Hold agree for Nodal/Sample/Classic ↔ Entrophon');
