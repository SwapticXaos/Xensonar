
function __ForgeTransportRack(e){
 const h=P.createElement,choice=__useForgeListeningMode(),busy=e.rendering;
 const rackRef=P.useRef(null);
 P.useLayoutEffect(()=>__ForgeRackVerticalAlign(rackRef.current)||undefined,[]);
 const [__micBusyOnRack,__setMicBusyOnRack]=P.useState(false);
 P.useEffect(()=>{const update=event=>__setMicBusyOnRack(!!event.detail?.busy);window.addEventListener('xensonar:forge:mic-busy',update);return()=>window.removeEventListener('xensonar:forge:mic-busy',update)},[]);
 const navigatorMessage=P.useSyncExternalStore(__ForgeNavigatorSample.subscribe,()=>__ForgeNavigatorSample.snapshot().message,()=>__ForgeNavigatorSample.snapshot().message);
 const navigatorSelectionState=P.useSyncExternalStore(__ForgeNavigatorSample.subscribe,__ForgeNavigatorSample.snapshot,__ForgeNavigatorSample.snapshot);
 const navigatorSelection=__ForgeNavigatorSample.current();
 const [__pinkAvailabilityRevision,__setPinkAvailabilityRevision]=P.useState(0);
 const suggestedBars=__f333NavigatorEstimateBars(navigatorSelection,e.materialExport.bars);
 const effectiveBars=__f333NavigatorBars(e.materialExport.bars);
 const barsManuallySet=Number.isFinite(navigatorSelectionState.barsDraft);
 const hearingStatus=[e.statusMessage||choice.error,navigatorMessage].filter(Boolean).join(' · '); P.useEffect(()=>{window.__ForgeBottomStatusState?.publish(hearingStatus)},[hearingStatus]);
 const button={type:'button',className:'h-8 rounded border border-neutral-700 bg-neutral-900 px-2 text-xs text-neutral-100 hover:bg-neutral-800'};
 const routing={
  material:{label:'Send to Material Track',color:'border-cyan-400 bg-cyan-800 hover:bg-cyan-700',sheen:'rgba(8,145,178,.18)',icon:'📀'},
  root:{label:'Use as Root Follow Loop',color:'border-violet-400 bg-violet-800 hover:bg-violet-700',sheen:'rgba(139,92,246,.08)',icon:'🎼'},
  pink:{label:'Send to Pink Track (Melodic Loop)',color:'border-pink-400 bg-pink-800 hover:bg-pink-700',sheen:'rgba(236,72,153,.16)',icon:'🎶'}
 };
 // Re-use Material Intake's existing file input. No second importer or state.
 const importAudio=()=>{
  const fileInput=document.querySelector('[data-material-intake-gateway] input[type="file"]');
  if(fileInput&&!fileInput.disabled){fileInput.click();return;}
  document.querySelector('[data-material-intake-gateway]')?.scrollIntoView({block:'start',behavior:'smooth'});
 };
 /* S1: Both transport destinations expose their existing, distinct contracts here.
    The panels float rather than reflowing the tuned Forge play-rack. */
 const [sendFlyout,setSendFlyout]=P.useState(null);
 P.useEffect(()=>{
  if(sendFlyout?.id!=='pink')return;
  let frame=0;
  const invalidate=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;__setPinkAvailabilityRevision(v=>v+1)})};
  const remove=[pe.subscribe(invalidate),Vt.subscribe(invalidate),
   __ForgeDonorRoutingF317.subscribe(invalidate),__ForgeNavigatorSample.subscribe(invalidate)];
  return()=>{if(frame)cancelAnimationFrame(frame);for(const un of remove)if(typeof un==='function')un()};
 },[sendFlyout?.id]);
 const pinkCapabilities=P.useMemo(()=>sendFlyout?.id==='pink'?
   __xenSfmlDirectAvailability(pe.getState(),navigatorSelection):null,
   [sendFlyout?.id,navigatorSelection,__pinkAvailabilityRevision]);
 const [rootMachine,setRootMachine]=P.useState(()=>{
   const selected=pe.getState()?.carrierIntegralSelection?.machineId;
   return oze({machineId:selected,targetId:'root-follow-export'})?.rootFollowMembershipConfig==='artifact-config'?selected:'branch-b573-synth-window';
 });
 const [quickSendBusy,setQuickSendBusy]=P.useState(false);
 const [quickSendFeedback,setQuickSendFeedback]=P.useState(null);
 const rootMachines=P.useMemo(()=>TK().machineItems.filter(item=>
    oze({machineId:item.id,targetId:'root-follow-export'})?.rootFollowMembershipConfig==='artifact-config'),[]);
 P.useEffect(()=>{
   if(!sendFlyout)return;
   const outside=event=>{if(!quickSendBusy&&!event.target?.closest?.('[data-forge-quick-send-panel], [data-forge-quick-send-trigger]'))setSendFlyout(null)};
   const key=event=>{if(event.key==='Escape'&&!quickSendBusy){setSendFlyout(null);event.stopPropagation()}};
   document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key,true);
   return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key,true)};
 },[sendFlyout,quickSendBusy]);
 const showQuickSend=(id,event)=>{
   if(busy||quickSendBusy)return;
   if(id==='root'){const selected=pe.getState()?.carrierIntegralSelection?.machineId;
     if(oze({machineId:selected,targetId:'root-follow-export'})?.rootFollowMembershipConfig==='artifact-config')setRootMachine(selected);}
   const r=event.currentTarget.getBoundingClientRect(),width=Math.min(330,window.innerWidth-20);
   const left=Math.min(Math.max(10,r.left),Math.max(10,window.innerWidth-width-10));
   const top=r.bottom+258>window.innerHeight?Math.max(10,r.top-268):r.bottom+6;
   setQuickSendFeedback(null);setSendFlyout(old=>old?.id===id?null:{id,left,top,width});
 };
 const quickSend=async(kind,mode)=>{
   if(busy||quickSendBusy)return;
   const routeLabel=kind==='root'?(mode==='structured'?'Structured Carrier · '+Mze(rootMachine):'Raw Audio'):
     ({scattered:'Scattered', 'last-hearing':'Fretless Field',monotone:'Monotone',grained:'Raw Audio'}[mode]||mode);
   setQuickSendBusy(true);
   setQuickSendFeedback({phase:'sending',message:'Preparing · '+routeLabel+' → '+(kind==='root'?'Root Follow Loop':'Melodic Loop')+' …'});
   try{
     let receipt;
     if(kind==='root'&&mode==='structured'){
       if(__ForgeNavigatorSample.current())throw Error('Structured Root Follow exports the full painted figure. Clear the purple selection first.');
       const state=pe.getState(),snapshot=state.createProjectSnapshot();
       if(!snapshot?.spectralSnapshot||!snapshot?.materialExport)throw Error('No complete editable Carrier drawing is available.');
       const contract=oze({machineId:rootMachine,targetId:'root-follow-export'});
       if(contract?.rootFollowMembershipConfig!=='artifact-config')throw Error('This machine does not export a structured Root Follow plan.');
       const name=__f333NavigatorTypedName()||String(state.materialExport?.name||'Carrier').trim()||'Carrier';
       const result=await Wje({entry:{id:'forge-current-'+crypto.randomUUID(),name},snapshot,
         machineId:rootMachine,targetId:'root-follow-export',targetLabel:'Root Follow Loop',
         valueSource:'right-override',selectionOverride:{...state.carrierIntegralSelection,machineId:rootMachine,source:'user'},
         synthLabOverride:state.carrierIntegralSynthLab,storedSynthLab:state.carrierIntegralSynthLab,
         currentSynthLab:state.carrierIntegralSynthLab,harmonicXploreOverride:state.carrierIntegralHarmonicXplore,
         storedHarmonicXplore:state.carrierIntegralHarmonicXplore,currentHarmonicXplore:state.carrierIntegralHarmonicXplore,
         previewBpm:Number(state.materialExport.bpm)||108,previewVolume:1,
         previewPitchSemitones:__f3565PitchSemis(),verifiedRootFollow:true});
       if(!result?.ok||result?.verifiedRootReceipt?.stage!=='root-bank-verified')throw Error(result?.reason||'Root Follow bank did not verify this structured transfer.');
       receipt={ok:true,stage:'root-bank-verified',entryName:result.materialEntry?.name||result.projectName||name,machineLabel:result.machineLabel||Mze(rootMachine)};
     }else if(kind==='root'){
       receipt=await e.handleSendCurrentPreviewToXensonar('root');
     }else if(kind==='pink'){
       const allowed=__xenSfmlDirectAvailability(pe.getState(),__ForgeNavigatorSample.current())[mode];
       if(!allowed?.ready)throw Error(allowed?.reason||'This projection is not available for the current figure.');
       receipt=await e.handleSendCurrentPreviewToXensonar('pink',mode);
     }else throw Error('Unknown send destination.');
     if(!receipt?.ok)throw Error(receipt?.reason||'Sender did not return a confirmed handoff result.');
     // Commit/readback belongs to each native owner. A synchronous event handoff
     // is not the same as a verified persistent save or a completed Pink import.
     const label=receipt.entryName||'current figure';
     const message=kind==='root'?
       (receipt.stage==='root-bank-verified'?'Root Follow stored (synthetic) · ':'Root Follow notified (audio) · ')+(receipt.machineLabel?receipt.machineLabel+' · ':'')+label+(receipt.stage==='root-bank-verified'?' · bank read-back OK.':' · bank persistence not yet verified.'):
       'Melodic handoff sent · '+label+' · receiver is importing automatically.';
     setQuickSendFeedback({phase:'sent',message});
     e.setStatusMessage?.(message);
     // Keep the Root Follow receipt by the button until explicitly dismissed.
     // Pink may navigate to the receiver; its chooser is the import confirmation.
   }catch(error){
     const message=error instanceof Error?error.message:String(error);
     setQuickSendFeedback({phase:'failed',message:'Send failed · '+message});
     e.setStatusMessage?.('Send failed · '+message);
   }finally{setQuickSendBusy(false)}
 };
 const sendPanel=sendFlyout?h('section',{'data-forge-quick-send-panel':sendFlyout.id,role:'dialog',
   'aria-label':sendFlyout.id==='root'?'Choose Root Follow representation':'Choose Melodic Loop interpretation',
   style:{position:'fixed',top:sendFlyout.top,left:sendFlyout.left,width:sendFlyout.width,maxHeight:'min(340px, calc(100vh - 20px))',
     overflowY:'auto',zIndex:210,background:'#090b16',border:'1px solid '+(sendFlyout.id==='root'?'#a78bfa':'#f472b6'),
     borderRadius:12,padding:11,boxShadow:'0 14px 32px rgba(0,0,0,.75)',color:'#f3f4f6'}},
   h('div',{className:'flex items-center justify-between gap-2 mb-2'},
    h('strong',{className:'text-xs'},sendFlyout.id==='root'?'Root Follow · choose signal':'Melodic Loop · choose projection'),
    h('button',{type:'button','aria-label':'Close send choices',disabled:quickSendBusy,onClick:()=>setSendFlyout(null)},'×')),
   sendFlyout.id==='root'?h(P.Fragment,null,
    h('button',{type:'button','data-forge-send-choice':'root-raw',disabled:quickSendBusy,className:'w-full text-left rounded border border-violet-800 bg-violet-950/30 px-3 py-2 text-xs mb-2',onClick:()=>void quickSend('root','raw')},'Send Raw Audio · heard sound / granular'),
    h('label',{className:'block text-[11px] mb-2'},'Structured Carrier · machine',
     h('select',{'data-forge-root-machine':true,value:rootMachine,disabled:quickSendBusy,className:'block mt-1 w-full bg-neutral-900 border border-violet-700 rounded p-1 text-xs',onChange:ev=>setRootMachine(ev.currentTarget.value)},
      ...rootMachines.map(item=>h('option',{value:item.id,key:item.id},Mze(item.id))))),
    h('button',{type:'button','data-forge-send-choice':'root-structured',disabled:quickSendBusy||!!navigatorSelection,className:'w-full text-left rounded border border-violet-500 bg-violet-900/50 px-3 py-2 text-xs',onClick:()=>void quickSend('root','structured')},'Send continuous / synthetic Root Follow plan'),
    navigatorSelection&&h('p',{className:'text-[10px] mt-1 text-amber-200'},'Full-figure structured export only; clear selection first.')
   ):h(P.Fragment,null,
    ...[{id:'scattered',label:'Scattered · grid projection'},{id:'last-hearing',label:'Fretless Field · continuous'},{id:'monotone',label:'Monotone · anchor curve'},{id:'grained',label:'Raw Audio · rendered sound'}]
      .map(item=>{const availability=pinkCapabilities?.[item.id];return h('button',{
       key:item.id,type:'button','data-forge-send-choice':'pink-'+item.id,
       'aria-label':item.label+(availability?.ready?'': ' · Unavailable: '+(availability?.reason||'No compatible figure')),
       title:availability?.ready?'One click imports directly into Melodic Loop':availability?.reason||'Unavailable',
       disabled:quickSendBusy||!availability?.ready,
       className:'w-full text-left rounded border border-pink-900/80 bg-pink-950/25 px-3 py-2 text-xs mb-1 hover:bg-pink-900/50 disabled:opacity-35 disabled:cursor-not-allowed',
       onClick:()=>void quickSend('pink',item.id)},item.label,
       !availability?.ready&&h('span',{className:'block text-[10px] text-amber-300/90 mt-1'},'Unavailable · '+(availability?.reason||'No compatible figure')))}),
    h('p',{className:'text-[10px] mt-1 text-neutral-400'},'Available modes import immediately. Melodic Loop verifies the inserted track; no second confirmation.')),
   quickSendFeedback&&h('div',{'data-forge-send-feedback':quickSendFeedback.phase,
     role:quickSendFeedback.phase==='failed'?'alert':'status','aria-live':quickSendFeedback.phase==='failed'?'assertive':'polite',
     className:'rounded border px-2.5 py-2 text-xs mt-2 '+(quickSendFeedback.phase==='failed'?'border-rose-500 bg-rose-950/65 text-rose-100':quickSendFeedback.phase==='sent'?'border-emerald-500/80 bg-emerald-950/60 text-emerald-100':'border-cyan-500/70 bg-cyan-950/60 text-cyan-100')},
     quickSendFeedback.phase==='sending'?'◌ ':quickSendFeedback.phase==='sent'?'✓ ':'! ',quickSendFeedback.message)
  ):null;
 const microphoneDock=h('div',{'data-forge-rack-microphone-slot':'true',className:'xen-rack-microphone-dock'});
 const verticalImport=h('button',{
  type:'button','data-forge-rack-import-audio':'true',
  className:'xen-vertical-import-audio',
  'aria-label':'Import Audio',
  title:'Import Audio · load an audio file into Material Intake',disabled:__micBusyOnRack,onClick:importAudio,
 },h('span',{'aria-hidden':true,className:'xen-vertical-import-words'},
     h('span',null,...'IMPORT'.split('').map(ch=>h('span',null,ch))),
     h('span',null,...'AUDIO'.split('').map(ch=>h('span',null,ch)))),
   h('svg',{'aria-hidden':true,className:'xen-vertical-import-arrow',viewBox:'0 0 44 23'},
     h('path',{d:'M2 2 H42 L22 21 Z',fill:'currentColor'})));
 const destination=id=>h('button',{
   type:'button','data-f318-export-target':id,'data-forge-navigator-route-active':navigatorSelection?'true':'false',disabled:busy,
   'data-forge-quick-send-trigger':id==='pink'?id:undefined,
   'aria-haspopup':id==='pink'?'dialog':undefined,
   'aria-expanded':id==='pink'?(sendFlyout?.id==='pink'?true:false):undefined,
   onClick:event=>id==='pink'?showQuickSend(id,event):e.handleSendCurrentPreviewToXensonar(id),
   title:id==='pink'?'Choose transfer interpretation':navigatorSelection?'Send only the purple Navigator selection · '+effectiveBars+' bars':'Send the entire Forge figure',
   // A translucent purple sheen marks selection routing but keeps every
   // destination's native cyan / violet / pink background and border.
   style:navigatorSelection?{
    backgroundImage:'linear-gradient(180deg, rgba(196,181,253,.12), rgba(124,58,237,.08)), linear-gradient('+routing[id].sheen+', '+routing[id].sheen+')',
    boxShadow:'inset 0 0 0 1px rgba(196,181,253,.19), 0 0 7px rgba(139,92,246,.11)'
   }:undefined,
   className:'h-9 inline-flex items-center gap-2 rounded border text-xs font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:opacity-50 '+(id==='pink'?'f35-pink-destination ':'px-3 ')+routing[id].color
  },id==='material'?
   h('span',{'aria-hidden':true,className:'text-base leading-none'},routing[id].icon):
   h('span',{'aria-hidden':true,className:'relative inline-flex h-5 w-5 shrink-0 items-center justify-center'},
    h('span',{className:'absolute h-4 w-4 rounded-full bg-white shadow-sm'}),
    h('span',{className:'relative z-10 text-[17px] leading-none'},routing[id].icon)),
   h('span',null,routing[id].label));
 return h(P.Fragment,null,
  h('div',{'data-forge-play-rack':true,className:'f31-play-rack',ref:rackRef},
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
    null),
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
      h('div',{className:'xen-rack-import-top'},
       h('button',{...button,'data-forge-import-image':true,'aria-label':'Import Image',title:'Load an image into the drawing',onClick:()=>e.fileInputRef.current?.click()},'▧ Import Image'),
       microphoneDock,
       h('span',{className:'xen-rack-vertical-import-anchor'},verticalImport)),
      h('div',{className:'flex items-center gap-2'},
       navigatorSelection?h('label',{'data-forge-navigator-bars':'true',title:'Estimated from the purple selection and Carrier bar grid; editable without changing the Carrier.',className:'flex items-center gap-1 rounded border border-violet-400 px-2 py-1 text-[10px] text-violet-100',style:{backgroundColor:'#4c1d95'}},
        h('span',{className:'uppercase tracking-[0.14em] text-violet-200'},'Bars'),
        h(__XenMaterialBarsInput,{'aria-label':'Navigator selection bars',value:navigatorSelectionState.barsDraft===''?'':effectiveBars,
         onCommit:bars=>__ForgeNavigatorSample.update({barsDraft:bars}),
         className:'h-6 w-12 rounded border border-violet-500 px-1.5 text-right font-mono text-[11px] text-violet-50',style:{backgroundColor:'#5b21b6'}}),
        !barsManuallySet&&h('span',{'aria-label':'Estimated bars',title:'Estimated · confirm by editing',className:'font-bold text-violet-200'},'?')):
        h('label',{'data-forge-transport-bars':'true',className:'flex items-center gap-1 rounded border border-neutral-700 bg-neutral-950/80 px-2 py-1 text-[10px] text-neutral-300'},h('span',{className:'uppercase tracking-[0.14em] text-neutral-500'},'Bars'),h(__XenMaterialBarsInput,{'aria-label':'Transport Bars',value:e.materialExport.bars,onCommit:bars=>e.updateMaterialExport({bars}),max:16,className:'h-6 w-12 rounded border border-neutral-700 bg-black px-1.5 text-right font-mono text-[11px] text-emerald-100'})),
       navigatorSelection?h('div',{'data-forge-navigator-segments':'true','aria-label':'Segments not applicable to navigator selection',className:'flex items-center gap-1 rounded border px-2 py-1 text-[10px] text-violet-300',style:{backgroundColor:'rgba(76,29,149,.35)',borderColor:'rgba(167,139,250,.45)',opacity:.5},title:'Segments belong to the full Carrier grid; the selected clip uses its own bar count.'},
        h('span',{className:'uppercase tracking-[0.14em]'},'Segments'),h('span',{className:'h-6 w-12'})):
        h(Z_,{label:'Segments',value:e.materialExport.guideSegments,min:1,max:16,onChange:v=>e.updateMaterialExport({guideSegments:J_(v,1,16,e.materialExport.guideSegments)})})))),
    h('div',{'data-f34-project-save-on-main':'true',className:'f34-project-save-on-main'},h(eVe,{compact:true})),
    h('div',{'data-forge-transport-picker':'true',className:'f35-rack-hearing-picker f35-rack-hearing-picker-raised'},h(__ForgeListeningPicker,{label:'Listening mode · Play Rack',compact:true}))),
   h('div',{className:'f31-transport-bottom'},
    h('div',{'data-forge-hearing-destinations':'v2',className:'f33-rack-destinations'},
     h(__ForgeSendToEditorButton),
     destination('material'),destination('root'),destination('pink'),sendPanel),
    h('div',{'data-forge-project-corner':'true',className:'f33-rack-project-corner'},
     h(jHe,{compact:true,onOpenInSpectralForge:()=>window.setTimeout(()=>{const anchor=document.querySelector('[data-xensonar-spectralforge-workmode-header]');anchor?.scrollIntoView({behavior:'smooth',block:'start'})},80)})))),
  h('input',{ref:e.fileInputRef,type:'file',accept:'image/*,.png,.jpg,.jpeg,.webp,.bmp,.gif',style:{display:'none'},onChange:e.handleImportFile}),
  e.pendingImageImport&&h(w6e,{pendingImageImport:e.pendingImageImport,imagePreviewCanvasRef:e.imagePreviewCanvasRef,spectralWidth:e.spectralWidth,spectralHeight:e.spectralHeight,rendering:busy,closeImageImport:e.closeImageImport,updatePendingImageImport:e.updatePendingImageImport,handleConfirmImageImport:e.handleConfirmImageImport}));
}
