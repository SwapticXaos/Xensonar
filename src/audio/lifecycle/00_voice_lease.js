// Ω1-E: a tiny main-thread ownership contract, not an audio scheduler.
// A lease belongs to one renderer and one AudioContext generation. It owns
// only cleanup of an ALREADY admitted voice, never a new admission policy.
// Cold/deferred PCM uses the context registry; direct hot-path owners can opt
// out and retain their existing arrays/maps without redundant Set writes.
const __xenContextVoiceLeases=new WeakMap();
// A pending decode owns no AudioNode yet, but still belongs to a context
// lifetime. Capture this scalar before awaiting; retirement invalidates it
// even when there are no active leases. No per-trigger registry allocation.
const __xenContextVoiceEpochs=new WeakMap();
function __xenVoiceEpoch(context){return __xenContextVoiceEpochs.get(context)??0;}
function __xenInvalidatePendingVoices(context){__xenContextVoiceEpochs.set(context,__xenVoiceEpoch(context)+1);}
function __xenCreateVoiceLease({context,renderer,releaseTicket,disconnect,stop,trackContext=true}){
  if(!context||typeof context!=='object')throw new TypeError('VoiceLease requires a context');
  let state='reserved';
  let cutRequested=false;
  let leases=null;
  const lease={
    context,renderer,
    get state(){return state;},
    commit(){if(state!=='reserved')return false;state='active';return true;},
    release(){
      if(state==='released')return false;
      state='released'; // first: recursive onended/stop cannot release twice
      leases?.delete(lease);
      // A closed AudioContext may throw from disconnect and an already
      // destroyed owner may throw from its ticket; both are best-effort.
      try{disconnect?.();}catch{}
      try{releaseTicket?.();}catch{}
      return true;
    },
    onEnded(){return lease.release();},
    cut(){
      if(state==='released'||cutRequested)return false;
      cutRequested=true; // guard synchronous stop -> onended -> recursive cut
      try{stop?.();}catch{}
      lease.release();
      return true;
    }
  };
  if(trackContext){
    leases=__xenContextVoiceLeases.get(context);
    if(!leases){leases=new Set();__xenContextVoiceLeases.set(context,leases);}
    leases.add(lease);
  }
  return lease;
}
function __xenRetireVoiceLeases(context){
  if(!context||typeof context!=='object')return 0;
  __xenInvalidatePendingVoices(context);
  const active=context&&__xenContextVoiceLeases.get(context);
  if(!active)return 0;
  // Remove the generation from visibility before invoking stops. Reentrant
  // completion handlers may release leases, but cannot retire them twice.
  __xenContextVoiceLeases.delete(context);
  let retired=0;
  for(const lease of active){if(lease.cut())retired++;}
  active.clear();
  return retired;
}
function __xenVoiceLeaseCount(context){return __xenContextVoiceLeases.get(context)?.size??0;}

// Existing synchronous Nodal handles already own their DSP tickets.
// This adapter applies the same best-effort release convention without
// adding a Lease object or allocating a Set entry on a Note-On hotpath.
function __xenCutOwnedVoice(voice){
  if(!voice||typeof voice.cut!=='function')return false;
  try{return voice.cut()!==false;}catch{return false;}
}
