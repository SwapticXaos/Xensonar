/* This is an explicit canvas replacement, separate from applying a donor's
   timbre. One worker prepares a neutral carrier; the common commit owns Undo. */
function __AudioToCarrierControls({source,range,disabled=false,onBusyChange}) {
  const [status,setStatus]=P.useState({phase:'idle',progress:0,message:''}),[settings,setSettings]=P.useState({voices:4,strictness:.5,noiseDb:-46,minimumMs:90,register:'standard'});
  const controller=P.useRef(null),generation=P.useRef(0),element=P.useRef(null),filterPanel=P.useRef(null),input=P.useRef(null);
  input.current={source,start:range?.startSec,duration:range?.durationSec};
  const busy=status.phase==='analyzing';
  const cancel=P.useCallback(()=>{generation.current++;controller.current?.abort();controller.current=null;setStatus(previous=>previous.phase==='analyzing'?{phase:'idle',progress:0,message:'Analyse abgebrochen; Carrier unverändert.'}:previous);},[]);
  P.useEffect(()=>{onBusyChange?.(busy);},[busy,onBusyChange]);
  P.useEffect(()=>{cancel();setStatus({phase:"idle",progress:0,message:""});},[source,range?.startSec,range?.durationSec,cancel]);
  P.useEffect(()=>{if(disabled)cancel();},[disabled,cancel]);
  P.useEffect(()=>{const unwatch=__forgeObserveIntakeVisibility(element.current,cancel);return()=>{generation.current++;controller.current?.abort();unwatch();};},[cancel]);
  async function transform(){
    if(busy||disabled||!source||!range)return;
    const token=++generation.current,abort=new AbortController();controller.current=abort;
    const captured={...input.current},version=pe.getState().renderVersion;
    setStatus({phase:'analyzing',progress:0,message:'Tonhöhen werden im Hintergrund analysiert …'});
    try{
      await new Promise(resolve=>requestAnimationFrame(resolve));
      if(abort.signal.aborted)return;
      const register=settings.register==='deep'?{minHz:35,maxHz:1200}:settings.register==='high'?{minHz:100,maxHz:3000}:{minHz:65,maxHz:1600};
      const result=await __audioCarrierAnalyze(source,range,{...settings,...register},{signal:abort.signal,onProgress:progress=>{if(token===generation.current)setStatus({phase:'analyzing',progress,message:'Tonhöhen werden im Hintergrund analysiert …'});}});
      if(token!==generation.current)return;
      const current=input.current;
      if(current.source!==captured.source||current.start!==captured.start||current.duration!==captured.duration||pe.getState().renderVersion!==version)throw Error('Quelle, Maske oder Carrier wurde inzwischen geändert. Bitte erneut starten.');
      if(!result.notes.length)throw Error('Keine stabilen Töne erkannt. Rauschschwelle/Strenge senken oder eine klarere Audio-Maske wählen.');
      const transfer=__audioCarrierDocument(result,pe.getState().materialExport);
      transfer.name=(source.fileName||'Audio').replace(/\.[^.]+$/,'')+' · Carrier';
      transfer.carrier.extraction={algorithm:'harmonic-pitch-skeleton-v1',settings:result.settings,sourceName:source.fileName||'Audio',startSec:range.startSec,durationSec:result.durationSec};
      __f334CommitCarrier(transfer,{neutral:true,message:'Audio als neutrale Tonlinien übernommen.'});__f333PersistNow();
      setStatus({phase:'idle',progress:1,message:result.notes.length+' Tonlinien übernommen · Klangmaschine beibehalten · Undo stellt die vorherige Figur wieder her.'});
      requestAnimationFrame(()=>document.querySelector('#spectralforge-station-draw')?.scrollIntoView({block:'start',behavior:'auto'}));
    }catch(error){if(token===generation.current&&error?.name!=='AbortError'){setStatus({phase:'failed',progress:0,message:error.message||'Audioanalyse fehlgeschlagen.'});if(filterPanel.current)filterPanel.current.open=true;}}
    finally{if(token===generation.current)controller.current=null;}
  }
  const field=(key,label,min,max,step,display)=>u.jsxs('label',{style:{display:'grid',gap:3,minWidth:140,fontSize:10},children:[label,u.jsx('input',{type:'range',min,max,step,value:settings[key],'aria-label':label,onChange:event=>{const next=Number(event.currentTarget.value);setSettings(value=>({...value,[key]:next}));}}),u.jsx('output',{children:display})]});
  return u.jsxs('div',{ref:element,'data-audio-to-carrier':status.phase,className:'xen-carrier-actions',children:[
    u.jsx('button',{type:'button',disabled:!busy&&(disabled||!source||!range),onClick:busy?cancel:transform,'aria-busy':busy,
      title:status.message?status.message+' · Audio to Carrier · Undo bleibt verfügbar.':'Audio to Carrier · erkennt Grundtonlinien aus der unteren Raw-Audio-Maske, auch Akkorde. Ersetzt die Carrier-Figur; Undo bleibt verfügbar.',
      className:'xen-carrier-transform',
      children:busy?'Abbrechen · '+Math.round(status.progress*100)+' %':'Transform to Carrier'}),
    u.jsxs('details',{ref:filterPanel,className:'xen-carrier-filter',children:[u.jsxs('summary',{title:'Erkennungsfilter für Transform to Carrier','aria-label':'Filter für Transform to Carrier',children:[u.jsx('span',{className:'xen-carrier-filter-text',children:'Filter'}),u.jsx('span',{className:'xen-carrier-filter-chevron','aria-hidden':true,children:'⌄'})]}),u.jsx('fieldset',{disabled:busy,className:'xen-carrier-filter-panel',children:u.jsxs(P.Fragment,{children:[
      field('voices','Max. gleichzeitige Töne',1,6,1,String(settings.voices)),field('noiseDb','Rauschschwelle',-70,-20,1,settings.noiseDb+' dB'),field('strictness','Erkennungsstrenge',0,1,.05,Math.round(settings.strictness*100)+' %'),field('minimumMs','Mindest-Tonlänge',40,240,10,settings.minimumMs+' ms'),
      u.jsxs('label',{style:{fontSize:10},children:['Tonbereich',u.jsxs('select',{'aria-label':'Tonbereich',value:settings.register,onChange:event=>{const next=event.currentTarget.value;setSettings(value=>({...value,register:next}));},style:{display:'block',background:'#171322',padding:4,border:'1px solid #4d3e61'},children:[u.jsx('option',{value:'standard',children:'Stimme / Gitarre · 65–1600 Hz'}),u.jsx('option',{value:'deep',children:'Tief · 35–1200 Hz'}),u.jsx('option',{value:'high',children:'Hoch · 100–3000 Hz'})]})]}),
      u.jsx('span',{style:{fontSize:10,maxWidth:240,color:'#aaa1b7'},children:'Mehr Strenge unterdrückt unsichere Töne. Leisere Rauschschwelle für leise Stimmen. Sehr dichte Akkorde und Oktav-Dopplungen können mehrdeutig bleiben.'}),
      (status.phase!=='idle'||status.message)&&u.jsx('div',{role:'status','aria-live':'polite',className:'xen-carrier-feedback',style:{color:status.phase==='failed'?'#fca5a5':'#b6a8c9'},children:status.message})
    ]})})]})
  ]});
}
