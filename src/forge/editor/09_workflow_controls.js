/* Forge Voices · G/H/I listening modes (Gaia, Hildegard, Isolde).
   This file is the single owner of their parameter ranges, defaults and presets.
   It is plain data: no audio, no DOM, no storage. The DSP lives in the lazy Forge chunk. */
function createForgeVoiceSpec(){
 const P=(min,max,def,step=.01)=>({min,max,def,step});
 // Shared by all three: envelope, stereo and the loop-aware room.
 const common={attack:P(.002,.6,.012,.001),release:P(.02,6,.35,.01),width:P(0,1,.7),space:P(0,1,.22),size:P(0,1,.45),tailWrap:P(0,1,1,1),level:P(.1,1.5,1)};
 const engines={
  gaia:{machineId:'gaia-terrain-carrier',label:'Gaia',title:'Gaia · Terrain Orbit',glyph:'◍',
   summary:'The drawing is a landscape. Every note circles its own surroundings and sounds what it finds there.',
   params:{...common,reachPitch:P(.25,24,5,.05),reachTime:P(0,.6,.06,.005),lift:P(-1.5,1.5,.8),lobes:P(1,7,1,1),relief:P(0,1,.4),
    drift:P(0,1,.25),dynamics:P(0,1,.5),anchor:P(0,1,.35),richness:P(8,64,40,1)},
   presets:[
    {id:'glass-ridge',name:'Glass Ridge',params:{reachPitch:3.5,reachTime:.03,lift:.9,lobes:1,relief:.3,drift:.15,dynamics:.4,anchor:.45,richness:36,space:.3,size:.55,width:.8}},
    {id:'canyon',name:'Canyon Choir',params:{reachPitch:12,reachTime:.14,lift:.35,lobes:2,relief:.55,drift:.4,dynamics:.6,anchor:.3,richness:48,space:.38,size:.7,width:.9,attack:.04,release:.9}},
    {id:'needle',name:'Needle Path',params:{reachPitch:1.2,reachTime:.012,lift:1,lobes:3,relief:.1,drift:.05,dynamics:.7,anchor:.8,richness:64,space:.12,size:.3,width:.5,attack:.003,release:.12}},
    {id:'tide',name:'Tide Organ',params:{reachPitch:7,reachTime:.3,lift:0,lobes:1,relief:.8,drift:.7,dynamics:.3,anchor:.6,richness:24,space:.45,size:.85,width:1,attack:.12,release:1.6}},
    {id:'fold',name:'Fold Engine',params:{reachPitch:19,reachTime:.05,lift:-.6,lobes:5,relief:.2,drift:.55,dynamics:.8,anchor:.9,richness:64,space:.18,size:.4,width:.75}}]},
  hildegard:{machineId:'hildegard-mirror-carrier',label:'Hildegard',title:'Hildegard · Mirror Spectrum',glyph:'♁',
   summary:'The intervals of the figure become the overtones of every note. Any tuning gets a timbre made for it.',
   params:{...common,mirror:P(0,1,1),partials:P(4,32,20,1),tilt:P(0,1,.5),bow:P(0,1,.25),decay:P(.08,12,2.2,.01),hardness:P(0,1,.55),
    dynamics:P(0,1,.5),halo:P(0,1,.35),haloDecay:P(.3,10,3,.05),shimmer:P(0,1,.3),equave:P(1.1,4,2,.0001)},
   presets:[
    {id:'bell-garden',name:'Bell Garden',params:{mirror:1,partials:20,tilt:.55,bow:.05,decay:3.4,hardness:.7,dynamics:.5,halo:.45,haloDecay:4.5,shimmer:.35,space:.3,size:.6,attack:.003,release:1.8}},
    {id:'bowed-glass',name:'Bowed Glass',params:{mirror:1,partials:16,tilt:.4,bow:1,decay:2,hardness:.3,dynamics:.7,halo:.5,haloDecay:6,shimmer:.5,attack:.09,release:.8,space:.35,size:.7,width:.9}},
    {id:'marimba',name:'Tuned Wood',params:{mirror:.85,partials:10,tilt:.75,bow:0,decay:.7,hardness:.45,dynamics:.6,halo:.2,haloDecay:1.5,shimmer:.1,space:.15,size:.3,attack:.003,release:.4}},
    {id:'sympathy',name:'Sympathetic Strings',params:{mirror:.6,partials:28,tilt:.35,bow:.3,decay:4,hardness:.85,dynamics:.45,halo:.9,haloDecay:8,shimmer:.25,space:.25,size:.5,width:1,attack:.004,release:2.5}},
    {id:'pure-harmonic',name:'Harmonic Reference',params:{mirror:0,partials:24,tilt:.5,bow:.6,decay:2.5,hardness:.5,dynamics:.5,halo:0,shimmer:0,space:.1,size:.3}}]},
  isolde:{machineId:'isolde-spiral-carrier',label:'Isolde',title:'Isolde · Endless Spiral',glyph:'꩜',
   summary:'A self-similar tone: the same sound in every register. Lines can rise forever, and the rhythm repeats at every scale.',
   params:{...common,equave:P(1.1,4,2,.0001),density:P(1,4,1,1),body:P(1,4,1,1),center:P(120,2400,520,1),span:P(1.5,7,4.5,.05),
    spiral:P(-12,12,0,1),pulse:P(0,1,0),pulseRate:P(1,32,4,.0001),pulseRatio:P(1,4,2,.0001),sharp:P(0,1,.4),swirl:P(0,1,.6)},
   presets:[
    {id:'shepard',name:'Endless Stair',params:{equave:2,density:1,body:1,center:520,span:5,spiral:0,pulse:0,swirl:.5,space:.25,size:.5}},
    {id:'risset-rise',name:'Rising Forever',params:{equave:2,density:1,body:2,center:440,span:5.5,spiral:2,pulse:0,swirl:.9,space:.4,size:.75,attack:.08,release:1.2,width:1}},
    {id:'pulse-fractal',name:'Fractal Pulse',params:{equave:2,density:1,body:1,center:600,span:5,spiral:0,pulse:.85,pulseRate:2,pulseRatio:2,sharp:.6,swirl:.7,space:.2,size:.4}},
    {id:'tritave',name:'Tritave Glass',params:{equave:3,density:2,body:1,center:700,span:6,spiral:0,pulse:.35,pulseRate:3,pulseRatio:3,sharp:.3,swirl:.6,space:.35,size:.65}},
    {id:'golden',name:'Golden Swarm',params:{equave:1.6180339887,density:1,body:1,center:480,span:5.5,spiral:-3,pulse:.6,pulseRate:5,pulseRatio:1.5,sharp:.5,swirl:1,space:.3,size:.6,width:1}}]}};
 const ids=Object.keys(engines),byMachine=Object.fromEntries(ids.map(id=>[engines[id].machineId,id]));
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function params(engine,input={}){
  const spec=engines[engine];if(!spec)throw Error('Unknown Forge voice: '+engine);
  const out={};for(const [key,p] of Object.entries(spec.params)){let v=Number(input?.[key]);if(!Number.isFinite(v))v=p.def;v=clamp(v,p.min,p.max);if(p.step===1)v=Math.round(v);out[key]=v}
  return out;
 }
 function recipe(engine,input){
  if(input&&input.schema!=null&&input.schema!=='xensonar.forge-voice')throw Error('This is not a Forge voice recipe');
  if(input&&input.version!=null&&input.version!==1)throw Error('Unsupported Forge voice recipe version');
  if(input&&input.engine!=null&&input.engine!==engine)throw Error('Recipe belongs to another listening mode');
  const preset=typeof input?.preset==='string'&&engines[engine]?.presets.some(p=>p.id===input.preset)?input.preset:null;
  return Object.freeze({schema:'xensonar.forge-voice',version:1,engine,preset,params:Object.freeze(params(engine,input?.params))});
 }
 const preset=(engine,id)=>{const p=engines[engine]?.presets.find(x=>x.id===id);if(!p)throw Error('Unknown preset');return recipe(engine,{preset:id,params:p.params})};
 return Object.freeze({engines,ids,byMachine,params,recipe,preset,engineOf:machineId=>byMachine[machineId]??null});
}
if(typeof module!=='undefined'&&module.exports)module.exports=createForgeVoiceSpec;
/* Forge Voices · state owner for the G/H/I listening modes (Gaia, Hildegard, Isolde).
   KALT: this small owner holds recipes only. DSP, Worker and Synth Lab panels live in
   the lazy Forge room chunk and register themselves here when that chunk is opened.
   One recipe per mode; the draft is kept in localStorage and inside each Forge project. */
