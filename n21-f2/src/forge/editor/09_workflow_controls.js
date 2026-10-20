/* Shared access to one listening selection and one mounted transport owner.
   Duplicate controls subscribe to the same state; no duplicate audio engine. */
const __ForgeListeningMode=(()=>{
 const listeners=new Set();let error='';
 const emit=()=>{for(const fn of listeners)fn()};
 const value=()=>{const machine=pe.getState().carrierIntegralSelection.machineId,donor=Vt.getSnapshot().selected;
  return __F35611DonorIntent||donor&&!['emilia-nodal-carrier','fractalia-self-carrier'].includes(machine)?'donor':LGe.find(x=>x.machineId===machine)?.id||'pure-dieter'};
 function choose(id,{prepare=true}={}){error='';__f333Stop();pe.setState(__f333Idle());
  if(id==='donor'){__F35611DonorIntent=true;emit();if(prepare)void __f3562EnsureDonor().catch(e=>{if(value()==='donor'){error=e.message;emit()}})}
  else{const option=LGe.find(x=>x.id===id);if(!option)return;__F35611DonorIntent=false;Vt.selectCarrier();const s=pe.getState();if(option.harmonicXploreProfileId)s.setCarrierIntegralHarmonicXplore({profileId:option.harmonicXploreProfileId,source:'user'});s.setCarrierIntegralSelection({machineId:option.machineId,source:'user'});emit()}
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
function __ForgeMiniPlay(){
 const state=P.useSyncExternalStore(__ForgeTransportAccess.subscribe,__ForgeTransportAccess.snapshot,__ForgeTransportAccess.snapshot);
 const loading=state.phase==='preparing',playing=state.phase==='playing';
 const fill=Math.min(99,Math.round(Math.max(0,Number(state.progress)||0)));
 return P.createElement('button',{type:'button','data-forge-synth-snap-play':true,'data-forge-synth-lab-play':true,
  'aria-label':loading?'Cancel figure rendering':playing?'Pause figure preview':'Play current figure','aria-busy':loading,
  title:loading?'Preparing current figure · '+fill+' %':playing?'Pause figure preview':state.ready?'Preview ready · starts immediately':'Preview is not yet audibly ready · Play prepares the selected mode',
  disabled:!state.available,onClick:()=>void __ForgeTransportAccess.activate(),
  className:'relative overflow-hidden inline-flex h-8 min-w-20 items-center justify-center gap-1 rounded border px-2 text-xs font-semibold text-white disabled:opacity-40 '+(loading?'border-neutral-500 bg-neutral-700':playing?'border-red-400 bg-red-600':state.ready?'border-green-400/40 bg-green-600 hover:bg-green-500':'border-neutral-500 bg-neutral-700')},
  loading&&P.createElement('span',{'aria-hidden':true,className:'pointer-events-none absolute inset-x-0 bottom-0 bg-emerald-500/90',style:{height:fill+'%'}}),
  P.createElement('span',{className:'relative z-10'},loading?'■ '+fill+' %':playing?'⏸ Pause':'▶ Play'));
}
/* P5: bounded navigator audition, independent from the main Forge transport. */
let __f333NavigatorPreviewSource=null,__f333NavigatorPreviewTicket=0;
function __f333StopNavigatorPreview(){
 ++__f333NavigatorPreviewTicket;
 const source=__f333NavigatorPreviewSource;__f333NavigatorPreviewSource=null;
 if(source){try{source.onended=null;source.stop()}catch{}try{source.disconnect()}catch{}}
 if(__ForgeNavigatorSample.snapshot().previewing||__ForgeNavigatorSample.snapshot().previewBusy)
  __ForgeNavigatorSample.update({previewing:false,previewBusy:false,previewDurationSec:null});
}
async function __f333PreviewNavigatorSample(){
 if(__f333NavigatorPreviewSource||__ForgeNavigatorSample.snapshot().previewBusy){__f333StopNavigatorPreview();return}
 const selected=__ForgeNavigatorSample.current();if(!selected)return;
 const ticket=++__f333NavigatorPreviewTicket;
 const state=pe.getState(),revision=state.renderVersion,route=__f333Route(state),masterRevision=__F3564Master.getSnapshot().revision;
 const ctx=xt.getContext();__ForgeNavigatorSample.update({previewBusy:true,message:''});
 try{
  if(ctx.state==='suspended')await ctx.resume();
  const render=await __f333RenderCurrent(state,{flacBuffer:true});
  if(ticket!==__f333NavigatorPreviewTicket||__ForgeNavigatorSample.current()!==selected||pe.getState().renderVersion!==revision||__f333Route(pe.getState())!==route||__F3564Master.getSnapshot().revision!==masterRevision)return;
  const buffer=render.buffer;
  if(!buffer||!buffer.sampleRate||!buffer.length)throw Error('No playable audio for this navigator selection.');
  const first=Math.max(0,Math.min(buffer.length-1,Math.floor(selected.start*buffer.length)));
  const last=Math.max(first+1,Math.min(buffer.length,Math.ceil(selected.end*buffer.length)));
  const count=last-first,seconds=count/buffer.sampleRate;
  if(seconds<.025||seconds>5.001)throw Error('Select a region between 25 ms and 5 seconds.');
  const audition=ctx.createBuffer(Math.min(2,buffer.numberOfChannels),count,buffer.sampleRate);
  const fade=Math.min(Math.floor(buffer.sampleRate*.003),Math.floor(count/4));let peak=0;
  for(let channel=0;channel<audition.numberOfChannels;channel++){
   const source=buffer.getChannelData(channel),target=audition.getChannelData(channel);
   for(let i=0;i<count;i++){
    let value=source[first+i];if(!Number.isFinite(value))throw Error('Selected audio contains invalid samples.');
    if(fade){if(i<fade)value*=i/fade;if(i>count-1-fade)value*=(count-1-i)/fade;}
    target[i]=value;peak=Math.max(peak,Math.abs(value));
   }
  }
  if(peak<1e-8)throw Error('The selected region is silent. Draw or select audible material.');
  const voice=ctx.createBufferSource();voice.buffer=audition;voice.connect(ctx.destination);
  voice.onended=()=>{try{voice.disconnect()}catch{}if(__f333NavigatorPreviewSource===voice){__f333NavigatorPreviewSource=null;__ForgeNavigatorSample.update({previewing:false,previewBusy:false,previewDurationSec:null})}};
  __f333NavigatorPreviewSource=voice;voice.start();__ForgeNavigatorSample.update({previewing:true,previewBusy:false,previewDurationSec:seconds});
 }catch(error){if(ticket===__f333NavigatorPreviewTicket)__ForgeNavigatorSample.update({previewing:false,previewBusy:false,message:error?.message||'Preview unavailable.'})}
 finally{if(ticket===__f333NavigatorPreviewTicket&&!__f333NavigatorPreviewSource)__ForgeNavigatorSample.update({previewing:false,previewBusy:false,previewDurationSec:null});}
}
/* P7.3: keep this title outside the button flow. Preview and Save stay anchored. */
function __ForgeNavigatorSampleNameInput(){
 const state=P.useSyncExternalStore(__ForgeNavigatorSample.subscribe,__ForgeNavigatorSample.snapshot,__ForgeNavigatorSample.snapshot);
 if(!__ForgeNavigatorSample.current())return null;
 return P.createElement(P.Fragment,null,
  P.createElement('label',{htmlFor:'f35-navigator-sample-name-input',className:'f35-navigator-sample-caption f33-project-name-text'},'Sample Name:'),
  P.createElement('input',{id:'f35-navigator-sample-name-input',type:'text','data-forge-navigator-sample-name':true,
  'aria-label':'Sample name',title:'Name this selection before saving · blank uses the automatic title',
  placeholder:'',maxLength:74,value:state.nameDraft||'',
  onChange:event=>__ForgeNavigatorSample.update({nameDraft:event.target.value}),
  onKeyDown:event=>event.stopPropagation(),onKeyUp:event=>event.stopPropagation(),
  className:'f35-navigator-sample-name rounded border border-violet-500/60 bg-neutral-950 px-2 text-[10px] text-violet-100 placeholder:text-violet-300/60 focus:border-fuchsia-400 focus:outline-none',
  style:{width:102,minWidth:102,height:25,boxSizing:'border-box'}
 }));
}
function __ForgeNavigatorPreviewButton(){
 const h=P.createElement,state=P.useSyncExternalStore(__ForgeNavigatorSample.subscribe,__ForgeNavigatorSample.snapshot,__ForgeNavigatorSample.snapshot);
 if(!__ForgeNavigatorSample.current())return null;
 return h('button',{type:'button','data-forge-navigator-preview':true,'aria-label':state.previewing?'Stop selected navigator preview':'Play selected navigator range',
  title:state.previewing?'Stop region preview':'Preview only the highlighted Navigator region',disabled:state.busy,
  onClick:()=>void __f333PreviewNavigatorSample(),className:'h-[25px] w-[29px] shrink-0 rounded border border-violet-500 bg-neutral-900 text-xs text-violet-100 hover:bg-violet-800 disabled:opacity-50',style:{width:29,minWidth:29,height:25}},state.previewBusy?'…':state.previewing?'■':'▶');
}
function __ForgeNavigatorSaveButton(){
 const state=P.useSyncExternalStore(__ForgeNavigatorSample.subscribe,__ForgeNavigatorSample.snapshot,__ForgeNavigatorSample.snapshot);
 if(!__ForgeNavigatorSample.current())return null;
 return P.createElement('button',{type:'button','data-forge-navigator-save-sample':true,disabled:state.busy,
  'aria-label':'Save selected navigator range as sample',onClick:()=>void __f333SaveNavigatorSample(),
  title:state.message||'Save the highlighted audio as a one-shot in the shared Sample Database',
  className:'rounded border border-violet-400 bg-violet-950 px-2 py-1 text-[10px] font-semibold text-violet-100 shadow-md hover:bg-violet-800 disabled:opacity-50',style:{width:102,minWidth:102,height:25}
 },state.busy?'Saving…':'Save as Sample');
}
function __ForgeTransportRack(e){
 const h=P.createElement,choice=__useForgeListeningMode(),busy=e.rendering;
 const navigatorMessage=P.useSyncExternalStore(__ForgeNavigatorSample.subscribe,()=>__ForgeNavigatorSample.snapshot().message,()=>__ForgeNavigatorSample.snapshot().message);
 const hearingStatus=[e.statusMessage||choice.error,navigatorMessage].filter(Boolean).join(' · ');
 const button={type:'button',className:'h-8 rounded border border-neutral-700 bg-neutral-900 px-2 text-xs text-neutral-100 hover:bg-neutral-800'};
 const routing={
  material:{label:'Send to Material Track',color:'border-cyan-400 bg-cyan-800 hover:bg-cyan-700',icon:'📀'},
  root:{label:'Use as Root Follow Loop',color:'border-violet-400 bg-violet-800 hover:bg-violet-700',icon:'🎼'},
  pink:{label:'Send to Pink Track (Melodic Loop)',color:'border-pink-400 bg-pink-800 hover:bg-pink-700',icon:'🎶'}
 };
 const destination=id=>h('button',{
   type:'button','data-f318-export-target':id,disabled:busy,
   onClick:()=>e.handleSendCurrentPreviewToXensonar(id),
   className:'h-9 inline-flex items-center gap-2 rounded border px-3 text-xs font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:opacity-50 '+routing[id].color
  },id==='material'?
   h('span',{'aria-hidden':true,className:'text-base leading-none'},routing[id].icon):
   h('span',{'aria-hidden':true,className:'relative inline-flex h-5 w-5 shrink-0 items-center justify-center'},
    h('span',{className:'absolute h-4 w-4 rounded-full bg-white shadow-sm'}),
    h('span',{className:'relative z-10 text-[17px] leading-none'},routing[id].icon)),
   h('span',null,routing[id].label));
 return h(P.Fragment,null,
  h('div',{'data-forge-play-rack':true,className:'f31-play-rack'},
   h('div',{className:'f31-transport-main'},
    h('div',{className:'f34-transport-and-status'},
    h('div',{className:'flex items-center gap-2'},
     h('button',{type:'button',
       'data-xensonar-spectralforge-render-fill-button':'true',
       'data-xensonar-spectralforge-render-fill-layered':'true',
       'data-xensonar-spectralforge-render-fill-percent':e.renderFillActive?e.renderFillPercent:undefined,
       'aria-label':busy?'Cancel figure rendering':e.isPlaying?'Pause figure preview':'Play current figure',
       'aria-busy':busy||e.renderFillActive,onClick:()=>void __ForgeTransportAccess.activate(),
       title:busy?(e.renderFillActive?e.playButtonView.title+' · click to cancel':'Cancel rendering'):e.playButtonView.title,
       style:f6e,className:e.playButtonView.className},
      e.renderFillActive&&h('span',{'aria-hidden':true,className:'pointer-events-none absolute inset-x-0 bottom-0 z-0 bg-emerald-500/90',style:{height:e.renderFillPercent+'%'}}),
      h('span',{className:'pointer-events-none relative z-10 flex h-full w-full items-center justify-center text-[18px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]','aria-hidden':true},e.playButtonView.symbol),
      h('span',{className:'sr-only'},e.playButtonView.screenReaderLabel)),
     h('button',{...button,onClick:e.handleStop,'aria-label':'Stop preview',title:'Stop preview'},'⏹')),
    h('div',{'data-forge-hearing-status':true,'data-forge-calculation-status':'true',role:'status','aria-live':'polite',className:'f34-transport-status',title:hearingStatus||''},hearingStatus||' ')),
    h('div',{className:'flex flex-wrap items-center gap-1'},
     h('button',{...button,'data-f345-export-format':'wav','aria-label':'Download Listening Mode as WAV',disabled:busy,onClick:()=>e.handleDownloadCurrentPreview('wav')},'⬇ WAV'),
     h('button',{...button,'data-f345-export-format':'flac','aria-label':'Download Listening Mode as FLAC',disabled:busy,onClick:()=>e.handleDownloadCurrentPreview('flac')},'⬇ FLAC'),
     h('button',{...button,disabled:busy,onClick:e.handleExport},'💾 Canvas + JSON')),
    h('div',{className:'f35-tempo-save'},
     h('div',{className:'flex items-center gap-2'},
     h('label',{className:'flex items-center gap-1 text-xs text-neutral-300'},'Tempo',
      h('input',{type:'number',min:20,max:320,step:1,value:e.previewBpmInputValue,disabled:e.previewBpmDisabled,
       onChange:ev=>{const v=Number(ev.target.value);if(Number.isFinite(v))e.updateMaterialExport({bpm:Math.max(20,Math.min(320,Math.round(v)))})},
       style:{width:60},className:'rounded border border-neutral-700 bg-black px-1 py-1 text-right'})),
     h('label',{className:'flex items-center gap-1 text-xs text-neutral-300'},
      h('input',{type:'checkbox','data-forge-loop-toggle':true,checked:e.previewLoopEnabled,disabled:e.previewLoopToggleDisabled,onChange:ev=>e.updateMaterialExport({loopPreview:ev.target.checked})}),'Loop')),
     h('div',{'data-forge-navigator-save-slot':true,className:'f35-navigator-save-slot inline-flex items-center gap-1'},h(__ForgeNavigatorSampleNameInput),h(__ForgeNavigatorPreviewButton),h(__ForgeNavigatorSaveButton))),
    h('div',{className:'f31-trim-import'},h(__F3564TransportTrim,{isPlaying:e.isPlaying,restartPreview:e.handlePlay}),
     h('div',{className:'f31-import-bars'},
      h('button',{...button,'data-forge-import-image':true,'aria-label':'Import Image',title:'Load an image into the drawing',onClick:()=>e.fileInputRef.current?.click()},'▧ Import Image'),
      h('div',{className:'flex items-center gap-2'},
       h(Z_,{label:'Bars',value:e.materialExport.bars,min:1,max:16,onChange:v=>e.updateMaterialExport({bars:J_(v,1,16,e.materialExport.bars)})}),
       h(Z_,{label:'Segments',value:e.materialExport.guideSegments,min:1,max:16,onChange:v=>e.updateMaterialExport({guideSegments:J_(v,1,16,e.materialExport.guideSegments)})})))),
    h('div',{'data-f34-project-save-on-main':'true',className:'f34-project-save-on-main'},h(eVe,{compact:true}))),
   h('div',{className:'f31-transport-bottom'},
    h('div',{'data-forge-hearing-destinations':'v2',className:'f33-rack-destinations'},
     h('div',{'data-forge-transport-picker':'true',className:'f35-rack-hearing-picker'},h(__ForgeListeningPicker,{label:'Listening mode · Play Rack',compact:true})),
     destination('material'),destination('root'),destination('pink')),
    h('div',{'data-forge-project-corner':'true',className:'f33-rack-project-corner'},
     h(jHe,{compact:true,onOpenInSpectralForge:()=>window.setTimeout(()=>{const anchor=document.querySelector('[data-xensonar-spectralforge-workmode-header]');anchor?.scrollIntoView({behavior:'smooth',block:'start'})},80)})))),
  h('input',{ref:e.fileInputRef,type:'file',accept:'image/*,.png,.jpg,.jpeg,.webp,.bmp,.gif',style:{display:'none'},onChange:e.handleImportFile}),
  e.pendingImageImport&&h(w6e,{pendingImageImport:e.pendingImageImport,imagePreviewCanvasRef:e.imagePreviewCanvasRef,spectralWidth:e.spectralWidth,spectralHeight:e.spectralHeight,rendering:busy,closeImageImport:e.closeImageImport,updatePendingImageImport:e.updatePendingImageImport,handleConfirmImageImport:e.handleConfirmImageImport}));
}
function __PureDieterControls(){
 const mode=pe(s=>s.synthMode),mix=pe(s=>s.waveformMix),usesMix=mode!=='ifft';
 return P.createElement('div',{className:'mt-3 space-y-3 text-xs text-neutral-300','data-pure-dieter-controls':true},
  P.createElement('label',{className:'flex items-center gap-2'},'Direct mode',P.createElement('select',{
   'aria-label':'Pure Dieter synthesis',value:mode,onChange:e=>pe.getState().setSynthMode(e.target.value),
   className:'rounded border border-neutral-700 bg-black p-1'},...DGe.map(v=>P.createElement('option',{key:v.id,value:v.id},v.label)))),
  P.createElement('div',{className:'grid grid-cols-2 gap-2',style:{opacity:usesMix?1:.45}},...['sine','sawtooth','square','triangle'].map(k=>P.createElement('label',{
   key:k,className:'flex flex-col gap-1'},k,P.createElement('input',{
    'aria-label':'Pure Dieter '+k,type:'range',min:0,max:1,step:.05,disabled:!usesMix,value:mix[k],
    onChange:e=>pe.getState().setWaveformMix({[k]:+e.target.value})})))),
  P.createElement('p',{className:'text-[10px] text-neutral-400'},
   usesMix?'Waveform mix affects Additive, Granular and Glyph. Changed settings render on Play; exact repeats may use cache.':'IFFT reconstructs the painted spectrum directly; waveform mix does not apply in this mode.'),
  P.createElement('p',{className:'text-[10px] text-neutral-400'},'Stop or a mode change cancels the current render.'));
}

// Content and destination are separate: legacy role values stay readable in old
// archives, but an imported sample is not restricted to one playback instrument.
function __forgeMaterialRootHz(value){return typeof value==='number'&&Number.isFinite(value)&&value>0&&value<=24000?value:null;}
function __ForgeMaterialMetadata({meta,onPatch,selection}){
 const h=P.createElement,duration=selection?.fineLoopRange?.durationSec;
 const label=(text,control)=>h('label',{className:'space-y-1 text-[11px] text-neutral-400'},h('span',{className:'block uppercase tracking-[0.18em] text-neutral-500'},text),control);
 const input='w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-100';
 const count=(key,value)=>h('input',{type:'number',min:1,max:16,value, 'aria-label':key==='bars'?'Number of Bars':'Melodic Loop Bar Segments',onChange:event=>onPatch({[key]:Math.max(1,Math.min(16,Math.round(Number(event.currentTarget.value)||1)))}),className:input});
 return h('section',{'data-forge-material-metadata':true,className:'rounded border border-neutral-800 bg-neutral-900/40 px-3 py-2 text-[11px] text-neutral-300'},
  h('div',{className:'mb-2 uppercase tracking-[0.22em] text-neutral-500'},'Raw Audio · Metadata'),
  h('p',{className:'mb-2 text-neutral-400'},'Sample / Loop · usable in Particles, Wave Starter, Melodic Loop and Drums. The destination does not change the source.'),
  h('div',{className:'grid gap-2 sm:grid-cols-2'},
   label('Number of Bars',count('bars',meta.bars)),
   label('Frequency Anchor (Hz)',h('input',{type:'number',min:1,max:24000,step:'any',value:__forgeMaterialRootHz(meta.rootHz)??'',placeholder:'Auto','aria-label':'Material Frequency Anchor (Hz)',onChange:event=>{const value=event.currentTarget.value;onPatch({rootHz:value===''?null:__forgeMaterialRootHz(Number(value))})},className:input})),
   h('div',null,h('span',{className:'block uppercase text-neutral-500'},'Original Tempo'),h('span',null,meta.bars>0&&duration>0?`${(meta.bars*(meta.beatsPerBar||4)*60/duration).toFixed(1)} BPM · calculated from bars / selection`:'Not calculated yet'))),
  h('p',{className:'mt-2 text-neutral-500'},'Bars describe loop length. The frequency anchor is used for pitch following; empty keeps the existing automatic/default behavior.'),
  h('details',{className:'mt-2'},h('summary',{className:'cursor-pointer text-neutral-400'},'Melodic Loop · visual guides'),label('Bar Segments (Guide Markers)',count('guideSegments',meta.guideSegments)),h('p',{className:'mt-1 text-neutral-500'},'Visual editing guides; no additional Root Follow subdivision.')));
}
