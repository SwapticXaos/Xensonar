/* S1 P0: opt-in control-thread admission trace. No DSP/process instrumentation.
   Use XenSonarAudioTrace.start(), then read(), and stop() in DevTools.
   'started' confirms the Worklet accepted a message, not audible output. */
const __XenAudioProbe=(()=>{
  let enabled=false,sequence=0,eventSequence=0,session=0,counts=Object.create(null),records=[];
  const cap=4096;
  const api={
    get enabled(){return enabled;},
    stats(){return {enabled,session,events:Math.min(sequence,cap),truncated:Math.max(0,sequence-cap)};},
    start(){enabled=true;session++;sequence=0;eventSequence=0;counts=Object.create(null);records=[];return api;},
    stop(){enabled=false;return api.read();},
    read(){const list=records.length<cap?records.slice():records.slice(sequence%cap).concat(records.slice(0,sequence%cap));return {enabled,session,counts:{...counts},records:list,truncated:Math.max(0,sequence-cap)};},
    begin(lane,now,origin='host'){
      if(!enabled)return null;
      const id=session+':'+(++eventSequence);
      api.record('ingress',lane,'requested',now,id,{origin});return id;
    },
    record(stage,lane,reason,now,eventId=null,details=null){
      if(!enabled)return;
      // Delayed acknowledgements from a previous capture are not current data.
      if(eventId!==null&&(typeof eventId!=='string'||!eventId.startsWith(session+':')))return;
      const key=stage+'|'+lane+'|'+reason;counts[key]=(counts[key]||0)+1;
      const item={seq:++sequence,eventId,stage,lane,reason,atMs:
        (typeof performance!=='undefined'?performance.now():Date.now())};
      if(Number.isFinite(now))item.eventTimeSec=now;
      if(details)item.details={...details};
      if(records.length<cap)records.push(item);else records[(sequence-1)%cap]=item;
    }
  };
  return Object.freeze(api);
})();
if(typeof globalThis!=='undefined')globalThis.XenSonarAudioTrace=__XenAudioProbe;
function readInstrumentDiagnostics(){return __XenAudioProbe.read();}

/* P3C-DIAG: bounded control-thread sound selection and routing timeline.
   No AudioWorklet logging, FFT, per-sample instrumentation or graph mutation.
   Each entry carries wall, performance, and (when available) AudioContext clocks. */