const __ForgeVoices=(()=>{
 const spec=createForgeVoiceSpec(),STORAGE='xensonar.forge.voices.v1',listeners=new Set();
 let recipes={},revision=0,lastError=null,lastReport=null,runtime=null;
 for(const id of spec.ids)recipes[id]=spec.recipe(id);
 try{const raw=JSON.parse(localStorage.getItem(STORAGE)||'null');if(raw&&typeof raw==='object')for(const id of spec.ids)if(raw[id])try{recipes[id]=spec.recipe(id,raw[id])}catch{}}catch{}
 recipes=Object.freeze(recipes);
 const engineOf=spec.engineOf,is=machineId=>engineOf(machineId)!==null,snapshot=()=>recipes;
 const notify=()=>{for(const fn of listeners)try{fn()}catch(error){console.warn('[Forge Voices] View update',error)}};
 // A project without (or with a damaged) recipe for a mode keeps the current draft of that mode.
 function normalizeProject(input){if(!input||typeof input!=='object')return null;const out={};for(const id of spec.ids)if(input[id])try{out[id]=spec.recipe(id,input[id])}catch{}return Object.keys(out).length?out:null}
 // Only the parameters are sound. The preset name is a label.
 const semanticKey=(machineId,input)=>{const id=engineOf(machineId);return id+':'+JSON.stringify(spec.recipe(id,(input??recipes)[id]??recipes[id]).params)};
 function set(engine,input,{invalidate=true}={}){
  const next=spec.recipe(engine,input),previous=recipes[engine];if(JSON.stringify(next)===JSON.stringify(previous))return previous;
  const sound=JSON.stringify(next.params)!==JSON.stringify(previous.params);recipes=Object.freeze({...recipes,[engine]:next});
  try{localStorage.setItem(STORAGE,JSON.stringify(recipes))}catch{}
  if(sound){revision++;lastError=null;
   if(invalidate&&typeof pe!=='undefined'&&pe.getState){const state=pe.getState();if(engineOf(state.carrierIntegralSelection?.machineId)===engine){__f333Stop();pe.setState({...__f333Idle(),renderVersion:(state.renderVersion??0)+1,audioBufferDirty:true})}}}
  if(invalidate&&typeof __f333Persistence!=='undefined')__f333Persistence?.scheduleSave?.();
  notify();return next;
 }
 function loadProject(input){const next=normalizeProject(input);if(!next)return;for(const id of Object.keys(next))set(id,next[id],{invalidate:false})}
 function lab(){if(!runtime)__xenLoadDeferred('lab');if(!runtime)throw Error('This listening mode could not be loaded.');return runtime}
 async function renderCarrier(args){
  try{lastError=null;const result=await lab().renderCarrier(args);lastReport=result.report;notify();return result.buffer}
  catch(error){if(error?.name!=='AbortError'){lastError=String(error?.message||error);notify()}throw error}
 }
 return Object.freeze({spec,is,engineOf,snapshot,semanticKey,set,loadProject,normalizeProject,renderCarrier,
  subscribe:fn=>(listeners.add(fn),()=>listeners.delete(fn)),revision:()=>revision,lastError:()=>lastError,lastReport:()=>lastReport,
  register(next){runtime=next},preset:(engine,id)=>set(engine,spec.preset(engine,id))});
})();
/* Listening modes that render themselves from the Carrier and are never replaced by a selected Donor. */
const __forgeSelfMachine=id=>id==='emilia-nodal-carrier'||id==='fractalia-self-carrier'||__ForgeVoices.is(id);
/* Modes whose heard PCM (not a generic carrier pattern) is what live destinations receive. */
const __forgeRenderedMachine=id=>id==='fractalia-self-carrier'||__ForgeVoices.is(id);
/* Shared access to one listening selection and one mounted transport owner.
   Duplicate controls subscribe to the same state; no duplicate audio engine. */
