/* Shared access to one listening selection and one mounted transport owner.
   Duplicate controls subscribe to the same state; no duplicate audio engine. */
const __ForgeListeningMode=(()=>{
 const listeners=new Set();let error='';
 const emit=()=>{for(const fn of listeners)fn()};
 const value=()=>{const machine=pe.getState().carrierIntegralSelection.machineId,donor=Vt.getSnapshot().selected;
  return __F35611DonorIntent||donor&&!['emilia-nodal-carrier','fractalia-self-carrier'].includes(machine)?'donor':LGe.find(x=>x.machineId===machine)?.id||'pure-dieter'};
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
function __ForgeListeningPicker({label='Listening mode',compact=false}){const choice=__useForgeListeningMode();return P.createElement('select',{'aria-label':label,'data-forge-shared-listening-picker':true,value:choice.value,onChange:e=>choice.choose(e.target.value),className:'min-w-0 w-full rounded border border-fuchsia-700/60 bg-neutral-900 px-2 py-2 text-xs text-neutral-100',style:compact?{maxWidth:210}:undefined},...LGe.filter(x=>!['emilia','fractalia'].includes(x.id)).map(x=>P.createElement('option',{key:x.id,value:x.id},x.label)),P.createElement('option',{value:'donor'},'Donor'),...LGe.filter(x=>['emilia','fractalia'].includes(x.id)).map(x=>P.createElement('option',{key:x.id,value:x.id},x.label)))}
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

