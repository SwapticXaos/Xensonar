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

globalThis.__XenRuntimeHygiene=Object.freeze({addWorkletModule:__xenAddWorkletModule,runBlobWorker:__xenRunBlobWorker});