const __ForgeListeningMode=(()=>{
 const listeners=new Set();let error='';
 const emit=()=>{for(const fn of listeners)fn()};
 const value=()=>{const machine=pe.getState().carrierIntegralSelection.machineId,donor=Vt.getSnapshot().selected;
  return __F35611DonorIntent||donor&&!__forgeSelfMachine(machine)?'donor':LGe.find(x=>x.machineId===machine)?.id||'pure-dieter'};
 function choose(id,{prepare=true}={}){error='';__f333Stop();pe.setState(__f333Idle());
  if(id==='donor'){__F35611DonorIntent=true;emit();if(prepare)void __f3562EnsureDonor().catch(e=>{if(value()==='donor'){error=e.message;emit()}})}
  else{const option=LGe.find(x=>x.id===id);if(!option)return;__F35611DonorIntent=false;Vt.selectCarrier();const s=pe.getState();if(option.harmonicXploreProfileId)s.setCarrierIntegralHarmonicXplore({profileId:option.harmonicXploreProfileId,source:'user'});s.setCarrierIntegralSelection({machineId:option.machineId,source:'user'});
   try{window.localStorage.setItem(__ForgePreferredListeningKey,option.machineId)}catch{};
   emit()}
  window.dispatchEvent(new CustomEvent('xensonar:forge:listening-choice',{detail:id}));
 }
 const subscribe=fn=>{listeners.add(fn);const a=pe.subscribe(fn),b=Vt.subscribe(fn);return()=>{listeners.delete(fn);a();b()}};
 return {value,choose,subscribe,error:()=>error};
})();
function __useForgeListeningMode(){const value=P.useSyncExternalStore(__ForgeListeningMode.subscribe,__ForgeListeningMode.value,__ForgeListeningMode.value),error=P.useSyncExternalStore(__ForgeListeningMode.subscribe,__ForgeListeningMode.error,__ForgeListeningMode.error);return{value,error,choose:__ForgeListeningMode.choose,label:value==='donor'?'Donor':LGe.find(x=>x.id===value)?.label||'Pure Dieter'}}
function __ForgeListeningPicker({label='Listening mode',compact=false}){const choice=__useForgeListeningMode();return P.createElement('select',{'aria-label':label,'data-forge-shared-listening-picker':true,value:choice.value,onChange:e=>choice.choose(e.target.value),className:'min-w-0 w-full rounded border border-fuchsia-700/60 bg-neutral-900 px-2 py-2 text-xs text-neutral-100',style:compact?{maxWidth:210}:undefined},...LGe.filter(x=>!__forgeSelfMachine(x.machineId)).map(x=>P.createElement('option',{key:x.id,value:x.id},x.label)),P.createElement('option',{value:'donor'},'Donor'),...LGe.filter(x=>__forgeSelfMachine(x.machineId)).map(x=>P.createElement('option',{key:x.id,value:x.id},x.label)))}
const __ForgeTransportAccess=(()=>{
 let owner=null,state=Object.freeze({phase:'idle',progress:0,available:false,ready:false});const listeners=new Set();
 const emit=()=>{for(const fn of listeners)fn()};
 function update(patch){const next={...state,...patch};if(Object.keys(next).every(k=>next[k]===state[k]))return;state=Object.freeze(next);emit()}
 return {subscribe:fn=>(listeners.add(fn),()=>listeners.delete(fn)),snapshot:()=>state,hasOwner:()=>!!owner,
  attach(handlers){const token={...handlers};owner=token;update({available:true});return()=>{if(owner===token){owner=null;update({available:false,phase:'idle',progress:0,ready:false})}}},update,
  activate(){return owner?.activate?.()},toggle(){return owner?.activate?.()},stop(){return owner?.stop()}};
})();

