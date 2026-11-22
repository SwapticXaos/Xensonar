/* Shared AudioWorklet module registration and one-shot abortable Blob Worker runner.
   Pure lifecycle infrastructure: never alters DSP code, audio graphs, or presets. */
async function __xenAddWorkletModule(ctx,code,{preferDataOnFile=true}={}){
 let error=null;
 const modes=preferDataOnFile&&typeof location!=='undefined'&&location.protocol==='file:'?['data','blob']:['blob','data'];
 for(const mode of modes){
  let url=null;
  try{
   url=mode==='blob'?URL.createObjectURL(new Blob([code],{type:'application/javascript'})):'data:application/javascript;charset=utf-8,'+encodeURIComponent(code);
   await ctx.audioWorklet.addModule(url);
   return mode;
  }catch(cause){error=cause}
  finally{if(mode==='blob'&&url)URL.revokeObjectURL(url)}
 }
 throw error??Error('AudioWorklet module could not be loaded.');
}

function __xenRunBlobWorker({code,payload,transfer=[],signal,timeoutMs=240000,timeoutMessage='Background job timed out.',errorMessage='Background worker failed.',onProgress,name}){
 return new Promise((resolve,reject)=>{
  if(signal?.aborted){reject(new DOMException('Abgebrochen','AbortError'));return}
  let worker=null,url=null,timer=null,settled=false;
  const done=(error,result)=>{
   if(settled)return;
   settled=true;
   if(timer!=null)clearTimeout(timer);
   signal?.removeEventListener('abort',abort);
   try{worker?.terminate()}catch{}
   if(url)try{URL.revokeObjectURL(url)}catch{}
   error?reject(error):resolve(result);
  };
  const abort=()=>done(new DOMException('Abgebrochen','AbortError'));
  try{
   url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));
   worker=name?new Worker(url,{name}):new Worker(url);
   worker.onmessage=({data})=>{
    if(!data)return;
    if(data.error)done(Error(data.error));
    else if(data.result!==undefined)done(null,data.result);
    else if(Number.isFinite(data.progress)&&typeof onProgress==='function')onProgress(data.progress);
   };
   worker.onerror=event=>done(Error(event?.message||errorMessage));
   signal?.addEventListener('abort',abort,{once:true});
   if(Number.isFinite(timeoutMs)&&timeoutMs>0)timer=setTimeout(()=>done(Error(timeoutMessage)),timeoutMs);
   worker.postMessage(payload,transfer);
  }catch(error){done(error)}
 });
}

/* Central visibility for storage persistence failures (e.g. QuotaExceededError / IDB blocked).
   Zero DOM overhead while healthy; renders a compact dismissible alert only if an error event fires. */
const __xenStorageAlerts=(()=>{
 const history=[];
 let banner=null;
 function summarize(source,detail){
  const quota=/quota/i.test(String(detail?.name||'')+' '+String(detail?.message||detail||''));
  const raw=typeof detail==='string'?detail:(detail?.message||detail?.reason||detail?.name||'Unbekannter Speicherfehler');
  const title=source==='root-follow'?'Root-Follow-Speicher blockiert':'Material-Speicherfehler';
  const hint=quota?'Browserspeicher ist voll (Quota). Arbeitsstand am besten direkt über die Paketstation sichern.':String(raw);
  return {source,title,hint,quota,at:Date.now(),detail:detail??null};
 }
 function dismiss(){if(banner){try{banner.remove()}catch{}banner=null}}
 function show(entry){
  if(typeof document==='undefined'||!document.body)return;
  if(!banner){
   banner=document.createElement('div');
   banner.setAttribute('role','alert');
   banner.setAttribute('aria-live','assertive');
   banner.dataset.xenStorageAlert='true';
   banner.style.cssText='position:fixed;right:16px;bottom:16px;z-index:2147483000;max-width:420px;padding:11px 14px;border:1px solid #d9826c;border-radius:10px;background:#1e1214f2;color:#fdece8;font:12px/1.45 system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.55);display:flex;gap:12px;align-items:flex-start';
   const body=document.createElement('div');body.style.cssText='flex:1;min-width:0';
   const strong=document.createElement('div');strong.style.cssText='font-weight:650;color:#ffb8a6;margin-bottom:2px';
   const msg=document.createElement('div');msg.style.cssText='color:#f5dad3;overflow-wrap:anywhere';
   const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Speicherhinweis schließen');
   close.style.cssText='flex:0 0 auto;border:1px solid #7d4640;background:#2f1b1e;color:#ffd4c9;border-radius:6px;width:24px;height:24px;cursor:pointer;line-height:1;font-size:15px;padding:0';
   close.addEventListener('click',dismiss);
   body.append(strong,msg);banner.append(body,close);document.body.append(banner);
   banner._title=strong;banner._msg=msg;
  }
  banner._title.textContent=entry.title;
  banner._msg.textContent=entry.hint;
 }
 function record(source,detail){
  const entry=summarize(source,detail);
  history.push(entry);if(history.length>20)history.shift();
  show(entry);
  return entry;
 }
 if(typeof window!=='undefined'&&typeof window.addEventListener==='function'){
  window.addEventListener('xensonar:material-persistence-error',ev=>record('material',ev?.detail));
  window.addEventListener('xensonar:root-follow-storage-error',ev=>record('root-follow',ev?.detail));
 }
 return Object.freeze({snapshot:()=>history.slice(),dismiss,record});
})();

globalThis.__XenStorageAlerts=__xenStorageAlerts;
globalThis.__XenRuntimeHygiene=Object.freeze({addWorkletModule:__xenAddWorkletModule,runBlobWorker:__xenRunBlobWorker,storageAlerts:__xenStorageAlerts});
