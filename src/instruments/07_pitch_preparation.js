/* Control-side, engine-independent preparation. Owns no notes, DSP budget,
   audio clock or audible fallback. Engine adapters own payloads and workers. */
function createInstrumentPitchPreparation({prepare,install,prune=()=>{},isCurrent=()=>true,capacity=2048,batchSize=16,pauseMs=12,schedule=setTimeout,cancel=clearTimeout}){
  let disposed=false,generation=0,desired=[],inflight=false,timer=null,error=null,failedGeneration=-1;
  const resident=new Map(),waiters=new Set(),counts={jobs:0,submitted:0,stale:0};let desiredSet=new Set();
  function current(){return !disposed&&isCurrent();}
  function missing(){return desired.filter(hz=>!resident.has(hz));}
  function settle(){
    for(const waiter of waiters){
      const failure=!current()?'Instrument pitch preparation cancelled':waiter.generation!==generation?'Instrument pitch preparation superseded':error;
      if(failure){waiters.delete(waiter);waiter.reject(new Error(failure));}
      else if(!missing().length){waiters.delete(waiter);waiter.resolve();}
    }
  }
  // Preparation barrier only. It owns no onset or voice and never retries a
  // missed note. Same-port ordering installs these packets before later notes.
  function whenReady(){return new Promise((resolve,reject)=>{waiters.add({generation,resolve,reject});settle();});}
  async function run(){
    timer=null;if(!current()||inflight||failedGeneration===generation)return;
    const batch=missing().slice(0,batchSize);if(!batch.length)return;
    const stamp=generation;inflight=true;counts.jobs++;
    try{
      const packet=await prepare(batch);
      if(!current()||stamp!==generation){counts.stale++;return;}
      if(install(packet,batch)===false)throw new Error('Instrument pitch preparation was not accepted');
      for(const hz of batch){resident.delete(hz);resident.set(hz,true);if(resident.size>capacity)resident.delete(resident.keys().next().value);}
      counts.submitted+=batch.length;error=null;
    }catch(reason){if(current()&&stamp===generation){error=String(reason?.message??reason);failedGeneration=stamp;}}
    finally{
      inflight=false;
      if(current()&&failedGeneration!==generation&&missing().length)timer=schedule(run,pauseMs);
      settle();
    }
  }
  function update(frequencies){
    if(!current()||!Array.isArray(frequencies)||frequencies.length>capacity||frequencies.some(hz=>!Number.isFinite(hz)||hz<=0))return false;
    const next=[...new Set(frequencies)];
    if(next.length===desired.length&&next.every((hz,i)=>hz===desired[i]))return true;
    desired=next;desiredSet=new Set(next);generation++;error=null;failedGeneration=-1;settle();
    if(timer!==null){cancel(timer);timer=null;}
    const keep=new Set(next),obsolete=[...resident.keys()].filter(hz=>!keep.has(hz));
    try{if(obsolete.length)prune(obsolete);for(const hz of obsolete)resident.delete(hz);}
    catch(reason){error=String(reason?.message??reason);failedGeneration=generation;settle();return false;}
    if(!inflight)run();return true;
  }
  // A priority hint changes neither acoustic identity nor the desired set.
  // Keep an in-flight valid batch; the next paced batch handles imminent notes
  // first. This control queue is shared by Nodal and Entrophon adapters.
  function prioritize(frequencies){
    if(!current()||!Array.isArray(frequencies)||frequencies.length>64||failedGeneration===generation)return false;
    const first=new Set(frequencies.filter(hz=>desiredSet.has(hz)&&!resident.has(hz)));
    if(!first.size)return true;
    desired=[...first,...desired.filter(hz=>!first.has(hz))];
    if(!inflight){if(timer!==null)cancel(timer);timer=null;run();}
    return true;
  }
  function dispose(){if(disposed)return;disposed=true;generation++;if(timer!==null)cancel(timer);timer=null;desired=[];desiredSet.clear();resident.clear();settle();}
  return Object.freeze({update,prioritize,whenReady,covers:hz=>current()&&desiredSet.has(hz),has:hz=>current()&&resident.has(hz),dispose,snapshot:()=>({generation,desired:desired.length,resident:resident.size,missing:missing().length,inflight,disposed,error,...counts,
    phase:disposed?'disposed':error?'failed':inflight||timer!==null?'preparing':missing().length?'pending':'submitted'})});
}