/* xen-lazy:lab */

/* P5: bounded navigator audition, independent from the main Forge transport. */
/* Navigator audition belongs to the Forge idle manager. The tiny Play button
   uses a direct AudioBufferSourceNode (not xt.playBufferInternal), so it must
   register as busy from the beginning of async rendering until stop/onended. */
let __f333NavigatorPreviewSource=null,__f333NavigatorPreviewGain=null,__f333NavigatorPreviewTicket=0;
function __f333NavigatorPreviewIdleRelease(){
 if(!xt.__f333NavigatorPreviewActive)return;
 xt.__f333NavigatorPreviewActive=false;
 __xenForgePreviewIdle(xt).schedule();
}
function __f333StopNavigatorPreview(){
 ++__f333NavigatorPreviewTicket;
 const source=__f333NavigatorPreviewSource,gain=__f333NavigatorPreviewGain;
 __f333NavigatorPreviewSource=null;__f333NavigatorPreviewGain=null;
 if(source){try{source.onended=null;source.stop()}catch{}try{source.disconnect()}catch{}}
 if(gain)try{gain.disconnect()}catch{}
 __f333NavigatorPreviewIdleRelease();
 if(__ForgeNavigatorSample.snapshot().previewing||__ForgeNavigatorSample.snapshot().previewBusy)
  __ForgeNavigatorSample.update({previewing:false,previewBusy:false,previewDurationSec:null});
}
async function __f333PreviewNavigatorSample(){
 if(__f333NavigatorPreviewSource||__ForgeNavigatorSample.snapshot().previewBusy){__f333StopNavigatorPreview();return}
 const selected=__ForgeNavigatorSample.current();if(!selected)return;
 const ticket=++__f333NavigatorPreviewTicket;
 const state=pe.getState(),revision=state.renderVersion,route=__f333Route(state),masterRevision=__F3564Master.getSnapshot().revision;
 const idle=__xenForgePreviewIdle(xt);
 xt.__f333NavigatorPreviewActive=true;
 idle.claim(); // Cancel a previously scheduled 1200-ms context suspension.
 const ctx=xt.getContext();__ForgeNavigatorSample.update({previewBusy:true,message:''});
 try{
  // A prior asynchronous suspension may still be pending. Wait for it,
  // resume the SAME context, and retain the audition claim throughout.
  if(!await idle.ready(ctx,()=>ticket===__f333NavigatorPreviewTicket))return;
  const render=await __f333RenderCurrent(state,{flacBuffer:true});
  if(ticket!==__f333NavigatorPreviewTicket||__ForgeNavigatorSample.current()!==selected||pe.getState().renderVersion!==revision||__f333Route(pe.getState())!==route||__F3564Master.getSnapshot().revision!==masterRevision)return;
  const buffer=render.buffer;
  if(!buffer||!buffer.sampleRate||!buffer.length)throw Error('No playable audio for this navigator selection.');
  const first=Math.max(0,Math.min(buffer.length-1,Math.floor(selected.start*buffer.length)));
  // Navigator Play auditions the whole purple selection. Save as Sample is
  // still subject to its separate maximum-length policy.
  const last=Math.max(first+1,Math.min(buffer.length,Math.ceil(selected.end*buffer.length)));
  const count=last-first,seconds=count/buffer.sampleRate;
  if(seconds<.025)throw Error('Select at least 25 ms of audible audio.');
  let peak=0;
  for(let channel=0;channel<Math.min(2,buffer.numberOfChannels);channel++){
   const samples=buffer.getChannelData(channel);
   for(let i=first;i<last;i++){
    const value=samples[i];if(!Number.isFinite(value))throw Error('Selected audio contains invalid samples.');
    peak=Math.max(peak,Math.abs(value));
   }
  }
  if(peak<1e-8)throw Error('The selected region is silent. Draw or select audible material.');
  // Use the existing PCM with an offset/duration: no extra long copy buffer.
  const voice=ctx.createBufferSource(),gain=ctx.createGain();voice.buffer=buffer;
  voice.connect(gain);gain.connect(ctx.destination);
  const t0=ctx.currentTime,fadeFrames=Math.min(Math.floor(buffer.sampleRate*.003),Math.floor(count/4));
  if(fadeFrames){
   const fade=fadeFrames/buffer.sampleRate;
   gain.gain.setValueAtTime(0,t0);
   gain.gain.linearRampToValueAtTime(1,t0+fade);
   gain.gain.setValueAtTime(1,t0+(count-1)/buffer.sampleRate-fade);
   gain.gain.linearRampToValueAtTime(0,t0+(count-1)/buffer.sampleRate);
  }else gain.gain.setValueAtTime(1,t0);
  voice.onended=()=>{
   try{voice.disconnect()}catch{}try{gain.disconnect()}catch{}
   if(__f333NavigatorPreviewSource===voice){
    __f333NavigatorPreviewSource=null;__f333NavigatorPreviewGain=null;
    __f333NavigatorPreviewIdleRelease();
    __ForgeNavigatorSample.update({previewing:false,previewBusy:false,previewDurationSec:null});
   }
  };
  try{voice.start(0,first/buffer.sampleRate,seconds)}catch(startError){
   voice.onended=null;try{voice.disconnect()}catch{}try{gain.disconnect()}catch{}throw startError;
  }
  __f333NavigatorPreviewSource=voice;__f333NavigatorPreviewGain=gain;
  __ForgeNavigatorSample.update({previewing:true,previewBusy:false,previewDurationSec:seconds,message:'Preview '+seconds.toFixed(2)+' s'});
 }catch(error){if(ticket===__f333NavigatorPreviewTicket)__ForgeNavigatorSample.update({previewing:false,previewBusy:false,message:error?.message||'Preview unavailable.'})}
 finally{if(ticket===__f333NavigatorPreviewTicket&&!__f333NavigatorPreviewSource){
  __f333NavigatorPreviewIdleRelease();
  __ForgeNavigatorSample.update({previewing:false,previewBusy:false,previewDurationSec:null});
 }}
}
/* P7.3: keep this title outside the button flow. Preview and Save stay anchored. */
function __ForgeNavigatorSampleNameInput(){
 const state=P.useSyncExternalStore(__ForgeNavigatorSample.subscribe,__ForgeNavigatorSample.snapshot,__ForgeNavigatorSample.snapshot);
 return P.createElement(P.Fragment,null,
  P.createElement('label',{htmlFor:'f35-navigator-sample-name-input',className:'f35-navigator-sample-caption f33-project-name-text'},P.createElement('span',{className:'f35-navigator-name-glyph'},'NAME'),P.createElement('span',{className:'f35-navigator-name-colon'},':')),
  P.createElement('input',{id:'f35-navigator-sample-name-input',type:'text','data-forge-navigator-sample-name':true,
  'aria-label':'Sample name for Forge exports',title:'Optional name shared by Save as Sample, Material Track, Root Follow Loop and Pink Track, plus WAV/FLAC downloads · blank keeps the automatic title',
  placeholder:'',maxLength:74,value:state.nameDraft||'',
  onChange:event=>__ForgeNavigatorSample.update({nameDraft:event.target.value}),
  onKeyDown:event=>event.stopPropagation(),onKeyUp:event=>event.stopPropagation(),
  className:'f35-navigator-sample-name rounded border bg-neutral-950 px-2 text-[11px] placeholder:text-emerald-300/60 focus:outline-none'
 }));
}
function __ForgeNavigatorPreviewButton(){
 const h=P.createElement,state=P.useSyncExternalStore(__ForgeNavigatorSample.subscribe,__ForgeNavigatorSample.snapshot,__ForgeNavigatorSample.snapshot);
 const selected=__ForgeNavigatorSample.current();
 return h('button',{type:'button','data-forge-navigator-preview':true,'aria-label':state.previewing?'Stop selected navigator preview':'Play selected navigator range',
  title:!selected?'Draw a Navigator selection to activate sample playback':state.previewing?'Stop region preview':'Preview only the highlighted Navigator region',disabled:!selected||state.busy,
  onClick:()=>void __f333PreviewNavigatorSample(),className:'shrink-0 rounded border border-violet-500 bg-neutral-900 text-xs text-violet-100 hover:bg-violet-800 disabled:opacity-50'},state.previewBusy?'…':state.previewing?'■':'▶');
}
function __ForgeNavigatorSaveButton(){
 const state=P.useSyncExternalStore(__ForgeNavigatorSample.subscribe,__ForgeNavigatorSample.snapshot,__ForgeNavigatorSample.snapshot);
 const selected=__ForgeNavigatorSample.current();
 return P.createElement('button',{type:'button','data-forge-navigator-save-sample':true,disabled:!selected||state.busy,
  'aria-label':'Save selected navigator range as sample',onClick:()=>void __f333SaveNavigatorSample(),
  title:!selected?'Draw a Navigator selection to activate Save as Sample':state.message||'Save up to 5 seconds of the highlighted audio to the shared Sample Database (longer selections are trimmed)',
  className:'rounded border border-violet-400 bg-violet-950 px-2 py-1 text-[10px] font-semibold text-violet-100 shadow-md hover:bg-violet-800 disabled:opacity-50'
 },state.busy?'Saving…':'Save as Sample');
}
/* P7.21: both vertical signs share the *actual* top and bottom edges of
   the two play-rack rows. The donor sign retains its tool-rail width; its
   geometry must not depend on whether Brush or Morph shows a second row.
   Measurements happen only on layout/resize, never in any audio hotpath. */