const __XenSoundTrace=(()=>{
  const maxEvents=16000, history=[];
  let sequence=0, dropped=0, markerCount=0, latest=null, latestKey='', phasesKey='', configurationKey='', capturing=true,lastLoadKey='',lastLoadAt=0;
  const clock=(ctx)=>({iso:new Date().toISOString(),epochMs:Date.now(),perfMs:typeof performance!=='undefined'?performance.now():null,audioSec:Number.isFinite(ctx?.currentTime)?ctx.currentTime:null,audioState:ctx?.state??null});
  const clean=(value,depth=0)=>{
    if(value===null||typeof value==='string'||typeof value==='boolean')return value;
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    if(Array.isArray(value))return depth<4?value.slice(0,128).map(x=>clean(x,depth+1)):null;
    if(typeof value==='object'&&depth<4){const result={};let i=0;
      for(const [key,item] of Object.entries(value)){if(++i>160)break;
        if(typeof item==='function'||key.startsWith('_')||item instanceof ArrayBuffer)continue;
        result[key]=clean(item,depth+1);
      }return result;
    }return null;
  };
  const put=(kind,slot,data,ctx)=>{
    if(!capturing)return null;
    const entry={seq:++sequence,...clock(ctx),kind,slot:slot??null,data:clean(data)};
    if(history.length===maxEvents){history.shift();dropped++;}
    history.push(entry);return entry;
  };
  const api={
    get enabled(){return capturing;},
    start(){capturing=true;history.length=0;sequence=0;dropped=0;markerCount=0;latestKey='';phasesKey='';configurationKey='';lastLoadKey='';lastLoadAt=0;if(latest)api.observe(latest,true);return api;},
    stop(){capturing=false;return api.read();},
    request(slot,next,details=null){return put('source-request',slot,{requested:next,details});},
    mark(kind,slot,data=null,ctx=null){return put(kind,slot,data,ctx);},
    sideMarker(side,marker=null,recordingActive=false){if(side!=="left"&&side!=="right")return null;const event=put("recorder-side-marker",null,{side,markerId:marker?.id??null,recordingTimeMs:recordingActive?marker?.timeMs??null:null,recordingActive:!!recordingActive,allSources:latest?.sources??null,settings:latest?.settings??null,room:latest?.room??null,note:"User annotation, not an automatically detected audio dropout"},latest?.audioContext??null);if(event){markerCount++;if(typeof window!=="undefined"&&typeof CustomEvent!=="undefined")window.dispatchEvent(new CustomEvent("xensonar-recorder-side-marker",{detail:{seq:event.seq,side,recordingActive}}));}return event;},
    observe(snapshot,force=false){
      if(!snapshot)return;
      latest=snapshot;
      const sources=snapshot.sources||{}, nodal=snapshot.nodal||{};
      const key=JSON.stringify(Object.fromEntries(Object.entries(sources).map(([slot,v])=>[slot,v?.id??null])));
      const phase=JSON.stringify(Object.fromEntries(Object.entries(nodal).map(([slot,v])=>[slot,[v?.desired,v?.active,v?.phase,v?.contextReady,v?.error]])));
      if(force||key!==latestKey){
        const old=latestKey?JSON.parse(latestKey):{};
        const next=JSON.parse(key);
        for(const slot of ['wave','keyboard','particle'])if(force||old[slot]!==next[slot]){
          put(force?'capture-baseline':'source-committed',slot,{previous:old[slot]??null,current:next[slot]??null,
            selection:sources[slot]??null,allSources:sources,nodal,settings:snapshot.settings,
            audio:snapshot.audio,room:snapshot.room},snapshot.audioContext);
        }
        latestKey=key;
      }
      // Preset can remain selected while the sound itself is reconfigured.
      // This is a control-rate snapshot, not a per-sample modulation log.
      const configurations=Object.fromEntries(Object.entries(sources).map(([slot,source])=>[slot,source]));
      const configuration=JSON.stringify({configurations,settings:snapshot.settings});
      if(!force&&configurationKey&&configuration!==configurationKey){
        const previous=JSON.parse(configurationKey),now=JSON.parse(configuration);
        const changedSettings=Object.keys(now.settings||{}).filter(k=>JSON.stringify(previous.settings?.[k])!==JSON.stringify(now.settings[k]));
        for(const slot of ['wave','keyboard','particle'])if(JSON.stringify(previous.configurations?.[slot])!==JSON.stringify(now.configurations?.[slot])){
          put('source-configuration',slot,{current:sources[slot],settings:snapshot.settings,changedSettings},snapshot.audioContext);
        }
        if(changedSettings.length&&!['wave','keyboard','particle'].some(slot=>JSON.stringify(previous.configurations?.[slot])!==JSON.stringify(now.configurations?.[slot]))){
          put('instrument-settings',null,{changedKeys:changedSettings,settings:snapshot.settings,allSources:sources},snapshot.audioContext);
        }
      }
      configurationKey=configuration;
      const load=snapshot.load||null;
      if(load){
        const loadKey=JSON.stringify({activeVoices:load.activeVoices,activeCost:load.activeCost,readyPlans:load.readyPlans});
        const now=typeof performance!=='undefined'?performance.now():Date.now();
        if(force||loadKey!==lastLoadKey&&now-lastLoadAt>=250||now-lastLoadAt>=2000){
          put('nodal-capacity-sample',null,{...load,sources:Object.fromEntries(Object.entries(sources).map(([key,v])=>[key,v.id]))},snapshot.audioContext);
          lastLoadAt=now;lastLoadKey=loadKey;
        }
      }
      if(force||phase!==phasesKey){
        const old=phasesKey?JSON.parse(phasesKey):{};
        const now=JSON.parse(phase);
        for(const slot of ['wave','keyboard','particle'])if(force||JSON.stringify(old[slot])!==JSON.stringify(now[slot])){
          put('nodal-readiness',slot,{...nodal[slot],selected:sources[slot]?.id??null},snapshot.audioContext);
        }
        phasesKey=phase;
      }
    },
    stats(){return {enabled:capturing,events:history.length,dropped,markerCount};},
    read(){return{schema:'xensonar-sound-selection-trace-v1',enabled:capturing,capacity:maxEvents,
      dropped,markerCount,events:history.slice(),latest:clean(latest&&{sources:latest.sources,nodal:latest.nodal,load:latest.load,settings:latest.settings,audio:latest.audio,room:latest.room})};}
  };
  return Object.freeze(api);
})();
if(typeof globalThis!=='undefined')globalThis.XenSonarSoundTrace=__XenSoundTrace;
