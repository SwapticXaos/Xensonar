/* F3.56.24: only workshop action ownership; the Vt generation/ticket remains authoritative for extraction and rendering. */
function __f35624WorkbenchActivity({operation,activity,disposed,setBusy,setPreviewPending,setError}){
 const isCurrent=token=>token!=null&&!disposed.current&&operation.current===token&&activity.current?.token===token;
 const begin=kind=>{if(disposed.current)return null;if(activity.current)Vt.stop();const token=++operation.current;activity.current={token,kind};setBusy(true);setPreviewPending(kind==='preview');setError('');return token;};
 const finish=token=>{if(!isCurrent(token))return;activity.current=null;setBusy(false);setPreviewPending(false);};
 const cancel=(stopAudio=true)=>{if(disposed.current)return;operation.current++;activity.current=null;setBusy(false);setPreviewPending(false);if(stopAudio)Vt.stop();};
 const dispose=()=>{if(disposed.current)return;const owned=!!activity.current;disposed.current=true;operation.current++;activity.current=null;if(owned)Vt.stop();};
 const error=(token,e)=>{if(isCurrent(token)&&e?.name!=='AbortError')setError(e?.message??String(e));};
 return {begin,isCurrent,finish,cancel,dispose,error};
}