function __ForgeRackVerticalAlign(rack){
 const top=rack.querySelector('[data-forge-import-image]');
 const bottom=rack.querySelector('[data-f318-export-target="pink"]');
 const importAnchor=rack.querySelector('.xen-rack-vertical-import-anchor');
 const importButton=importAnchor?.querySelector('.xen-vertical-import-audio');
 const microphone=rack.querySelector('[data-forge-rack-microphone-slot]');
 const material=rack.querySelector('[data-f318-export-target="material"]');
 const destinations=bottom?.parentElement;
 const rail=document.querySelector('.xen-forge-tool-rail');
 const donor=rail?.querySelector('.xen-donor-library-dock-switch');
 if(!top||!bottom||!importAnchor||!importButton||!rail||!donor)return null;
 let frame=0;
 const measure=()=>{
  frame=0;
  if(!rack.isConnected||!rail.isConnected)return;
  if(microphone&&material&&destinations){
   const pink=bottom.getBoundingClientRect(),mic=microphone.getBoundingClientRect();
   const row=material.getBoundingClientRect(),bounds=destinations.getBoundingClientRect();
   const spans=bottom.querySelectorAll(':scope>span'),style=getComputedStyle(bottom);
   const ink=[...spans].reduce((width,span)=>width+span.getBoundingClientRect().width,0)+
    parseFloat(style.columnGap||0)+parseFloat(style.borderLeftWidth)+parseFloat(style.borderRightWidth);
   const width=mic.right-pink.left;
   // Preserve R11's row choices. Never stretch a wrapped button under Projects.
   const fits=Math.abs(pink.top-row.top)<1&&width>=ink&&mic.right<=bounds.right+.5;
   if(fits){
    bottom.style.setProperty('--forge-pink-span',width.toFixed(3)+'px');
    bottom.style.setProperty('--forge-pink-ink',ink.toFixed(3)+'px');
   }else{
    bottom.style.removeProperty('--forge-pink-span');
    bottom.style.removeProperty('--forge-pink-ink');
   }
  }
  // UI2: actual destination edges own the naming row, independent of font metrics.
  const slot=rack.querySelector('[data-forge-navigator-save-slot]');
  const save=rack.querySelector('[data-forge-navigator-save-sample]');
  const root=rack.querySelector('[data-f318-export-target="root"]');
  const caption=rack.querySelector('.f35-navigator-sample-caption');
  if(slot&&save&&root&&caption&&material){
   const parent=slot.offsetParent;
   if(parent){
    const pr=parent.getBoundingClientRect(),rr=root.getBoundingClientRect();
    const sw=save.getBoundingClientRect().width;
    slot.style.setProperty('--forge-save-right',(pr.right-rr.left-sw)+'px');
    const sr=slot.getBoundingClientRect(),mr=material.getBoundingClientRect();
    const gap=parseFloat(getComputedStyle(slot).columnGap)||0;
    const play=slot.querySelector('[data-forge-navigator-preview]');
    const nameField=slot.querySelector('.f35-navigator-sample-name');
    // Keep the input precisely one grid gap left of Play, as Play is from Save.
    // If the narrow rack wraps Save/Play ahead of NAME, preserve the old input
    // anchor: that breakpoint cannot fit all three controls in a single row.
    const room=play&&nameField&&
     play.getBoundingClientRect().left-gap-nameField.getBoundingClientRect().width >=
     caption.getBoundingClientRect().right+gap;
    if(room)slot.style.removeProperty('--forge-name-right');
    else slot.style.setProperty('--forge-name-right',(sr.right-pr.right+sr.width+gap)+'px');
    caption.style.setProperty('--forge-caption-right',(sr.right-mr.left-caption.getBoundingClientRect().width)+'px');
   }
  }
  // Import owns only the available gutter; it may not cover either project control.
  if(microphone){
   const projects=[rack.querySelector('.f33-rack-project-corner'),rack.querySelector('.f34-project-save-on-main')].filter(Boolean);
   const left=importAnchor.getBoundingClientRect().left;
   const edge=Math.min(...projects.map(el=>el.getBoundingClientRect().left));
   const available=edge-left-4;
   if(available>0)importButton.style.setProperty('--forge-import-width',Math.min(43,available)+'px');
  }
  const topY=top.getBoundingClientRect().top;
  const bottomY=bottom.getBoundingClientRect().bottom;
  const height=bottomY-topY;
  // Refrain from applying temporary invalid geometry during hidden/mount states.
  if(!Number.isFinite(height)||height<60||height>400)return;
  const importY=importAnchor.getBoundingClientRect().top;
  const railY=rail.getBoundingClientRect().top;
  importButton.style.top=(topY-importY).toFixed(2)+'px';
  importButton.style.height=height.toFixed(2)+'px';
  donor.style.top=(topY-railY).toFixed(2)+'px';
  donor.style.height=height.toFixed(2)+'px';
 };
 const queue=()=>{if(!frame)frame=requestAnimationFrame(measure)};
 const ro=typeof ResizeObserver==='function'?new ResizeObserver(queue):null;
 for(const el of [rack,rail,top,bottom,importAnchor,microphone,destinations].filter(Boolean))ro?.observe(el);
 window.addEventListener('resize',queue);
 // Listening-mode/tool changes may relocate elements without resizing them.
 window.addEventListener('xensonar:forge:listening-choice',queue);
 document.fonts?.ready.then(queue);
 queue();
 return ()=>{
  if(frame)cancelAnimationFrame(frame);
  ro?.disconnect();
  window.removeEventListener('resize',queue);
  window.removeEventListener('xensonar:forge:listening-choice',queue);
 };
}
function __ForgeTransportRack(e){
 return __xenGetDeferredFn("__ForgeTransportRack").apply(this, arguments);
}

/* xen-lazy:lab */


// Content and destination are separate: legacy role values stay readable in old
// archives, but an imported sample is not restricted to one playback instrument.
function __forgeMaterialRootHz(value){return typeof value==='number'&&Number.isFinite(value)&&value>0&&value<=24000?value:null;}

/* xen-lazy:lab */

