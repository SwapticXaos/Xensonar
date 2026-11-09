
/* M11: opt-in, deferred hydration for saved SESSION DRAFTS only.
 * V2 localStorage stays authoritative; this never writes archive metadata or
 * touches live audio / the Quickrack activation path. A sidecar record is
 * advisory until it matches the current canonical row exactly.
 */
function __xenM11HydrationFactory(storage,metaStore,mirrorSupplier){
 const KEY='xensonar.meta-sessions.v2';
 let ticket=0;
 const cancel=()=>{ticket++};
 async function loadDraft(id){
  const mine=++ticket;
  if(typeof id!=='string'||!id)return {ok:false,reason:'missing'};
  const baseline=metaStore.snapshot();
  const before=storage.getItem(KEY);
  const found=baseline.saved.find(row=>row.id===id);
  if(!found)return {ok:false,reason:'missing'};
  // Never start/open the archive merely to satisfy a Quickrack request.
  // The Sessions view initializes it when the archive tab is opened.
  let viaMirror=null;
  try{
   const mirror=mirrorSupplier?.();
   if(mirror?.get){
    // A delayed or blocked IndexedDB must never hold an already available V2
    // draft hostage. The old canonical row remains available immediately.
    let timeout;
    try{
     viaMirror=await Promise.race([
      Promise.resolve().then(()=>mirror.get(id)).catch(()=>null),
      new Promise(resolve=>{timeout=setTimeout(()=>resolve(null),60)})
     ]);
    }finally{clearTimeout(timeout)}
   }else await Promise.resolve();
  }catch{viaMirror=null}
  // Any local edit, newer selection, archive replacement or tab change
  // invalidates this in-flight request. Do not apply stale results.
  if(ticket!==mine||metaStore.snapshot()!==baseline||storage.getItem(KEY)!==before)
   return {ok:false,reason:'stale'};
  const current=metaStore.snapshot().saved.find(row=>row.id===id);
  if(!current)return {ok:false,reason:'stale'};
  const matched=!!viaMirror&&JSON.stringify(viaMirror)===JSON.stringify(current);
  // The synchronous, validated store is the sole authority today. This is
  // deliberately NOT a hidden cutover to IDB read/write authority.
  const committed=metaStore.load(id);
  return committed
   ?{ok:true,source:matched?'mirror':'canonical'}
   :{ok:false,reason:'commit-failed'};
 }
 return {loadDraft,cancel};
}

