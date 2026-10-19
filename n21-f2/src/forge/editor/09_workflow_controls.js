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
  title:loading?'Preparing current figure · '+fill+' %':playing?'Pause figure preview':state.ready?'Preview ready · starts immediately':'Preview not rendered yet',
  disabled:!state.available,onClick:()=>void __ForgeTransportAccess.activate(),
  className:'relative overflow-hidden inline-flex h-8 min-w-20 items-center justify-center gap-1 rounded border px-2 text-xs font-semibold text-white disabled:opacity-40 '+(loading?'border-neutral-500 bg-neutral-700':playing?'border-red-400 bg-red-600':state.ready?'border-green-400/40 bg-green-600 hover:bg-green-500':'border-neutral-500 bg-neutral-700')},
  loading&&P.createElement('span',{'aria-hidden':true,className:'pointer-events-none absolute inset-x-0 bottom-0 bg-emerald-500/90',style:{height:fill+'%'}}),
  P.createElement('span',{className:'relative z-10'},loading?'■ '+fill+' %':playing?'⏸ Pause':'▶ Play'));
}
function __ForgeNavigatorSaveButton(){
 const h=P.createElement,state=P.useSyncExternalStore(__ForgeNavigatorSample.subscribe,__ForgeNavigatorSample.snapshot,__ForgeNavigatorSample.snapshot);
 const selected=__ForgeNavigatorSample.current();
 return selected?h(P.Fragment,null,
  h('button',{type:'button','data-forge-navigator-save-sample':true,disabled:state.busy,
   'aria-label':'Save selected navigator range as sample',onClick:()=>void __f333SaveNavigatorSample(),
   title:'Save the highlighted audio as a one-shot in the shared Sample Database',
   className:'absolute z-20 left-0 bottom-full mb-1 w-1/2 min-w-max rounded border border-violet-400 bg-violet-950 px-2 py-1 text-[10px] font-semibold text-violet-100 shadow-md hover:bg-violet-800 disabled:opacity-50'
  },state.busy?'Saving…':'Save as Sample'),
  state.message&&h('span',{role:'status',className:'absolute left-0 top-full z-20 max-w-60 whitespace-nowrap rounded bg-black px-1 text-[10px] text-violet-200'},state.message)):
  state.message?h('span',{role:'status',className:'absolute left-0 top-full z-20 text-[10px] text-violet-200'},state.message):null;
}
function __ForgeTransportRack(e){
 const h=P.createElement,choice=__useForgeListeningMode(),busy=e.rendering;
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
    h('div',{'data-forge-hearing-status':true,'data-forge-calculation-status':'true',role:'status','aria-live':'polite',className:'f34-transport-status',title:e.statusMessage||choice.error||''},e.statusMessage||choice.error||' ')),
    h('div',{className:'flex flex-wrap items-center gap-1'},
     h('button',{...button,'data-f345-export-format':'wav','aria-label':'Download Listening Mode as WAV',disabled:busy,onClick:()=>e.handleDownloadCurrentPreview('wav')},'⬇ WAV'),
     h('button',{...button,'data-f345-export-format':'flac','aria-label':'Download Listening Mode as FLAC',disabled:busy,onClick:()=>e.handleDownloadCurrentPreview('flac')},'⬇ FLAC'),
     h('button',{...button,disabled:busy,onClick:e.handleExport},'💾 Canvas + JSON')),
    h('div',{className:'flex items-center gap-2'},
     h('label',{className:'flex items-center gap-1 text-xs text-neutral-300'},'Tempo',
      h('input',{type:'number',min:20,max:320,step:1,value:e.previewBpmInputValue,disabled:e.previewBpmDisabled,
       onChange:ev=>{const v=Number(ev.target.value);if(Number.isFinite(v))e.updateMaterialExport({bpm:Math.max(20,Math.min(320,Math.round(v)))})},
       style:{width:60},className:'rounded border border-neutral-700 bg-black px-1 py-1 text-right'})),
     h('label',{className:'flex items-center gap-1 text-xs text-neutral-300'},
      h('input',{type:'checkbox',checked:e.previewLoopEnabled,disabled:e.previewLoopToggleDisabled,onChange:ev=>e.updateMaterialExport({loopPreview:ev.target.checked})}),'Loop')),
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
     destination('material'),h('div',{className:'relative inline-flex items-center'},
      h(__ForgeNavigatorSaveButton),destination('root')),destination('pink')),
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
