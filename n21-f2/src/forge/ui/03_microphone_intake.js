/* A microphone capture owns only its stream and recorder. Completed audio
   enters the same File -> intake adapter as an ordinary imported donor. */
function __createForgeMicCapture({onFile,onState=()=>{},mediaDevices=navigator.mediaDevices,Recorder=globalThis.MediaRecorder,secure=globalThis.isSecureContext!==false,maxSeconds=60}) {
  let phase='idle',generation=0,disposed=false,stream=null,recorder=null,tick=null,limit=null,started=0;
  const notify=(next,message='',seconds=0)=>{phase=next;if(!disposed)onState({phase,message,seconds});};
  const clearTimers=()=>{clearInterval(tick);clearTimeout(limit);tick=limit=null;};
  const release=()=>{
    clearTimers();
    if(recorder){recorder.ondataavailable=recorder.onstop=recorder.onerror=null;try{if(recorder.state!=='inactive')recorder.stop();}catch{}recorder=null;}
    if(stream){for(const track of stream.getTracks()){track.onended=null;track.stop();}stream=null;}
  };
  const messageFor=error=>error?.name==='NotAllowedError'||error?.name==='SecurityError'
    ?'Mikrofonzugriff wurde nicht erlaubt. Bitte die Mikrofonberechtigung im Browser freigeben und erneut starten.'
    :error?.name==='NotFoundError'?'Kein Mikrofon gefunden. Bitte ein Mikrofon anschließen und erneut starten.'
    :error?.name==='NotReadableError'?'Das Mikrofon ist nicht verfügbar oder wird von einer anderen Anwendung belegt.'
    :error?.message||'Die Mikrofonaufnahme ist fehlgeschlagen.';
  const fail=(error,token)=>{if(disposed||token!==generation)return;generation++;release();notify('failed',messageFor(error));};
  function cancel(){if(disposed||!['requesting','recording'].includes(phase))return;generation++;release();notify('idle','Aufnahme verworfen.');}
  function stop(){
    if(disposed||phase!=='recording')return;
    clearTimers();notify('processing','Aufnahme wird als Audio importiert …');
    try{if(recorder?.state!=='inactive')recorder.stop();}catch(error){fail(error,generation);}
  }
  async function start(){
    if(disposed||!['idle','failed'].includes(phase))return;
    if(!secure||!mediaDevices?.getUserMedia){notify('failed','Mikrofonaufnahme benötigt HTTPS oder localhost und einen Browser mit Mikrofonunterstützung.');return;}
    if(!Recorder){notify('failed','Dieser Browser unterstützt keine Mikrofonaufnahme. Der Audio-Dateiimport ist weiterhin verfügbar.');return;}
    const token=++generation;notify('requesting','Bitte den Mikrofonzugriff im Browser erlauben.');
    try{
      const acquired=await mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
      if(disposed||token!==generation){acquired.getTracks().forEach(track=>track.stop());return;}
      stream=acquired;
      const mime=['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4'].find(type=>Recorder.isTypeSupported?.(type));
      recorder=mime?new Recorder(stream,{mimeType:mime}):new Recorder(stream);
      const current=recorder,chunks=[];let finished=false;
      current.ondataavailable=event=>{if(token===generation&&event.data?.size)chunks.push(event.data);};
      current.onerror=event=>fail(event.error||Error('Die Mikrofonaufnahme wurde unterbrochen.'),token);
      current.onstop=async()=>{
        if(finished||disposed||token!==generation)return;finished=true;
        const type=current.mimeType||chunks[0]?.type||'audio/webm';release();notify('processing','Aufnahme wird als Audio importiert …');
        try{
          if(!chunks.length)throw Error('Die Aufnahme enthält keine Audiodaten. Bitte erneut aufnehmen.');
          const extension=type.includes('ogg')?'ogg':type.includes('mp4')?'m4a':'webm';
          const stamp=new Date().toISOString().replace(/[:.]/g,'-');
          const file=new File(chunks,'Mikrofon_'+stamp+'.'+extension,{type});
          const loaded=await onFile(file);
          if(disposed||token!==generation)return;
          if(loaded===false)throw Error('Die Aufnahme konnte nicht importiert werden. Bitte erneut aufnehmen oder eine Audiodatei importieren.');
          notify('idle','Aufnahme als Donor-Quelle geladen. Unten kannst du die Maske wählen und den Donor anhören.');
        }catch(error){fail(error,token);}
      };
      current.start(250);started=performance.now();notify('recording','Mikrofonaufnahme läuft.',0);
      tick=setInterval(()=>{if(token===generation&&phase==='recording')notify('recording','Mikrofonaufnahme läuft.',Math.min(maxSeconds,(performance.now()-started)/1000));},250);
      limit=setTimeout(stop,maxSeconds*1000);
      for(const track of stream.getAudioTracks())track.onended=stop;
    }catch(error){fail(error,token);}
  }
  function dispose(){if(disposed)return;disposed=true;generation++;release();}
  return {start,stop,cancel,dispose};
}
function __ForgeMicrophoneIntake({onFile,disabled=false,onBusyChange,compact=false}) {
  const [state,setState]=P.useState({phase:'idle',message:'',seconds:0}),owner=P.useRef(null),element=P.useRef(null),importRef=P.useRef(onFile);
  importRef.current=onFile;
  P.useEffect(()=>{
    const capture=__createForgeMicCapture({onFile:file=>importRef.current(file),onState:setState});owner.current=capture;
    const unwatch=__forgeObserveIntakeVisibility(element.current,()=>capture.cancel());
    return()=>{owner.current=null;unwatch();capture.dispose();};
  },[]);
  const recording=state.phase==='recording',requesting=state.phase==='requesting',processing=state.phase==='processing',busy=recording||requesting||processing;
  P.useEffect(()=>{onBusyChange?.(busy);},[busy,onBusyChange]);
  return u.jsxs('div',{ref:element,'data-forge-microphone':state.phase,className:compact?'xen-rack-microphone':'',style:compact?undefined:{display:'flex',flexWrap:'wrap',alignItems:'center',gap:6,maxWidth:440},children:[
    u.jsx('button',{type:'button',disabled:processing||(!busy&&disabled),onClick:()=>recording?owner.current?.stop():requesting?owner.current?.cancel():owner.current?.start(),
      'aria-label':recording?'Stop and import microphone recording':requesting?'Cancel microphone request':processing?'Importing microphone recording':'Microphone',
      style:{border:'1px solid '+(recording?'#f87171':'#3f6e77'),borderRadius:5,padding:'6px 9px',background:recording?'#6b1620':'#10232a',color:'#e5f6f5',opacity:(processing||(!busy&&disabled))?0.5:1},
      title:state.message||'Record audio with Microphone',children:recording?'🎙 Stop · '+state.seconds.toFixed(1)+' s':requesting?'🎙 Cancel':processing?'🎙 Importing…':compact&&state.phase==='failed'?'⚠ Microphone':'🎙 Microphone'}),
    recording&&u.jsx('button',{type:'button',onClick:()=>owner.current?.cancel(),className:'rounded border border-neutral-600 px-2 py-1 text-neutral-300','aria-label':'Discard microphone recording',children:compact?'×':'Discard'}),
    u.jsx('span',{role:'status','aria-live':recording?'off':'polite',className:compact?'sr-only':'',style:compact?undefined:{fontSize:10,color:state.phase==='failed'?'#fca5a5':'#94a3b8',maxWidth:260},children:state.message||'Stimme / Mikrofon · bis 60 s'})
  ]});
}

function __forgeObserveIntakeVisibility(element,onHidden){
  const ancestors=[];for(let node=element;node;node=node.parentElement)ancestors.push(node);
  const hidden=()=>ancestors.some(node=>node.hidden||node.getAttribute('aria-hidden')==='true'||getComputedStyle(node).display==='none'||getComputedStyle(node).visibility==='hidden');
  const observer=new MutationObserver(()=>{if(hidden())onHidden();});
  for(const node of ancestors)observer.observe(node,{attributes:true,attributeFilter:['class','style','hidden','aria-hidden']});
  window.addEventListener('pagehide',onHidden);
  return()=>{observer.disconnect();window.removeEventListener('pagehide',onHidden);};
}
