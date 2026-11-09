

// One owner for playback epochs, cancellation and the subscriptions that observe them.
function __createF352PlaybackRuntime({pipeline,identity,capture,pe,Vt,xt,__F352Worker,__F341Workbench,__F352Session,__f3564ActivateLiveGain,subscribeTuning}){
 let playEpoch=0,disposed=false,subscriptions=null,releaseProgress=null;
 function checkLive(){if(disposed)throw new DOMException("Playback runtime disposed.",'AbortError');}
 function invalidate(){
  playEpoch++;
  const release=releaseProgress;releaseProgress=null;release?.();
  pipeline.invalidate();__F352Worker.cancel();xt.stop();
 }
 async function render(state=pe.getState()){
  checkLive();attach();const token=playEpoch,job=capture(state),artifact=await pipeline.render(job);
  if(disposed||token!==playEpoch||identity()!==job.key||!Vt.getSnapshot().selected)
   throw new DOMException("The sound recipe changed during rendering.",'AbortError');
  return artifact;
 }
 function stop(){if(disposed)return;invalidate();Vt.stop();}
 async function play(state=pe.getState(),options={}){
  checkLive();attach();stop();const token=++playEpoch,ticket=Vt.beginRender();
  Vt.setPlaybackStopHandler(()=>{if(token===playEpoch)invalidate();});
  let listening=true;
  const unsubscribe=pipeline.subscribe(()=>{if(token===playEpoch){const s=pipeline.getSnapshot();if(s.phase==='rendering')Vt.reportRenderProgress(ticket,s.progress);}});
  const release=()=>{if(!listening)return;listening=false;unsubscribe();if(releaseProgress===release)releaseProgress=null;};
  releaseProgress=release;
  try{
   const artifact=await render(state);
   const current=()=>!disposed&&token===playEpoch&&Vt.getSnapshot().selected&&identity()===artifact.key;
   if(!current())return false;
   Vt.markFigurePrepared(ticket,state.renderVersion,artifact.key,false);
   const played=await xt.playBufferInternal(artifact.buffer,artifact.durationSec,options.fromPosition??0,
    p=>{if(current())options.onPosition?.(p);},()=>{if(current()){Vt.finish(ticket);options.onEnd?.();}},
    {isCurrent:current,playbackRate:1,loopPreview:!!state.materialExport.loopPreview,lifecycleMode:'forge-f352-hybrid',beatGuide:{...state.materialExport,loopDurationSec:artifact.durationSec}});
   if(played&&current()){__f3564ActivateLiveGain(artifact.buffer);Vt.markPlaying(ticket);}
   return played&&current();
  }catch(e){if(token===playEpoch)Vt.failPlayback(ticket,e);throw e;}finally{release();}
 }
 function current(){const artifact=pipeline.getSnapshot().result;return !disposed&&Vt.getSnapshot().selected&&artifact?.key===identity()?artifact:null;}
 function detach(){if(!subscriptions)return;const owned=subscriptions;subscriptions=null;for(const release of owned)release();stop();}
 function attach(){
  checkLive();if(subscriptions)return detach;
  let stamp=identity(),selected=Vt.getSnapshot().selected;
  const update=()=>{
   const next=identity(),selection=Vt.getSnapshot().selected;
   if(next===stamp&&selection===selected)return;stamp=next;selected=selection;
   // Extraction owns its generation; publishing its source must not cancel its loader.
   invalidate();if(['rendering','playing'].includes(Vt.getSnapshot().phase))Vt.stop();
  };
  subscriptions=[];
  try{for(const subscribe of [f=>pe.subscribe(f),f=>Vt.subscribe(f),f=>__F341Workbench.subscribe(f),f=>__F352Session.subscribe(f),subscribeTuning])subscriptions.push(subscribe(update));}
  catch(e){detach();throw e;}
  return detach;
 }
 function dispose(){if(disposed)return;if(subscriptions)detach();else stop();disposed=true;pipeline.dispose();}
 return Object.freeze({identity,capture,render,play,stop,attach,detach,dispose,current,getSnapshot:pipeline.getSnapshot,subscribe:pipeline.subscribe,
  diagnostics:()=>({...pipeline.diagnostics(),worker:__F352Worker.status(),attached:subscriptions!==null})});
}
