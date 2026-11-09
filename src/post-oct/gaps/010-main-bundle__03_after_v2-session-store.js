
/* XEN-META-M3-LANES-BEGIN
   Session-lane reassignment is a change of owner REFERENCE, not a conversion.
   No Root Follow bank registration, WAV rendering or audio asset duplication here.
   A target must independently own the SAME material ID before reassignment. */
function __xenMetaLaneCompatibility(entry,targetKind){
 if(!entry||typeof entry.id!=='string'||!entry.id)return {ok:false,reason:'Missing source identity.'};
 if(entry.kind===targetKind)return {ok:true,sameLane:true};
 if(!(['material','rootFollow'].includes(entry.kind)&&['material','rootFollow'].includes(targetKind)))
  return {ok:false,reason:'Only Material ↔ Root Follow can change session lanes.'};
 if(entry.id.startsWith('loop-rec-')&&(typeof __XenMetaSessions==='undefined'||__XenMetaSessions.activeSessionTakeIds().includes(entry.id)))return {ok:false,reason:'Session Takes cannot change owner lane; their recording belongs to the session.'};
 const id=entry.id;
 // The Root Follow bank is authoritative even when its UI is unmounted.
 let bank=null;try{bank=typeof Yp==='function'?Yp():null}catch{return {ok:false,reason:'Root Follow bank unavailable; no changes made.'};}
 if(targetKind==='rootFollow'){
  if(!bank||!Array.isArray(bank.memberIds)||!bank.memberIds.includes(id))
   return {ok:false,reason:'No Root Follow bank member for this material ID. Send through the native Root Follow route first.'};
  // Preserve the bank config in place: a synth plan stays a synth plan.
  return {ok:true,sourceId:id,targetKind};
 }
 // Material must already have a durable asset. Synth-only RFL entries are NOT audio.
 let inAdapter=false,inMaterialLibrary=false;
 try{const registered=__XenQuick.adapters.get('material')?.entries;
  inAdapter=Array.isArray(registered)&&registered.some(row=>String(row.id)===id);
  const library=typeof bs==='function'?bs():null;
  inMaterialLibrary=Array.isArray(library?.entries)&&library.entries.some(row=>String(row.id)===id);
 }catch{return {ok:false,reason:'Material library unavailable; no changes made.'};}
 if(!inAdapter&&!inMaterialLibrary)
  return {ok:false,reason:'No original Material Track audio asset for this ID. A synthetic Root Follow plan is not Raw Audio.'};
 return {ok:true,sourceId:id,targetKind};
}
/* XEN-META-M3-LANES-END */
