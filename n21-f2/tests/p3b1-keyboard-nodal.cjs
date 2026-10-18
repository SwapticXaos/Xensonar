'use strict';
// Actual UI callback, selection effect, live input adapter, player and DSP.
// AudioNode wiring/message ports and JSX rendering are simulated.
const fs=require('node:fs'),assert=require('node:assert/strict'),read=p=>fs.readFileSync(p,'utf8');
let frame=48000,node,api,constructors=0;
class AudioNode{
 constructor(ctx,name,options){node=this;constructors++;this.sent=[];let Processor;const host=this;
  class Base{constructor(){this.port={postMessage:data=>queueMicrotask(()=>host.port.onmessage?.({data}))};}}
  api.factory(api.kernel,(_,C)=>Processor=C,Base,48000,()=>frame);this.processor=new Processor({processorOptions:options.processorOptions});
  this.port={onmessage:null,postMessage:m=>{this.sent.push(m);queueMicrotask(()=>this.processor.port.onmessage({data:m}));},close(){this.onmessage=null;}};
 }connect(){}disconnect(){}
}
const src=read('src/instruments/07_pitch_preparation.js')+'\n'+['01_instrument_model','02_synthesis_kernel','07_sound_designer','04_audio_runtime','12_surface_runtime'].map(n=>read('src/nodal/'+n+'.js')).join('\n').replace('const __XenNodalSurfaces=createNodalSurfaceRuntime({library:__XenNodalLibrary,live:__XenNodalLive,model:__XenNodalModel});','');
api=new Function('jF','AudioWorkletNode',src+';return {model:__XenNodalModel,kernel:createNodalSynthesisKernel,live:__XenNodalLive,surface:createNodalSurfaceRuntime,factory:nodalWorkletProcessorFactory,starter:nodalOpenStarter};')(async()=>{},AudioNode);
const ctx={state:'running',sampleRate:48000,audioWorklet:{},get currentTime(){return frame/48000;},addEventListener(){},removeEventListener(){}};
const A=api.starter('hollow'),B=api.starter('prism'),entries=[{id:'A',revision:1,instrument:A},{id:'B',revision:1,instrument:B}],waveId='nodal:A@1',keyboardId='nodal:B@1';
const surface=api.surface({library:{list:()=>entries},live:api.live,model:api.model});let physical=0;
const runtime={canAdmitVoice:()=>physical<52,beginEvent:()=>({maxVoices:1}),admitVoice:()=>{physical++;return{};},releaseVoice:()=>physical--};
const params={particlePreset:'classic',keyboardHoldSoundPreset:'clean_pluck'},output={},shell=read('src/app/forge/01_room_shell.js');
const a=shell.indexOf('P.useEffect(()=>{__XenNodalSurfaces.configure')+'P.useEffect(()=>{'.length,b=shell.indexOf('},[i,et.particlePreset,',a);assert(a>0&&b>a);
const effectEnv={__XenOctaves:{factor:()=>1},__XenNodalSurfaces:surface,Xn:()=>[],Fx:()=>[],uw:()=>[],Zs:x=>x,Tt:{current:params},Qa:()=>220,xn:{current:{cursorY:0}},zhe:()=>({playbackFreq:220}),NT:()=>({playbackFreq:220}),Lr:{current:ctx},i:ctx,Bs:async()=>ctx,Hh:()=>output,hi:()=>output,hl:{current:runtime},et:params,Ou:waveId};
const selectEffect=new Function(...Object.keys(effectEnv),shell.slice(a,b));
// Drive the real upper Keyboard menu after removing the duplicated lower UI.
const {performanceMenus,flatten}=require('./helpers/performance-menus.cjs');
const menus=performanceMenus();
const props={nParamsUI:params,waveSoundPreset:waveId,updateNParams:patch=>Object.assign(params,patch),waveSoundPresets:surface.options([])};
const menu=menus.menu(props,'keyboard');assert(flatten(menu).some(n=>n.type==='option'&&n.props.value===keyboardId));menu.props.onChange({target:{value:keyboardId}});
const wave=read('src/audio/05_live_voice_runtime.js'),body=wave.slice(wave.indexOf('function Ixe('),wave.indexOf('function Exe('));
const direct=new Function('__XenNodalSurfaces','$W','AL','xL',body+';return Ixe;')(surface,()=>false,()=>{},()=>({targets:[],prefixes:[]}));
const options=new Function(wave.slice(wave.indexOf('function Lxe('),wave.indexOf('const Vq'))+';return Lxe;')();
const flush=()=>new Promise(r=>setImmediate(r));async function pump(n){let nonzero=false;for(let i=0;i<n;i++){const out=Array.from({length:2},()=>[new Float32Array(128),new Float32Array(128)]);node.processor.process([],out);nonzero||=out[0].some(c=>c.some(v=>Math.abs(v)>1e-7));assert(out[1].every(c=>c.every(v=>v===0)),'keyboard stays on the Wave output, never Particle');frame+=128;await flush();}return nonzero;}
function play(source='keyboard-direct',id=keyboardId){direct({runtime:{enabled:true},transientRuntime:runtime,resolvedDirect:{selection:{kind:'nodal',id},emitState:{playbackFreq:330,volume:.2,waveGradient:{}}},options:options({keyboardGestureSource:source,waveStarterPresetOverride:id}),ctx,cursor:{},primeMyzelFromY(){},getWaveOutput:()=>output,fxTargets:{},fxRoutes:{}});}
(async()=>{
 selectEffect(...Object.values(effectEnv));await surface.select('wave',waveId);await surface.select('keyboard',keyboardId);
 assert.equal(surface.selectionStatus('keyboard').active,keyboardId,'Keyboard selection effect must prepare its own program');assert.equal(surface.selectionStatus('keyboard').phase,'ready','all production preparation dependencies must be present');assert.equal(surface.selectionStatus('wave').active,waveId,'keyboard must not replace Wave selection');assert.equal(constructors,1,'one shared processor, not a new synth per slot');
 const before=node.sent.filter(m=>m.type==='note').length;play();await flush();assert.equal(node.sent.filter(m=>m.type==='note').length,before+1,'the actual keyboard adapter submits its independently selected Nodal voice');assert(await pump(3000),'real Keyboard DSP must emit nonzero samples');assert.equal(physical,0);
 const heldEnv={__XenNodalSurfaces:surface,$w:()=>({kind:'nodal',id:keyboardId}),$W:()=>false,fr:()=>{},pL:()=>({playbackFreq:330,volume:.2,microVoiceDemandMul:1,waveGradient:{}}),kxe:()=>true,AL:()=>{},xL:()=>({targets:[],prefixes:[]})};
 const Exe=new Function(...Object.keys(heldEnv),wave.slice(wave.indexOf('function Exe('),wave.indexOf('function Fxe('))+';return Exe;')(...Object.values(heldEnv));
 Exe({runtime:{enabled:true,preset:waveId},options:{waveStarterPresetOverride:keyboardId,waveStarterGestureLoopLane:'klaviatur',keyboardGestureSource:'apostrophe-hold',waveStarterGestureLoopWorkletBridge:true,entrophonWaveActive:false},heldLong:true,ctx,cursor:{},primeMyzelFromY(){},getWaveOutput:()=>output,nexusSound:{},fxTargets:{},fxRoutes:{}});await flush();assert.equal(node.sent.filter(m=>m.type==='note').at(-1).options.held,true,'Nodal Keyboard hold bypasses the incompatible Classic bridge');surface.releaseHeld();await flush();await pump(3000);assert.equal(physical,0);
 const plans=node.sent.filter(m=>m.type==='plan').length;for(let i=0;i<9;i++)surface.note('keyboard',keyboardId,{frequency:220,gain:.2,held:true},ctx);await flush();assert.equal(physical,9);assert.equal(surface.note('keyboard',keyboardId,{frequency:220},ctx),null);assert.equal(node.sent.filter(m=>m.type==='plan').length,plans,'no compile or preparation at note onset');surface.releaseHeld();await flush();await pump(3000);assert.equal(physical,0);
 await surface.select('keyboard','clean_pluck');assert.equal(surface.selectionStatus('keyboard').active,null);assert.equal(surface.selectionStatus('wave').active,waveId);surface.dispose();assert.equal(physical,0);
 console.log('PASS actual Keyboard UI→selection effect→input options→independent Nodal slot→nonzero DSP; shared budget, output and release ownership');
})().catch(e=>{surface.dispose();console.error(e);process.exitCode=1;});
