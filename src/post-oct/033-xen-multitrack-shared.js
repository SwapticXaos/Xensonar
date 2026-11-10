/* ROOM4-03 · shared Multitrack services in the main bundle (cold: nothing runs until used).
 *
 * __XenMultitrackInbox — ONE "Send to Multitrack" path for every room (Wave Editor, Spectral Forge,
 * Melodic Loop, raw import inside Room IV). Audio becomes a durable Material through the existing
 * owner (__registerDurableMaterial), losslessly: the original WAV blob, or a Float32 WAV of PCM.
 * A small inbox (IndexedDB "xensonar-multitrack-v1", key "inbox") tells Room IV to lay each item on
 * a new track below the existing ones. The same database holds the Room IV project ("current").
 * Tempo fitting happens at playback only (tape rate); the stored material is never re-timed.
 *
 * __xenViewportRail — neutral math for a draggable/resizable overview rail (the Melodic Loop's
 * interaction model: drag the window, drag its edges to zoom, click to jump), reusable by any room.
 */
const __XenMultitrackInbox=(()=>{
 const DB='xensonar-multitrack-v1',STORE='projects',INBOX='inbox';let task=null;
 const uid=()=>globalThis.crypto?.randomUUID?.()??(Date.now().toString(36)+Math.random().toString(36).slice(2,8));
 function db(){if(task)return task;task=new Promise((ok,bad)=>{if(typeof indexedDB==='undefined'){bad(Error('IndexedDB unavailable'));return}
  const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};
  r.onsuccess=()=>{r.result.onversionchange=()=>r.result.close();ok(r.result)};r.onerror=()=>bad(r.error||Error('Cannot open multitrack storage'))}).catch(e=>{task=null;throw e});return task}
 async function tx(mode,fn){const d=await db();return new Promise((ok,bad)=>{const t=d.transaction(STORE,mode),s=t.objectStore(STORE);let out;Promise.resolve(fn(s,v=>{out=v})).catch(bad);t.oncomplete=()=>ok(out);t.onerror=()=>bad(t.error);t.onabort=()=>bad(t.error||Error('Inbox transaction aborted'))})}
 const notify=count=>{try{window.dispatchEvent(new CustomEvent('xensonar:multitrack-inbox',{detail:{count}}))}catch{}};
 async function add(item,{quiet=false}={}){if(!item?.materialId)throw Error('Inbox item needs a materialId.');let count=0;
  await tx('readwrite',s=>{const q=s.get(INBOX);q.onsuccess=()=>{const list=Array.isArray(q.result)?q.result:[];list.push({...item,id:item.id||uid(),at:item.at||Date.now()});count=list.length;s.put(list,INBOX)}});if(!quiet)notify(count);return count}
 async function take(){return tx('readwrite',(s,out)=>{const q=s.get(INBOX);q.onsuccess=()=>{const list=Array.isArray(q.result)?q.result:[];out(list);if(list.length)s.put([],INBOX)}})}
 async function count(){return tx('readonly',(s,out)=>{const q=s.get(INBOX);q.onsuccess=()=>out(Array.isArray(q.result)?q.result.length:0)})}
 /* Tempo from an onset envelope (10 ms hops): autocorrelation over 60–200 BPM with a mild
    preference for 80–160 BPM, beat phase from the strongest comb alignment. Cold, offline. */
 function detectTempo(x,rate){const hop=Math.max(1,Math.round(rate*.01)),n=Math.floor(x.length/hop);if(n<250)return {bpm:null,confidence:0,offsetSec:0};
  const e=new Float32Array(n);for(let i=0;i<n;i++){let s=0;for(let j=i*hop,z=j+hop;j<z;j++)s+=x[j]*x[j];e[i]=Math.log1p(1000*s/hop)}
  const o=new Float32Array(n);for(let i=1;i<n;i++)o[i]=Math.max(0,e[i]-e[i-1]);
  const w=50;let acc=0;const m=new Float32Array(n);for(let i=0;i<n;i++){acc+=o[i];if(i>=w)acc-=o[i-w];m[i]=acc/Math.min(i+1,w)}for(let i=0;i<n;i++)o[i]=Math.max(0,o[i]-m[i]);
  let mean=0;for(const v of o)mean+=v;mean/=n;for(let i=0;i<n;i++)o[i]-=mean;
  const ac=l=>{let s=0;for(let i=0;i+l<n;i++)s+=o[i]*o[i+l];return s/(n-l)};const a0=ac(0)||1e-12;
  let best=null;for(let l=30;l<=100;l++){const v=ac(l)/a0,v2=2*l<n/2?ac(2*l)/a0:0,bpm=6000/l,pref=Math.exp(-.5*Math.pow(Math.log2(bpm/120)/.9,2));const score=(v+.5*v2)*(.6+.4*pref);if(!best||score>best.score)best={l,score,v}}
  if(!best||best.v<=0)return {bpm:null,confidence:0,offsetSec:0};
  const y0=ac(best.l-1)/a0,y1=best.v,y2=ac(best.l+1)/a0,den=y0-2*y1+y2,d=Math.abs(den)>1e-9?Math.max(-.5,Math.min(.5,.5*(y0-y2)/den)):0,lag=best.l+d;
  let phase=0,ps=-Infinity;for(let p=0;p<Math.ceil(lag);p++){let s=0;for(let k=p;k<n;k+=lag)s+=o[Math.round(k)]||0;if(s>ps){ps=s;phase=p}}
  return {bpm:Math.round(60/(lag*.01)*100)/100,confidence:Math.max(0,Math.min(1,best.v)),offsetSec:phase*.01}}
 async function decode(blob){const Offline=globalThis.OfflineAudioContext||globalThis.webkitOfflineAudioContext;const ctx=new Offline(1,1,48000);return ctx.decodeAudioData((await blob.arrayBuffer()).slice(0))}
 function monoOf(buffer){const n=buffer.length,c=buffer.numberOfChannels,out=new Float32Array(n);for(let ch=0;ch<c;ch++){const d=buffer.getChannelData(ch);for(let i=0;i<n;i++)out[i]+=d[i]/c}return out}
 /* blob: the audio as it should be kept (never re-encoded). bpm: known source tempo (wins over detection). */
 async function sendBlob({blob,name,origin='external',bpm=null,enqueue=true}){
  if(!(blob instanceof Blob)||!blob.size)throw Error('No audio to send.');
  const buffer=await decode(blob),dur=buffer.duration;if(!(dur>.02))throw Error('Audio is too short.');
  const det=enqueue?detectTempo(monoOf(buffer),buffer.sampleRate):{bpm:null,confidence:0,offsetSec:0},known=Number(bpm)>0?Number(bpm):null,useDet=!known&&det.bpm&&det.confidence>=.2;
  const sourceBpm=known??(useDet?det.bpm:null),pkgBpm=sourceBpm??108,clean=String(name||'Audio').replace(/\.[a-z0-9]{2,5}$/i,'').slice(0,80)||'Audio';
  const pkg={schemaVersion:qT,id:'mt-'+uid(),name:clean,role:'loop',audio:{kind:'audio',mimeType:blob.type||'audio/wav',blob,durationSec:dur,channels:buffer.numberOfChannels,sampleRate:buffer.sampleRate},
   timing:{bpm:pkgBpm,bars:Math.max(.25,Math.round(dur*pkgBpm/240*100)/100),beatsPerBar:4,loopStartSec:0,loopEndSec:dur,intendedLoopDurationSec:dur},
   renderInfo:{sourceVersion:'Send to Multitrack',renderMode:'raw-pcm',workspaceOrigin:origin},provenance:{createdAt:new Date().toISOString()}};
  const entry=await __registerDurableMaterial(pkg,{selectOnRegister:false});
  if(enqueue)await add({materialId:entry.id,name:clean,origin,sourceBpm,tempoSource:known?'known':useDet?'detected':'none',tempoConfidence:det.confidence,offsetSec:useDet?det.offsetSec:0});
  return {entry,sourceBpm,detected:det}}
 /* PCM channels (e.g. the Wave Editor document): stored as Float32 WAV, bit-exact. */
 async function send({channels,sampleRate,name,origin='external',bpm=null}){
  if(!Array.isArray(channels)||!channels[0]?.length)throw Error('No audio to send.');
  const blob=await __xenRecorderFloatWav(channels[0],channels[1]||channels[0],sampleRate);return sendBlob({blob,name,origin,bpm})}
 const api=Object.freeze({db,add,take,count,send,sendBlob,detectTempo});
 try{globalThis.__XenMultitrackInbox=api}catch{}
 return api;
})();
/* ROOM4-03c · EDIT-RETURN-01: scoped Multitrack -> existing Forge Wave Editor ->
   exactly one original clip. No existing audio is overwritten, no new track is queued.
   RAM-only session; IDB commit is atomic and refuses a changed source clip.
   The previous project snapshot is handed to the remounted Room IV for Undo. */
const __XenMultitrackRoundTrip=(()=>{
 'use strict';
 let active=null,receipt=null,lastError='';
 const uuid=()=>globalThis.crypto?.randomUUID?.()??'rt-'+Date.now()+'-'+Math.random().toString(36).slice(2);
 const clipIdentity=c=>JSON.stringify(['materialId','startBeat','inBeat','lenBeats','repeats','fit','sourceBpm','gain','fadeIn','fadeOut','muted'].map(k=>c?.[k]??null));
 const emit=()=>window.dispatchEvent(new CustomEvent('xensonar:multitrack:roundtrip-state',{detail:status()}));
 const status=()=>Object.freeze({active:!!active,phase:active?.phase??'idle',clipId:active?.clipId??null,trackId:active?.trackId??null,error:lastError});
 const navigate=room=>window.dispatchEvent(new CustomEvent('xensonar:multitrack:roundtrip-navigate',{detail:{room}}));
 const cancel=(reason='',token=null)=>{if(token&&active?.token!==token)return false;active=null;if(reason)lastError=reason;emit();return true};
 const bound=editor=>!!(active&&active.phase==='editing'&&editor?.doc?.id===active.editorDocId&&editor.activeWorkspace==='project');
 const pending=()=>!!(active&&active.phase==='opening');
 function bind(editor,token){if(!active||active.token!==token||active.phase!=='opening'||!editor?.doc?.id)return false;
  active.editorDocId=editor.doc.id;active.phase='editing';lastError='';emit();editor.refreshRoundTripButton?.();return true}
 async function open(file,meta){
  if(active)throw Error('A Multitrack-to-Wave-Editor edit is already open. Apply or close it first.');
  if(!file||!meta?.clipId||!meta?.trackId||!meta?.materialId)throw Error('Missing clip edit context.');
  const token=uuid();active={...meta,token,phase:'opening',editorDocId:null};lastError='';emit();navigate('L3LAB');
  try{
   // The Forge is lazily mounted. Reuse its canonical decoded-file handoff; never
   // create an alternate Wave Editor or hidden scratch document.
   for(let attempt=0;attempt<180;attempt++){
    if(!active||active.token!==token)throw Error('Clip edit was cancelled.');
    let resolve,reject;const accepted=new Promise((yes,no)=>{resolve=yes;reject=no});
    const request={file,claimed:false,roundTripToken:token,resolve,reject};
    window.dispatchEvent(new CustomEvent('xensonar:forge:send-to-editor-file',{detail:request}));
    if(request.claimed){await accepted;if(active?.token!==token||active.phase!=='editing')throw Error('Wave Editor did not bind to the selected clip.');return true}
    await new Promise(ok=>setTimeout(ok,80));
   }
   throw Error('The Wave Editor did not become ready. Open Material Forge / Spectral Forge and retry.');
  }catch(error){cancel(String(error?.message||error),token);navigate('MULTITRACK');throw error}
 }
 async function apply(editor){
  if(!bound(editor))throw Error('The current Wave Editor document is not linked to the Multitrack clip.');
  const current=active;
  if(!editor.doc?.frames)throw Error('Wave Editor document is empty.');
  if(editor.nodes.length){await editor.applyChain();if(editor.nodes.length)throw Error('Effect rendering did not complete. No clip was replaced.');}
  if(!active||active.token!==current.token||!editor.doc?.frames)throw Error('Clip edit was cancelled.');
  const doc=editor.doc,expectedDoc=doc;
  current.phase='saving';emit();
  try{
   const core=globalThis.__XenWaveCoreW01;if(!core?.encodeWav)throw Error('Wave WAV encoder unavailable.');
   const bytes=core.encodeWav(doc,{format:'float32'}),blob=new Blob([bytes],{type:'audio/wav'});
   const result=await __XenMultitrackInbox.sendBlob({blob,name:current.name+' · edited',origin:'multitrack-wave-return',bpm:current.bpm,enqueue:false});
   if(active!==current||editor.doc!==expectedDoc)throw Error('Wave document changed while saving; the clip was not replaced.');
   const db=await __XenMultitrackInbox.db();let before=null,after=null;
   await new Promise((resolve,reject)=>{
    const tx=db.transaction('projects','readwrite'),store=tx.objectStore('projects');
    const req=store.get('current');
    req.onsuccess=()=>{try{
     const project=req.result;
     if(project?.format!=='xensonar.multitrack'||project?.id!=='current')throw Error('Arrangement record is unavailable.');
     if(project.bpm!==current.bpm)throw Error('Arrangement tempo changed during editing. Return without applying and try again.');
     const track=project.tracks?.find(t=>t.id===current.trackId),clip=track?.clips?.find(c=>c.id===current.clipId);
     if(!clip||clipIdentity(clip)!==current.identity)throw Error('Target clip changed or was removed while editing. Nothing was overwritten.');
     before=project;
     const beats=doc.frames/doc.sampleRate*project.bpm/60;
     const replacement={...clip,materialId:result.entry.id,inBeat:0,fit:'bpm',sourceBpm:project.bpm,lenBeats:Math.max(1/64,beats)};
     delete replacement.repeats;
     after={...project,updatedAt:Date.now(),tracks:project.tracks.map(t=>t.id!==current.trackId?t:{...t,clips:t.clips.map(c=>c.id!==current.clipId?c:replacement)})};
     store.put(after,'current');
    }catch(error){try{tx.abort()}catch{};reject(error)}};
    req.onerror=()=>reject(req.error||Error('Could not read arrangement.'));
    tx.oncomplete=()=>resolve();tx.onabort=()=>reject(req.error||tx.error||Error('Clip replacement was rejected.'));
    tx.onerror=()=>{};
   });
   receipt={before,clipId:current.clipId,trackId:current.trackId,startBeat:current.startBeat,newMaterialId:result.entry.id};
   active=null;lastError='';emit();navigate('MULTITRACK');
   return {materialId:result.entry.id,clipId:current.clipId};
  }catch(error){if(active===current){current.phase='editing';emit()}throw error}
 }
 function takeReceipt(){const r=receipt;receipt=null;return r}
 function takeError(){const e=lastError;lastError='';return e}
 const api=Object.freeze({status,pending,bound,bind,open,apply,cancel,takeReceipt,takeError,clipIdentity});
 try{globalThis.__XenMultitrackRoundTrip=api}catch{}
 return api;
})();
const __xenViewportRail=Object.freeze({
 // view = {start, visible, total, minVisible} in any unit (tracks, lines, beats …); axis 'y' (default) or 'x'
 begin(rect,mode,client,view,axis='y'){const x=axis==='x';return {mode,y0:client,start:view.start,visible:view.visible,total:view.total,minVisible:Math.max(1e-6,view.minVisible??1),h:Math.max(1,x?rect.width:rect.height)}},
 jump(rect,client,view,axis='y'){const x=axis==='x',h=Math.max(1,x?rect.width:rect.height),s=(client-(x?rect.left:rect.top))/h*view.total-view.visible/2;return {start:Math.max(0,Math.min(Math.max(0,view.total-view.visible),s)),visible:view.visible}},
 move(st,client){const d=(client-st.y0)/st.h*st.total,maxStart=Math.max(0,st.total-st.visible);
  if(st.mode==='move')return {start:Math.max(0,Math.min(maxStart,st.start+d)),visible:st.visible};
  // Pulling an edge past its end takes the other edge along, so a fully pulled window always shows everything.
  if(st.mode==='resize-start'){let end=st.start+st.visible,s=st.start+d;if(s<0){end=Math.min(st.total,end-s);s=0}s=Math.min(end-st.minVisible,s);return {start:s,visible:end-s}}
  let s=st.start,end=st.start+st.visible+d;if(end>st.total){s=Math.max(0,s-(end-st.total));end=st.total}end=Math.max(s+st.minVisible,end);return {start:s,visible:end-s}}
});
